// 注入 readline 函數 控制命令行
const readline = require("readline");

// 文字顏色 ANSI 控制碼常量
const {
  resetANSI,
  BOLD_SKY,
  BOLD_RED,
  BOLD_MAGENTA,
  DARK_RED,
  SKY,
  BLACK,
  YELLOW,
  REVERSE,
} = require("./escapeCodeANSI.js");

// 定義類
class createCLI {
  constructor(bot) {
    this._bot = bot; // 改為私有屬性  儲存 bot 實例
    this.rl = null; // 初始化 readline 介面
    this.rlStopManually = false; // 標記是不是手動關閉的
  }

  // 啟動 CLI
  async start() {
    const commandPrefix = this._bot.Bot_Config.commandSitting.prefix;
    // 新增前置檢查
    if (process.stdin.isPaused()) {
      process.stdin.resume();
    }
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }

    // 移除殘留監聽器
    // process.stdin.removeAllListeners("keypress");
    // this.rl.removeAllListeners();

    if (!this._bot) {
      console.warn(
        `${BLACK}[CLI] Cannot start without bot instance${resetANSI}`
      );
      return;
    }
    if (this.rl) {
      console.warn(
        `${BLACK}[CLI] Command line interface is already running.${resetANSI}`
      );
      return;
    }
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    this.rlStopManually = false;

    // 提示用戶 命令行可以輸入訊息
    console.log(
      `${BLACK}[CLI] Command line interface started.${resetANSI}\n` +
        `> ${BLACK}Type ${SKY}${commandPrefix} help${resetANSI} ${BLACK}for commands.${resetANSI}`
    );

    this.rl.on("line", (line) => {
      const command = line.trim();
      if (command) {
        try {
          console.log("> ", command); // 標示 CLI 輸入的命令
        } catch (error) {
          console.error(`[CLI] Error processing command: ${error.message}`);
        }
      }

      if (this.bot) {
        try {
          readline.moveCursor(process.stdout, 0, -1); // 遊標上移一行
          readline.clearScreenDown(process.stdout); // 清除遊標下方的所有行
          this.bot.chat(line); // 將命令傳送至遊戲聊天室
        } catch (error) {
          console.error(`[CLI] Error: ${error.message}`);
        }
      } else {
        console.error(
          `${BLACK}[CLI] Command line interface fails. Bot is not initialized.${resetANSI}`
        );
      }
    });

    this.rl.on("SIGINT", () => {
      // 檢測用戶按下 <Ctrl^C>
      this.rlStopManually = true;
      readline.moveCursor(process.stdout, -2, 0); // 遊標左移兩格
      console.log(
        `> [CLI] Process close by manually type ${BOLD_RED}<Ctrl^C>${resetANSI}.`
      );
      this.rl.close();
    });

    this.rl.on("close", () => {
      if (this.rlStopManually) {
        this.rlStopManually = false;
        // 結束整個程式
        console.log(
          `\n${REVERSE}   Stop   ${resetANSI} :: Process exit. See you again!\n`
        );
        process.exit(0);
      }
    });
  }

  // 關閉 CLI
  async close() {
    if (!this.rl) {
      console.warn(
        `${BLACK}[CLI] Command line interface closed. But CLI is not start yet.${resetANSI}`
      );
      return;
    }

    // 分階段關閉
    try {
      this.rl.close();
      console.logTimer("[CLI] Command line interface fully closed.");
    } catch (err) {
      console.logTimer(
        `[CLI] Close failed: ${BOLD_MAGENTA}${err.message}${resetANSI}`
      );
      console.error(`${err.stack}`);
    } finally {
      this.rl = null;
    }
  }

  // 添加安全訪問方法
  get bot() {
    if (!this._bot) {
      throw new Error("Bot instance not initialized");
    }
    return this._bot;
  }

  // prompt init 提示符號初始化
  creatPrompt() {
    if (!this.rl) return;

    // 強制同步緩衝區
    this.rl.line = "";
    this.rl.cursor = 0;

    // 物理重置遊標位置
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);

    // 使用 write + flush 組合
    process.stdout.write("> ");
    if (process.stdout.flush) process.stdout.flush(); // Node.js 14+
  }

  // 將遊標往左兩格 重製輸入的距離
  moveCursorLeft2() {
    if (!this.rl) return;
    // 使用同步組合指令
    readline.moveCursor(process.stdout, -2, 0);
    readline.clearLine(process.stdout, 1);
    readline.cursorTo(process.stdout, process.stdout.columns - 2);
  }
}

module.exports = createCLI;
