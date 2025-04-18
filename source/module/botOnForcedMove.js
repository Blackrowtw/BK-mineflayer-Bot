// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED } = require("../escapeCodeANSI.js");

// Bot 重生事件
async function botOnForcedMove(bot) {
  // 增加一個標記，用於識別第一次觸發
  let isFirstMove = true;
  bot.on("forcedMove", async () => {
    // bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "forcedMove" Event.`); // debug 用

    // 如果是第一次觸發，跳過 stopAll 並設置標記
    if (isFirstMove) {
      isFirstMove = false;
      return;
    }
    const LCM = bot.loopableCommandManager;
    await bot.safeChat(`Bot 離開原本地點，執行 stopAll 命令`, `✨`);
    await LCM.start(bot, "stopAll");
    await bot.waitForTicks(bot.Bot_Config.waitForTicks);
  });
}

module.exports = { botOnForcedMove };
