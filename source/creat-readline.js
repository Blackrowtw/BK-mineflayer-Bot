// 注入操作命令列的模組
const readline = require("readline");

function creatReadline(bot) {
  let rl = null;
  return function () {
    if (rl) {
      console.warn("[CLI] Command line interface is already running.");
      return;
    }

    // 創建 rl 對象 用來操作命令行
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // 命令行操作
    rl.on("line", (line) => {
      const command = line.trim();
      if (command) {
        try {
          console.log("> "); // 標示 CLI 輸入的命令
        } catch (error) {
          console.error(`[CLI] Error executing command: ${error.message}`);
        }
      }

      // 確保 bot 已經初始化
      try {
        if (bot) {
          readline.moveCursor(process.stdout, 0, -1); // 將游標上移一行
          readline.clearScreenDown(process.stdout); // 清除游標下方的所有行（即我們輸入的最後一行）
          bot.safeChat(line.toString()); // 將我們輸入的命令行傳送至遊戲聊天室
        } else {
          console.error(
            "[CLI] Command line interface fails. Bot is not initialized."
          );
        }
      } catch (error) {
        console.error(`[CLI] Error: ${error.message}`);
      }
    });

    rl.on("close", () => {
      readline.moveCursor(process.stdout, -2, 0); // 我們將游標向左移動兩個位置（因為輸入箭頭的緣故）
      if (isTryingRespawn) {
        return;
      } else {
        console.logTimer(
          `[CLI] Paused. Type ${redBold}<Ctrl^C>${resetANSI} again to exit process.`
        );
      }
    });

    return rl;
  };
}
