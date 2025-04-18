async function printArmorStats(bot) {
  const helmetSlot = bot.getEquipmentDestSlot("head");
  const chestplateSlot = bot.getEquipmentDestSlot("torso");
  const leggingsSlot = bot.getEquipmentDestSlot("legs");
  const bootsSlot = bot.getEquipmentDestSlot("feet");
  const offHandSlot = bot.getEquipmentDestSlot("off-hand");
  let mainHandSlot = bot.getEquipmentDestSlot("hand");
  const helmet = bot.inventory.slots[helmetSlot]
    ? bot.inventory.slots[helmetSlot].displayName
    : "None";
  const chestplate = bot.inventory.slots[chestplateSlot]
    ? bot.inventory.slots[chestplateSlot].displayName
    : "None";
  const leggings = bot.inventory.slots[leggingsSlot]
    ? bot.inventory.slots[leggingsSlot].displayName
    : "None";
  const boots = bot.inventory.slots[bootsSlot]
    ? bot.inventory.slots[bootsSlot].displayName
    : "None";
  const offHand = bot.inventory.slots[offHandSlot]
    ? bot.inventory.slots[offHandSlot].displayName
    : "None";
  const mainHand = bot.inventory.slots[mainHandSlot]
    ? bot.inventory.slots[mainHandSlot].displayName
    : "None";
  const Test = [
    bot.getEquipmentDestSlot("head"),
    bot.getEquipmentDestSlot("torso"),
    bot.getEquipmentDestSlot("legs"),
    bot.getEquipmentDestSlot("feet"),
    bot.getEquipmentDestSlot("hand"),
    bot.getEquipmentDestSlot("off-hand"),
    bot.quickBarSlot[1],
  ];

  bot.safeChat(`【${helmetSlot}】Helmet 👒 : ${helmet}`, ``);
  bot.safeChat(`【${chestplateSlot}】Chestplate 🧥 : ${chestplate}`, ``);
  bot.safeChat(`【${leggingsSlot}】Leggings 👖 : ${leggings}`, ``);
  bot.safeChat(`【${bootsSlot}】Boots 👢 : ${boots}`, ``);
  bot.safeChat(`【${mainHandSlot}】Main-hand ✋ : ${mainHand}`, ``);
  bot.safeChat(`【${offHandSlot}】Off-hand 🛡 : ${offHand}`, ``);
  // bot.safeChat(`Test: ${Test}`); 👓👕👖👞🗡  👒🧥👖👢✋
}

module.exports = { printArmorStats };
