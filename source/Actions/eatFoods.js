const { FOODS } = require("./_DATA/FOODS.js");

async function eatFoods(bot) {
  // 儲存 bot 目前的食物狀況
  const food = await bot.food;

  // 取得所有 inventory 中的物品
  const inventoryItems = await bot.inventory.items();
  if (!(bot.inventory.slots[45] == null)) {
    inventoryItems.push(bot.inventory.slots[45]); // 加入副手物品
  }

  // 過濾出在 inventory 中符合 FOODS 陣列中 food 名稱的項目
  // 假設 FOODS 陣列已依優先順序排序，第一個即為最佳食物
  const availableFoods = FOODS.filter((food) =>
    inventoryItems.some((item) => item.name === food.name)
  );

  if (availableFoods.length === 0) {
    await bot.safeChat(`袋裡空空，我吃西北風`, `❓`);
    return;
  }

  // 選取最佳食物：FOODS 排序中第一個符合的食物
  const bestFood = availableFoods[0];

  // 在 inventory 中尋找對應的物品實例
  const bestFoodItem = inventoryItems.find(
    (item) => item.name === bestFood.name
  );
  if (!bestFoodItem) {
    await bot.safeChat(`找不到最佳食物物品`, `❌`);
    return;
  }

  // 儲存主手欄位的原有物品
  const holdItem = bot.heldItem;

  // 將最佳食物裝備到主手
  await bot.equip(bestFoodItem, "hand");
  await bot.waitForTicks(1);
  try {
    if (!bot.usingHeldItem) {
      await bot.consume(); // 等待進食完成
      await bot.waitForTicks(1);
    }
    await bot.waitForTicks(1);
  } catch (err) {
    // 錯誤處理
    const errMsg = err.message;
    if (errMsg === "Food is full") {
      await bot.safeChat(`我吃不下拉`, `❌`);
    } else {
      await bot.safeChat(`進食發生錯誤: ${errMsg}`, `❌`);
    }
    // 如果進食失敗，換回主手欄位
    if (holdItem) await bot.equip(holdItem, "hand");
    await bot.waitForTicks(1);
    return false;
  }
  // 進食完畢後，換回主手欄位
  if (holdItem) await bot.equip(holdItem, "hand");

  // 檢查進食前後的飽食度
  const health = parseFloat(bot.health.toFixed(0));
  const afterFood = parseFloat(await bot.food.toFixed(2));
  const saturation =
    (await bot.foodSaturation) !== undefined
      ? parseFloat(await bot.foodSaturation.toFixed(2))
      : "N/A";
  if (afterFood > food) {
    await bot.safeChat(
      `進食完成 🖤: ${health} , 🍗: ${afterFood} + ${saturation}`,
      `✅`
    );
    return true;
  } else {
    await bot.safeChat(
      `飽食度未回復 🖤: ${health} , 🍗: ${afterFood} + ${saturation}`,
      `❓`
    );
    return false;
  }
}

// // 定義一個通用的 promise timeout 包裝器
// async function timeoutPromise(promise, ms) {
//   return new Promise((resolve, reject) => {
//     const timer = setTimeout(() => {
//       reject(new Error("[eatFoods] bot.consume() timed out"));
//     }, ms);
//     promise.then(
//       (res) => {
//         clearTimeout(timer);
//         resolve(res);
//       },
//       (err) => {
//         clearTimeout(timer);
//         reject(err);
//       }
//     );
//   });
// }

module.exports = { eatFoods };
