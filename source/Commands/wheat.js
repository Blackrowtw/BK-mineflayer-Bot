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
    preCheck: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return false;

      const range = 24;
      const utils = await bot.actions.utils(bot);
      const botBedPos = bot.Bot_Config.homeSetting.bedPos;
      cmd.isRunning = false;
      cmd.chestLocations = await chestToStorage(range);
      cmd.bed = await utils.findBlockByName("bed", { r: range });
      const bedPos = cmd.bed && cmd.bed.position ? cmd.bed.position : null;
      if (bedPos) {
        botBedPos.x = bedPos.x;
        botBedPos.y = bedPos.y;
        botBedPos.z = bedPos.z;
        bot.safeChat(
          `將床定位在 (${bedPos.x}, ${bedPos.y}, ${bedPos.z})`,
          `🛌`
        );
      } else {
        bot.safeChat(`附近 ${range} 格沒有找到床` + `🛌`);
      }
      if (cmd.chestLocations !== 0) {
        bot.safeChat(`已登記附近 ${cmd.chestLocations.length} 個容器`);
      } else {
        bot.safeChat(`附近 ${range} 格沒有找到容器，背包滿了將停止收穫`);
      }

      async function chestToStorage(range = 16) {
        const containers = await utils.findBlocksByNameArray(
          ["chest", "barrel", "shulker_box"],
          { r: range, c: 128 }
        );
        return containers;
      }
      return true;
    },
    execute: async (bot, cmd, options) => {
      const utils = await bot.actions.utils(bot);
      let toCollect = null;
      let toSow = null;
      let toSowBlocks = [];
      let toPickUp = [];
      let toLook = null;

      loop();
      async function loop() {
        if (cmd.isRunning) return;

        try {
          // 第一優先級：檢查並立即中斷循環的步驟
          const priorityOneChecks = [
            {
              condition: () => {
                const currentTime = bot.time.timeOfDay;
                return currentTime > 13000 && currentTime < 23950 && cmd.bed;
              },
              action: async () => {
                await stepTimeToSleep();
                console.log(`[wheat] Step: sleep`);
                return true; // 返回 true 表示需要中斷循環
              },
            },
            {
              condition: () => bot.inventory.emptySlotCount() === 0,
              action: async () => {
                await stepInvCheck();
                console.log(`[wheat] Step: inv`);
                return true;
              },
            },
            {
              condition: () => bot.health <= 14 || bot.food <= 14,
              action: async () => {
                await stepHealthCheck();
                console.log(`[wheat] Step: health`);
                return true;
              },
            },
          ];

          // 執行第一優先級檢查
          for (const check of priorityOneChecks) {
            if (check.condition()) {
              const shouldBreak = await check.action();
              if (shouldBreak) return;
            }
          }

          // 第二優先級：允許連續執行的步驟
          const priorityTwoChecks = [
            {
              condition: async () => {
                toCollect = await utils.findBlockByName("wheat", {
                  r: 16,
                  m: 7,
                });
                return toCollect !== null;
              },
              action: async () => await stepCollect("wheat"),
            },
            {
              condition: async () => {
                toSowBlocks = await blocksToSow("farmland");
                return toSowBlocks.length > 0;
              },
              action: async () => await stepToSow("wheat"),
            },
            {
              condition: async () => {
                toPickUp = await utils.filterNearEntities("item", 16, 3);
                return toPickUp.length > 0;
              },
              action: async () => await stepPickUpItem(),
            },
          ];

          // 執行第二優先級檢查
          let hasExecutedAny = false;
          for (const check of priorityTwoChecks) {
            if (await check.condition()) {
              await check.action();
              hasExecutedAny = true;
            }
          }

          // 第三優先級：預設行為
          if (!hasExecutedAny) {
            toSow = await utils.findBlockWithRule("farmland", "air", "top");
            console.log({ toSow });
            if (toSow) {
              await stepToSowSingleBlock("wheat");
            } else {
              const names = ["wheat"];
              toLook = await getLookPos(names);

              if (toLook?.length > 0) {
                await stepToLookAtCrop(toLook);
              }
            }
          }
        } catch (error) {
          console.log(`[wheat] 循環執行錯誤: ${error.message}`);
        } finally {
          resetLoopParm();
        }
      }

      async function stepTimeToSleep() {
        if (cmd.isRunning) return;
        cmd.isRunning = true;

        try {
          // 檢查床的存在和位置
          if (cmd.bed == null || cmd.bed?.position == null) {
            await findAndBindBed();
            if (cmd.bed == null) {
              console.log(`[wheat] 找不到床，無法睡覺`);
              return;
            }
          }

          const bedPos = cmd.bed.position;
          // 移動到床的位置
          const gotoPos = await utils.gotoNear(bedPos, 2);
          if (!gotoPos) {
            console.log(`[wheat] 無法到達床的位置`);
            cmd.isRunning = false;
            return;
          }
          await bot.waitForTicks(20);
          // 檢查目標方塊是否為床
          const bedBlock = bot.blockAt(bedPos);
          if (!bedBlock || !bedBlock.name.includes("bed")) {
            console.log(`[wheat] 原目標位置不是床，重新尋找床`);
            await findAndBindBed();
            if (cmd.bed == null) return;
            // 重新嘗試睡覺
            return await stepTimeToSleep();
          }

          // 嘗試使用床
          try {
            await bot.activateBlock(cmd.bed);
            await bot.waitForTicks(200); // 使用後冷卻10秒
          } catch (error) {
            console.log(`[wheat] 睡覺時發生錯誤: ${error.message}`);
          }
        } catch (error) {
          console.log(`[wheat] stepTimeToSleep 發生錯誤: ${error.message}`);
        } finally {
          cmd.isRunning = false;
        }
      }

      async function stepInvCheck() {
        if (cmd.isRunning) return;
        cmd.isRunning = true;
        try {
          if (cmd.chestLocations.length === 0) {
            bot.safeChat("背包已滿，且無可用容器，停止種植命令");
            await bot.loopableCommandManager.stop(bot, cmd.name);
            return;
          }

          const itemsToStore = [
            { name: "wheat", keep: 0 },
            { name: "wheat_seeds", keep: 64 },
            // 可以添加其他需要存放的物品
          ];

          // 遍歷每一個箱子座標
          for (let i = 0; i < cmd.chestLocations.length; i++) {
            const chestPos = cmd.chestLocations[i];
            console.log(`[wheat] 嘗試使用第 ${i + 1} 個容器`);

            try {
              // 移動到容器位置
              const gotoChest = await utils.gotoNear(chestPos);
              if (!gotoChest) {
                console.log(`[wheat] 無法移動到第 ${i + 1} 容器`);
                continue;
              }
              await bot.waitForTicks(60);
              // 開啟容器
              const chestBlock = bot.blockAt(chestPos);
              if (!chestBlock) {
                console.log(`[wheat] 第 ${i + 1} 容器找不到`);
                continue;
              }
              const gui = await bot.openContainer(chestBlock);
              await bot.waitForTicks(20);
              let containerChanged = false;

              // 嘗試存放每種物品
              for (const i of itemsToStore) {
                const stored = await utils.moveItemsByGUI(gui, i.name, i.keep);
                await bot.waitForTicks(20);
                if (stored) containerChanged = true;
              }
              await bot.waitForTicks(20);
              await gui.close();

              // 如果這個容器有成功存放物品，且背包有空間了，就結束循環
              if (
                containerChanged &&
                (await bot.inventory.emptySlotCount()) > 0
              ) {
                console.log(
                  `[wheat] 在第 ${i + 1} 個容器成功存放物品，背包已有空間`
                );
                return;
              }
            } catch (error) {
              if (error.message.includes("destination full")) {
                console.log(`[wheat] 第 ${i + 1} 個容器已滿`);
              } else {
                console.log(
                  `[wheat] 使用第 ${i + 1} 個容器時發生錯誤: ${error.message}`
                );
              }
            }
            await bot.waitForTicks(20);
          }
          // 如果所有容器都檢查完還是沒有空間
          if ((await bot.inventory.emptySlotCount()) === 0) {
            bot.safeChat(`背包已滿，且所有容器都已檢查完畢，停止種植模式`);
            console.log(`[wheat] 所有容器都已檢查完畢，但背包仍然已滿`);
            resetLoopParm();
            await bot.loopableCommandManager.stop(bot, cmd.name);
          }
        } catch (error) {
          console.log(`[wheat] stepInvCheck 發生錯誤: ${error.message}`);
        } finally {
          cmd.isRunning = false;
        }
      }

      async function stepHealthCheck() {
        if (cmd.isRunning) return;
        cmd.isRunning = true;
        await bot.actions.eatFoods(bot);
        await bot.waitForTicks(8);
        cmd.isRunning = false;
      }

      async function stepCollect(blockName) {
        if (cmd.isRunning) return;
        if (toCollect !== null) {
          cmd.isRunning = true;
          const block = toCollect;
          const pos = block.position;
          const { GoalNear } = bot.goals;
          const goal = new GoalNear(pos.x, pos.y, pos.z, 0);
          await bot.pathfinder.setGoal(null);
          await bot.lookAt(pos);
          await bot.waitForTicks(8);
          await bot.pathfinder.setGoal(goal);
          await bot.waitForTicks(8);
          const breakNearBlocks = blocksToBreak(blockName);
          if (breakNearBlocks.length > 0) {
            for (const block of breakNearBlocks) {
              await bot.dig(block, "ignore");
              await bot.waitForTicks(1);
            }
          }
        }
        cmd.isRunning = false;
      }

      async function stepToSow(cropName) {
        if (cmd.isRunning) return;
        if (toSowBlocks.length > 0) {
          cmd.isRunning = true;
          const seedsName = getSeedNameFromBlock(cropName);
          const hasSeed = await utils.equipItemByName(seedsName);
          if (hasSeed) {
            for (const farmland of toSowBlocks) {
              const offsetTop = { x: 0, y: 1, z: 0 };
              await bot.placeBlock(farmland, offsetTop);
              await bot.waitForTicks(1);
            }
          } else cmd.isRunning = false; // 如果沒有種子可用，則返回
        } else cmd.isRunning = false; // 如果沒有可種植的耕地，則返回
        cmd.isRunning = false;
      }

      async function stepPickUpItem() {
        if (cmd.isRunning) return;
        let attempts = 0;
        const MAX_ATTEMPTS = 16;

        try {
          cmd.isRunning = true;
          while (attempts < MAX_ATTEMPTS) {
            // 檢查背包空間
            if ((await bot.inventory.emptySlotCount()) === 0) {
              console.log(`[wheat] 背包已滿，停止撿取物品`);
              break;
            }

            toPickUp = utils.filterNearEntities("item", 16, 3);
            if (toPickUp.length === 0) break;

            const item = toPickUp[0];
            const pos = item.position.offset(0, 0.5, 0).floor();
            const { GoalNear } = bot.goals;
            const goal = new GoalNear(pos.x, pos.y, pos.z, 0);

            try {
              await bot.pathfinder.setGoal(null);
              await bot.lookAt(pos);
              await bot.waitForTicks(8);
              await bot.pathfinder.setGoal(goal);
              await bot.waitForTicks(8);
            } catch (error) {
              attempts++;
              console.log(
                `[wheat] 第 ${attempts}/${MAX_ATTEMPTS} 次嘗試撿取掉落物失敗`
              );
              if (attempts >= MAX_ATTEMPTS) {
                break;
              }
              continue;
            }

            attempts++;
            await bot.waitForTicks(4);
          }
        } catch (error) {
          console.log(`[wheat] 撿取掉落物時發生錯誤: ${error.message}`);
        } finally {
          if (attempts > 0) {
            console.log(`[wheat] 結束撿取掉落物，共嘗試 ${attempts} 次`);
          }
          cmd.isRunning = false;
        }
      }

      async function stepToSowSingleBlock(cropName) {
        if (cmd.isRunning) return;
        if (toSow) {
          cmd.isRunning = true;
          const gotoSow = await utils.gotoNear(toSow.position);
          if (!gotoSow) {
            cmd.isRunning = false;
            return;
          }
          const seedsName = getSeedNameFromBlock(cropName);
          const hasSeed = await utils.equipItemByName(seedsName);
          if (hasSeed) {
            const offsetTop = { x: 0, y: 1, z: 0 };
            await bot.placeBlock(toSow, offsetTop);
            await bot.waitForTicks(1);
          } else cmd.isRunning = false; // 如果沒有種子可用，則返回
        } else cmd.isRunning = false; // 如果沒有可種植的耕地，則返回
        cmd.isRunning = false;
      }

      async function stepToLookAtCrop(toLook) {
        if (cmd.isRunning) return;
        if (toLook && toLook.length > 0) {
          cmd.isRunning = true;
          try {
            // 依序遍歷所有作物位置
            for (let i = 0; i < toLook.length; i++) {
              const targetPos = toLook[i];
              const lookPos = targetPos.offset(0.5, 0.5, 0.5);
              await bot.lookAt(lookPos);
              await bot.waitForTicks(8);

              // 1/20 的機率決定是否移動
              const shouldMove = Math.random() < 0.05;

              if (shouldMove) {
                console.log(`[wheat] 隨機決定移動到觀察目標`);
                const moveResult = await utils.gotoNear(targetPos);
                if (moveResult) {
                  await bot.waitForTicks(60); // 移動成功後停留 3 秒
                }
                break; // 移動後結束觀察循環
              } else {
                // 不移動時等待 1.5 秒後繼續
                await bot.waitForTicks(30);
              }
            }
          } catch (error) {
            console.log(`[wheat] stepToLookAtCrop Error: ${error.message}`);
          }
        }
        cmd.isRunning = false;
      }

      /* 工具函數 */
      // 重設循環參數
      function resetLoopParm() {
        cmd.isRunning = false;
        toCollect = null;
        toSow = null;
        toSowBlocks = [];
        toPickUp = [];
        toLook = null;
      }

      // // 取得單個 可以種植的耕地方塊 farmland
      // function blockToSow(blockName) {
      //   return bot.findBlock({
      //     point: bot.entity.position,
      //     matching: bot.registry.blocksByName[blockName].id,
      //     maxDistance: 16, // 設定範圍
      //     useExtraInfo: (block) => {
      //       const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
      //       return !blockAbove || blockAbove.type === 0;
      //     },
      //   });
      // }

      // 取得周圍多個 作物方塊 wheat
      function blocksToBreak(blockName) {
        const blocksPos = bot.findBlocks({
          point: bot.entity.position,
          maxDistance: 3.5, // 設定範圍
          count: 32, // 設定最大數量，避免過多
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

      // 取得周圍多個 可以種植的耕地方塊 farmland
      function blocksToSow(blockName) {
        const blocks = bot.findBlocks({
          point: bot.entity.position,
          matching: bot.registry.blocksByName[blockName].id,
          maxDistance: 3.5, // 設定範圍
          count: 32, // 設定最大數量，避免過多
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

      // 檢查是否有床的座標
      async function findAndBindBed() {
        const range = 24;
        const botBedPos = bot.Bot_Config.homeSetting.bedPos;

        cmd.bed = await utils.findBlockByName("bed", { r: range });
        const bedPos = cmd.bed?.position;

        if (bedPos) {
          botBedPos.x = bedPos.x;
          botBedPos.y = bedPos.y;
          botBedPos.z = bedPos.z;
          bot.safeChat(
            `將床定位在 (${bedPos.x}, ${bedPos.y}, ${bedPos.z})`,
            `🛌`
          );
        } else {
          bot.safeChat(`附近 ${range} 格沒有找到床 🛌`);
          cmd.bed = null;
        }
      }

      // 找到周圍需要看向的座標
      async function getLookPos(names = ["wheat"], options = { r: 24 }) {
        let allPositions = [];

        // 檢查附近是否有玩家，排除機器人自己
        const nearPlayers = await utils.filterNearEntities("player", 5);
        if (nearPlayers && nearPlayers.length > 0) {
          // 過濾掉機器人自己，只保留其他玩家
          const otherPlayers = nearPlayers.filter(
            (player) => player.username !== bot.username
          );

          if (otherPlayers.length > 0) {
            const nearPlayer = otherPlayers[0];
            const nearPlayerPos = nearPlayer.position.offset(0, 0, 0).floor();
            console.log(
              `[wheat] 發現玩家 ${nearPlayer.username}，位置: ${nearPlayerPos.x}, ${nearPlayerPos.y}, ${nearPlayerPos.z}`
            );
            allPositions.push(nearPlayerPos);
            return allPositions;
          }
        }

        // 如果沒有找到玩家，繼續搜尋作物
        for (let stage = 6; stage >= 0; stage--) {
          const positions = await utils.findBlocksByNameArray(names, {
            ...options,
            m: stage,
          });

          if (positions && positions.length > 0) {
            console.log(
              `[wheat] 找到 ${positions.length} 個生長階段 ${stage} 的作物`
            );
            allPositions.push(...positions);
          }

          if (allPositions.length >= 32) {
            console.log(`[wheat] 已找到足夠的觀察目標`);
            break;
          }
        }

        // 擴大搜索範圍的邏輯保持不變
        if (allPositions.length === 0 && options.r <= 24) {
          console.log(
            `[wheat] 在範圍 ${options.r} 內沒有找到作物，擴大搜索範圍`
          );
          return getLookPos(names, { r: options.r + 8 });
        }

        return allPositions;
      }

      // 從方塊實例中 比對 map 資訊，取得需要種植得種子名稱
      function getSeedNameFromBlock(cropName) {
        const cropToSeedMap = new Map([
          ["wheat", "wheat_seeds"], // 小麥方塊
          ["carrots", "carrot"], // 胡蘿蔔方塊
          ["potatos", "potato"], // 馬鈴薯方塊
          ["beetroots", "beetroot_seeds"], // 甜菜根方塊
          // 添加其他作物與種子的映射
        ]);
        return cropToSeedMap.get(cropName) || null;
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
