// 注入 path 模組 (處理檔案路徑)
const path = require("path");
// 文字顏色 ANSI 控制碼常量
const { resetANSI, BLACK } = require("./escapeCodeANSI.js");

// 安全載入模組的函式
async function safeRequire(bot, Modules) {
  if (Modules) {
    for (const modPath of Modules) {
      const modulePath = path.resolve(modPath);
      // bot.logTimer(`[safeRequire] >> Loaded module at ${modulePath}`); // debug 用
      let botModule = await parsePath(modulePath, bot);
      return botModule;
    }
  }
}

async function parsePath(modulePath, bot) {
  if (!bot || typeof bot !== "object") {
    console.log(
      `${BLACK}[safeRequire] >> Bot is not ready yet. Skipping module: ` +
        `<${path.basename(modulePath)}>${resetANSI}`
    );
    return;
  }

  try {
    const botModule = require(modulePath);
    if (typeof botModule === "function") {
      console.log(
        `${BLACK}[safeRequire] Loaded additional module: ` +
          `<${path.basename(modulePath)}>${resetANSI}`
      );
      // 調用函數並傳入 bot 作為參數
      return await botModule(bot);
    } else {
      console.warn(
        `${BLACK}[safeRequire] >> Module at <${path.basename(modulePath)}> ` +
          `is not a function, it's a ${typeof module}.${resetANSI}`
      );
      return null; // 返回 null 或做其他處理
    }
  } catch (err) {
    console.log(
      `${BLACK}[safeRequire] >> Failed to load module: ` +
        `<${path.basename(modulePath)}> skipping...${resetANSI}`
    );
    console.error(
      `${BLACK}[safeRequire] >> : ${err.message}` +
        `\n[safeRequire] Error stack:` +
        `\n${err.stack}${resetANSI}`
    );
  }

  return null; // 如果模塊加載失敗，返回 null
}

module.exports = {
  safeRequire,
};
