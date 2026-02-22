// Task 基礎類
class Task {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
    this.isActive = false;
  }

  /**
   * 檢查任務是否應該執行
   * @param {Object} bot - mineflayer bot 實例
   * @returns {boolean}
   */
  shouldExecute(bot) {
    throw new Error("shouldExecute must be implemented");
  }

  /**
   * 執行任務
   * @param {Object} bot - mineflayer bot 實例
   */
  async execute(bot) {
    throw new Error("execute must be implemented");
  }

  /**
   * 停止任務
   * @param {Object} bot - mineflayer bot 實例
   */
  stop(bot) {
    this.isActive = false;
  }

  /**
   * 任務開始時調用
   * @param {Object} bot - mineflayer bot 實例
   */
  onStart(bot) {
    this.isActive = true;
    console.log(`Task ${this.name} started`);
  }

  /**
   * 任務結束時調用
   * @param {Object} bot - mineflayer bot 實例
   */
  onEnd(bot) {
    this.isActive = false;
    console.log(`Task ${this.name} ended`);
  }
}

// Goal 類 - 管理一組相關的任務
class Goal {
  constructor(name, priority = 0) {
    this.name = name;
    this.priority = priority;
    this.tasks = [];
    this.isActive = false;
    this.currentTaskIndex = 0;
  }

  /**
   * 添加子任務
   * @param {Task} task
   */
  addSubTask(task) {
    this.tasks.push(task);
    // 按優先級排序
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 檢查目標是否應該執行
   * @param {Object} bot - mineflayer bot 實例
   * @returns {boolean}
   */
  shouldExecute(bot) {
    return this.tasks.some((task) => task.shouldExecute(bot));
  }

  /**
   * 執行目標中的任務
   * @param {Object} bot - mineflayer bot 實例
   */
  async execute(bot) {
    if (!this.isActive) {
      this.isActive = true;
      console.log(`Goal ${this.name} started`);
    }

    // 找到第一個可以執行的任務
    for (let task of this.tasks) {
      if (task.shouldExecute(bot)) {
        if (!task.isActive) {
          task.onStart(bot);
        }
        await task.execute(bot);
        return;
      }
    }
  }

  /**
   * 停止目標
   * @param {Object} bot - mineflayer bot 實例
   */
  stop(bot) {
    this.isActive = false;
    this.tasks.forEach((task) => task.stop(bot));
    console.log(`Goal ${this.name} stopped`);
  }
}

// Brain 類 - 管理所有目標和任務
class Brain {
  constructor(bot) {
    this.bot = bot;
    this.goals = [];
    this.currentGoal = null;
    this.isRunning = false;
    this.updateInterval = null;
  }

  /**
   * 添加目標
   * @param {Goal} goal
   */
  addGoal(goal) {
    this.goals.push(goal);
    // 按優先級排序
    this.goals.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 開始 AI 系統
   * @param {number} updateRate - 更新頻率 (毫秒)
   */
  start(updateRate = 100) {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("Brain started");

    this.updateInterval = setInterval(() => {
      this.update();
    }, updateRate);
  }

  /**
   * 停止 AI 系統
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.currentGoal) {
      this.currentGoal.stop(this.bot);
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log("Brain stopped");
  }

  /**
   * 更新 AI 行為 - 每個遊戲循環調用
   */
  async update() {
    if (!this.isRunning) return;

    try {
      // 選擇最高優先級的可執行目標
      let selectedGoal = null;

      for (let goal of this.goals) {
        if (goal.shouldExecute(this.bot)) {
          selectedGoal = goal;
          break;
        }
      }

      // 如果當前目標改變了
      if (selectedGoal !== this.currentGoal) {
        if (this.currentGoal) {
          this.currentGoal.stop(this.bot);
        }
        this.currentGoal = selectedGoal;
      }

      // 執行當前目標
      if (this.currentGoal) {
        await this.currentGoal.execute(this.bot);
      }
    } catch (error) {
      console.error("Brain update error:", error);
    }
  }

  /**
   * 獲取當前狀態信息
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentGoal: this.currentGoal ? this.currentGoal.name : "None",
      totalGoals: this.goals.length,
    };
  }
}

// 導出類
module.exports = { Brain, Goal, Task };
