module.exports = [
  {
    name: "craftingStation",
    aliases: ["craftst", "craftingstation", "合成站"],
    interval: null,
    paramRules: [],
    preCheck: async (bot, cmd, options) => {
      const ticks = bot.Bot_Config.waitForTicks;
      cmd.bigTick = ticks < 8 ? 8 : ticks; // 最小值為 8
      cmd.smallTick = Math.max(1, Math.floor(cmd.bigTick / 8)); // bigTick 除以8取整，最小值為 1

      const { aBoxes, bBoxes, barrel, craftingTable, falseMsg } =
        await checkStationPosition(bot);
      cmd.aBoxPos = aBoxes[0] ?? null;
      cmd.bBoxPos = bBoxes[0] ?? null;
      cmd.craftTablePos = craftingTable[0] ?? null;
      cmd.barrelPos = barrel[0] ?? null;
      // 預檢查
      bot.safeChat(`檢查合成站的狀態預檢查`, `🔍`);
      if (
        cmd.aBoxPos == null ||
        cmd.bBoxPos == null ||
        cmd.craftTablePos == null
      ) {
        console.log({ aBoxes, bBoxes, barrel, craftingTable, falseMsg });
        bot.safeChat(`${falseMsg}`, `❌`);
        return false;
      } else {
        bot.safeChat(`檢查通過，整組合成開始`, `✅`);
        return true;
      }

      async function checkStationPosition(bot, searchRadius = 5) {
        const { bigTick, smallTick } = cmd;
        // 搜尋範圍內的 barrel
        const barrel =
          bot.findBlocks({
            matching: (block) => block.name.includes("barrel"),
            maxDistance: searchRadius,
            count: 1,
          }) ?? [];

        // 搜尋範圍內的 craftingTable
        const craftingTable =
          bot.findBlocks({
            matching: (block) => block.name.includes("crafting_table"),
            maxDistance: searchRadius,
            count: 1,
          }) ?? [];

        // 分類搜尋結果
        const aBoxes = []; // 有內容的 shulker box
        const bBoxes = []; // 空的 shulker box

        // 搜尋範圍內的 shulker box
        const shulkerBoxes = bot.findBlocks({
          matching: (block) => block.name.includes("shulker_box"),
          maxDistance: searchRadius,
          count: 2, // 最多找兩個
        });
        let falseMsg = `範圍 ${searchRadius} 格內`;
        if (shulkerBoxes.length === 0) {
          falseMsg += `: 未找到 Shulker Box`;
          return { aBoxes, bBoxes, craftingTable, barrel, falseMsg };
        }

        // 依次檢查每個 shulker box
        for (const boxPosition of shulkerBoxes) {
          const block = bot.blockAt(boxPosition);
          if (!block) continue;

          // 打開 shulker box
          const container = await bot.openContainer(block);
          await bot.waitForTicks(bigTick);
          const items = container.containerItems();

          // 判斷 shulker box 是否為空
          let isEmpty = true;
          if (items && items.length > 0) {
            isEmpty = false;
          }

          // 依照內容物分類
          if (!isEmpty) {
            aBoxes.push(boxPosition); // 有內容
          } else {
            bBoxes.push(boxPosition); // 空的
          }

          // 關閉容器
          await bot.closeWindow(container);
        }

        // 處理失敗訊息
        if (aBoxes.length == 0) {
          falseMsg += `: 沒有需要合成的 Shulker Box`;
        } else if (bBoxes.length == 0) {
          falseMsg += `: 沒有找到空的 Shulker Box`;
        } else if (craftingTable.length == 0) {
          falseMsg += `: 沒有找到可使用的 Crafting Table`;
        } else {
          falseMsg = `沒有失敗的情況`;
        }
        return { aBoxes, bBoxes, craftingTable, barrel, falseMsg };
      }
    },
    execute: async (bot, cmd, options) => {
      //   await bot.waitForTicks(5);
      //   const LCM = bot.loopableCommandManager;
      //   const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      //   if (!accept) return;

      const { aBoxPos, bBoxPos, barrelPos } = cmd;
      await useCraftingStation(bot, aBoxPos, bBoxPos, barrelPos);
      async function useCraftingStation(bot, aBox, bBox, barrel) {
        const { bigTick, smallTick } = ticksCalculat(bot);
        let counter = 0;
        // 主循環邏輯
        async function mainLoop() {
          while (true) {
            // 檢查盒子狀態
            let aBoxStatus = checkBoxValidity(bot, aBox);
            let bBoxStatus = checkBoxValidity(bot, bBox);

            let stopMsg = `整組合成終止觸發: `;

            if (!isBoxCanUse(aBoxStatus, bBoxStatus)) {
              // 等待冷卻後再次檢查
              let missingMsg = ``;
              if (aBoxStatus.isAir || !aBoxStatus.isBox) {
                missingMsg = `發現 A 盒子消失`;
              } else if (bBoxStatus.isAir || !bBoxStatus.isBox) {
                missingMsg = `發現 B 盒子消失`;
              } else {
                missingMsg = `邊緣情況: A 盒子 isAir: ${aBoxStatus.isAir}, B 盒子 isAir: ${bBoxStatus.isAir}`;
              }
              await bot.waitForTicks(bigTick); // 延遲 8 tick
              await bot.waitForTicks(smallTick); // 延遲 1 tick
              await bot.safeChat(`${missingMsg}`, `❓`);
              // 第二次檢查
              aBoxStatus = checkBoxValidity(bot, aBox);
              bBoxStatus = checkBoxValidity(bot, bBox);
              if (!isBoxCanUse(aBoxStatus, bBoxStatus)) {
                if (aBoxStatus.isAir || !aBoxStatus.isBox) {
                  stopMsg += `確認 A 盒子消失`;
                } else if (bBoxStatus.isAir || !bBoxStatus.isBox) {
                  stopMsg += `確認 B 盒子消失`;
                } else {
                  stopMsg = `邊緣情況: A 盒子 isAir: ${aBoxStatus.isAir}, B 盒子 isAir: ${bBoxStatus.isAir}`;
                }
                await bot.safeChat(`${stopMsg}`, `⛔`);
                break;
              }
            }

            // 檢查背包是否是空的
            if (!isInventoryEmpty(bot)) {
              // 確認是否有桶子用來放物品
              if (barrel !== null) {
                // 確認有桶子，將身上物品放入
                const bar = await openBoxCheck(bot, barrel);
                if (bar.isEmpty) {
                  await bot.waitForTicks(bigTick); // 延遲 8 tick
                  await transferSingleBoxItems(bot, "to");
                  await bot.safeChat(`將背包中的無關物品存入桶子`, `🚮`);
                } else {
                  stopMsg += `桶子無法存放背包物品，請清空背包後再試`;
                  await bot.safeChat(`${stopMsg}`, `⛔`);
                  await bot.waitForTicks(bigTick); // 延遲 8 tick
                  await bot.closeWindow(bot.currentWindow);
                  break;
                }
              } else {
                stopMsg += `背包需要騰出空間，請清空背包後再試`;
                await bot.safeChat(`${stopMsg}`, `⛔`);
                break;
              }
            }

            // --- 核心操作流程改造 ---
            // 階段1：從A盒取物
            // await transferSingleBoxItems(bot, aBox, "from");
            const a = await openBoxCheck(bot, aBox);
            await bot.waitForTicks(bigTick); // 延遲 8 tick

            if (a.isEmpty == false && a.stackNames) {
              await transferSingleBoxItems(bot, "from");
            } else {
              await bot.closeWindow(bot.currentWindow);
              console.log({ a });
              stopMsg += `A 盒子異常 >> ${a.stateMsg}`;
              await bot.safeChat(`${stopMsg}`, `⛔`);
              break;
            }
            // 階段2：打開合成台
            const c = await openNearbyCraftingTable(bot);
            await bot.waitForTicks(bigTick); // 延遲 8 tick

            if (!c.isCraftingTable) {
              console.log({ c });
              stopMsg += `${c.falseMsg}`;
              await bot.safeChat(`${stopMsg}`, `⛔`);
              break;
            }
            // 階段3：執行整組合成
            const craftFalseMsg = await stackCrafting(bot);
            if (craftFalseMsg !== null) {
              stopMsg += `${craftFalseMsg}`;
              await bot.safeChat(`${stopMsg}`, `⛔`);
              break;
            }
            const itemEntries = bot.registry.itemsByName;
            const item = itemEntries[a.stackNames];
            const recipes = bot.recipesAll(item.id, null, 1);
            // console.log({ recipes });

            await bot.waitForTicks(bigTick); // 冷卻時間

            // 階段4：存入B盒
            // await transferSingleBoxItems(bot, bBox, "to");
            const b = await openBoxCheck(bot, bBox);
            await bot.waitForTicks(bigTick); // 延遲 8 tick

            if (b.stackNames.length == 1 || b.stackNames.length == 0) {
              await transferSingleBoxItems(bot, "to");
            } else {
              await bot.closeWindow(bot.currentWindow);
              console.log({ b });
              stopMsg += `B 盒子異常 >> ${b.stateMsg}`;
              await bot.safeChat(`${stopMsg}`, `⛔`);
              break;
            }
            counter++;
          }
        }
        // 執行主循環
        await mainLoop();
        if (counter == 0) return;
        await bot.safeChat(`循環結束，統計成功合成次數：${counter} 次`, `📊`);

        // --- 以下為其他功能函數 ---

        // 計算等待時間
        function ticksCalculat(bot) {
          const ticks = bot.Bot_Config.waitForTicks;
          const bigTick = ticks < 8 ? 8 : ticks; // 最小值為 8
          const smallTick = Math.max(1, Math.floor(cmd.bigTick / 8)); // bigTick 除以8取整，最小值為 1
          return { bigTick, smallTick };
        }

        // 確認盒子方塊存在的狀態
        function checkBoxValidity(bot, position) {
          const block = bot.blockAt(position);
          return {
            isAir: block?.name === "air",
            isBox: block?.name.includes("shulker_box"),
          };
        }

        // 檢查盒是否可以使用
        function isBoxCanUse(aBoxStatus, bBoxStatus) {
          if (
            !aBoxStatus.isBox || // A盒不為 shulker_box
            !bBoxStatus.isBox || // B盒不為 shulker_box
            aBoxStatus.isAir || // A盒位置變空氣
            bBoxStatus.isAir // B盒位置變空氣
          ) {
            return false;
          } else {
            return true;
          }
        }

        // 檢查 bot 背包是否為空
        function isInventoryEmpty(bot) {
          const items = bot.inventory.items();
          if (items && items.length == 0) {
            return true;
          } else {
            return false;
          }
        }

        // 打開盒子並檢查內容物
        async function openBoxCheck(bot, position) {
          const { bigTick, smallTick } = ticksCalculat(bot);
          const block = bot.blockAt(position);
          if (!block) return { block: null };

          // 開啟容器
          const container = await bot.openContainer(block);
          await bot.waitForTicks(bigTick); // 延遲 8 tick

          // 取得容器內的所有物品
          const items = container.containerItems();
          let isEmpty = false;
          let stackNames = [];
          let stackCount = 0;
          let stateMsg = "";

          if (items) {
            // 檢查: items 的數量為 空
            if (items.length == 0) {
              isEmpty = true;
              stateMsg = "是空盒";
            } else {
              const firstItem = items[0];
              stackNames.push(firstItem.name);
              let isValid = true;
              // 檢查每一項的 name 是否相同且 count 是否為 64
              for (const item of items) {
                if (item.name !== firstItem.name) {
                  if (!stackNames.includes(item.name)) {
                    stackNames.push(item.name);
                  }
                  isValid = false;
                } else {
                  if (item.count !== 64) {
                    isValid = false;
                  } else {
                    stackCount++;
                  }
                }
              }
              // 輸出結果
              if (isValid) {
                stateMsg = "是滿盒的純物品";
              } else if (!isValid && stackCount !== 27) {
                stateMsg = "非滿盒";
              } else if (!isValid && stackNames.length > 0) {
                stateMsg = "是滿盒但有雜物";
              } else if (
                !isValid &&
                stackCount !== 27 &&
                stackNames.length > 0
              ) {
                stateMsg = "非滿盒且有雜物";
              } else {
                stateMsg = "極端情況: 無法判斷盒子內容物狀態";
              }
            }
          } else {
            stateMsg = "極端情況: 無法取得盒子內的物品訊息";
          }
          return { isEmpty, stackNames, stateMsg, stackCount };
        }

        // 通用單盒物品轉移函數
        async function transferSingleBoxItems(bot, direction) {
          const { bigTick, smallTick } = ticksCalculat(bot);
          const container = bot.currentWindow;
          const { inventoryStart, inventoryEnd } = container;
          let startClick = 0;
          let endClick = 0;
          if (direction == "from") {
            endClick = inventoryStart;
          } else if (direction == "to") {
            startClick = inventoryStart;
            endClick = inventoryEnd;
          }
          await bot.waitForTicks(bigTick); // 延遲 8 tick
          for (let i = startClick; i < endClick; i++) {
            try {
              await bot.waitForTicks(smallTick); // 延遲 1 tick
              await bot.clickWindow(i, 0, 1);
            } catch (error) {
              break;
            }
          }
          await bot.waitForTicks(bigTick); // 延遲 8 tick
          await bot.closeWindow(container);
        }

        // 開啟附近的工作檯
        async function openNearbyCraftingTable(bot, searchRadius = 5) {
          let isCraftingTable = true;
          let falseMsg = null;
          // 1. 尋找附近的合成台
          const craftingTable = bot.findBlock({
            matching: bot.registry.blocksByName.crafting_table.id,
            maxDistance: searchRadius,
          });

          // 如果找不到合成台，返回 null
          if (!craftingTable) {
            isCraftingTable = false;
            falseMsg = `範圍 ${searchRadius} 格內: 沒有 Crafting Table 可以打開`;
            return { isCraftingTable, falseMsg };
          }

          // 2. 打開合成台視窗
          try {
            await bot.activateBlock(craftingTable); // 激活合成台方塊
            return { isCraftingTable, falseMsg };
          } catch (error) {
            isCraftingTable = false;
            console.error(`\n${error.stack}`);
            falseMsg = `打開合成台視窗時發生錯誤： ${error.message}`;
            return { isCraftingTable, falseMsg };
          }
        }

        // 執行整組合成功能
        async function stackCrafting(bot) {
          const { bigTick, smallTick } = ticksCalculat(bot);
          let falseMsg = null;
          try {
            const craftWindow = bot.currentWindow;
            const { type, craftingResultSlot } = craftWindow;
            const items = craftWindow.items();
            let isStackCount27 = false;
            const checkItems = () => {
              if (items.length == 27) {
                isStackCount27 = true;
              }
            };
            // 1. 檢查 window 是否為合成台視窗
            if (type !== "minecraft:crafting") {
              falseMsg = `目前的視窗 ${type}: 不是合成台視窗。`;
              return falseMsg;
            }

            // 2. 檢查身上是否有足夠的物品
            checkItems();
            if (!isStackCount27) {
              falseMsg = `身上有 ${items.length} 項物品並非 27。`;
              return falseMsg;
            }

            // 3. 開始合成循環
            for (let i = 0; i < 27; i++) {
              let item = items[i];
              let itemSlot = item.slot;
              // 1. 移動物品到合成台上
              // clickWindow(slot, mouseButton, mode) 模擬滑鼠點擊 mode:0 - shift
              try {
                await bot.clickWindow(itemSlot, 0, 1);
              } catch (error) {
                const errWindow = bot.currentWindow;
                const items = errWindow.containerItems();
                console.log({ errWindow, items });
                falseMsg = `移動物品到合成台上時，發生錯誤: ${error.message}`;
                break;
              }
              // 2. Shift 取出合成產物欄位
              if (i % 9 === 8) {
                try {
                  await bot.waitForTicks(bigTick); // 延遲 8 tick
                  await bot.clickWindow(craftingResultSlot, 0, 1);
                } catch (error) {
                  const errWindow = bot.currentWindow;
                  const items = errWindow.containerItems();
                  console.log({ errWindow, items });
                  falseMsg = `Shift 取出合成產物欄位時，發生錯誤: ${error.message}`;
                  break;
                }
              }
              await bot.waitForTicks(smallTick); // 延遲 1 tick
            }
            await bot.closeWindow(craftWindow);
            return falseMsg;
          } catch (error) {
            console.error(`\n${error.stack}`);
            falseMsg = `整組合成過程時發生錯誤： ${error.message}`;
            return falseMsg;
          }
        }
      }
    },
    group: `dev`,
    description: `讓 bot 使用合成站，將 9 格原材料壓縮合成為 1 格產物`,
  },
];

//   // 從 aBox 移動所有的物品到身上
//   await transferAllItemsFromContainer(bot, aBoxes);
//   async function transferAllItemsFromContainer(
//     bot,
//     containerPositions
//   ) {
//     for (const boxPosition of containerPositions) {
//       const block = bot.blockAt(boxPosition);
//       if (!block) continue;

//       // 打開容器
//       await bot.openContainer(block);
//       await bot.waitForTicks(1);
//       const container = bot.currentWindow;
//       const invStart = container.inventoryStart; // 容器物品的起始位置
//       const invEnd = container.inventoryEnd; // 容器物品的結束位置

//       // 取出所有物品
//       for (let i = 0; i < invStart; i++) {
//         const item = container.slots[i];
//         if (item) {
//           await bot.transfer({
//             window: container,
//             itemType: item.type,
//             count: item.count,
//             sourceStart: 0,
//             sourceEnd: invStart,
//             destStart: invStart,
//             destEnd: invEnd,
//           });
//           await bot.waitForTicks(1); // 等待 1 tick 確保物品轉移完成
//         }
//       }
//       await bot.closeWindow(container); // 關閉容器
//       await bot.waitForTicks(8); // 等待 8 ticks 確保容器關閉完成
//     }
//   }
