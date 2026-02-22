// tasks.js - 任務定義
const { Task } = require('./Brain');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// ===== 生存類任務 =====

/**
 * 尋找食物任務 - 當飢餓值低時自動尋找食物
 */
class FindFoodTask extends Task {
    constructor(hungerThreshold = 15) {
        super('FindFood', 9); // 高優先級
        this.hungerThreshold = hungerThreshold;
        this.targetFood = null;
        this.searchRadius = 32;
        this.foodTypes = ['wheat', 'carrot', 'potato', 'beetroot', 'apple', 'bread'];
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        return bot.food < this.hungerThreshold;
    }

    async execute(bot) {
        try {
            // 如果沒有目標食物，尋找一個
            if (!this.targetFood) {
                this.targetFood = bot.findBlock({
                    matching: this.foodTypes,
                    maxDistance: this.searchRadius
                });

                if (!this.targetFood) {
                    console.log('[FindFood] 附近沒有找到食物');
                    // 檢查背包中是否有食物
                    const foodInInventory = bot.inventory.items().find(item => 
                        this.foodTypes.some(food => item.name.includes(food))
                    );
                    
                    if (foodInInventory) {
                        console.log(`[FindFood] 在背包中找到食物: ${foodInInventory.name}`);
                        await bot.equip(foodInInventory, 'hand');
                        await bot.consume();
                        return;
                    }
                    
                    return;
                }
                
                console.log(`[FindFood] 找到食物: ${this.targetFood.name} 在 ${this.targetFood.position}`);
            }

            // 移動到食物位置
            await bot.pathfinder.goto(new goals.GoalBlock(
                this.targetFood.position.x,
                this.targetFood.position.y,
                this.targetFood.position.z
            ));

            // 挖掘食物
            await bot.dig(this.targetFood);
            console.log('[FindFood] 成功收集食物！');
            
            // 重置目標
            this.targetFood = null;

        } catch (error) {
            console.log('[FindFood] 執行錯誤:', error.message);
            this.targetFood = null;
        }
    }

    stop(bot) {
        super.stop(bot);
        this.targetFood = null;
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
    }
}

/**
 * 避免危險任務 - 遠離怪物和危險
 */
class AvoidDangerTask extends Task {
    constructor() {
        super('AvoidDanger', 10); // 最高優先級
        this.dangerDistance = 8;
        this.safeDistance = 16;
        this.dangerEntities = ['zombie', 'skeleton', 'spider', 'creeper', 'enderman'];
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        
        // 檢查附近是否有危險生物
        const dangerousEntity = Object.values(bot.entities).find(entity => {
            if (!entity.position || !entity.name) return false;
            
            const distance = bot.entity.position.distanceTo(entity.position);
            return distance < this.dangerDistance && 
                   this.dangerEntities.includes(entity.name.toLowerCase());
        });

        return !!dangerousEntity;
    }

    async execute(bot) {
        try {
            // 找到最近的危險生物
            const nearestDanger = Object.values(bot.entities)
                .filter(entity => {
                    if (!entity.position || !entity.name) return false;
                    const distance = bot.entity.position.distanceTo(entity.position);
                    return distance < this.dangerDistance && 
                           this.dangerEntities.includes(entity.name.toLowerCase());
                })
                .sort((a, b) => {
                    const distA = bot.entity.position.distanceTo(a.position);
                    const distB = bot.entity.position.distanceTo(b.position);
                    return distA - distB;
                })[0];

            if (nearestDanger) {
                console.log(`[AvoidDanger] 發現危險: ${nearestDanger.name}，正在逃跑`);
                
                // 計算逃跑方向
                const dx = bot.entity.position.x - nearestDanger.position.x;
                const dz = bot.entity.position.z - nearestDanger.position.z;
                const distance = Math.sqrt(dx * dx + dz * dz);
                
                // 正規化方向向量
                const normalizedDx = dx / distance;
                const normalizedDz = dz / distance;
                
                // 計算安全位置
                const safeX = bot.entity.position.x + normalizedDx * this.safeDistance;
                const safeZ = bot.entity.position.z + normalizedDz * this.safeDistance;
                const safeY = bot.entity.position.y;

                // 移動到安全位置
                await bot.pathfinder.goto(new goals.GoalXZ(safeX, safeZ));
                console.log('[AvoidDanger] 已移動到安全位置');
            }

        } catch (error) {
            console.log('[AvoidDanger] 執行錯誤:', error.message);
        }
    }
}

// ===== 社交類任務 =====

/**
 * 跟隨玩家任務
 */
class FollowPlayerTask extends Task {
    constructor(playerName, followDistance = 3, maxDistance = 16) {
        super('FollowPlayer', 6);
        this.playerName = playerName;
        this.followDistance = followDistance;
        this.maxDistance = maxDistance;
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        
        const player = bot.players[this.playerName];
        if (!player || !player.entity) return false;
        
        const distance = bot.entity.position.distanceTo(player.entity.position);
        return distance > this.followDistance && distance < this.maxDistance;
    }

    async execute(bot) {
        try {
            const player = bot.players[this.playerName];
            if (!player || !player.entity) return;

            console.log(`[FollowPlayer] 跟隨玩家: ${this.playerName}`);
            
            await bot.pathfinder.goto(new goals.GoalNear(
                player.entity.position.x,
                player.entity.position.y,
                player.entity.position.z,
                this.followDistance
            ));

        } catch (error) {
            console.log('[FollowPlayer] 執行錯誤:', error.message);
        }
    }

    // 更新要跟隨的玩家
    setTargetPlayer(playerName) {
        this.playerName = playerName;
        console.log(`[FollowPlayer] 目標玩家更新為: ${playerName}`);
    }
}

// ===== 工作類任務 =====

/**
 * 採集木材任務
 */
class CollectWoodTask extends Task {
    constructor(targetAmount = 16) {
        super('CollectWood', 4);
        this.targetAmount = targetAmount;
        this.targetTree = null;
        this.woodTypes = ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log'];
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        
        // 計算背包中的木材數量
        const woodCount = bot.inventory.items()
            .filter(item => this.woodTypes.some(wood => item.name.includes('_log')))
            .reduce((total, item) => total + item.count, 0);
            
        return woodCount < this.targetAmount;
    }

    async execute(bot) {
        try {
            if (!this.targetTree) {
                this.targetTree = bot.findBlock({
                    matching: (block) => this.woodTypes.includes(block.name),
                    maxDistance: 32
                });

                if (!this.targetTree) {
                    console.log('[CollectWood] 附近沒有找到樹木');
                    return;
                }
                
                console.log(`[CollectWood] 找到樹木: ${this.targetTree.name} 在 ${this.targetTree.position}`);
            }

            // 移動到樹木位置
            await bot.pathfinder.goto(new goals.GoalBlock(
                this.targetTree.position.x,
                this.targetTree.position.y,
                this.targetTree.position.z
            ));

            // 挖掘樹木
            await bot.dig(this.targetTree);
            console.log('[CollectWood] 成功收集木材！');
            
            this.targetTree = null;

        } catch (error) {
            console.log('[CollectWood] 執行錯誤:', error.message);
            this.targetTree = null;
        }
    }

    stop(bot) {
        super.stop(bot);
        this.targetTree = null;
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
    }
}

/**
 * 採集石頭任務
 */
class CollectStoneTask extends Task {
    constructor(targetAmount = 32) {
        super('CollectStone', 3);
        this.targetAmount = targetAmount;
        this.targetStone = null;
        this.stoneTypes = ['stone', 'cobblestone', 'granite', 'diorite', 'andesite'];
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        
        const stoneCount = bot.inventory.items()
            .filter(item => this.stoneTypes.some(stone => item.name.includes(stone)))
            .reduce((total, item) => total + item.count, 0);
            
        return stoneCount < this.targetAmount;
    }

    async execute(bot) {
        try {
            if (!this.targetStone) {
                this.targetStone = bot.findBlock({
                    matching: this.stoneTypes,
                    maxDistance: 32
                });

                if (!this.targetStone) {
                    console.log('[CollectStone] 附近沒有找到石頭');
                    return;
                }
                
                console.log(`[CollectStone] 找到石頭: ${this.targetStone.name} 在 ${this.targetStone.position}`);
            }

            await bot.pathfinder.goto(new goals.GoalBlock(
                this.targetStone.position.x,
                this.targetStone.position.y,
                this.targetStone.position.z
            ));

            await bot.dig(this.targetStone);
            console.log('[CollectStone] 成功收集石頭！');
            
            this.targetStone = null;

        } catch (error) {
            console.log('[CollectStone] 執行錯誤:', error.message);
            this.targetStone = null;
        }
    }

    stop(bot) {
        super.stop(bot);
        this.targetStone = null;
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
    }
}

// ===== 基礎行為任務 =====

/**
 * 閒置任務 - 當沒有其他任務時執行
 */
class IdleTask extends Task {
    constructor() {
        super('Idle', 1); // 最低優先級
        this.lastActionTime = Date.now();
        this.actionInterval = 5000; // 5秒執行一次動作
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        return true; // 總是可以執行（但優先級最低）
    }

    async execute(bot) {
        const now = Date.now();
        
        // 避免過於頻繁的動作
        if (now - this.lastActionTime < this.actionInterval) {
            return;
        }
        
        this.lastActionTime = now;
        
        // 隨機動作
        const actions = [
            () => this.randomLook(bot),
            () => this.randomJump(bot),
            () => this.checkInventory(bot)
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        await action();
    }

    async randomLook(bot) {
        const yaw = Math.random() * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * 0.5;
        await bot.look(yaw, pitch);
        console.log('[Idle] 隨機觀察周圍');
    }

    async randomJump(bot) {
        if (Math.random() < 0.3) { // 30% 機率跳躍
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 100);
            console.log('[Idle] 隨機跳躍');
        }
    }

    async checkInventory(bot) {
        const itemCount = bot.inventory.items().length;
        console.log(`[Idle] 背包檢查 - 物品數量: ${itemCount}`);
    }
}

/**
 * 巡邏任務 - 在指定區域巡邏
 */
class PatrolTask extends Task {
    constructor(patrolPoints, radius = 5) {
        super('Patrol', 2);
        this.patrolPoints = patrolPoints || [];
        this.currentPointIndex = 0;
        this.radius = radius;
        this.isPatrolling = false;
    }

    shouldExecute(bot) {
        if (this.isPaused) return false;
        return this.patrolPoints.length > 0;
    }

    async execute(bot) {
        if (this.patrolPoints.length === 0) return;
        
        try {
            const targetPoint = this.patrolPoints[this.currentPointIndex];
            
            if (!this.isPatrolling) {
                console.log(`[Patrol] 前往巡邏點 ${this.currentPointIndex + 1}: (${targetPoint.x}, ${targetPoint.y}, ${targetPoint.z})`);
                this.isPatrolling = true;
            }

            // 檢查是否到達目標點
            const distance = bot.entity.position.distanceTo(targetPoint);
            
            if (distance < this.radius) {
                // 到達目標點，切換到下一個點
                this.currentPointIndex = (this.currentPointIndex + 1) % this.patrolPoints.length;
                this.isPatrolling = false;
                console.log(`[Patrol] 到達巡邏點，切換到下一個點`);
                
                // 短暫停留
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                // 移動到目標點
                await bot.pathfinder.goto(new goals.GoalNear(
                    targetPoint.x,
                    targetPoint.y,
                    targetPoint.z,
                    this.radius
                ));
            }

        } catch (error) {
            console.log('[Patrol] 執行錯誤:', error.message);
            this.isPatrolling = false;
        }
    }

    // 添加巡邏點
    addPatrolPoint(x, y, z) {
        this.patrolPoints.push({ x, y, z });
        console.log(`[Patrol] 添加巡邏點: (${x}, ${y}, ${z})`);
    }

    // 清除所有巡邏點
    clearPatrolPoints() {
        this.patrolPoints = [];
        this.currentPointIndex = 0;
        this.isPatrolling = false;
        console.log('[Patrol] 清除所有巡邏點');
    }

    stop(bot) {
        super.stop(bot);
        this.isPatrolling = false;
        if (bot.pathfinder) {
            bot.pathfinder.stop();
        }
    }
}

// 導出所有任務類別
module.exports = {
    // 生存類
    FindFoodTask,
    AvoidDangerTask,
    
    // 社交類
    FollowPlayerTask,
    
    // 工作類
    CollectWoodTask,
    CollectStoneTask,
    
    // 基礎行為類
    IdleTask,
    PatrolTask
};