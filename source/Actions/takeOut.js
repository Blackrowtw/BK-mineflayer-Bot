async function takeOut(bot, itemName, index = 1) {
  if (!itemName) {
    bot.safeChat(`你想要我拿出什麼？`, `❓`);
    // 沒有輸入參數 退出
    return;
  }
  if (!parseInt(index, 10) || index <= 0 || index > 46) {
    bot.safeChat(`請輸入 1 - 46 的整數`, `❌`);
    return;
  }
  // 遍歷身上背包 尋找庫存是否符合
  const ITEM = bot.inventory.items().find((i) => i.name.includes(itemName));
  const ITEMS = bot.inventory.items().filter((i) => i.name.includes(itemName));

  if (!ITEM) {
    bot.safeChat(`沒有物品名稱符合 ${itemName}`, `❌`);
    return false;
  }
  if (ITEMS.length === 1) {
    bot.safeChat(`找到背包裡面有 ${ITEM.displayName}`, `🔎`);
  } else {
    bot.safeChat(
      `找到物品 ${ITEM.displayName} 在欄位 ${ITEM.slot} 上，共有 ${ITEMS.length} 種符合的物品`,
      `🔎`
    );
  }

  // 定義目前主手的 Slot 位置與物品
  const mainHandSlot = bot.getEquipmentDestSlot("hand");
  const mainHandItem = bot.inventory.slots[mainHandSlot];

  await bot.moveSlotItem(ITEM.slot, mainHandSlot);
  //   await bot.equip(ITEM, "hand");

  if (index > 0 && index <= ITEMS.length) {
    let itemDisplayName = ITEMS[index - 1].displayName;
    let itemSlot = ITEMS[index - 1].slot;
    try {
      if (ITEMS.length === 1) {
        bot.safeChat(`將 ${itemDisplayName} 放到手上`);
      } else {
        bot.safeChat(`選擇第 ${index} 種物品 ${itemDisplayName} 放到手上`);
      }
      await bot.moveSlotItem(itemSlot, mainHandSlot);
    } catch (error) {
      bot.safeChat(`錯誤: ${itemDisplayName} ${error}`, `❌`);
      console.log(error);
    }
  } else {
    bot.safeChat(`並沒有第 ${index} 種物品`, `❌`);
  }
  //   // 如果手上的物品是不存在 或是 輸入的與手上的物品名稱不同
  //   if (!mainHandItem || mainHandItem.name !== ITEM.name) {
  //     // 遍歷身上背包 尋找庫存
  //     // const itemToTakeOut = bot.inventory.items().find((i) => i.name.);

  //     if (!itemToEquip) {
  //       bot.safeChat(`錯誤: 你沒有 ${ITEM.displayName} 可用於放置！`);
  //       return false;
  //     }

  //   }
}

module.exports = { takeOut };
