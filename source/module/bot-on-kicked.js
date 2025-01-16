// Bot 被踢出
function botOnKicked(bot) {
  bot.on("kicked", (reason) => {
    // 確認是否是系統訊息 (translate?.value 這是純系統訊息 需轉換 待完成)
    const kickMsg = String(
      reason?.value?.translate?.value ?? reason?.value ?? "null"
    );
    console.logTimer(`[bot.on-kick] Bot been kicked. #reason: [ ${kickMsg} ]`);
    // console.log(JSON.stringify(reason, null, 2));
  });
}

module.exports = { botOnKicked };
