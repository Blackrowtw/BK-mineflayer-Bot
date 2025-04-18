// 引入 unCommand 函數
const { runCommand } = require("./runCommand.js");

// 文字顏色 ANSI 控制碼常量
const { resetANSI, BLACK } = require("../escapeCodeANSI.js");

// Bot 監聽聊天事件
async function botOnChat(bot) {
  bot.on("chat", (username, message, translate, jsonMsg, matches) => {
    // bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "Chat" Event.`); // debug 用
    const ownerList = bot.Bot_Config.commandSitting.owner; // 機器人主人的清單
    const commandPrefix = bot.Bot_Config.commandSitting.prefix; // 命令觸發詞
    const playerList = bot.players; // 機器人儲存的玩家清單
    const keys = genKeys(jsonMsg, message); // 生成指令用的鍵值
    const cmdSender = username;

    // 檢查是否為主人
    if (isOwner(username, ownerList)) {
      runCommand(bot, keys, cmdSender);
      return; // 返回
    } else if (isInPlayerList(username, playerList)) {
      console.logTimer(`${username} 在玩家清單中，但非主人。`);
      return; // 返回
    } else {
      console.logTimer(`${username} 不在玩家清單中，無法使用命令。`);
      return; // 返回
    }

    // console.log({ username }); //debug 用
    // console.log({ message }); //debug 用
    // console.log({ translate }); //debug 用
    // console.log({ ownerList }); //debug 用
    // let print = genKeys(jsonMsg, message);
    // console.log(`genKeys: ` + print);
    // console.log({ print });

    /**
     * 檢查訊息發送者是否為機器人主人
     * @param {string} username - 訊息發送者的名稱
     * @param {Array|string} ownerList - 機器人主人的清單（可以是陣列或字串）
     * @returns {boolean|null} - 是否為主人，若參數無效則返回 null
     */
    function isOwner(username, ownerList) {
      // 檢查 username 是否為有效字串
      if (typeof username !== "string" || username.trim() === "") {
        console.error(
          "[bot.on.chat] isOwner: 參數 username 無效，必須為非空字串。"
        );
        return null;
      }

      // 檢查 ownerList 是否為有效陣列或字串
      if (
        !(Array.isArray(ownerList) || typeof ownerList === "string") ||
        (Array.isArray(ownerList) && ownerList.length === 0) ||
        (typeof ownerList === "string" && ownerList.trim() === "")
      ) {
        console.error(
          "[bot.on.chat] isOwner 參數 ownerList 無效，必須為非空陣列或字串。"
        );
        return null;
      }

      // 將 ownerList 統一轉換為陣列，方便處理
      const owners = Array.isArray(ownerList) ? ownerList : [ownerList];

      // 檢查 username 是否在 ownerList 中（無視大小寫）
      return owners.some(
        (owner) => owner.toLowerCase() === username.toLowerCase()
      );
    }

    /**
     * 檢查訊息發送者是否在玩家清單中
     * @param {string} username - 訊息發送者的名稱
     * @param {Array} playerList - 機器人儲存的玩家清單
     * @returns {boolean|null} - 是否在玩家清單中，若參數無效則返回 null
     */
    function isInPlayerList(username, playerList) {
      // 檢查 username 是否為有效字串
      if (typeof username !== "string" || username.trim() === "") {
        console.error(
          "[bot.on.chat] isInPlayerList: 參數 username 無效，必須為非空字串。"
        );
        return null;
      }

      // 檢查 playerList 是否為有效陣列
      if (!Array.isArray(playerList) || playerList.length === 0) {
        console.error(
          "[bot.on.chat] isInPlayerList: 參數 playerList 無效，必須為非空陣列。"
        );
        return null;
      }

      // 檢查 username 是否在 playerList 中（無視大小寫）
      return playerList.some(
        (player) => player.toLowerCase() === username.toLowerCase()
      );
    }

    /**
     * 從訊息中提取指令關鍵字
     * @param {Object} jsonMsg - 包含訊息的 JSON 對象
     * @param {string} message - 原始訊息字串
     * @returns {Promise<Array<string>|null>} - 提取的指令關鍵字陣列，若無效則返回 null
     */
    function genKeys(jsonMsg, message) {
      // 新增正則表達式轉義函式 (防止特殊符號(如 . * ?) 被解析成正則控制字符)
      const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        // 取出訊息內容，優先從 jsonMsg 中提取
        let msgText = jsonMsg?.json?.with?.[1]?.[""] ?? message ?? "";

        // 如果 msgText 不是字串或為空，返回 null
        if (typeof msgText !== "string" || msgText.trim() === "") return null;

        // 使用空格分割字符串
        const processKeys = msgText.split(" ");

        // 獲取所有包含 @bot (commandPrefix) 的元素的索引
        const botIndices = processKeys
          .map((key, index) => {
            // 動態生成正則表達式，包含轉義處理與大小寫不敏感
            const prefixPattern = new RegExp(escapeRegExp(commandPrefix), "i");
            return prefixPattern.test(key) ? index : -1;
          })
          .filter((index) => index !== -1);

        // 如果找不到任何 @bot (commandPrefix)，返回 null
        if (botIndices.length === 0) return null;

        // 取第一個 @bot (commandPrefix) 的索引處開始的部分
        const keys = processKeys.slice(botIndices[0]);

        return keys;
      } catch (err) {
        bot.logTimer(`[bot.on.chat] genKeys Error: ${err.message}`);
        console.error(`${err.stack}`);
        return null;
      }
    }
  });
}

module.exports = { botOnChat };
