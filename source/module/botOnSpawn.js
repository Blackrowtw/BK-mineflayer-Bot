// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED, BOLD_MAGENTA } = require("../escapeCodeANSI.js");
// 增加一個標記，用於識別第一次觸發
let isFirstMove = true;

// Bot 重生事件
async function botOnSpawn(bot) {
  bot.on("spawn", async () => {
    bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "spawn" Event.`); // debug 用

    await getBotSpawnState(bot);
    await stopBot(bot);
  });
}

// 如果是第一次觸發，跳過 stopAll 並設置標記
async function stopBot(bot) {
  if (isFirstMove) {
    isFirstMove = false;
    return;
  }
  const LCM = bot.loopableCommandManager;
  await bot.safeChat(`Bot 離開原本地點，執行 stopAll 命令`, `✨`);
  await LCM.start(bot, "stopAll");
  await bot.waitForTicks(bot.Bot_Config.waitForTicks);
}

// 顯示提示訊息
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
