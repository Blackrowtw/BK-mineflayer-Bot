// 引入 Vec3 處理座標
const { Vec3 } = require("vec3");

async function lookAt(bot, direction, vec3Pos) {
  // console.log({ direction }); // Debug 用
  // console.log(`[lookAt] direction D:${direction}, vec3Pos:${vec3Pos}`); // Debug 用
  // 有輸入方向
  if (direction) {
    let botSay = "是的長官！";
    // 根據方向計算角度
    switch (direction) {
      case "forward":
      case "f":
      case "前":
        yawDegree = bot.entity.yaw;
        pitchDegree = 0;
        botSay = "向前看齊！";
        break;
      case "back":
      case "b":
      case "後":
        yawDegree = bot.entity.yaw + Math.PI; // 180 度
        pitchDegree = 0;
        botSay = "向後看齊！";
        break;
      case "left":
      case "l":
      case "左":
        yawDegree = bot.entity.yaw + Math.PI / 2; // +90 度
        pitchDegree = 0;
        botSay = "向左看齊！";
        break;
      case "right":
      case "r":
      case "右":
        yawDegree = bot.entity.yaw - Math.PI / 2; // -90 度
        pitchDegree = 0;
        botSay = "向右看齊！";
        break;
      case "up":
      case "u":
      case "上":
        yawDegree = bot.entity.yaw;
        pitchDegree = 90;
        botSay = "舉頭望明月！";
        break;
      case "down":
      case "d":
      case "下":
        yawDegree = bot.entity.yaw;
        pitchDegree = -90;
        botSay = "低頭吃便當！";
        break;
      case "north":
      case "n":
      case "北":
        yawDegree = 0;
        pitchDegree = 0;
        botSay = "北天龍！";
        break;
      case "east":
      case "e":
      case "東":
        yawDegree = 0 - Math.PI / 2;
        pitchDegree = 0;
        botSay = "日出於東！";
        break;
      case "south":
      case "s":
      case "南":
        yawDegree = Math.PI;
        pitchDegree = 0;
        botSay = "南山豬！";
        break;
      case "west":
      case "w":
      case "西":
        yawDegree = 0 + Math.PI / 2;
        pitchDegree = 0;
        botSay = "日沒於西！";
        break;
      case "block":
      case "方塊":
        // 嘗試從準心獲取方塊
        const Block = bot.blockAtCursor(5);
        if (!Block) {
          bot.safeChat(`準心 5 格內，沒有發現方塊`, `❌`);
          return;
        }
        bot.safeChat(`${Block.displayName} 位於座標: ${Block.position}`, `🎯`);
        return;
      default:
        console.logTimer("[action-lookAt] 錯誤：沒有符合的 direction。");
        await bot.safeChat(`不正確的面朝方向`, "❌");
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
    // Bot 看向座標
    lookPos = new Vec3(vec3Pos.x, vec3Pos.y, vec3Pos.z);
    if (
      !lookPos ||
      lookPos.x === undefined ||
      lookPos.y === undefined ||
      lookPos.z === undefined
    ) {
      bot.safeChat(`無效的座標！請提供正確的座標`, "❌");
      return;
    }
    await bot.lookAt(lookPos);
    bot.safeChat(`看向座標: ${lookPos}`, `🎯`);
    return;
  }
}

module.exports = { lookAt };
