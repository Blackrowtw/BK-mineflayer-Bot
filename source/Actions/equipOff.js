const armorSlotNameInMineflayer = [
  "head",
  "torso",
  "legs",
  "feet",
  "off-hand",
  "hand",
];

async function equipOff(bot) {
  /** Mapping of armor slotID*/
  const ARMOR_SLOTS = armorSlotNameInMineflayer.map((slotName) =>
    bot.getEquipmentDestSlot(slotName)
  );

  /** Mapping of armor slot items*/
  const ARMOR_ITEMS = ARMOR_SLOTS.map(
    (slot) => bot.inventory.slots[slot] || null
  );

  /** Mapping of empty slotID
   *  排除 0-4 合成欄位, 5-8 裝備欄位
   */
  const EMPTY_SLOTS = bot.inventory.slots
    .map((slot, index) => (slot ? null : index))
    .filter((slot) => slot !== null && slot > 8);
  try {
    // 計算裝備數量與背包空間數量 給予不同對話
    let armorItemsCount = ARMOR_ITEMS.filter((item) => item !== null).length;
    let emptySlotsCount = EMPTY_SLOTS.length;
    if (armorItemsCount === 0) {
      bot.safeChat(`人家早就光溜溜的囉`, `😘`);
    } else {
      if (emptySlotsCount === 0) {
        bot.safeChat(`人家的背包已經塞滿了`, `🥵`);
      } else if (armorItemsCount > emptySlotsCount) {
        bot.safeChat(`人家身上沒有位置放了啦`, `😫`);
      } else {
        // 開始循環 0-4 及 45 欄位 並脫下裝備
        for (let i = 0; i < ARMOR_ITEMS.length; i++) {
          const item = ARMOR_ITEMS[i];
          // 跳過沒有物品的欄位
          if (!item) continue;
          // 取得對應的裝備欄位名稱
          const slotName = armorSlotNameInMineflayer[i];
          // 欄位名稱轉換
          const slotName2Map = () => {
            if (!slotName) return null; // 提前攔截
            const nameMap = {
              head: "頭盔欄",
              torso: "胸甲欄",
              legs: "護腿欄",
              feet: "靴子欄",
              "off-hand": "副手欄",
              hand: "主手",
            };
            return nameMap[slotName] ?? null;
          };
          try {
            await bot.swingArm();
            await bot.waitForTicks(1);
            await bot.unequip(slotName);
            await bot.waitForTicks(1);
            bot.safeChat(`已從 ${slotName2Map()} 卸下 ${item.displayName}`);
          } catch (err) {
            bot.safeChat(
              `bot.unequip ${sourceType} 發生錯誤: ${err.message}`,
              "❌"
            );
          }
        }
        bot.safeChat(`討厭，尼怎麼要人家脫光光？`, `😱`);
      }
    }
  } catch (err) {
    bot.safeChat(`脫下裝備失敗`, `❌`);
    console.logTimer(`[equipOff] bot.unequip failed: ${err.message}`);
    console.log(err.stack);
  }
}
module.exports = { equipOff };
