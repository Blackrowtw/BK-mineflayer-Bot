class Task {
  constructor(name, priority, condition, action) {
    this.name = name;
    this.priority = priority;
    this.condition = condition;
    this.action = action;
    this.isRunning = false;
  }

  async execute(bot, cmd) {
    if (!(await this.condition(bot, cmd))) return false;
    this.isRunning = true;
    console.log(`開始執行任務: ${this.name}`); // 添加日誌
    try {
      await this.action(bot, cmd);
      console.log(`完成任務: ${this.name}`); // 添加日誌
    } catch (error) {
      console.log(`任務執行失敗 ${this.name}:`, error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
    return true;
  }
}

class TaskManager {
  constructor() {
    this.tasks = [];
  }

  addTask(task) {
    this.tasks.push(task);
    this.tasks.sort((a, b) => b.priority - a.priority);
  }

  async runTasks(bot, cmd) {
    for (const task of this.tasks) {
      if (await task.execute(bot, cmd)) {
        return true;
      }
    }
    return false;
  }
}

module.exports = { Task, TaskManager };

// // 任務1: 檢查健康狀態
// taskManager.addTask(
//   new Task(
//     "checkHealth",
//     4, // 最高優先級
//     async (bot, cmd) => bot.health < 14 || bot.food < 14,
//     async (bot, cmd) => {
//       await bot.autoEat.enableAuto();
//       await bot.waitForTicks(60);
//       await bot.autoEat.disableAuto();
//     }
//   )
// );

// // 任務2: 收集成熟作物
// taskManager.addTask(
//   new Task(
//     "collectCrop",
//     3,
//     async (bot, cmd) => {
//       const block = blockToCollect("wheat");
//       if (block) {
//         cmd.toCollect = block;
//         console.log("找到可收割的作物:", block.position); // 添加日誌
//         return true;
//       }
//       return false;
//     },
//     async (bot, cmd) => {
//       const block = cmd.toCollect;
//       await bot.tool.equipForBlock(block, {
//         requireHarvest: true,
//         getFromChest: true,
//         maxTools: 3,
//       });
//       await bot.collectBlock.collect(block);
//     }
//   )
// );

// // 任務3: 收割附近作物
// taskManager.addTask(
//   new Task(
//     "harvestNearby",
//     2,
//     async (bot, cmd) => {
//       const blocks = blocksToBreak("wheat");
//       return blocks.length > 0;
//     },
//     async (bot, cmd) => {
//       const blocks = blocksToBreak("wheat");
//       for (const block of blocks) {
//         await bot.dig(block);
//         await bot.waitForTicks(1);
//       }
//     }
//   )
// );

// // 任務4: 種植作物
// taskManager.addTask(
//   new Task(
//     "plantSeeds",
//     1,
//     async (bot, cmd) => {
//       cmd.toSowFarmlands = blocksToSow("farmland");
//       cmd.seedsName = getSeedNameFromBlock(cmd.toCollect);
//       return cmd.toSowFarmlands.length > 0;
//     },
//     async (bot, cmd) => {
//       const hasSeed = await tryEquipSeedByName(cmd.seedsName);
//       if (hasSeed) {
//         for (const farmland of cmd.toSowFarmlands) {
//           const offsetTop = { x: 0, y: 1, z: 0 };
//           await bot.placeBlock(farmland, offsetTop);
//           await bot.waitForTicks(1);
//         }
//       }
//     }
//   )
// );

// // 主循環
// async function loop() {
//   // 添加無限循環
//   try {
//     const hasTask = await taskManager.runTasks(bot, cmd);
//     if (!hasTask) {
//       await bot.waitForTicks(20);
//     }
//     // 添加循環間隔
//     await bot.waitForTicks(5);
//   } catch (e) {
//     console.log("任務執行錯誤:", e.message);
//     await bot.waitForTicks(20); // 錯誤時等待一段時間
//     // continue 而不是 return，保持循環運行
//   }
// }

// // 開始循環
// loop();
