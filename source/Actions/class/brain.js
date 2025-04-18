class Brain {
  constructor(bot) {
    this.bot = bot;
    this.taskManager = new TaskManager(bot);
  }

  // 直接從實例訪問 TaskManager 的方法
  addTask(task, priority = 0) {
    return this.taskManager.addTask(task, priority);
  }

  createTask(name, action, options = {}) {
    return new Task(name, this.bot, action, options);
  }

  cancelTask(taskName) {
    return this.taskManager.cancelTask(taskName);
  }

  pause() {
    return this.taskManager.pause();
  }

  resume() {
    return this.taskManager.resume();
  }

  getStatus() {
    return this.taskManager.getStatus();
  }

  clearQueue() {
    return this.taskManager.clearQueue();
  }
}

// 原 Brain 類改名為 TaskManager
class TaskManager {
  constructor(bot) {
    this.bot = bot;
    this.currentTask = null;
    this.taskQueue = [];
    this.isPaused = false;
    this.maxQueueSize = 10;
    this.messageQueue = [];
    this.messageTypes = {
      INFO: "📝",
      SUCCESS: "✅",
      ERROR: "❌",
      WARNING: "⚠️",
      PROGRESS: "📊",
    };
    this.debug = false; // 加入 debug 開關
  }

  // 新增 debug 開關控制方法
  setDebug(enabled) {
    this.debug = enabled;
    this.sendMessage(`Debug 模式已${enabled ? "開啟" : "關閉"}`, "INFO");
  }

  // 修改訊息處理方法
  async sendMessage(message, type = "INFO") {
    const icon = this.messageTypes[type] || "";

    // 只在 debug 模式開啟時輸出 console 訊息
    if (this.debug) {
      console.log(`${icon} ${message}`);
      // 遊戲內訊息
      await this.bot.safeChat(`${message}`, `${icon}`);
    }
  }

  // 添加任務，支援優先級
  addTask(task, priority = 0) {
    if (this.taskQueue.length >= this.maxQueueSize) {
      this.sendMessage("任務佇列已滿！", "WARNING");
      return false;
    }

    // 設置任務優先級和創建時間
    task.priority = priority;
    task.createdAt = Date.now();

    // 根據優先級插入佇列
    const insertIndex = this.taskQueue.findIndex((t) => t.priority < priority);
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.sendMessage(
      `新任務加入隊列：${task.name} (優先級: ${priority})`,
      "INFO"
    );
    this.processQueue();
    return true;
  }

  // 取消特定任務
  cancelTask(taskName) {
    const index = this.taskQueue.findIndex((task) => task.name === taskName);
    if (index !== -1) {
      this.taskQueue.splice(index, 1);
      this.sendMessage(`已取消任務：${taskName}`, "WARNING");
      return true;
    }
    return false;
  }

  // 暫停所有任務
  pause() {
    this.isPaused = true;
    this.sendMessage("任務系統已暫停", "WARNING");
  }

  // 恢復執行
  resume() {
    this.isPaused = false;
    this.sendMessage("任務系統已恢復", "SUCCESS");
    this.processQueue();
  }

  // 清空任務佇列
  clearQueue() {
    this.taskQueue = [];
    this.sendMessage("任務佇列已清空", "WARNING");
  }

  // 取得佇列狀態
  getStatus() {
    return {
      currentTask: this.currentTask?.name || "*無*",
      queueLength: this.taskQueue.length,
      isPaused: this.isPaused,
      nextTask: this.taskQueue[0]?.name || "*無*",
    };
  }

  // 處理任務佇列
  async processQueue() {
    if (this.isPaused || this.currentTask || this.taskQueue.length === 0)
      return;

    this.currentTask = this.taskQueue.shift();
    this.sendMessage(`開始執行任務：${this.currentTask.name}`, "INFO");

    try {
      // 設置任務超時
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("任務超時")),
          this.currentTask.timeout || 30000
        );
      });

      // 競速執行任務和超時檢查
      await Promise.race([this.currentTask.execute(), timeoutPromise]);

      this.sendMessage(`任務完成：${this.currentTask.name}`, "SUCCESS");
    } catch (err) {
      this.sendMessage(
        `任務失敗：${this.currentTask.name} - ${err.message}`,
        "ERROR"
      );
      if (this.currentTask.onError) {
        await this.currentTask.onError(err);
      }
    } finally {
      this.currentTask = null;
      this.processQueue();
    }
  }
}

// Task 類保持不變
class Task {
  constructor(name, bot, action, options = {}) {
    this.name = name;
    this.bot = bot;
    this.action = action;
    this.priority = options.priority || 0;
    this.timeout = options.timeout || 30000;
    this.createdAt = Date.now();
    this.progress = 0;
    this.status = "pending";
    this.onError = options.onError;
  }

  // 執行任務
  async execute() {
    if (typeof this.action !== "function") {
      throw new Error("未定義的行動");
    }

    this.status = "running";
    try {
      await this.action(this.updateProgress.bind(this));
      this.status = "completed";
    } catch (error) {
      this.status = "failed";
      throw error;
    }
  }

  // 更新進度
  updateProgress(progress) {
    this.progress = Math.min(Math.max(progress, 0), 100);
    this.bot.taskManager.sendMessage(
      `任務 ${this.name} 進度: ${this.progress}%`,
      "PROGRESS"
    );
  }

  // 取得任務資訊
  getInfo() {
    return {
      name: this.name,
      status: this.status,
      progress: this.progress,
      priority: this.priority,
      createdAt: this.createdAt,
      runningTime: Date.now() - this.createdAt,
    };
  }
}

// 工廠函數
function brain(bot) {
  return new Brain(bot);
}

module.exports = { brain };
