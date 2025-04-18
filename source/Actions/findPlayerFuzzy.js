function findPlayerFuzzy(bot, username) {
  // 檢查 bot 實例是否有效
  if (!bot) {
    console.log(`[findPlayerFuzzy] Error: 未傳入 bot 實例`);
    return null;
  }

  // 檢查 username 是否為字串類型
  if (typeof username !== "string") {
    console.log(
      `[findPlayerFuzzy] Error: 參數 username: ${username} 必須是字串類型，收到類型: ${typeof username}`
    );
    return null;
  }

  // 檢查 username 是否為 bot 自己
  if (username === bot.username) {
    console.log(
      `[findPlayerFuzzy] Error:  參數 username: ${username} 不能是 bot 自己`
    );
    return null;
  }

  // 將目標用戶名標準化為小寫
  const usernameLC = username.toLowerCase();

  // 第一步：精確匹配
  for (const player of Object.values(bot.players || {})) {
    if (player.username === username) {
      return player; // 返回精確匹配的玩家
    }
  }

  // 第二步：模糊匹配
  for (const player of Object.values(bot.players || {})) {
    const playerUsernameLC = player.username.toLowerCase();

    // 檢查目標用戶名是否包含在玩家名稱中
    if (playerUsernameLC.includes(usernameLC)) {
      return player; // 返回第一個模糊匹配的玩家
    }
  }

  return null; // 未找到匹配的玩家
}

module.exports = { findPlayerFuzzy };
