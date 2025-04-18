// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED, BOLD_MAGENTA } = require("../escapeCodeANSI.js");

// Bot 重生事件
async function botOnSpawn(bot) {
  bot.on("spawn", async () => {
    bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "spawn" Event.`); // debug 用
    await getBotSpawnState(bot);
  });
}

async function getBotSpawnState(bot) {
  let botGameMode = bot.game?.gameMode ?? "?? game mode";
  let botDimension = bot.game?.dimension ?? "?? dimension";
  let botPos = bot.entity?.position ?? "?? position";
  // 輸出訊息
  bot.logTimer(
    `Bot spawned in ${BOLD_MAGENTA}${botGameMode.toUpperCase()}${resetANSI} ` +
      `on ${BOLD_MAGENTA}${botDimension.toUpperCase()}${resetANSI} ` +
      `at ${botPos.round()}.`
  );
}

module.exports = { botOnSpawn, getBotSpawnState };
