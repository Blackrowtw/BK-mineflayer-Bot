async function attackOnce(bot, target, botSay = true) {
  // bot.logTimer(`[attackNear] bot attack: ${entityName}`);  // Debug 用
  let targetEntity = target;

  // 定義攻擊黑名單
  const blackList = [
    "painting",
    "item_frame",
    "glow_item_frame",
    "leash_knot",

    "tnt",
    "item",
    "eye_of_ender",
    "evoker_fangs",
    "falling_block",
    "experience_orb",
    "ominous_item_spawner",

    "area_effect_cloud",
    "marker",
    "interaction",
    "item_display",
    "text_display",
    "block_display",
  ];
  if (blackList.includes(targetEntity.name)) {
    botSay &&
      bot.safeChat(`唉呦! 這是 ${targetEntity.displayName} ，我可不敢打阿`);
    await bot.swingArm();
    targetEntity = null;
    return;
  }

  // 沒有最近的實體則退出
  if (!targetEntity) {
    botSay && bot.safeChat(`好人你幫幫人民的辣，哇丟跨謀`);
    return;
  }

  // 計算與實體的距離 處理實體的名稱
  const distance = bot.entity.position.distanceTo(targetEntity.position);
  const entityName =
    targetEntity.username || targetEntity.displayName || "Unknown Name";
  if (distance <= 5.5) {
    if (targetEntity.type === "player") {
      botSay && bot.safeChat(`${entityName} 吃我一擊!`);
    } else {
      botSay && bot.safeChat(`看招! ${entityName}`);
    }
  } else {
    botSay && bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
  }
  // 看向實體的座標
  const pos = targetEntity.position.offset(0, targetEntity.height, 0);
  await bot.lookAt(pos);
  // 執行攻擊
  bot.attack(targetEntity);
}
module.exports = { attackOnce };
