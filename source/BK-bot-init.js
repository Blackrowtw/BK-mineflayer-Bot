// 注入 mineflayer 模組
const mineflayer = require("mineflayer");

// node 功能模組
const delay = require("delay"); // 注入 delay 模組 (處理程式延遲時間)
const fs = require("fs"); // 注入 fs 模組 (處理檔案存取)
const path = require("path"); // 注入 path 功能 (處理檔案路徑)

// 文字顏色 ANSI 控制碼常量
const {
  resetANSI,
  BOLD_SKY,
  BOLD_RED,
  BOLD_MAGENTA,
  DARK_RED,
  SKY,
  BLACK,
  GOLD,
  REVERSE,
} = require("./escapeCodeANSI.js");

// 引入 CLI 類 :: 用於操作命令列
const createCLI = require("./bot-createCLI.js");

// 引入 Actions 類 :: 用於執行 Bot 的基礎動作集合
const { Actions } = require("./Actions.js");

// 引入 LoopableCommandManager :: 用於管理 Bot 的命令例項
const { LoopableCommandManager } = require("./LoopableCommandManager.js");

// 功能模組引用
const { createLogTimer } = require("./bot-createLogTimer.js");
const { createSafeChat } = require("./bot-createSafeChat.js");
const { safeRequire } = require("./safeRequire.js");

// 功能差件初始化
const { initAutoEat } = require("./module/init_AutoEat.js");
const { initCollectBlock } = require("./module/init_CollectBlock.js");
const { initMineflayerViewer } = require("./module/init_MineflayerViewer.js");
const { initPathfinder } = require("./module/init_Pathfinder.js");
const { initPVP } = require("./module/init_PVP.js");
const { initTool } = require("./module/init_Tool.js");
const { initAIChat } = require("./module/init_AIChat.js");

// bot Listeners Events 引用
const { botOnSpawn, getBotSpawnState } = require("./module/botOnSpawn.js");
const { botOnForcedMove } = require("./module/botOnForcedMove.js");
const { botOnDeath } = require("./module/botOnDeath.js");
const { botOnKicked } = require("./module/botOnKicked.js");
const { botOnMessage } = require("./module/botOnMessage.js");
const { botOnChat } = require("./module/botOnChat.js");

// 全域性狀態管理
const state = {
  isTryingSpawn: false,
  isWaitForRespawn: false,
  currentBot: null,
  currentCli: null,
  checkConnect: 30000, // 連線超時時間
};

const respawnSitting = {
  retryMaxTimes: 6, // 預設值 最大重試次數
  retryMultiply: 2, // 預設值 重試等待時間的計算乘數
  baseDelay: 5000, // 預設值 初始等待時間
  maxDelay: 30, // 預設值 最大等待時間
  retryCount: 0, // 當前重試次數
  retryDelay: 5000, // 當前重試等待時間
};

/*  <<主功能程式>>
 * */
async function botSpawn(botID, loginConfig, botConfig) {
  if (state.isTryingSpawn) {
    console.log(
      `${BLACK}[botSpawn] Already trying to spawn. Skipping...${resetANSI}`
    );
    return null;
  }

  // 標記開始初始化狀態，避免重複觸發
  state.isTryingSpawn = true;

  try {
    console.log(
      `${BLACK}[botSpawn] Start creating Bot instances...${resetANSI}`
    );
    const newBot = mineflayer.createBot(loginConfig);

    state.currentBot = newBot;
    state.currentCli = new createCLI(newBot);

    // 立即繫結核心監聽事件
    newBot.once("login", () => {
      // console.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "login" Event.`); // debug 用
      handleLoginOnce(loginConfig);
    });
    newBot.once("spawn", () => {
      // console.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "spawn" once Event.`); // debug 用
      handleSpawnOnce(newBot, botID, state.currentCli);
    });
    newBot.on("end", () => {
      // console.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "end" Event.`); // debug 用
      handleEnd(newBot, botID, loginConfig, botConfig);
    });

    newBot.on("error", (err) => {
      // console.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "error" Event.`); // debug 用
      handleError(newBot, err);
    });

    // 將 bot 設定 存入 bot 物件中
    newBot.Bot_Config = botConfig;

    return newBot;
  } catch (err) {
    console.error(
      `[botSpawn] Creation newBot ${BOLD_MAGENTA}Failed${resetANSI}: ` +
        `${err?.message ?? ``}`
    );
    // 觸發自動重試
    await botRespawn(null, botID, loginConfig, botConfig); // 傳遞 null 表示無舊bot
    return null;
  } finally {
    state.isTryingSpawn = false; // 移動到 finally 確保狀態重置
  }
}

/*  <<監聽事件>> 處理 伺服器 登入
 * Bot 成功登入並生成後 初始化的步驟 只執行一次
 * */
async function handleLoginOnce(loginConfig) {
  const serverIP = `${loginConfig.host.split(".").slice(0, 2).join(".")}.*.***`;
  console.log(
    `\n${REVERSE}  Server  ${resetANSI} :: Login to ` +
      `${GOLD}[${serverIP}]:${loginConfig.port}${resetANSI} ` +
      `(v_${loginConfig.version})`
  );
}

/*  <<監聽事件>> 處理 Bot 生成
 * Bot 成功登入並生成後 初始化的步驢 只執行一次
 * */
async function handleSpawnOnce(bot, botID, cli) {
  try {
    // 注入設定引數
    const botUsername = bot.username;
    const botConfig = bot.Bot_Config;
    const waitForTicks = botConfig.waitForTicks || 60;
    const modules = botConfig.modules || [];
    const loadedModules = botConfig.loadedModules;
    const showLoadedModules = () => {
      loadedModules.forEach((module) => {
        if (module.status === "loaded") {
          const msg = `[checkModule] ${module.moduleName} is loaded.`;
          console.log(`${BLACK}${msg}${resetANSI}`);
        }
      });
    };
    const addNewOwner = (newOwner) => {
      if (newOwner) {
        let botOwners = botConfig.commandSitting.owner;
        const ownerNames = new Set(botOwners.map((n) => n.toLowerCase()));
        if (!ownerNames.has(newOwner.toLowerCase())) {
          botConfig.commandSitting.owner = [...botOwners, newOwner];
        }
      }
    };

    // console.log({ waitForTicks, modules, botConfig});

    // 初始化 bot 設定
    bot.setSettings({
      locale: "zh_TW", // 設定為繁體中文
      viewDistance: 4, // 設定視野距離為 4
      chatMode: 0, // 顯示所有聊天
    });

    // 將 bot 自身加入 owner 名單
    addNewOwner(botUsername);

    // 初始化 bot 日誌紀錄
    createLogTimer(bot, cli);
    // 安全聊天模組
    await createSafeChat(bot);

    // 將 mcData 存入 bot 物件中
    const mcData = require("minecraft-data")(bot.version);
    bot.mcData = mcData;

    // 初始化 多功能插件
    await initAutoEat(bot);
    await initCollectBlock(bot);
    await initMineflayerViewer(bot);
    await initPathfinder(bot);
    await initPVP(bot);
    await initTool(bot);

    // 註冊其餘輔助用 監聽事件
    await botOnSpawn(bot);
    await botOnForcedMove(bot);
    await botOnDeath(bot);
    await botOnKicked(bot);
    await botOnMessage(bot);
    await botOnChat(bot);

    // 檢查 Module 類型，並記錄載入狀態
    checkModuleType(bot, bot.logTimer, "bot.logTimer", "function");
    checkModuleType(bot, bot.safeChat, "bot.safeChat", "function");
    checkModuleType(bot, bot.mcData, "bot.mcData", "object");
    // 公開插件
    checkModuleType(bot, bot.autoEat, "bot.autoEat", "object");
    checkModuleType(bot, bot.collectBlock, "bot.collectBlock", "object");
    checkModuleType(bot, bot.mineflayerViewer, "mineflayerViewer", "function");
    checkModuleType(bot, bot.pathfinder, "bot.pathfinder", "object");
    checkModuleType(bot, bot.pvp, "bot.pvp", "object");
    checkModuleType(bot, bot.tool, "bot.tool", "object");
    // 顯示所有已經載入的模組訊息;
    // showLoadedModules();

    // 載入用戶自定義模組
    await bot.waitForTicks(waitForTicks);
    if (!modules) {
      bot.logTimer(
        `${BLACK}[safeRequire] No modules need to be loaded.${resetANSI}`
      );
    }
    await safeRequire(bot, modules);
    await bot.waitForTicks(waitForTicks);

    // 注入自定義類
    const LCM = new LoopableCommandManager();
    bot.loopableCommandManager = await LCM;

    const actions = new Actions(bot);
    bot.actions = await actions;

    // 重製重生嘗試 引數
    respawnSitting.retryCount = 0; // 次數
    respawnSitting.retryDelay =
      botConfig.respawnSitting.minDelayMs ?? respawnSitting.baseDelay; // 延遲
    await bot.waitForTicks(waitForTicks);

    // 完成初始化
    bot.logTimer(
      `Bot ${BOLD_SKY}<${botUsername}>${resetANSI} initialization complete.`
    );

    // 顯示伺服器訊息
    await showServerInfo(bot);

    // 等待區塊載入
    await bot.waitForChunksToLoad();

    // 輸出一次 Bot 重生訊息
    await getBotSpawnState(bot);
    await bot.waitForTicks(waitForTicks);

    // 載入 AI 聊天模組
    await initAIChat(bot);

    // 啟動 CLI (Command-line interface)
    await state.currentCli.start();
    await state.currentCli.creatPrompt();

    // 更新日誌系統的 CLI 參考
    const { updateCli } = require("./bot-createLogTimer.js");
    updateCli(state.currentCli); // 傳入完整初始化的 CLI

    // BOT HELLO WORLD
    const helloWorld = botConfig.safeChatSetting.helloWorld;
    await bot.safeChat(`${helloWorld}`, -1);
    await bot.swingArm();
  } catch (err) {
    console.error(
      `[initBot] >> Initialization ${BOLD_MAGENTA}Failed${resetANSI}: ` +
        `${err?.message ?? ``}`
    );
    console.error(`${BLACK}${err.stack}${resetANSI}`);
    bot.end();
  } finally {
    state.isTryingSpawn = false;
  }
}

/*  <<監聽事件>> 處理 Bot 終止
 *  Bot 意外終止後的處理方式
 * */
async function handleEnd(bot, botID, loginConfig, botConfig) {
  const botUsername = bot.username ?? ` *uninitialized* `;
  console.logTimer(
    `[bot.on.end] >> Bot ${BOLD_SKY}<${botUsername}>${resetANSI} is ${BOLD_RED}disconnect${resetANSI}.`
  );
  // 執行重生函式
  await botRespawn(bot, botID, loginConfig, botConfig);
}

/*  <<監聽事件>> 處理 Bot 錯誤
 *  Bot 丟出錯誤後 紀錄錯誤資訊並存檔於 <bot-errors.log>
 * */
function handleError(bot, err) {
  const readableErrorCode = (err) => {
    if (err.code === "ECONNREFUSED") {
      return `伺服器拒絕連線`;
    } else if (err.code === "ETIMEDOUT") {
      return `連線請求超時`;
    } else if (err.code === "EHOSTUNREACH") {
      return `目標主機不可達`;
    } else if (err.code === "ENOTFOUND") {
      return `DNS 解析失敗`;
    } else return null;
  };
  const filePath = `./_log/bot-errors.log`;
  const dir = path.dirname(filePath);
  const errorTime = new Date().toISOString();
  const readableErr = readableErrorCode(err) ?? err.message;
  const dividerLine =
    `--------------\n` +
    `[bot.on.error] >> ⚠ ${readableErr}\n` +
    `--------------`;
  const errorLog =
    `\n${dividerLine}\n` +
    `[${errorTime}] >> Error_Code: ${err.code}\n` +
    `${err.stack}\n`;

  // 將錯誤記錄到檔案
  fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, errorLog);
  console.logTimer(
    `[bot.on.error] >> ${BOLD_MAGENTA}${readableErr}${resetANSI} Error_Code: ${err.code} `
  );
  bot.end();
}

// 處理 Bot 重生：等待並嘗試重生（採用指數退避）
async function botRespawn(oldBot, botID, loginConfig, botConfig) {
  if (state.isWaitForRespawn) {
    console.log(
      `${BLACK}[botRespawn] Already trying to respawn. Skipping...${resetANSI}`
    );
  }

  // 標記開始重生等待，避免重複觸發
  state.isWaitForRespawn = true;

  // 讀取重生配置
  respawnSitting.retryMaxTimes =
    botConfig.respawnSitting.retryMaxTimes ?? respawnSitting.retryMaxTimes; // 最大嘗試次數

  try {
    // 清理舊 bot 引數
    if (oldBot) await performCleanup(oldBot);
    // 開始嘗試重生
    return await attemptRespawn(botID, loginConfig, botConfig);
  } finally {
    state.isWaitForRespawn = false;
  }
  // 處理嘗試重生 與重生次數
  async function attemptRespawn(id, config, bkConfig) {
    respawnSitting.retryCount++;
    if (respawnSitting.retryCount > respawnSitting.retryMaxTimes) {
      // 重生次數達到最大值 退出
      console.logTimer(
        `<Respawn> Reached ${BOLD_RED}Max Retries #${respawnSitting.retryMaxTimes}${resetANSI}.\n` +
          `\n${REVERSE}   Stop   ${resetANSI} :: Process Exiting ...\n`
      );
      await delay(50);
      process.exit(1); // 0: 正常退出 1: 異常退出
    }

    // 讀取最新配置
    const currentConfig = {
      ...bkConfig,
      retryMultiply:
        bkConfig.respawnSitting.retryMultiply || respawnSitting.retryMultiply,
    };

    // 計算下次重生時間
    respawnSitting.retryDelay = calculateNextDelay(
      respawnSitting.retryCount,
      currentConfig
    );
    console.logTimer(
      `<Respawn ${BOLD_RED}#${respawnSitting.retryCount}${resetANSI}> Waiting for respawn after ` +
        `${BOLD_RED}${formatDelay(respawnSitting.retryDelay)}${resetANSI} ...`
    );

    await delay(respawnSitting.retryDelay);

    try {
      return await botSpawn(id, config, currentConfig);
    } catch (err) {
      console.Error(
        `<Respawn ${BOLD_RED}#${respawnSitting.retryCount}${resetANSI}> ` +
          `${BOLD_MAGENTA}Failed${resetANSI}: ${err?.message ?? ``}`
      );
      console.error(`${BLACK}${err.stack}${resetANSI}`);
      return attemptRespawn(id, config, currentConfig); // 遞迴呼叫
    }
  }
}

// 計算下次重生時間
function calculateNextDelay(attempt, config) {
  const baseDelay =
    config.respawnSitting.minDelayMs ?? respawnSitting.baseDelay;
  const maxDelay =
    (config.respawnSitting.maxDelayMinutes ?? respawnSitting.maxDelay) * 60000; // 單位轉換分鐘→毫秒
  const factor =
    config.respawnSitting.retryMultiply ?? respawnSitting.retryMultiply;

  respawnSitting.retryCount = attempt; // 記錄當前嘗試次數

  // 修正指數計算：使用 (attempt - 1) 確保第一次重試使用基礎延遲
  const calculated = baseDelay * Math.pow(factor, Math.min(attempt - 1, 10));
  // console.logTimer(
  //   `(計算引數: base=${baseDelay}, max=${maxDelay}, factor=${factor}, attempt=${attempt})` // debug用
  // );

  // 雙重保險：最低不低於基礎延遲，最高不超過最大延遲
  return Math.min(Math.max(calculated, baseDelay), maxDelay);
}

// 清理舊 bot 引數
async function performCleanup(bot) {
  try {
    // 關閉 Ollama 服務
    if (bot?.aiChat?.ollamaManager) {
      await bot.aiChat.ollamaManager.shutdown();
    }

    // 清理 mineflayerViewer
    if (bot?.viewer) {
      bot.viewer.close();
    }

    // 清理 CLI 例項
    if (state.currentCli) {
      await state.currentCli.close();
      state.currentCli = null;
    }

    // 清理 Bot 監聽器
    if (bot) {
      bot.removeAllListeners();
      try {
        await bot.quit();
      } catch {}
      try {
        await bot.end();
      } catch {}
    }

    console.log(`${BLACK}[initBot] Perform cleanup finished.${resetANSI}`);
  } catch (error) {
    console.error(`${RED}[initBot] 清理資源時發生錯誤:${resetANSI}`, error);
  }
}

/*  <<輔助函式>>
 * */
// 顯示伺服器資訊
async function showServerInfo(bot) {
  const gameRT = formatMinecraftTime(bot.time.bigAge);
  const realRT = formatRealTime(bot.time.bigAge);
  const serverInfo = [
    `Server is ${GOLD}${bot.game.serverBrand ?? "Unknow"}${resetANSI}`,
    `RunTimes: ${GOLD}${gameRT ?? "Unknow"}${resetANSI} ` + `${realRT ?? ""}\n`,
    `ViewDistance: ${GOLD}${
      bot.game.serverViewDistance ?? "Unknow"
    }${resetANSI}`,
    `Difficulty: ${GOLD}${bot.game.difficulty ?? "Unknow"}${resetANSI}`,
    `WorldSpwan: ${GOLD}${bot.spawnPoint ?? "Unknow"}${resetANSI}`,
  ].join(" | ");

  bot.logTimer(`${serverInfo}`);

  // 顯示線上玩家資訊
  let playerCount = Object.keys(bot.players).length || "Unknow";
  let maxPlayers = bot.game.maxPlayers || "Unknow";
  let playerNamesList = Object.keys(bot.players) || "Unknow";
  let playerNames = () => {
    if (playerNamesList.length > 5) {
      return playerNamesList.slice(0, 5).join(", ") + ", ...";
    } else {
      return playerNamesList.join(", ") || "Unknow";
    }
  };
  bot.logTimer(
    `Players: ${GOLD}${playerCount}${resetANSI}/${maxPlayers} online, [ ${playerNames()} ]`
  );
}

// 處理遊戲內時間轉換
function formatMinecraftTime(worldAge) {
  const numWorldAge = Number(worldAge);

  // 如果是負數，直接返回原始值（帶千分位）
  if (numWorldAge < 0) {
    return `${numWorldAge.toLocaleString("en-US")}`;
  }

  const TICKS_PER_DAY = 24000;
  const totalGameDays = Math.floor(numWorldAge / TICKS_PER_DAY);
  const showGameDays = totalGameDays.toLocaleString("en-US");
  return `${showGameDays} days`;
}

// 處理遊戲內時間到現實時間轉換
function formatRealTime(worldAge) {
  const numWorldAge = Number(worldAge);

  // 處理負數或無效輸入
  if (numWorldAge < 0 || isNaN(numWorldAge)) return null;

  const TICKS_PER_DAY = 24000;
  const REAL_MINUTES_PER_DAY = 20;

  // 核心時間轉換邏輯
  const realHoursTotal =
    (numWorldAge / TICKS_PER_DAY) * (REAL_MINUTES_PER_DAY / 60);

  // 分級計算現實時間 (年 > 月 > 日 > 小時 > 分鐘)
  let remaining = realHoursTotal;
  const years = Math.floor(remaining / (12 * 30 * 24)); // 1年 = 12月×30天×24小時
  remaining %= 12 * 30 * 24;

  const months = Math.floor(remaining / (30 * 24)); // 1月 = 30天×24小時
  remaining %= 30 * 24;

  const days = Math.floor(remaining / 24); // 1天 = 24小時
  remaining %= 24;

  const hours = Math.floor(remaining); // 直接取小時
  const mins = Math.floor((remaining - hours) * 60); // 將小數部分轉換為分鐘

  // 動態組裝非零單位
  const timeUnits = [];
  if (years > 0) timeUnits.push(`${years}y`);
  if (months > 0) timeUnits.push(`${months}m`);
  if (days > 0) timeUnits.push(`${days}d`);
  if (hours > 0) timeUnits.push(`${hours}h`);
  if (mins > 0) timeUnits.push(`${mins}min`);

  return `(r: ${timeUnits.join(" ")})`;
}

// 處理時間轉換
function formatDelay(ms) {
  const mins = Math.floor(ms / 60000);
  const secs = Math.round((ms % 60000) / 1000);
  return mins > 0 ? `${mins} min ${secs}s` : `${secs}s`;
}

// 檢查 Module 類型紀錄載入狀態
function checkModuleType(bot, targetModule, displayName, type2check) {
  const botConfig = bot.Bot_Config;
  try {
    if (typeof targetModule !== type2check) {
      const error = new Error();
      const errorType =
        targetModule === undefined ? "NOT_EXISTS" : "TYPE_MISMATCH";
      error.code = errorType;
      throw error;
    }

    // 標記成功狀態
    botConfig.loadedModules.push({
      moduleName: displayName,
      type: typeof targetModule,
      status: "loaded",
      expectType: type2check,
    });
  } catch (err) {
    // 記錄錯誤細節
    botConfig.loadedModules.push({
      moduleName: displayName,
      type: typeof targetModule,
      status: "error",
      expectType: type2check,
    });
    if (err.code === "NOT_EXISTS") {
      const msg = `: <${displayName}> not exists.`;
      console.error(
        `[checkModule] >> ${BOLD_MAGENTA}Failed${resetANSI}: ` +
          `${msg} ${err?.message ?? ``}`
      );
      console.error(`${BLACK}${err.stack}${resetANSI}`);
    } else if (err.code === "TYPE_MISMATCH") {
      const msg = `: <${displayName}> is mismatch. (Expected ${type2check}, got ${typeof targetModule})`;
      console.error(
        `[checkModule] >> ${BOLD_MAGENTA}Failed${resetANSI}: ` +
          `${msg} ${err?.message ?? ``}`
      );
      console.error(`${BLACK}${err.stack}${resetANSI}`);
    }
  }
}

// 程序終止處理
async function handleProcessTermination(signal) {
  console.log(
    `> [initBot] Receive ${BOLD_MAGENTA}${signal}${resetANSI} signal, start cleanup...`
  );
  await performCleanup(state.currentBot);
  console.log(
    `[initBot] Process close by: ${BOLD_MAGENTA}${signal}${resetANSI}`
  );
  console.log(
    `\n${REVERSE}   Stop   ${resetANSI} :: Process exit. See you again!\n`
  );
  process.exit(0);
}

// 註冊信號處理器
process.on("SIGINT", () => handleProcessTermination("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => handleProcessTermination("SIGTERM")); // kill
process.on("beforeExit", () => handleProcessTermination("beforeExit"));

// 捕獲未處理的 Promise 拒絕
process.on("unhandledRejection", async (reason, promise) => {
  console.error("未處理的 Promise 拒絕:", reason);
  // await handleProcessTermination("unhandledRejection");
});

module.exports = {
  botSpawn,
  botRespawn,
  state,
};
