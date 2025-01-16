// 注入 path 模組 (處理檔案路徑)
const path = require("path");
// 安全載入模組的函式
function safeRequire(modulePath, bot) {
  if (!bot || typeof bot !== "object") {
    console.error(
      `[safeRequire] >> Bot is not ready yet. Skipping module: ${path.basename(
        modulePath
      )}`
    );
    return;
  }

  try {
    const module = require(modulePath);
    if (typeof module === "function") {
      console.logTimer(
        `[safeRequire] >> Successfully loaded module: <${path.basename(
          modulePath
        )}>`
      );
      return module; // 返回模塊實例
    } else {
      console.warn(
        `[safeRequire] >> Module at <${path.basename(
          modulePath
        )}> is not a function, it's a ${typeof module}.`
      );
      return null; // 返回 null 或做其他處理
    }
  } catch (e) {
    console.error(
      `[safeRequire] Error loading module: <${path.basename(modulePath)}>`
    );
    console.error(`[safeRequire] Reason: ${e.message}`);
    console.logTimer(
      `[safeRequire] >> Skipping module: <${path.basename(modulePath)}>`
    );
  }

  return null; // 如果模塊加載失敗，返回 null
}

module.exports = {
  safeRequire,
};
