// putAll.js 基於 putItems 的最佳化版本
const CONTAINER_TYPES = [
  "chest",
  "trapped_chest",
  "barrel",
  "shulker_box",
  "ender_chest",
];
const ITEM_BLACKLIST = [
  "air",
  "bedrock",
  "barrier",
  "command_block", // 普通命令方塊
  "repeating_command_block", // 迴圈命令方塊
  "chain_command_block", // 鏈式命令方塊
  "jigsaw", // 拼圖方塊
  "structure_block", // 結構方塊
  "structure_void", // 結構空位
  "light", // 光源
  "debug_stick", // 除錯棒
];

async function putAll(bot, count = 1, range = 5) {
  // 檢查輸入 是否為有效的整數
  if (!parseInt(count, 10) || count <= 0) {
    bot.safeChat("請輸入搜尋容器方塊的數量");
    return;
  } else if (!parseInt(range, 10) || range <= 0) {
    bot.safeChat("請輸入搜尋容器方塊的範圍");
    return;
  }

  // 定義引數
  const maxRange = range;
  const maxCount = count;
  const containers = await findContainers(bot, maxRange, maxCount);

  // 獲取所有非黑名單物品（過濾裝備與合成欄）
  const ALLITEMS = bot.inventory
    .items()
    .filter((item) => item.slot >= 9 && !ITEM_BLACKLIST.includes(item.name));

  // 計算物品的數量
  const totalItemCount = ALLITEMS.reduce((total, i) => total + i.count, 0);

  // 檢查是否擁有該物品
  if (ALLITEMS.length === 0) {
    bot.safeChat(`背包中沒有可儲存的物品`, `❌`);
    return;
  }

  // 檢查範圍內是否有容器方塊
  if (!containers.length) {
    if (count > 1) {
      bot.safeChat(`範圍 ${range} 內並沒有找到 ${count} 個可用的容器`, `❌`);
    } else {
      bot.safeChat(`範圍 ${range} 內並沒有找到可用的容器`, `❌`);
    }
    return;
  }

  // 輸出符合的物品提示訊息
  bot.safeChat(
    `所有的物品共佔 ${ALLITEMS.length} 格，總共 ${totalItemCount} 個`
  );

  // 輸出符合的容器提示訊息
  bot.safeChat(`找到 ${containers.length} 個容器，開始儲存...`, `🔍`);

  // 主儲存流程
  for (const containerBlock of containers) {
    try {
      // 開啟容器
      const containerWindow = await bot.openContainer(containerBlock);

      // 儲存目前容器的資訊
      const pos = containerBlock.position;
      const name = containerBlock.displayName;
      let isContainerFull = false;

      // 遍歷目前容器內的 ITEMS 物件
      const containerITEMS = containerWindow
        .items()
        // 雙重過濾：槽位索引 + 物品有效性檢查
        .filter(
          (i) =>
            i !== null && // 過濾空槽位
            i.slot >= containerWindow.inventoryStart && // 背包槽位判斷
            !ITEM_BLACKLIST.includes(i.name) // 黑名單過濾
        );

      // 定義容器的儲存位置為 從 0 到玩家背包開始的位置
      const containerSlots = containerWindow.slots.slice(
        0,
        containerWindow.inventoryStart
      );

      // 查詢容器的空位置 SlotID 並加入到陣列中
      const emptySlots = containerSlots
        .map((slot, index) => (slot ? null : index))
        .filter((slot) => slot !== null);

      // 如果沒有空間，關閉容器並繼續下一個容器迴圈
      if (emptySlots.length === 0) {
        containerWindow.close();
        bot.safeChat(`容器 ${name} ${pos} 是滿的`, `❌`);
        isContainerFull = true;
        continue;
      }

      // 按物品 name 排序
      const sortedITEMS = containerITEMS
        .slice()
        // 當名稱相同時按槽位排序
        .sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name);
          return nameCompare !== 0 ? nameCompare : a.slot - b.slot;
        });

      // 物品轉移核心邏輯
      for (const item of sortedITEMS) {
        // 防禦性檢查
        if (emptySlots.length === 0) break;

        // 定義來源槽位 是物品所在的槽位
        const sourceSlot = item.slot;

        // 定義目的槽位 為空的槽位（從 emptySlots 中移除並作為 destSlot 使用）
        const destSlot = emptySlots.shift();
        if (destSlot === undefined) {
          // 跳出 繼續下一個容器迴圈
          await bot.waitForTicks(4);
          await containerWindow.close();
          break;
        }

        // 嘗試移動物品
        try {
          await bot.moveSlotItem(sourceSlot, destSlot);
          await bot.waitForTicks(1);
        } catch (err) {
          bot.safeChat(`移動物品 ${item.displayName} 失敗`, `❌`);
          console.logTimer(`[putItem] bot.moveSlotItem failed: ${err.message}`);
          console.error(`${err.stack}`);
        }

        // 重新檢查空槽位，如果沒有空位可用，跳出迴圈或處理錯誤
        if (emptySlots.length === 0) {
          bot.safeChat(`容器 ${name} ${pos} 放滿了`, `⛔`);
          isContainerFull = true;
          await containerWindow.close();
          await bot.waitForTicks(4);
          // 跳出 繼續下一個容器迴圈
          break;
        }
      }
      // 完成物品存放後 檢查容器還有無空位
      if (emptySlots.length !== 0) {
        bot.safeChat(`關閉容器 ${name} ${pos}`, `⛔`);
      }
      await containerWindow.close();
      await bot.waitForTicks(4);
    } catch (err) {
      console.logTimer(`[putItem] failed: ${err.message}`);
      console.error(`${err.stack}`);
    }
  }

  // 最終狀態報告
  const afterslotCount = bot.inventory.items().length;
  const blackListSlotCount = bot.inventory
    .items()
    .filter((item) => ITEM_BLACKLIST.includes(item.name)).length;

  if (afterslotCount > 0) {
    if (blackListSlotCount > 0) {
      bot.safeChat(
        `還剩 ${afterslotCount} 格物品在背包，包含 ${blackListSlotCount} 個黑名單`
      );
    } else {
      bot.safeChat(`還剩 ${afterslotCount} 格物品在背包`);
    }
  } else {
    bot.safeChat(`所有物品已存储`, `🎉`);
  }
}

// 取得範圍內的可用容器容器
async function findContainers(bot, maxRange, maxCount) {
  // 搜尋範圍內的方塊 直到最大值 將符合條件的容器 整理成陣列回傳
  return bot
    .findBlocks({
      matching: (block) => CONTAINER_TYPES.includes(block.name),
      maxDistance: maxRange,
      count: maxCount,
    })
    .map((pos) => bot.blockAt(pos))
    .filter(Boolean);
}

module.exports = { putAll };
