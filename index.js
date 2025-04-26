// 引入 envLoader.js 模組 (處理環境變數)
const { envLoader } = require("./source/envLoader");
// 引入 BK-bot-init.js 模組內函數 (處理 bot 創建與重連)
const { botSpawn, botRespawn } = require("./source/BK-bot-init.js");
// 引入 logTimer.js 模組
const { logTimer } = require("./source/logTimer.js");
// 擴展 console 對象，將 logTimer 添加到其中
console.logTimer = logTimer;
// 引入 errorHandler.js 模組 (捕捉非預期錯誤，防止崩潰)
const { errorHandler } = require("./source/errorHandler");

// 文字顏色 ANSI 控制碼常量
const { resetANSI, BLACK } = require("./source/escapeCodeANSI.js");

// 處理複數 Bot ****未完成****
const Bots = ["bot_01"];
let botID = Bots[0];

// Bot 基本參數
let Login_Config = {};
let Bot_Config = {};

// 載入 錯誤處理函數 捕捉非預期錯誤 uncaughtException
errorHandler();
// 主程序
async function main() {
  // https://www.asciiart.eu/text-to-ascii-art
  const startTextArt = [
    "  ██████╗_██╗__██╗_____██████╗__██████╗_████████╗",
    "  ██╔══██╗██║_██╔╝_____██╔══██╗██╔═══██╗╚══██╔══╝",
    "  ██████╔╝█████╔╝█████╗██████╔╝██║___██║___██║___",
    "  ██╔══██╗██╔═██╗╚════╝██╔══██╗██║___██║___██║___",
    "  ██████╔╝██║__██╗_____██████╔╝╚██████╔╝___██║___",
    "  ╚═════╝_╚═╝__╚═╝_____╚═════╝__╚═════╝____╚═╝___",
  ];
  for (const line of startTextArt) {
    console.log(line);
  }
  console.log(``);
  // console.log(`\n[Terminal] :: <BK-mineflayer-Bot> main program is starting.`);
  try {
    // 異步等待 環境變數加載
    await envLoader();
    // 將讀取到的外部環境變數 填入等待後續傳遞
    Login_Config = {
      host: process.env.MC_HOST,
      port: process.env.MC_PORT,
      username: process.env.MC_USERNAME,
      password: process.env.MC_PASSWORD,
      version: process.env.MC_VERSION,
      auth: process.env.MC_AUTH,
      hideErrors: process.env.MINEFLAYER_HIDE_ERRORS || false,
    };
    Bot_Config = {
      respawnSitting: {
        minDelayMs:
          parseConfig(process.env.BOT_RESPAWN_MIN_WAIT_FOR_MS) || 5000,
        maxDelayMinutes:
          parseConfig(process.env.BOT_RESPAWN_MAX_WAIT_FOR_MIN) || 30,
        retryMultiply:
          parseConfig(process.env.BOT_RESPAWN_MULTIPLY_FACTOR) || 2,
        retryMaxTimes: parseConfig(process.env.BOT_RESPAWN_MAX_TIMES) || 6,
      },
      commandSitting: {
        owner: parseConfig(process.env.BOT_COMMAND_OWNER) || [],
        prefix: parseConfig(process.env.BOT_COMMAND_PREFIX) || "@bot",
      },
      safeChatSetting: {
        silence: parseConfig(process.env.BOT_CHAT_SILENCE) || false,
        filterMs: parseConfig(process.env.BOT_CHAT_FILTER_MS) || 2000,
        filterCount: parseConfig(process.env.BOT_CHAT_FILTER_COUNT) || 10,
        helloWorld:
          parseConfig(process.env.BOT_CHAT_HELLO_WORLD) ||
          "Hello World! I'm mineflayer Bot.",
      },
      pathfinderSetting: {
        canDig: parseConfig(process.env.BOT_PATH_CANDIG) || false,
        allow1by1towers: parseConfig(process.env.BOT_PATH_1X1TOWER) || false,
        canOpenDoors: parseConfig(process.env.BOT_PATH_CANOPENDOOR) || true,
        canScafBlocksName: parseConfig(process.env.BOT_PATH_SCAF_BLOCKS) || [],
      },
      homeSetting: {
        homePos: {
          x: parseConfig(process.env.BOT_HOME_X) || 0,
          y: parseConfig(process.env.BOT_HOME_Y) || 0,
          z: parseConfig(process.env.BOT_HOME_Z) || 0,
        },
        bedPos: {
          x: parseConfig(process.env.BOT_HOME_BED_X) || 0,
          y: parseConfig(process.env.BOT_HOME_BED_Y) || 0,
          z: parseConfig(process.env.BOT_HOME_BED_Z) || 0,
        },
        containers: [],
      },
      viewerSetting: {
        isEnabled: parseConfig(process.env.BOT_WEB_VIEWER) || false,
        port: parseConfig(process.env.BOT_WEB_VIEWER_PORT) || 3000,
      },
      aiChatSetting: {
        isEnabled: parseConfig(process.env.BOT_AI_CHAT) || false,
        modelName: parseConfig(process.env.BOT_AI_CHAT_MODEL) || "",
        apiUrl: parseConfig(process.env.BOT_AI_CHAT_API_URL) || "",
        prefix: parseConfig(process.env.BOT_AI_CHAT_PREFIX) || "@ai",
        checkPlayerInRange: parseConfig(process.env.BOT_AI_CHAT_RANGE) || 16,
        templateFolder:
          parseConfig(process.env.BOT_AI_CHAT_TEMPLATE_FOLDER) ||
          "./AI_prompt/minecraft.template.js",
        templateId: parseConfig(process.env.BOT_AI_CHAT_TEMPLATE_ID) || 1,
        generationParams: {
          temperature: parseConfig(process.env.BOT_AI_CHAT_PARAMS_TEM) || 0.8,
          top_p: parseConfig(process.env.BOT_AI_CHAT_PARAMS_TOP_P) || 0.9,
          max_tokens: parseConfig(process.env.BOT_AI_CHAT_PARAMS_TOKENS) || 120,
          frequency_penalty:
            parseConfig(process.env.BOT_AI_CHAT_PARAMS_FRQ) || 0.2,
          presence_penalty:
            parseConfig(process.env.BOT_AI_CHAT_PARAMS_PRS) || 0.2,
        },
      },
      waitForTicks: parseConfig(process.env.BOT_WAIT_FOR_TICKS) || 30,
      exportFolder: parseConfig(process.env.BOT_EXPORT_FOLDER) || "_log",
      modules: parseConfig(process.env.BOT_MODULES) || [],
      loadedModules: [],
    };
    // 傳遞參數 開始 Bot 初始化 執行生成函數
    await botSpawn(botID, Login_Config, Bot_Config);
  } catch (error) {
    console.error(`${BLACK}[BK-bot main] Error: ${error.message}${resetANSI}`);
    await botRespawn(null, botID, Login_Config, Bot_Config);
  }

  /**
   * 處理 .env 檔案的字串類型轉換
   * @param {Object} value - 原始值
   * @returns {Object} 處理後的值
   */
  // 定義 parseConfig 方法 處理環境參數
  function parseConfig(value) {
    if (typeof value === "string") {
      // 處理明確的空值標記
      if (value === "" || value === '""' || value === "[]") return null;

      // 優先嘗試解析為數字（整數或浮點數）
      const numericValue = Number(value);
      if (!isNaN(numericValue) && value.trim() !== "") return numericValue;

      // 嘗試解析為 JSON 結構
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const filtered = parsed
            .map((v) => (v === "" ? null : v)) // 陣列內部 "" 轉換為 null
            .filter((v) => v !== null); // 過濾掉所有的 null
          return filtered.length ? filtered : null; // 如果陣列只剩下 [null]，則返回 null
        }
        return parsed;
      } catch (e) {
        // 非 JSON 結構的普通字串，直接返回
        return value;
      }
    }
    return null; // 其他不符合條件的情況 -> null
  }
}

// 主程序錯誤捕捉
try {
  main();
} catch (error) {
  const mainError = new Error(`
    [BK-bot main] >> Fatal error! : 
    - Error: ${error.message}
  `);
  mainError.name = "MainProgramInitializationFailure";
  throw mainError;
}
