module.exports = function (bot) {
  let lastLookAtTime = Date.now(); // 上次執行 lookAt 的時間

  // 非同步函式
  async function lookAtNearestPlayer() {
    // 如果距離上次執行 `lookAt` 的時間太短，就跳過當前執行
    if (Date.now() - lastLookAtTime < 500) {
      return;
    }

    const playerFilter = (entity) => entity.type === "player";
    const playerEntity = bot.nearestEntity(playerFilter);
    if (!playerEntity) {
      // console.log("No player found!");
      return;
    }

    const pos = playerEntity.position.offset(0, playerEntity.height - 0.2, 0); // 注意糾正拼寫錯誤：'height' 而不是 'hight'
    // console.log("Looking at player:", playerEntity.username);

    // 非同步呼叫 lookAt
    try {
      await bot.lookAt(pos); // 等待 lookAt 完成
      // console.log("Finished looking at player:", playerEntity.username);
      lastLookAtTime = Date.now(); // 更新上次執行 `lookAt` 的時間
    } catch (err) {
      // console.error("Error occurred while looking at player:", err);
    }
  }

  bot.on("physicsTick", lookAtNearestPlayer); // 在每個物理更新週期呼叫
};
