// 定義需要的參數
const CONTAINER_WHITELIST = [
  "chest",
  "trapped_chest",
  "barrel",
  "shulker_box",
  "ender_chest",
];
const ITEM_BLACKLIST = ["air", "bedrock", "command_block", "barrier"];

async function putItems(bot, item, count = 1, range = 5) {
  // 檢查是否有輸入物品參數
  if (!item) {
    bot.safeChat(`你想要我儲存什麼？`);
    return;
  }

  // 檢查輸入 是否為有效的整數
  if (!parseInt(count, 10) || count <= 0) {
    bot.safeChat("請輸入搜尋容器方塊的數量");
    return;
  } else if (!parseInt(range, 10) || range <= 0) {
    bot.safeChat("請輸入搜尋容器方塊的範圍");
    return;
  }

  // 定義參數
  const maxRange = range;
  const maxCount = count;
  const containers = await findContainers(bot, maxRange, maxCount);

  // console.log({ containers }); // debug 用

  // 計算 BOT 身上符合 item.name 的物品數量
  const ITEMS = bot.inventory.items().filter((i) => i.name.includes(item));
  const totalItemCount = ITEMS.reduce((total, i) => total + i.count, 0);

  // console.log({ ITEMS }); // debug 用
  // console.log({ totalItemCount }); // debug 用

  // 檢查是否擁有該物品
  if (!ITEMS.length) {
    bot.safeChat(`背包中並沒有 ${item}`, `❓`);
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
    `含有 ${item} 名稱的物品共佔 ${ITEMS.length} 格，總共 ${totalItemCount} 個`
  );

  // 開始儲存物品
  for (const containerBlock of containers) {
    try {
      // 打開容器
      const containerWindow = await bot.openContainer(containerBlock);

      // 儲存目前容器的資訊
      const pos = containerBlock.position;
      const name = containerBlock.displayName;
      // const nowItemCount = bot.inventory
      //   .items()
      //   .filter((i) => i.name.includes(item)).length;
      let isContainerFull = false;

      // 遍歷目前容器內的 ITEMS 對象
      const containerITEMS = containerWindow
        .items()
        // 雙重過濾：槽位索引 + 物品有效性檢查
        .filter(
          (i) =>
            i !== null && // 過濾空槽位
            i.slot >= containerWindow.inventoryStart && // 背包槽位判斷
            i.name.includes(item) // 獲取指定物品
        );

      // 定義容器的儲存位置為 從 0 到玩家背包開始的位置
      const containerSlots = containerWindow.slots.slice(
        0,
        containerWindow.inventoryStart
      );

      // 定義玩家背包位置為 inventoryStart 位置
      const inventorySlots = containerWindow.slots.slice(
        containerWindow.inventoryStart
      );

      // 查詢容器的空位置 SlotID 並加入到陣列中
      const emptySlots = containerSlots
        .map((slot, index) => (slot ? null : index))
        .filter((slot) => slot !== null);

      // // 計算前 inventoryStart 個 slot 為 null 的數量
      // for (let i = 0; i < containerSlots.length; i++) {
      //   if (!containerSlots[i]) {
      //     // 記錄空的 slot
      //     emptySlots.push(i);
      //   }
      // }

      // 如果沒有空間，關閉容器並繼續下一個容器循環
      if (emptySlots.length === 0) {
        containerWindow.close();
        bot.safeChat(`容器 ${name} ${pos} 是滿的`, `⛔`);
        isContainerFull = true;
        continue;
      }

      // bot.safeChat(`移動前 容器 ${name} 有 ${emptySlots.length} 個空位 ${pos}`);

      // 開始處理每一個物品移動
      for (const item of containerITEMS) {
        // 防禦性檢查
        if (emptySlots.length === 0) break;

        // 定義來源槽位 是物品所在的槽位
        const sourceSlot = item.slot;

        // 定義目的槽位 為空的槽位（從 emptySlots 中移除並作為 destSlot 使用）
        const destSlot = emptySlots.shift();
        if (destSlot === undefined) {
          // 跳出 繼續下一個容器循環
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
          // 跳出 繼續下一個容器循環
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
  const afterITEMS = bot.inventory.items().filter((i) => i.name.includes(item));
  const afterItemCount = afterITEMS.reduce((total, i) => total + i.count, 0);
  const afterslotCount = afterITEMS.length;

  if (afterslotCount > 0) {
    bot.safeChat(
      `物品 ${item} 還剩 ${afterITEMS.length} 格，總共 ${afterItemCount} 個`
    );
  } else {
    bot.safeChat(`所有 ${item} 已存储`, `🎉`);
  }
}

// 取得範圍內的可用容器容器
async function findContainers(bot, maxRange, maxCount) {
  // 搜尋範圍內的方塊 直到最大值 將符合條件的容器 整理成陣列回傳
  return bot
    .findBlocks({
      matching: (block) => CONTAINER_WHITELIST.includes(block.name),
      maxDistance: maxRange,
      count: maxCount,
    })
    .map((pos) => bot.blockAt(pos))
    .filter(Boolean);
}

module.exports = { putItems };
