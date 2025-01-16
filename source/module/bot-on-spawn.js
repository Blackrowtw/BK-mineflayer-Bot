// Bot 重生事件
function botOnSpawn(bot) {
  bot.on("spawn", () => {
    let botGameMode = bot.game?.gameMode ?? "?? game mode";
    let botDimension = bot.game?.dimension ?? "?? dimension";
    let botPos = bot.entity?.position ?? "?? position";
    console.logTimer(
      `Bot spawned in ${botGameMode.toUpperCase()} on ${botDimension.toUpperCase()} at ${botPos.round()}.`
    );
  });
}

module.exports = { botOnSpawn };
