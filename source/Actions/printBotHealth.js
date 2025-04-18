async function printBotHealth(bot, options) {
  // 基礎訊息
  const gameModeList = ["Survival", "Creative", "Adventure", "Spectator"];
  const gamemode = gameModeList[bot.player.gamemode] || "N/A";
  const ping = bot.player.ping || "N/A";
  const spawnPoint =
    `(${bot.spawnPoint.x}, ${bot.spawnPoint.y}, ${bot.spawnPoint.z})` || "N/A";

  // 取得生命值與食物數值
  const health = parseFloat(bot.health.toFixed(2));
  const food = parseFloat(bot.food.toFixed(2));

  // 飽和度可能需要透過自訂或擴充取得，若無法取得就回傳 "N/A"
  const saturation =
    bot.foodSaturation !== undefined
      ? parseFloat(bot.foodSaturation.toFixed(2))
      : "N/A";

  // 經驗值：若 bot.experience 存在就取得，否則顯示 "N/A"
  const experienceLevel =
    bot.experience && bot.experience.level !== undefined
      ? bot.experience.level
      : "N/A";
  const experiencePoints =
    bot.experience && bot.experience.points !== undefined
      ? bot.experience.points
      : "N/A";
  const experienceProgress =
    bot.experience && bot.experience.progress !== undefined
      ? parseFloat(bot.experience.progress.toFixed(2))
      : "N/A"; //  progress: 0.5714285969734192

  const attributes = bot.entity.attributes;
  //   console.log({ attributes });

  // 盔甲數值：

  const armorsBase = bot.entity.attributes["generic.armor"].value || 0;
  const armors = bot.entity.attributes["generic.armor"].modifiers;
  const armorsToughBase =
    bot.entity.attributes["generic.armor_toughness"].value / 100 || 0;
  const armorsTough =
    bot.entity.attributes["generic.armor_toughness"].modifiers;
  let armorValue = 0;
  let armorToughValue = 0;

  if (armors) {
    armorValue =
      armorsBase + armors.reduce((sum, armor) => sum + armor.amount, 0);
  }
  if (armorsTough) {
    armorToughValue =
      armorsToughBase +
      armorsTough.reduce((sum, armor) => sum + armor.amount, 0) / 100;
  }

  // 氧氣值：使用 bot.entity.oxygen，若不存在則回傳 "N/A"
  const oxygen =
    bot.entity && bot.oxygenLevel !== undefined ? bot.oxygenLevel : "20";

  // Buffs：檢查 bot.entity.effects 內的 buff 資訊 (若有使用支援效果的模組)
  let buffs = "*none*";
  if (bot.entity && bot.entity.effects) {
    const effectIds = Object.keys(bot.entity.effects);

    const effectDescriptions = effectIds.map((id) => {
      const effectData = bot.entity.effects[id]; // 取得效果資訊
      const effect = bot.registry.effectsArray.find((e) => e.id === Number(id));

      if (!effect) return `Unknown(${id})`; // 避免找不到對應效果

      const level = effectData.amplifier + 1; // 等級從 1 開始
      const time =
        effectData.duration === -1
          ? "infinite "
          : parseFloat((effectData.duration / 20).toFixed(1)); // 轉換為秒並保留1位小數

      return `${effect.name} (lv: ${level}, time: ${time}s)`;
    });

    buffs =
      effectDescriptions.length == 0 ? "N/A" : effectDescriptions.join(", ");
  }

  // 背包物品格數：統計 inventory.slots 中不為 null 的格子數
  let invAllCount = 0;
  const invTotal = bot.inventory.inventoryEnd - 9;
  let invCount = Object.keys(bot.inventory.items()).length;
  let invOther = 0;
  if (bot.inventory && bot.inventory.slots) {
    for (const slot of bot.inventory.slots) {
      if (slot) invAllCount++;
    }
    invOther = invAllCount - invCount;
  }

  // 組合訊息
  const statusMessage =
    `📊 Ping: ${ping}, 🎮 GameMode: ${gamemode}, 🛏 MainSpawnPoint: ${spawnPoint}\n` +
    `🖤 HP: ${health}, 🍗 Food: ${food} + ${saturation}, 💧 Oxygen: ${oxygen}\n` +
    `👤 Armor: ${armorValue}, Toughness%: ${armorToughValue}\n` +
    `💼 Inv: ${invCount}/${invTotal}` +
    `${invOther !== 0 ? ` + 🛡 ${invOther}` : ``}\n` +
    `👁 ExpLv: ${experienceLevel}, Exp%: ${experienceProgress}, ExpPoint ${experiencePoints}\n` +
    `💪 Effect: ${buffs}`;

  await bot.safeChat(statusMessage, ``);

  // 回傳狀態字串以便其他邏輯使用
  return statusMessage;
}

module.exports = { printBotHealth };
