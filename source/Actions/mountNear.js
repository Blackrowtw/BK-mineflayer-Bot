async function mountNear(bot) {
  // 找到最近的實體
  const nearestEntity = bot.nearestEntity();
  // bot.logTimer(`[attackNear] bot ride: ${entityName}`);  // Debug 用
  if (!nearestEntity) {
    await bot.safeChat(`好人你幫幫人民的辣，哇丟跨謀`);
    return;
  }
  // 計算與實體的距離 處理實體的名稱
  const distance = bot.entity.position.distanceTo(nearestEntity.position);
  const entityName =
    nearestEntity.username || nearestEntity.displayName || "Unknown Name";
  if (distance <= 5.5) {
    if (nearestEntity.type === "minecart") {
      await bot.safeChat(`沒時間解釋了，快上車`);
    } else if (nearestEntity.type === "boat") {
      await bot.safeChat(`𝗡𝗶𝗰𝗲 𝗕𝗼𝗮𝘁`);
    } else {
      await bot.safeChat(`我也是很想上 ${entityName} 的車...`);
    }
  } else {
    await bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
    return;
  }

  // 看向實體的座標
  const pos = nearestEntity.position.offset(0, nearestEntity.height, 0);
  await bot.lookAt(pos);
  await bot.waitForTicks(5);
  // 執行騎乘
  bot.mount(nearestEntity);
  return;
}

module.exports = { mountNear };
