// 文字顏色 ANSI 控制碼常量
const { resetANSI, BLACK, ITALIC_BLACK } = require("./escapeCodeANSI.js");

// 文字顏色 ANSI 控制碼常量

/** code source:
 *  https://github.com/fubira/TemzinBot
 *  同じメッセージのループ送信、短時間での大量送信などを
 *  防ぐ仕組みを入れたチャット送信メソッド
 *  防止同一條訊息尋還、短時間的海量傳輸等，安全的 Bot 聊天方法。
 * */
async function createSafeChat(bot) {
  const commandPrefix = bot.Bot_Config.commandSitting.prefix;
  const isSlience = bot.Bot_Config.safeChatSetting.silence;
  const filterMs = bot.Bot_Config.safeChatSetting.filterMs;
  const filterCount = bot.Bot_Config.safeChatSetting.filterCount;

  // 初始化每個 bot 的專屬狀態
  bot.safechat_send_text_cache = [];
  bot.safechat_last_send_time = Date.now();
  bot.safechat_continuous_count = 0;

  // 定義 safeChat 方法，綁定到該 bot
  bot.safeChat = (text, icon) => {
    const current_time = Date.now();
    const elapsed_ms = current_time - bot.safechat_last_send_time;

    // 如果不存在訊息 則返回
    if (!text) return;
    // 如果只有輸入 @bot (commandPrefix) 則返回
    if (text === commandPrefix) return;
    // 如果 bot 設定為沉默，則返回
    if (isSlience || isSlience !== false) return;

    // 過濾 1 秒內 大量的垃圾訊息
    if (elapsed_ms > 950) {
      /** 一定時間経過カウンターを作り直す
       *  一定時間後重製計數器
       */
      bot.safechat_continuous_count = 0;
    }

    bot.safechat_continuous_count++;
    if (bot.safechat_continuous_count > filterCount) {
      bot.logTimer(
        `${BLACK}[bot.safechat] >> *REJECTED* ` +
          `1 秒內超過 ${filterCount} 條訊息${resetANSI}`
      );
      /* this.bot.log('[bot.safechat] *REJECTED* 短時間での大量メッセージが送信がされました'); */
      return;
    }

    // 過濾 指定時間內 重複的訊息
    if (elapsed_ms > filterMs) {
      /** 一定時間経過したら直前のメッセージは忘れる
       *  一定時間後忘記上一條消息
       */
      bot.safechat_send_text_cache = [];
    }

    if (bot.safechat_send_text_cache.includes(text)) {
      bot.logTimer(
        `${BLACK}[bot.safechat] >> *REJECTED* ` +
          `${filterMs / 1000} 秒內重複: ${ITALIC_BLACK}${text}${resetANSI}`
      );
      return;
    }

    // 紀錄訊息快取 與時間訊息
    bot.safechat_send_text_cache.push(text);
    bot.safechat_last_send_time = current_time;

    // 處理 bot 文字訊息
    if (icon == null) {
      bot.chat(`💻 ${text}`); // 💬
    } else if (icon === -1 || icon === "") {
      bot.chat(`${text}`);
    } else {
      if (!typeof icon === "string") {
        return;
      } else {
        bot.chat(`${icon} ${text}`);
      }
    }
    return;
  };
}

module.exports = {
  createSafeChat,
};
