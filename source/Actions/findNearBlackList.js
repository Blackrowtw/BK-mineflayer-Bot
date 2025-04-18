async function findNearBlackList(bot) {
  if (!bot) {
    console.log(`[findNearBlackList] Error: 未傳入 bot 實例`);
    return null;
  }
  /** MC_1.21.4
   * player: 玩家。
   * animal: 動物類生物。
   * hostile: 攻擊型敵對生物。
   * mob: 中立或特殊生物，史萊姆、傀儡、惡魂、終界龍、悅靈。
   * ambient: 環境生物，只有蝙蝠。
   * living: 生命體，只有盔甲架。
   * other: 其他類型的實體，船、礦車、TNT。
   * passive: 被動生物，如海豚、魷魚、村民。
   * projectile: 投射物，如箭矢、火球。
   * water_creature: 水中生物，如蝌蚪、熱帶魚。
   **/

  // 找到最近的實體
  const entity = bot.nearestEntity();
  //   console.log(`findNear: ${entity.name}`); // Debug用
  //   console.log({ entity }); // Debug用
  //   console.log(`findNear: `, JSON.stringify(entity, null, 2)); // Debug用 原始輸出

  // 定義攻擊黑名單
  const ATK_BLACK_LIST = [
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

  // 返回 null 表示沒有找到目標
  if (!entity) {
    bot.safeChat(`好人你幫幫人民的辣，哇丟跨謀`);
    return null;
  }

  const isBlackList = ATK_BLACK_LIST.includes(entity.name);
  const distance = bot.entity.position.distanceTo(entity.position);
  // 檢查是否是黑名單
  if (isBlackList) return null;
  // 檢查是否 > 4.75
  if (distance > 4.75) return null;

  let targetPos = entity.position; // 假設 entity 是您要讓機器人檢視的目標實體
  // 檢查實體是否具有 eyeHeight 屬性
  if ("eyeHeight" in entity) {
    targetPos = targetPos.offset(0, entity.eyeHeight, 0); // 如果有，將 eyeHeight 新增到目標位置的 Y 座標
  }
  // 使機器人看向目標位置
  await bot.lookAt(targetPos, true);
  return entity;
}

module.exports = { findNearBlackList };
