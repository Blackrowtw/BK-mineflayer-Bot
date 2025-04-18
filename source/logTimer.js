// 文字顏色 ANSI 控制碼常量
const { resetANSI, REVERSE_RED } = require("./escapeCodeANSI.js");

const logTimer = (() => {
  const lastMessageMap = new Map(); // 存儲最近的訊息及其計數
  const MAX_MESSAGES = 10; // 最大訊息記錄數量

  return (msg) => {
    // 注入 dateformat 模組 (處理時間格式)
    const dateformat = require("dateformat");
    const now = new Date(); // 獲取當前時間
    const timestamp = `[${dateformat(now, "isoTime")}]`;

    if (lastMessageMap.has(msg)) {
      const data = lastMessageMap.get(msg);
      data.count++; // 增加計數
      const count = data.count;

      // 控制輸出頻率 前九次不記錄執行次數，從第六次開始才顯示
      if (count <= 9) {
        console.log(`${timestamp} :: ${msg}`);
      } else {
        if (
          count <= 10 || // 每次輸出
          (count > 10 && count <= 100 && count % 10 === 0) || // 每10次輸出
          (count > 100 && count <= 1000 && count % 100 === 0) || // 每100次輸出
          (count > 1000 && count % 1000 === 0) // 每1000次輸出
        ) {
          console.log(
            `${timestamp} :: ${msg} ${REVERSE_RED}(${count})${resetANSI}`
          );
        }
      }
    } else {
      // 當 Map 中記錄的訊息超過 MAX_MESSAGES 時，移除最早的一條記錄
      if (lastMessageMap.size >= MAX_MESSAGES) {
        const oldestKey = lastMessageMap.keys().next().value; // 取得最早的 key
        lastMessageMap.delete(oldestKey); // 刪除最早的訊息
      }
      // 新的訊息，初始化計數器
      lastMessageMap.set(msg, { count: 1 });
      console.log(`${timestamp} :: ${msg}`);
    }
  };
})();

module.exports = { logTimer };
