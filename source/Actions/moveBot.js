async function moveBot(bot, direction, ticks = 4) {
  // 可用的控制方向，這裡使用物件來映射多個別名到相同的 direction
  const validDirections = {
    forward: ["forward", "w", "前", "往前", "前進"], // forward 和 前 都映射到 forward
    back: ["back", "s", "後", "退", "後退"],
    left: ["left", "a", "左", "向左"],
    right: ["right", "d", "右", "向右"],
    jump: ["jump", "跳", "跳躍"],
    sprint: ["sprint", "跑", "衝", "衝刺"],
    sneak: ["sneak", "蹲", "蹲下", "蹲著"],
  };

  // 驗證方向
  let validDirectionFound = false;
  for (let key in validDirections) {
    if (validDirections[key].includes(direction)) {
      validDirectionFound = true;
      direction = key; // 如果找到對應的方向，將 direction 統一為基礎方向名稱
      break;
    }
  }

  if (!validDirectionFound) {
    bot.safeChat("不正確的移動方向", "❌");
    return;
  }

  try {
    bot.setControlState(direction, true); // 啟動控制
    await bot.waitForTicks(ticks); // 等待指定時間
  } finally {
    bot.setControlState(direction, false); // 無論如何都停止控制
  }
}

module.exports = { moveBot };
