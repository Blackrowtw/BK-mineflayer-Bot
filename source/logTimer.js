// 注入 dateformat 模組 (處理時間格式)
const dateformat = require("dateformat");

const logTimer = (msg) => {
  if (typeof msg === "string") {
    msg = `[${dateformat(new Date(), "isoTime")}] :: ${msg}`; // 在日誌前加上時間戳
  }
  console.log(msg);
};

module.exports = { logTimer };
