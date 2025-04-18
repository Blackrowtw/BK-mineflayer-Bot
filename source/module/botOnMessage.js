// 文字顏色 ANSI 控制碼常量
const { resetANSI, DARK_RED, SKY, BLACK } = require("../escapeCodeANSI.js");

// Bot 監聽伺服器訊息 並返回終端
async function botOnMessage(bot) {
  // 接收聊天訊息並觸發
  bot.on(
    "messagestr",
    (message, messagePosition, jsonMsg, sender, verified) => {
      // bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "messagest" Event.`); // debug 用

      // 取出訊息發送者 (<>中的內容)
      const msgSender = (message.match(/<([^>]+)>/) || [])[1] || "";

      // 取出訊息內容 如果有 (提取 `with` 數組的第 2 個元素 中的 空白對象值)
      const msgText = jsonMsg?.json?.with?.[1]?.[""] ?? "";
      const adjMsgText = msgText.replace(/�+/g, "⬚"); // 取代無法識別的字符◌

      //  console.log(JSON.stringify(jsonMsg, null, 2)); //Debug 用

      /*
       * 回傳伺服器訊息 到 cmd 命令行上紀錄
       *
       * 聊天室舉報實裝後的版本，訊息結構有很大的變化，得注意處理
       * 原始的訊息會有 msg 與發送者
       * 而經過伺服器額外處理得過的
       * 發送者與發送訊息會全部混在一起
       *  */

      if (msgText) {
        bot.logTimer(
          `${BLACK}-${resetANSI} ${SKY}${message}${resetANSI}${adjMsgText} ${BLACK}[${messagePosition}]${resetANSI}`
        );
      } else {
        bot.logTimer(
          `${BLACK}-${resetANSI} ${DARK_RED}<${messagePosition}>${resetANSI} ${BLACK}${message}${resetANSI}`
        );
      }
    }
  );
}

module.exports = { botOnMessage };
