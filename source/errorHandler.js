const fs = require("fs"); // 注入 fs 模組 (處理檔案存取)
const path = require("path");

// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED, REVERSE } = require("./escapeCodeANSI.js");

// errorHandler.js
let uncaughtCount = 1; // 錯誤計數器

function errorHandler() {
  // 捕捉主程式產生的錯誤
  process.on("uncaughtException", (err) => {
    const errorTime = new Date().toISOString();
    const dividerLine =
      `--------------\n` +
      `[errorHandler] >> ⚠ An unexpected error caught in the main program !!!\n` +
      `--------------`;
    console.error(
      `\n${dividerLine}\n` +
        `[uncaughtException (${BOLD_RED}#${uncaughtCount}${resetANSI})] >> Error_Code: ${err.code}\n` +
        `${err.stack}\n`
    );

    // 將錯誤記錄到檔案
    const filePath = `./_log/bot-errors.log`;
    const dir = path.dirname(filePath);
    const exitMsg = (uncaughtCount) => {
      if (uncaughtCount > 4) {
        return (
          `\n\n██ >> Stop << ██ :: Too many uncaught exceptions (#${uncaughtCount}).` +
          ` Process Exiting ...\n`
        );
      } else return ``;
    };
    const checkCount = exitMsg(uncaughtCount);
    const errorLog =
      `\n${dividerLine}\n` +
      `[${errorTime}] >> ⚠ 主程式發生未預期錯誤 ! ` +
      `(uncaughtException #${uncaughtCount})\n` +
      `Error_Code: ${err.code}\n` +
      `${err.stack}${checkCount}\n`;

    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, errorLog);

    uncaughtCount++;
    // 如果計數超過5次 則強制退出主程式
    if (uncaughtCount > 5) {
      console.error(
        `${REVERSE}   Stop   ${resetANSI} :: ` +
          `Too many uncaught exceptions` +
          `(${BOLD_RED}#${uncaughtCount}${resetANSI}). Process Exiting ...\n`
      );
      process.exit(1);
    }
  });

  // 捕捉主程式產生的警告
  process.on("warning", (warning) => {
    if (warning.name === "ignoreWarning") {
      console.warn(`⚠ 忽略警告: ${warning.name}`);
    } else {
      console.warn(`[errorHandler] >> \n${warning.message}`);
    }
  });

  // // 捕捉主程式產生的 未處理的 Promise
  // process.on("unhandledRejection", (reason, promise) => {
  //   console.error(
  //     `[errorHandler] >> ⚠ 捕捉到未處理的 Promise 拒絕:\n${reason}`
  //   );
  // });
}

module.exports = {
  errorHandler,
};
