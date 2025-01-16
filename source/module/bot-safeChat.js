/** code source:
 *  https://github.com/fubira/TemzinBot
 *  同じメッセージのループ送信、短時間での大量送信などを
 *  防ぐ仕組みを入れたチャット送信メソッド
 *  防止同一條訊息尋還、短時間的海量傳輸等，安全的 Bot 聊天方法。
 * */
module.exports = function createSafeChat(bot) {
  // 初始化每個 bot 的專屬狀態
  bot.safechat_send_text_cache = [];
  bot.safechat_last_send_time = Date.now();
  bot.safechat_continuous_count = 0;

  // 定義 safeChat 方法，綁定到該 bot
  bot.safeChat = (text) => {
    const current_time = Date.now();
    const elapsed_ms = current_time - bot.safechat_last_send_time;

    if (!text) return;

    if (elapsed_ms > 900) {
      bot.safechat_continuous_count = 0;
    }

    bot.safechat_continuous_count++;
    if (bot.safechat_continuous_count > 10) {
      /* this.bot.log('[bot.safechat] *REJECTED* 短時間での大量メッセージが送信がされました'); */
      console.logTimer("[bot.safechat] * REJECTED * => 防止洗頻");
      return;
    }

    if (elapsed_ms > 3000) {
      /** 一定時間経過したら直前のメッセージは忘れる
       *  一定時間後忘記上一條消息
       */
      bot.safechat_send_text_cache = [];
    }

    if (bot.safechat_send_text_cache.includes(text)) {
      console.logTimer(
        `[bot.safechat] * REJECTED * => 短時間同樣消息：${text}`
      );
      return;
    }

    bot.safechat_send_text_cache.push(text);
    bot.safechat_last_send_time = current_time;
    bot.chat(text);
  };

  console.logTimer(`[bot.safechat] Module has been successfully loaded.`);
};
