// Brain.js - 任務管理器
class Brain {
    constructor(bot) {
        this.bot = bot;
        this.tasks = [];           // 存放所有任務
        this.currentTask = null;   // 當前執行的任務
        this.isRunning = false;    // AI系統是否運行中
        this.updateInterval = null; // 更新計時器
        this.debugMode = false;    // 除錯模式
    }

    /**
     * 添加任務到 Brain
     * @param {Task} task - 任務實例
     */
    addTask(task) {
        this.tasks.push(task);
        // 按優先級排序（高優先級在前）
        this.tasks.sort((a, b) => b.priority - a.priority);
        
        if (this.debugMode) {
            console.log(`[Brain] 添加任務: ${task.name} (優先級: ${task.priority})`);
        }
    }

    /**
     * 移除任務
     * @param {string} taskName - 任務名稱
     */
    removeTask(taskName) {
        const index = this.tasks.findIndex(task => task.name === taskName);
        if (index !== -1) {
            const removedTask = this.tasks.splice(index, 1)[0];
            
            // 如果移除的是當前任務，停止執行
            if (this.currentTask === removedTask) {
                removedTask.stop(this.bot);
                this.currentTask = null;
            }
            
            if (this.debugMode) {
                console.log(`[Brain] 移除任務: ${taskName}`);
            }
            return true;
        }
        return false;
    }

    /**
     * 開始 AI 系統
     * @param {number} updateRate - 更新頻率（毫秒）
     */
    start(updateRate = 200) {
        if (this.isRunning) {
            console.log('[Brain] AI 系統已經在運行中');
            return;
        }
        
        this.isRunning = true;
        console.log('[Brain] AI 系統啟動');
        
        this.updateInterval = setInterval(() => {
            this.update();
        }, updateRate);
    }

    /**
     * 停止 AI 系統
     */
    stop() {
        if (!this.isRunning) {
            console.log('[Brain] AI 系統已經停止');
            return;
        }
        
        this.isRunning = false;
        
        // 停止當前任務
        if (this.currentTask) {
            this.currentTask.stop(this.bot);
            this.currentTask = null;
        }
        
        // 清除計時器
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('[Brain] AI 系統停止');
    }

    /**
     * 核心更新邏輯 - 每個週期調用
     */
    async update() {
        if (!this.isRunning) return;

        try {
            // 找到最高優先級且可執行的任務
            let selectedTask = null;
            
            for (let task of this.tasks) {
                if (task.shouldExecute(this.bot)) {
                    selectedTask = task;
                    break; // 因為已按優先級排序，找到第一個就是最優的
                }
            }

            // 任務切換邏輯
            if (selectedTask !== this.currentTask) {
                // 停止舊任務
                if (this.currentTask) {
                    this.currentTask.stop(this.bot);
                    if (this.debugMode) {
                        console.log(`[Brain] 停止任務: ${this.currentTask.name}`);
                    }
                }
                
                // 開始新任務
                this.currentTask = selectedTask;
                if (this.currentTask) {
                    this.currentTask.onStart(this.bot);
                    if (this.debugMode) {
                        console.log(`[Brain] 開始任務: ${this.currentTask.name}`);
                    }
                }
            }

            // 執行當前任務
            if (this.currentTask) {
                await this.currentTask.execute(this.bot);
            }

        } catch (error) {
            console.error('[Brain] 更新錯誤:', error);
            
            // 發生錯誤時停止當前任務
            if (this.currentTask) {
                this.currentTask.stop(this.bot);
                this.currentTask = null;
            }
        }
    }

    /**
     * 暫停指定任務
     * @param {string} taskName - 任務名稱
     */
    pauseTask(taskName) {
        const task = this.tasks.find(t => t.name === taskName);
        if (task) {
            task.isPaused = true;
            if (this.currentTask === task) {
                task.stop(this.bot);
                this.currentTask = null;
            }
            console.log(`[Brain] 暫停任務: ${taskName}`);
        }
    }

    /**
     * 恢復指定任務
     * @param {string} taskName - 任務名稱
     */
    resumeTask(taskName) {
        const task = this.tasks.find(t => t.name === taskName);
        if (task) {
            task.isPaused = false;
            console.log(`[Brain] 恢復任務: ${taskName}`);
        }
    }

    /**
     * 設置除錯模式
     * @param {boolean} enabled - 是否啟用
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        console.log(`[Brain] 除錯模式: ${enabled ? '啟用' : '關閉'}`);
    }

    /**
     * 獲取當前狀態
     * @returns {Object} 狀態資訊
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            currentTask: this.currentTask ? this.currentTask.name : 'None',
            totalTasks: this.tasks.length,
            activeTasks: this.tasks.filter(task => !task.isPaused).length,
            debugMode: this.debugMode
        };
    }

    /**
     * 獲取所有任務列表
     * @returns {Array} 任務資訊列表
     */
    getTaskList() {
        return this.tasks.map(task => ({
            name: task.name,
            priority: task.priority,
            isActive: task.isActive,
            isPaused: task.isPaused || false,
            canExecute: task.shouldExecute(this.bot)
        }));
    }

    /**
     * 強制執行指定任務（用於測試）
     * @param {string} taskName - 任務名稱
     */
    async forceExecuteTask(taskName) {
        const task = this.tasks.find(t => t.name === taskName);
        if (task) {
            console.log(`[Brain] 強制執行任務: ${taskName}`);
            
            // 停止當前任務
            if (this.currentTask && this.currentTask !== task) {
                this.currentTask.stop(this.bot);
            }
            
            // 執行指定任務
            if (!task.isActive) {
                task.onStart(this.bot);
            }
            this.currentTask = task;
            await task.execute(this.bot);
        } else {
            console.log(`[Brain] 找不到任務: ${taskName}`);
        }
    }

    /**
     * 清除所有任務
     */
    clearAllTasks() {
        // 停止當前任務
        if (this.currentTask) {
            this.currentTask.stop(this.bot);
            this.currentTask = null;
        }
        
        // 停止所有任務
        this.tasks.forEach(task => {
            if (task.isActive) {
                task.stop(this.bot);
            }
        });
        
        // 清空任務列表
        this.tasks = [];
        console.log('[Brain] 清除所有任務');
    }

    /**
     * 銷毀 Brain（清理資源）
     */
    destroy() {
        this.stop();
        this.clearAllTasks();
        console.log('[Brain] Brain 已銷毀');
    }
}

// 基礎任務類別
class Task {
    constructor(name, priority = 0) {
        this.name = name;
        this.priority = priority;
        this.isActive = false;
        this.isPaused = false;
        this.createdTime = new Date();
    }

    /**
     * 檢查任務是否應該執行
     * @param {Object} bot - mineflayer bot 實例
     * @returns {boolean}
     */
    shouldExecute(bot) {
        if (this.isPaused) return false;
        // 子類別必須重寫此方法
        throw new Error(`shouldExecute must be implemented in ${this.name}`);
    }

    /**
     * 執行任務
     * @param {Object} bot - mineflayer bot 實例
     */
    async execute(bot) {
        // 子類別必須重寫此方法
        throw new Error(`execute must be implemented in ${this.name}`);
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
    }

    /**
     * 任務結束時調用
     * @param {Object} bot - mineflayer bot 實例
     */
    onEnd(bot) {
        this.isActive = false;
    }

    /**
     * 獲取任務資訊
     * @returns {string}
     */
    getInfo() {
        return `任務: ${this.name}, 優先級: ${this.priority}, 狀態: ${this.isActive ? '執行中' : '停止'}`;
    }
}

module.exports = { Brain, Task };