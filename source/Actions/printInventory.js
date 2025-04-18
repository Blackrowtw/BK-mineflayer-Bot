// async function printInventory(bot) {
//   const inventory = {};

//   // 遍歷 BOT 背包內所有槽位，按正確的 slot 編號存儲
//   bot.inventory.slots.forEach((item, slot) => {
//     inventory[slot] = item ? `${item.displayName}:${item.count}` : "＿";
//   });

//   // 初始化變量
//   let currentLength = 0; // 當前字串長度
//   let outputString = ""; // 當前要發送的字串
//   let count = 0; // 計數器，記錄當前行的物品數量

//   // 遍歷背包內所有槽位
//   for (let slot = 0; slot < bot.inventory.slots.length; slot++) {
//     const info = inventory[slot] || "none"; // 確保即使沒有物品，也會顯示 `none`
//     const itemString = `〚${slot}〛${info}`;
//     const itemLength = itemString.length;

//     // 檢查加入這個物品字串後是否超過最大長度
//     if (currentLength + itemLength > 256 || count === 9) {
//       // 超過了，先發送當前字串，再清空
//       if (outputString) {
//         bot.safeChat(outputString);
//         await new Promise((resolve) => setTimeout(resolve, 500)); // 等待 0.5 秒
//       }

//       // 重設變量，開始下一輪
//       outputString = "";
//       currentLength = 0;
//       count = 0;
//     }

//     // 添加當前物品到輸出字串
//     outputString += (outputString ? "" : "") + itemString;
//     currentLength += itemLength;
//     count++;
//   }

//   // 發送最後一段字串（如果有剩餘）
//   if (outputString) {
//     bot.safeChat(outputString);
//   }
// }

// module.exports = { printInventory };

async function printInventory(bot) {
  // 定義 ASCII 佈局模板
  const layout = [
    "",
    "┌────┐┌────────────┐      Crafting            ",
    "│ 05 ││   ------   │     ┌────┬────┐          ",
    "├────┤│   ------   │     │ 01 │ 02 │    ┌────┐",
    "│ 06 ││ ---------- │     ├────┼────┤ ─► │  0 │",
    "├────┤│ ---------- │     │ 03 │ 04 │    └────┘",
    "│ 07 ││ ---------- │     └────┴────┘          ",
    "├────┤│   ------   │┌────┐                    ",
    "│ 08 ││   ------   ││ 45 │                    ",
    "└────┘└────────────┘└────┘                    ",
    "┌────┬────┬────┬────┬────┬────┬────┬────┬────┐",
    "│ 09 │ 10 │ 11 │ 12 │ 13 │ 14 │ 15 │ 16 │ 17 │",
    "├────┼────┼────┼────┼────┼────┼────┼────┼────┤",
    "│ 18 │ 19 │ 20 │ 21 │ 22 │ 23 │ 24 │ 25 │ 26 │",
    "├────┼────┼────┼────┼────┼────┼────┼────┼────┤",
    "│ 27 │ 28 │ 29 │ 30 │ 31 │ 32 │ 33 │ 34 │ 35 │",
    "└────┴────┴────┴────┴────┴────┴────┴────┴────┘",
    "┌────┬────┬────┬────┬────┬────┬────┬────┬────┐",
    "│ 36 │ 37 │ 38 │ 39 │ 40 │ 41 │ 42 │ 43 │ 44 │",
    "└────┴────┴────┴────┴────┴────┴────┴────┴────┘",
  ];

  // 先發送佈局結構
  for (const line of layout) {
    console.log(line);
  }
  // 定義空數組
  const inventory = {};

  // 建立自定義槽位順序 (根據用戶指定的分組結構)
  const slotGroups = [
    // 第一組：5-8 +45
    [5, 6, 7, 8, 45],
    // 第二組：1-4 + 0
    [1, 2, 3, 4, 0],
    // 後續分組
    Array.from({ length: 9 }, (_, i) => i + 9), //9-17
    Array.from({ length: 9 }, (_, i) => i + 18), //18-26
    Array.from({ length: 9 }, (_, i) => i + 27), //27-35
    Array.from({ length: 9 }, (_, i) => i + 36), //36-44
  ];

  // 遍歷 BOT 背包內所有槽位，預處理物品數據
  bot.inventory.slots.forEach((item, slot) => {
    inventory[slot] = item ? `${item.displayName}:${item.count}` : "＿";
  });

  // 處理自定義順序的每個槽位
  for (const group of slotGroups) {
    // 消息分段參數
    let currentBatch = [];
    let currentLength = 0;

    for (const slot of group) {
      const itemInfo = `〚${slot}〛${inventory[slot] || "none"}`;
      const projectedLength =
        currentLength + itemInfo.length + (currentBatch.length > 0 ? 2 : 0);

      // 僅檢查長度限制，移除9個物品限制
      if (projectedLength > 256) {
        // 超過了，先發送當前字串，再清空
        await sendBatch(bot, currentBatch.join(""));
        // 重設變量，開始下一輪
        currentBatch = [];
        currentLength = 0;
      }

      currentBatch.push(itemInfo);
      currentLength += itemInfo.length + (currentBatch.length > 1 ? 2 : 0);
    }

    // 強制發送當前分組
    if (currentBatch.length > 0) {
      await sendBatch(bot, currentBatch.join(""));
    }
  }
}

// 封裝消息發送邏輯
async function sendBatch(bot, message) {
  await bot.safeChat(message, ``);
  await bot.waitForTicks(bot.Bot_Config.waitForTicks || 60);
}

module.exports = { printInventory };
