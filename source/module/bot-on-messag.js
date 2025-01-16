// 引入 unCommand 函數
const { runCommand } = require("./run-command.js");
// Bot 監聽伺服器訊息 並返回終端
function botOnMessag(bot) {
  // 接收聊天訊息並觸發
  bot.on("message", (jsonMsg, position) => {
    // 訊息傳送者 (如果是系統訊息則是整條內容)
    let msgSender = jsonMsg.toString();
    // 提取 `with` 數組的第 2 個元素 中的 空白對象值
    let msg = jsonMsg?.json?.with?.[1]?.[""] ?? "";
    // 回傳伺服器訊息 到 cmd 命令行上紀錄
    if (msg) {
      bot.chatLog(`[${position}] ${msgSender}${msg}`);
    } else {
      bot.chatLog(`[${position}] ${msgSender}`);
    }

    //  console.log(JSON.stringify(jsonMsg, null, 2)); //Debug 用

    /*
     * 嘗試解析指令
     *  */
    let keys = genKeys();
    runCommand(bot, keys);

    // Debug 用
    // console.log(`msgSender: ${jsonMsg}`);
    // // console.log({ jsonMsg });
    // console.log(`msgSender: ${msgSender}`);
    // // console.log({ msgSender });
    // console.log(`msg: ${msg}`);
    // // console.log({ msg });
    // console.log(`keys: ${keys}`);
    // // console.log({ keys });

    // 將訊息處理為 Keys
    function genKeys() {
      // 使用空格分割字符串
      let processKeys = "";
      if (typeof msg === "string" && msg.length > 0) {
        processKeys = msg.split(" ");
      } else if (msgSender.length > 0) {
        processKeys = msgSender.split(" ");
      } else {
        processKeys = "";
        console.logTimer(
          `[bot.on.messag] Keys generation fails. processKeys: <${processKeys}>`
        );
      }

      // 獲取所有包含 @bot 的元素的索引
      const findBotIndex = processKeys
        .map((i, index) => (i.includes("@bot") ? index : -1)) // 沒有找到 @bot 返回 -1
        .filter((index) => index !== -1); //

      if (findBotIndex.length === 0) {
        console
          .logTimer
          // `[bot.on.messag] No @bot in msg to array: [${processKeys}]` // Debug 用
          ();
        return []; // 如果找不到任何 @bot，返回空陣列
      }

      // 假設你想取第一個 @bot 的索引處開始的部分
      const keys = processKeys.slice(findBotIndex[0]);

      return keys;
    }
  });
}

module.exports = { botOnMessag };
