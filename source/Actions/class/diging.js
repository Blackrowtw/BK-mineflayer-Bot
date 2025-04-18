class DigingClass {
  constructor(bot, options = {}) {
    this.bot = bot;
    this.queue = [];
    this.isMining = false;
    this.currentBlock = null;
    this.stats = { success: 0, cannotDig: 0, fail: 0 };

    // 將事件處理函數綁定到實例
    this.handleStoppedDigging = () => this.onDigComplete(this.bot);
    this.handleDiggingCompleted = () => this.onDigComplete(this.bot);
    this.handleDiggingAborted = (block) => this.onDigError(this.bot, block);

    // 綁定事件監聽器
    this._bindEvents();
  }

  _bindEvents() {
    this._removeEvents(); // 先移除舊的監聽器
    // 添加新的監聽器
    this.bot.on("stoppedDigging", this.handleStoppedDigging);
    this.bot.on("diggingCompleted", this.handleDiggingCompleted);
    this.bot.on("diggingAborted", this.handleDiggingAborted);
  }

  _removeEvents() {
    // 移除所有相關的事件監聽器
    this.bot.removeListener("stoppedDigging", this.handleStoppedDigging);
    this.bot.removeListener("diggingCompleted", this.handleDiggingCompleted);
    this.bot.removeListener("diggingAborted", this.handleDiggingAborted);
  }

  // 取得挖掘狀態
  getStatus() {
    return {
      isMining: this.isMining,
      queueLength: this.queue.length,
      currentBlock: this.currentBlock,
      stats: { ...this.stats },
    };
  }

  // 只回傳挖掘狀態
  isRunning() {
    return this.isMining;
  }

  addQueueAuto(radius, direction, depth) {
    const newBlocks = [];
    for (const { x, y, z } of this._spiralScanPosGenerator(
      radius,
      direction,
      depth
    )) {
      const botPos = this.bot.entity.position;
      const pos = botPos.offset(x, y - botPos.y, z);
      const block = this.bot.blockAt(pos);
      if (block && block.name !== "air") {
        newBlocks.push(block);
        this.queue.push(block);
      }
    }
    this.bot.safeChat(
      `加入 ${newBlocks.length} 個方塊，共 ${this.queue.length} 項任務待挖掘`
    );
  }

  addBlocks(blocks) {
    if (!Array.isArray(blocks)) return;
    this.stats = { success: 0, cannotDig: 0, fail: 0 };
    this.queue.push(
      ...blocks.filter(
        (b) => b && !this.queue.some((q) => q.position.equals(b.position))
      )
    );
    this.bot.safeChat(
      `加入 ${blocks.length} 個方塊，共 ${this.queue.length} 項任務待挖掘`
    );
  }

  start() {
    // 檢查是否已在執行中
    if (this.isMining) {
      this.bot.safeChat(`挖掘任務正在執行中`);
      return;
    }

    if (this.queue.length === 0) {
      this.bot.safeChat(`沒有需要挖掘的方塊`);
      return;
    }
    this.bot.safeChat(`挖掘任務開始`);
    this._processQueue();
  }

  stop() {
    this.bot.safeChat(`挖掘任務終止: ` + `共清除 ${this.queue.length} 項任務`);
    this.queue = [];
    this.isMining = false;
    this.currentBlock = null;
    this.stats = { success: 0, cannotDig: 0, fail: 0 };
    this._removeEvents(); // 停止時移除事件監聽器
    this.bot.stopDigging();
  }

  async _processQueue() {
    if (this.isMining || this.queue.length === 0) return;

    this.isMining = true;
    this.currentBlock = this.queue.shift();

    try {
      if (!this.currentBlock?.position) {
        this._skipQueue();
        return;
      }

      if (!this.bot.canDigBlock(this.currentBlock)) {
        const name = this.currentBlock.displayName;
        const pos = this.currentBlock.position;
        this.stats.cannotDig++;
        this.bot.logTimer(`碰不到: ${name} ${pos}`);
        this._skipQueue();
        return;
      }
      const digBlock = this.currentBlock;
      await this.bot.dig(digBlock, "ignore");
      this.stats.success++;
    } catch (err) {
      const pos = this.currentBlock.position;
      this.stats.fail++;
      this.bot.logTimer(`挖掘失敗 ${pos}: ${err.message}`);
    } finally {
      this.isMining = false;
    }
  }

  _skipQueue() {
    this.isMining = false;
    this.stats.fail++;
    this._isQueueEnd();
  }

  _isQueueEnd() {
    if (this.queue.length === 0) {
      const total = this.stats.success;
      const successRate =
        total > 0 ? (((total - this.stats.fail) / total) * 100).toFixed(1) : 0;
      this.bot.safeChat(`挖掘任務已完成`, `✅`);
      this.bot.safeChat(
        `碰不到: ${this.stats.cannotDig}, 共失敗: ${this.stats.fail}, 成功率: ${successRate} %`,
        `📊`
      );
      this.isMining = false;
      this.stats = { success: 0, cannotDig: 0, fail: 0 };
    } else {
      this._processQueue();
    }
  }

  onDigComplete(bot) {
    this.isMining = false;
    this.currentBlock = null;
    this._isQueueEnd(bot);
  }

  onDigError(bot, block) {
    this.isMining = false;
    let errBlock;
    if (block) errBlock = block;
    const name = errBlock.displayName ?? "block";
    const pos = errBlock.position ?? "( N/A )";
    bot.logTimer(
      `[bot-on-diggingAborted] the ${name} ${pos} that still exists`
    );
    if (this.currentBlock) {
      this.queue.unshift(this.currentBlock); // 將當前方塊重新加入佇列
      this.currentBlock = null;
    }
    this._processQueue(bot); // 繼續執行下一個任務
  }

  *_spiralScanPosGenerator(radius = 3, direction = "both", depth = null) {
    const botPos = this.bot.entity.position;
    const validDirections = ["up", "down", "both"];
    if (!validDirections.includes(direction)) {
      throw new Error(
        `Invalid direction: ${direction}. Must be "up", "down", or "both".`
      );
    }

    let upRadius = Math.min(radius, 7); // upRadius 最大為 6
    let xzRadius = Math.min(radius, 6 - upRadius + 1); // xzRadius 根據 upRadius 動態調整

    // 如果有 depth 參數，則取代下半部分的 radius 否則與 radius 相同
    const downRadius = depth !== null ? depth : radius;

    // 上半部分（Y >= botPos.y）
    if (direction === "up" || direction === "both") {
      for (let y = botPos.y; y <= botPos.y + upRadius; y++) {
        for (let r = 1; r <= xzRadius; r++) {
          for (let x = -r, z = -r; z <= r; z++) yield { x, y, z };
          for (let x = -r + 1, z = r; x <= r; x++) yield { x, y, z };
          for (let x = r, z = r - 1; z >= -r; z--) yield { x, y, z };
          for (let x = r - 1, z = -r; x >= -r + 1; x--) yield { x, y, z };
        }
        yield { x: 0, y, z: 0 }; // 每層中心點
      }
    }

    // 下半部分（Y < botPos.y）
    if (direction === "down" || direction === "both") {
      for (let y = botPos.y - 1; y >= botPos.y - downRadius; y--) {
        for (let r = 1; r <= xzRadius; r++) {
          for (let x = -r, z = -r; z <= r; z++) yield { x, y, z };
          for (let x = -r + 1, z = r; x <= r; x++) yield { x, y, z };
          for (let x = r, z = r - 1; z >= -r; z--) yield { x, y, z };
          for (let x = r - 1, z = -r; x >= -r + 1; x--) yield { x, y, z };
        }
        yield { x: 0, y, z: 0 }; // 每層中心點
      }
    }
  }
}

// 工廠函數
function diging(bot, options = {}) {
  return new DigingClass(bot, options);
}

module.exports = { diging };
