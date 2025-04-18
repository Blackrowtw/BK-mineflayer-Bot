module.exports = [
  {
    name: "wheat",
    aliases: ["wheat"],
    interval: 1000,
    paramRules: [
      {
        name: ["loopPrompt"],
        desc: ["循環啟動詞"],
        type: ["string"],
        required: [true],
        helpMsg: "<loopPrompt>: 循環啟動 / 關閉 - start/stop",
      },
    ],
    onStart: async (bot, cmd, options) => {
      cmd.isRunning = false;
      cmd.chestLocations = chestToStorage("chest");
      function chestToStorage(blockName, maxDis = 16) {
        const blocksPos = bot.findBlocks({
          matching: bot.registry.blocksByName[blockName].id,
          maxDistance: maxDis,
          count: 64, // Get as many chests as we can
        });
        if (blocksPos !== 0) {
          bot.collectBlock.chestLocations = blocksPos;
          console.log({ blocksPos });
          return blocksPos;
        } else {
          bot.safeChat(`附近 ${maxDis} 格沒有找到箱子，背包滿了將暫停收穫`);
          return [];
        }
      }
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;

      const utils = await bot.actions.utils(bot);
      const eatFoods = async () => await bot.actions.eatFoods(bot);
      let toCollect = null;
      let toSowFarmlands = [];
      let toCollectItems = [];
      let seedsName = null;

      loop();
      async function loop() {
        if (cmd.isRunning) return;
        try {
          if (bot.health < 14 || bot.food < 14) {
            cmd.isRunning = true;
            await eatFoods();
            await bot.waitForTicks(60);
          } else {
            await bot.autoEat.disableAuto();
            cmd.isRunning = false;
          }

          toCollect = blockToCollect("wheat");
          if (toCollect !== null) {
            cmd.isRunning = true;
            const block = toCollect;
            const pos = block.position;
            const { GoalNear } = bot.goals;
            const goal = new GoalNear(pos.x, pos.y, pos.z, 0);
            await bot.pathfinder.setGoal(goal);
            await bot.waitForTicks(8);
            const breakNearBlocks = blocksToBreak("wheat");
            if (breakNearBlocks.length > 0) {
              for (const block of breakNearBlocks) {
                await bot.dig(block, "ignore");
                await bot.waitForTicks(1);
              }
            }
            cmd.isRunning = false;
          } else cmd.isRunning = false; // 如果沒有可收穫的作物，則返回

          toSowFarmlands = blocksToSow("farmland");
          seedsName = getSeedNameFromBlock(toCollect); // 從第一個破壞的方塊上取得種子名字
          if (toSowFarmlands.length > 0) {
            cmd.isRunning = true;
            const hasSeed = await tryEquipSeedByName(seedsName);
            if (hasSeed) {
              for (const farmland of toSowFarmlands) {
                const offsetTop = { x: 0, y: 1, z: 0 };
                await bot.placeBlock(farmland, offsetTop);
                await bot.waitForTicks(1);
              }
              cmd.isRunning = false;
            } else cmd.isRunning = false; // 如果沒有種子可用，則返回
          } else cmd.isRunning = false; // 如果沒有可種植的耕地，則返回

          toCollectItems = utils.filterNearEntities("item", 16, 3);
          if (toCollectItems.length > 0) {
            cmd.isRunning = true;
            for (const item of toCollectItems) {
              const pos = item.position;
              const { GoalNear } = bot.goals;
              const goal = new GoalNear(pos.x, pos.y, pos.z, 0);
              await bot.pathfinder.setGoal(goal);
              await bot.waitForTicks(8);
            }
            cmd.isRunning = false;
          } else cmd.isRunning = false; // 如果沒有可收集的物品，則返回
          toCollect = null;
          toSowFarmlands = [];
          toCollectItems = [];
        } catch (e) {
          cmd.isRunning = false;
          cmd.chestLocations = [];
          console.log(`[wheat] 發生錯誤: ${e.message}`);
          // await bot.loopableCommandManager.stop(bot, cmd.name); // 停止命令
          return; // 如果發生錯誤，則返回
        }
      }

      // 取得單個 作物方塊 wheat
      function blockToCollect(blockName) {
        return bot.findBlock({
          point: bot.entity.position,
          maxDistance: 16,
          matching: (block) => {
            return (
              block &&
              block.type === bot.registry.blocksByName[blockName].id &&
              block.metadata === 7
            );
          },
        });
      }

      // 取得周圍多個 作物方塊 wheat
      function blocksToBreak(blockName) {
        const blocksPos = bot.findBlocks({
          point: bot.entity.position,
          maxDistance: 2.5, // 設定範圍
          count: 16, // 設定最大數量，避免過多
          matching: (block) => {
            return (
              block &&
              block.type === bot.registry.blocksByName[blockName].id &&
              block.metadata === 7
            );
          },
        });

        // 將座標轉換為方塊實例，並過濾符合條件的方塊
        const blocks = blocksPos.map((pos) => bot.blockAt(pos));
        return blocks;
      }

      // 取得可以種植的單個 耕地方塊 farmland
      function blockToSow(blockName) {
        return bot.findBlock({
          point: bot.entity.position,
          matching: bot.registry.blocksByName[blockName].id,
          maxDistance: 2.5, // 設定範圍
          useExtraInfo: (block) => {
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return !blockAbove || blockAbove.type === 0;
          },
        });
      }

      // 取得可以種植的多個 耕地方塊 farmland
      function blocksToSow(blockName) {
        const blocks = bot.findBlocks({
          point: bot.entity.position,
          matching: bot.registry.blocksByName[blockName].id,
          maxDistance: 2.5, // 設定範圍
          count: 16, // 設定最大數量，避免過多
        });

        // 將座標轉換為方塊實例，並過濾符合條件的方塊
        const farmlandBlocks = blocks
          .map((pos) => bot.blockAt(pos)) // 將座標轉換為方塊實例
          .filter((block) => {
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return !blockAbove || blockAbove.type === 0; // 上方沒有方塊或為空氣
          });

        return farmlandBlocks;
      }

      // 從方塊實例中 比對 map 資訊，取得需要種植得種子名稱
      function getSeedNameFromBlock(block) {
        if (!block) return null; // 如果方塊不存在，回傳 null
        const cropToSeedMap = new Map([
          ["wheat", "wheat_seeds"], // 小麥方塊對應小麥種子
          ["carrots", "carrot"], // 胡蘿蔔方塊對應胡蘿蔔
          ["potatoes", "potato"], // 馬鈴薯方塊對應馬鈴薯
          // 添加其他作物與種子的映射
        ]);
        // 從方塊實例中取得方塊名稱
        // const blockName = bot.registry.blocksById[block.type].name;
        const blockName = block.name;

        return cropToSeedMap.get(blockName) || null;
      }

      // 輸入種子名稱 找到背包中的物品裝備到手上 並返回值表示成功與否
      async function tryEquipSeedByName(seedName) {
        try {
          // 取得背包中的所有物品
          const items = bot.inventory.items();
          // 查找符合種子名稱的第一個物品實例
          const seedItem = items.find((item) => item.name === seedName);
          // 如果找不到物品，返回 false
          if (!seedItem) {
            console.log(`[equipSeedByName] 未找到名稱為 ${seedName} 的物品`);
            return false;
          }
          // 裝備物品到手上
          await bot.equip(bot.registry.itemsByName[seedName].id, "hand");
          return true;
        } catch (e) {
          console.log(
            `[equipSeedByName] 裝備 ${seedName} 時發生錯誤: ${e.message}`
          );
          return false;
        }
      }
    },
    onStop: async (bot, cmd, options) => {
      cmd.isRunning = false;
      cmd.chestLocations = [];
      await bot.pathfinder.setGoal(null);
    },
    group: `dev`,
    description: `讓 bot 搜尋附近的 wheat 作物，並自動收穫、種植、撿起掉落物品`,
  },
];
