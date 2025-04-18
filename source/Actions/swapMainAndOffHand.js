async function swapMainAndOffHand(bot) {
  try {
    // 取得主手與副手的物品
    const mainHandSlot = bot.getEquipmentDestSlot("hand");
    const offHandSlot = bot.getEquipmentDestSlot("off-hand");

    const mainHandItem = bot.inventory.slots[mainHandSlot];
    const offHandItem = bot.inventory.slots[offHandSlot];

    // 如果兩隻手都是空的，就不做交換
    if (!mainHandItem && !offHandItem) {
      bot.safeChat("兩手空空，來去如風");
      return;
    }

    // 先將主手物品移到副手
    if (mainHandItem) {
      // await bot.equip(mainHandItem, "off-hand");
      await bot.moveSlotItem(mainHandSlot, offHandSlot);
      bot.safeChat("見證奇蹟的時刻！");
      return;
    }

    // 再將副手物品移到主手
    if (offHandItem) {
      // await bot.equip(offHandItem, "hand");
      await bot.moveSlotItem(offHandSlot, mainHandSlot);
      bot.safeChat("直接雙手交換！");
      return;
    }
  } catch (err) {
    console.error("交換失敗:", err);
    bot.safeChat("初四了阿北");
  }
}

module.exports = { swapMainAndOffHand };
