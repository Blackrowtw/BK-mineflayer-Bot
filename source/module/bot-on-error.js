// 注入 fs 模組 (處理檔案存取)
const fs = require("fs");
// Bot 發生錯誤 處理
function botOnError(bot) {
  bot.on("error", (err) => {
    const errorLog = `[${new Date().toISOString()}] :: ${err}\n
    ${JSON.stringify(err, null, 2)}\n`;
    if (err.code === "ECONNREFUSED") {
      console.logTimer(`[botSpawn] err.code = ${err.code} >> 連線被拒絕`);
    } else {
      console.logTimer(`[botSpawn] >> Bot spawn fails...`);
      console.error(errorLog);
    }
    // 將錯誤記錄到檔案
    fs.appendFileSync("bot-errors.log", errorLog);
  });
}

module.exports = { botOnError };
