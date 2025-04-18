class BodyGuardClass {
  constructor(bot, options = {}) {
    this.bot = bot;
    this.config = {
      targetName: options.targetName || null,
      followRange: options.followRange || 4,
      guardRange: options.guardRange || 16,
      blackListEntities: options.blackListEntities || ["creeper"],
      interval: options.interval || 1000,
      wait: options.wait || 60,
      chatCooldown: options.chatCooldown || 5000,
    };

    this.state = {
      chatQueue: [],
      loopCounter: 0,
      targetEnemy: null,
      isEating: false,
    };
  }

  async handleEatStatus() {
    const { bot, config, state } = this;
    if (bot.health < 14 || bot.food < 14) {
      state.chatQueue.push([`尼給路打油～`, `🏃`]);

      // 處理逃離邏輯
      if (
        state.targetEnemy &&
        state.targetEnemy.isValid &&
        state.targetEnemy.health > 0
      ) {
        await this._handleEscapeFromEnemy();
      } else {
        await this._handleEscapeFromPosition();
      }

      // 進食邏輯
      if (!state.isEating) {
        await this._handleEating();
      }
      return true;
    }
    return false;
  }

  async _handleEscapeFromEnemy() {
    const { bot, config } = this;
    if (!bot.pathfinder.isMoving()) {
      const enemyPos = this.state.targetEnemy.position;
      const nearEnemyGoal = new bot.goals.GoalNear(
        enemyPos.x,
        enemyPos.y,
        enemyPos.z,
        10
      );
      const safeGoal = new bot.goals.GoalInvert(nearEnemyGoal);
      await bot.pathfinder.setGoal(safeGoal);
      await bot.waitForTicks(config.wait * 1.2);
    }
  }

  async _handleEscapeFromPosition() {
    const { bot, config } = this;
    if (!bot.pathfinder.isMoving()) {
      const standPos = bot.entity.position;
      const nowStandGoal = new bot.goals.GoalNear(
        standPos.x,
        standPos.y,
        standPos.z,
        10
      );
      const safeGoal = new bot.goals.GoalInvert(nowStandGoal);
      await bot.pathfinder.setGoal(safeGoal);
      await bot.waitForTicks(config.wait * 1.2);
    }
  }

  async _handleEating() {
    const { bot, config, state } = this;
    state.isEating = true;
    const holdItem = bot.heldItem;

    try {
      await bot.actions.eatFoods(bot);
      if (bot.usingHeldItem) {
        await bot.waitForTicks(config.wait);
      }
      await bot.waitForTicks(2);
      if (holdItem) await bot.equip(holdItem, "hand");
    } catch (error) {
      state.chatQueue.push([`進食失敗: ${error.message}`, `⛔`]);
    } finally {
      state.isEating = false;
    }
  }

  async handleAttackAndFollow() {
    const { bot, config, state } = this;

    // 檢查現有目標
    if (
      state.targetEnemy &&
      (!state.targetEnemy.isValid || state.targetEnemy.health <= 0)
    ) {
      state.targetEnemy = null;
      bot.pvp.stop();
      state.chatQueue.push([`攻擊目標死亡或無效，清除標記。`, `👾`]);
    }

    // 搜尋新目標
    if (!state.targetEnemy) {
      const enemy = bot.nearestEntity((entity) => {
        const custom_name = entity.metadata?.[2] ?? null;
        return (
          custom_name == null &&
          !config.blackListEntities.includes(entity.name) &&
          entity.kind === "Hostile mobs" &&
          bot.entity.position.distanceTo(entity.position) <= config.guardRange
        );
      });

      if (enemy) {
        state.targetEnemy = enemy;
        bot.pathfinder.stop();
        state.chatQueue.push([
          `範圍 ${config.guardRange} 內發現 ${enemy.displayName}，準備攻擊！`,
          `🎯`,
        ]);
        if (bot.pvp.target !== state.targetEnemy) {
          bot.pvp.attack(state.targetEnemy);
        }
      } else {
        await this.updateFollow();
      }
    }
  }

  async updateFollow() {
    const { bot, config, state } = this;
    const guard = await bot.actions.findPlayerFuzzy(bot, config.targetName);

    if (!guard) {
      state.chatQueue.push([
        `Ooh, where's my lover? ${config.targetName}`,
        `❓`,
      ]);
      throw new Error("目標消失");
    }

    try {
      const entityGuard = guard.entity;
      const distance = bot.entity.position.distanceTo(entityGuard.position);
      const backMsgRange = config.guardRange - config.followRange;

      if (distance > backMsgRange) {
        state.chatQueue.push([`返回主人身邊`, `😎`]);
      }

      if (!bot.pathfinder.isMoving()) {
        const goal = new bot.goals.GoalFollow(entityGuard, config.followRange);
        await bot.pathfinder.setGoal(goal, true);
      }
    } catch (error) {
      console.logTimer(`[bodyGuardClass] updateFollow error: ${error.message}`);
      throw error;
    }
  }

  handleChatQueue() {
    const { bot, config, state } = this;
    state.loopCounter += config.interval;

    if (state.loopCounter >= config.chatCooldown) {
      state.loopCounter = 0;
      const messageData = state.chatQueue.shift();
      if (messageData) {
        const [message, icon] = messageData;
        bot.safeChat(message, icon);
      }
    }

    if (state.chatQueue.length > 1) {
      state.chatQueue = state.chatQueue.slice(-1);
    }
  }

  async loop() {
    try {
      if (await this.handleEatStatus()) return true;
      await this.handleAttackAndFollow();
      this.handleChatQueue();
      return true;
    } catch (error) {
      console.logTimer(`[bodyGuardClass] Error: ${error.message}`);
      throw error;
    }
  }

  stop() {
    const { bot } = this;
    this.state = {
      chatQueue: [],
      loopCounter: 0,
      targetEnemy: null,
      isEating: false,
    };
    bot.pvp.stop();
    bot.pathfinder.setGoal(null);
  }
}

// 創建工廠函數，與文件名相同
function bodyGuard(bot, options = {}) {
  return new BodyGuardClass(bot, options);
}

// 導出方式一：直接導出工廠函數
module.exports = { bodyGuard };
