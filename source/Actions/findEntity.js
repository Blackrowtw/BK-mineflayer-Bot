async function findEntity(bot, category) {
  if (!bot) {
    console.log(`[findEntity] Error: 未傳入 bot 實例`);
    return null;
  }
  if (typeof category !== "string") {
    console.log(
      `[findEntity] Error: category 參數必須是字串類型，收到類型: ${typeof category}`
    );
    return null;
  }

  const CATEGORY = [
    "Hostile mobs", // 主動攻擊 (怪物)
    "Passive mobs", // 被動生物
    "Vehicles", // 騎乘物
    "Projectiles", // 投射物
    "Immobile", // 不動裝飾
    "UNKNOWN", // 未定義
  ];

  if (category === "player") {
    // 玩家專用搜尋邏輯
    for (const entity of Object.values(bot.entities || {})) {
      if (entity.type === "player") {
        return entity;
      }
    }
    return null;
  } else {
    // 新增有效性檢查
    if (!CATEGORY.includes(category)) {
      console.log(
        `[WARN] 無效的 category 參數: ${category}，可用選項為:`,
        CATEGORY
      );
      return null;
    }

    // 原有分類搜尋邏輯
    for (const entity of Object.values(bot.entities || {})) {
      if (entity.kind === category) {
        return entity;
      }
    }
    return null;
  }
}
module.exports = { findEntity };
/** 不動
"Immobile"[
    "armor_stand",
    "block_display",
    "end_crystal",
    "glow_item_frame",
    "interaction",
    "item_display",
    "item_frame",
    "leash_knot",
    "painting",
    "text_display"
],
*/
/** 未定義
"UNKNOWN"[
    "area_effect_cloud",
    "experience_orb",
    "eye_of_ender",
    "falling_block",
    "item",
    "ominous_item_spawner",
    "lightning_bolt",
    "marker",
    "tnt",
    "player"
],*/
