async function turnBot(bot, direction, yawDegree, pitchDegree) {
  // 有輸入方向
  if (direction) {
    let botSay = "是的長官！";
    // 根據方向計算角度
    switch (direction) {
      case "back":
      case "s":
      case "後":
        yawDegree = bot.entity.yaw + Math.PI; // 180 度
        pitchDegree = 0;
        botSay = "向後轉！";
        break;
      case "left":
      case "a":
      case "左":
        yawDegree = bot.entity.yaw + Math.PI / 2; // -90 度
        pitchDegree = 0;
        botSay = "向左轉！";
        break;
      case "right":
      case "d":
      case "右":
        yawDegree = bot.entity.yaw - Math.PI / 2; // 90 度
        pitchDegree = 0;
        botSay = "向右轉！";
        break;
      case "forward":
      case "w":
      case "前":
        yawDegree = bot.entity.yaw; // 無需改變
        pitchDegree = 0;
        botSay = "向前看齊！";
        break;
      default:
        console.logTimer("[action-turnBot] 錯誤：沒有符合的 direction。");
        await bot.safeChat("不正確的轉身朝向", "❌");
        return;
    }
    // console.log(`direction D:${direction}, Y${yawDegree}, P:${pitchDegree}`); // Debug 用
    // Bot 轉向
    await bot.look(yawDegree, pitchDegree, true); // 第三個參數 true 表示立即完成

    bot.safeChat(`${botSay}`);
    return;
  }
  // 無輸入方向
  else if (!direction) {
    // console.log(`!direction D:${direction}, Y${yawDegree}, P:${pitchDegree}`); // Debug 用
    // Bot 轉向
    await bot.look(
      bot.entity.yaw + yawDegree * (Math.PI / 180),
      pitchDegree * (Math.PI / 180),
      true
    );
    bot.safeChat(`身體旋轉 = ${yawDegree}°, 頭部俯仰 = ${pitchDegree}°`);
    return;
  }
}

module.exports = { turnBot };
