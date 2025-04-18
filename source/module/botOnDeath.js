// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED, BOLD_MAGENTA } = require("../escapeCodeANSI.js");

// Bot 死亡事件
async function botOnDeath(bot) {
  bot.on("death", async () => {
    // bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "death" Event.`); // debug 用
    await getBotDeathState(bot);
    bot.safeChat(`Oh, I'm die. Thank you forever.`, `💣`);
    await bot.waitForTicks(bot.Bot_Config.waitForTicks * 3);
  });
}

async function getBotDeathState(bot) {
  let botPos = bot.entity?.position ? bot.entity.position.round() : "N/A";
  let nearEnti = bot.nearestEntity() ? bot.nearestEntity() : "N/A";
  let nearEntiName = nearEnti?.username
    ? nearEnti.username
    : nearEnti?.displayName
    ? nearEnti.displayName
    : nearEnti?.name ?? "N/A";

  // console.log(nearEnti);
  // 輸出訊息
  bot.logTimer(
    `Bot ${BOLD_MAGENTA}death${resetANSI} at ` +
      `${BOLD_MAGENTA}${botPos}${resetANSI}` //+
    // ` with ${BOLD_MAGENTA}${nearEntiName}${resetANSI}.`
  );
}

module.exports = { botOnDeath, getBotDeathState };
