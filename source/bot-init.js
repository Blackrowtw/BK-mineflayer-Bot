// 注入 mineflayer 模組
const mineflayer = require("mineflayer");
// 注入 dateformat 模組 (處理時間格式)
const dateformat = require("dateformat");
// 注入 delay 模組 (處理程式延遲時間)
const delay = require("delay");
// 注入 path 模組 (處理檔案路徑)
const path = require("path");
// 注入操作命令列的模組
const readline = require("readline");

// 文字顏色 ANSI 控制常量設定
const resetANSI = "\x1b[0m";
const redBold = "\x1b[31;1m";
const yellowBold = "\x1b[33;1m";
const lightBlueBold = "\x1b[36;1m";

// 載入 safeRequire 函數
const { safeRequire } = require("./bot-safe-require");
// botBasicEvents 參數引用
const { botOnSpawn } = require("./module/bot-on-spawn.js");
const { botOnKicked } = require("./module/bot-on-kicked.js");
const { botOnMessag } = require("./module/bot-on-messag.js");
const { botOnError } = require("./module/bot-on-error.js");

// Bot 標記用變量
let isTryingRespawn = false; // 用於標記 Bot 是否正在等待重新連線

// Rl 標記用變量
let rl = null;

// 開始建立 Bot 並登入
async function botSpawn(bot, Bot_Login_Config, Modules, botTimer) {
  // Bot 創建
  bot = mineflayer.createBot(Bot_Login_Config);

  let serverIP =
    Bot_Login_Config.host.split(".").slice(0, 2).join(".") + ".*.***";
  let serverPort = Bot_Login_Config.port;
  // 登入資訊 IP & 版本 訊息
  console.log(
    `----------\n[Terminal] :: Connecting to server ${yellowBold}[${serverIP}]:${serverPort}${resetANSI} (ver-${bot.version})\n----------`
  );

  // Bot 成功登入伺服器事件 只執行一次 (角色仍未生成)
  bot.once("login", () => {
    console.logTimer(
      `Bot ${lightBlueBold}<${bot.username}>${resetANSI} now login ...`
    );
  });
  // 開始啟用 CLI
  rlStart(bot);
  // Bot 重生訊息
  botOnSpawn(bot);
  // Bot 被踢出訊息
  botOnKicked(bot);
  // Bot 回傳伺服器訊息
  botOnMessag(bot);
  // 注入 訊息處理函數
  setBotChatLog(bot, rl);

  // Bot 成功登入並生成後 只執行一次
  bot.once("spawn", () => {
    // 顯示伺服器訊息 ping
    console.logTimer(
      `Server's ping: ${yellowBold}${
        bot.player?.ping ?? "404 not found"
      }${resetANSI}, ViewDistance: ${yellowBold}${
        bot.game.serverViewDistance
      }${resetANSI}`
    );
    //開始載入其他模組
    console.logTimer(`[initBot] >> Now trying loading Bot modules ...`);
    delay(botTimer.waitForLoading);
    // 解析绝对路径
    Modules.forEach((modulePath) => {
      const absolutePath = path.resolve(modulePath);
      const module = safeRequire(absolutePath, bot);
      if (module) {
        module(bot);
      }
    });
    // 提示命令行 可以輸入訊息
    console.logTimer(
      "[CLI] Command line interface started. Type 'help' for commands."
    );
    rl.setPrompt("> ");
    rl.prompt();
  });

  // Bot 斷線
  bot.on("end", () => {
    console.logTimer(
      `[bot.on-end] Bot ${lightBlueBold}<${bot.username}>${resetANSI} is disconnect.`
    );
    //重新生成 Bot
    botRespawn(bot, Bot_Login_Config, Modules, botTimer);
  });

  // Bot 發生錯誤 處理
  botOnError(bot);

  // 將 Bot 對象返回主程式
  return bot;
}

// Bot 斷線處理 延遲並重啟
async function botRespawn(bot, Bot_Login_Config, Modules, botTimer) {
  if (isTryingRespawn) {
    console.logTimer("[botRespawn] Skipping...");
    return;
  }
  // 標記開始重啟
  isTryingRespawn = true;
  // 重置 readline 狀態
  rlClose();
  // 確保之前的 rl 被正確關閉
  rl = null;
  console.logTimer(
    `[botRespawn] Trying respawn at ${redBold}${
      botTimer.respawn / 60000
    } min${resetANSI} later...`
  );
  await delay(botTimer.respawn);
  console.log(
    `[Terminal] >> Now ${redBold}respawn${resetANSI} mineflayer bot.`
  );
  isTryingRespawn = false;
  await botSpawn(bot, Bot_Login_Config, Modules, botTimer);
}

function setBotChatLog(bot, rl) {
  // 處理 Bot 回傳訊息函數 (加入時間戳 並操作輸入介面)
  bot.chatLog = (chatmsg) => {
    if (typeof chatmsg === "string") {
      // 在輸出的開頭插入當前時間
      chatmsg = `[${dateformat(new Date(), "isoTime")}] >> ${chatmsg}`;
    }
    readline.moveCursor(process.stdout, -2, 0); // 我們將游標向左移動兩個位置（因為輸入箭頭的緣故）
    console.log(chatmsg);
    // 將伺服器訊息回傳到命令行後 重新產生輸入列上的小箭頭
    // 確保 rl 存在
    if (!rl) {
      console.warn("[bot.chatLog] Warning: rl is null. Skipping prompt.");
      return;
    } else {
      rl.prompt();
    }
  };
}

// 啟動 CLI
function rlStart(bot) {
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
}

// 關閉 CLI
function rlClose() {
  if (rl) {
    rl.close();
    console.logTimer("[CLI] Closed.");
  } else {
    console.warn("[CLI] Command line interface is not running or rl is null.");
  }
}

// 獲取 RL 對象
const getRl = () => {
  // console.log(`[CLI] rl 狀態傳遞: ${typeof rl}`);
  return rl;
};

module.exports = {
  botSpawn,
  botRespawn,
  rlStart,
  rlClose,
  getRl,
};
