module.exports = [
  {
    name: "treeFarm2x2",
    aliases: ["tree2x2"],
    interval: 2000,
    onStart: async (bot, cmd, options) => {
      cmd.isSapling = false;
      cmd.dirtCoords = [];
      cmd.saplingItems = [];
      cmd.whiteListBlocks = ["dirt", "grass_block", "podzol", "coarse_dirt"];
      cmd.whiteListSapling = ["_sapling", "_fungus", "mangrove_propagule"];
      const dirtCoordinatesArr = bot.findBlocks({
        // matching 會過濾出 block 存在且名稱為 "Podzol" 的方塊
        matching: (block) =>
          block &&
          cmd.whiteListBlocks.some((keyword) => block.name.includes(keyword)),
        maxDistance: 4.5, // 搜尋範圍
        count: 4, // 搜尋上限
      });
      cmd.dirtCoords = dirtCoordinatesArr;

      if (bot.heldItem) {
        const itemName = bot.heldItem.name;
        cmd.isSapling = cmd.whiteListSapling.some((keyword) =>
          itemName.includes(keyword)
        );
        cmd.saplingItems.push(bot.heldItem);
      } else {
        bot.safeChat(`我手上沒有可以種的東西`, `❌`);
      }
      if (!cmd.dirtCoords || cmd.dirtCoords.length === 0) {
        await bot.safeChat(`附近找不到 ${cmd.whiteListBlocks}`, `❌`);
      }
      // console.log(cmd.saplingItems);
    },
    execute: async (bot, cmd, options) => {
      let isPlaceTree = false;
      placeSaplings();
      async function placeSaplings() {
        // 如果目前正在放置樹苗，或樹苗狀態不允許則直接返回
        if (isPlaceTree || !cmd.isSapling) return;
        if (!cmd.dirtCoords || cmd.dirtCoords.length === 0) return;

        // 設定為正在放置樹苗中，避免重複觸發
        isPlaceTree = true;
        try {
          // 逐一處理每個坐標
          for (const pos of cmd.dirtCoords) {
            const topFace = pos.offset(0, 1, 0);
            const airBlock = bot.blockAt(topFace);
            const targetBlock = bot.blockAt(pos);

            // 檢查區塊是否取得成功
            if (!targetBlock || !airBlock) {
              console.log("區塊資料不完整，跳過此位置", pos);
              continue;
            }

            // 檢查目標區塊是否為白名單中的泥土類型
            const isDirtBlock = cmd.whiteListBlocks.some((keyword) =>
              targetBlock.name.includes(keyword)
            );

            if (airBlock.name === "air" && isDirtBlock) {
              try {
                // 裝備第一個樹苗物品
                await bot.equip(cmd.saplingItems[0].type, "hand");
              } catch (equipError) {
                console.error("裝備樹苗失敗：", equipError);
                continue;
              }
              try {
                // 嘗試激活目標區塊（放置樹苗）
                await bot.activateBlock(targetBlock, { x: 0, y: 1, z: 0 });
              } catch (activateError) {
                console.error("激活區塊失敗：", activateError);
                continue;
              }
              // 等待一個 tick（以確保動作執行穩定）
              await bot.waitForTicks(1);
            }
          }
        } catch (loopError) {
          console.error("處理座標時出錯：", loopError);
          isPlaceTree = false;
        }
        // 放置樹苗完成後重置旗標
        isPlaceTree = false;
      }
    },
    group: `dev`,
    description: `讓 Bot 種植 2x2 的樹苗`,
  },
];
