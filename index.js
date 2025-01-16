// 引入 envLoader.js 模組 (處理環境變數)
const { envLoader } = require("./source/envLoader");
// 引入 bot-init.js 模組內函數 (處理 bot 創建與重連)
const { botSpawn, botRespawn } = require("./source/bot-init.js");
// 引入 logTimer.js 模組
const { logTimer } = require("./source/logTimer.js");
// 擴展 console 對象，將 logTimer 添加到其中
console.logTimer = logTimer;
// 引入 errorHandler.js 模組 (處理未捕獲的異常，防止崩潰)
const { errorHandler } = require("./source/errorHandler");

// 可選用模組
const Modules = [
  // "./source/module/action-chat",
  "./source/module/chat-extra-check.js",
  "./source/module/action-lookAt",
];

// Bot 延遲設定
const botTimer = { waitForLoading: 5000, respawn: 60000 };

// 處理複數 Bot ****未完成****
const Bots = ["bot_01"];
let bot = Bots[0];

// Bot 基本參數
let Bot_Login_Config = { viewDistance: "tiny" };

// 設置 uncaughtException 處理
errorHandler();
// 主程序
async function main() {
  try {
    try {
      await envLoader(); // 加載環境變數
      console.logTimer("[Env] Environment variables loaded successfully!");
    } catch (error) {
      console.error("[Env] Error loading environment variables:", error);
    }
    Bot_Login_Config = {
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      password: process.env.MC_PASSWORD,
      version: process.env.MC_VERSION,
      auth: process.env.MC_AUTH,
    };
    await botSpawn(bot, Bot_Login_Config, Modules, botTimer);
    // 在 bot 成功生成後啟動 CLI (命令行監聽)
  } catch (error) {
    console.error(`[main] Bot spawn fails: ${error.message}\n----------`);
    botRespawn(botTimer);
  }
}

// 主程序錯誤捕捉
try {
  main();
} catch (e) {
  console.error(`[main] Fatal error: ${e.message}\n----------`);
}
