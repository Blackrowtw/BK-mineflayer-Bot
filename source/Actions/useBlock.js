// 引入 Vec3 處理座標
const { Vec3 } = require("vec3");

async function useBlock(bot, block, vec3Pos) {
  // console.log(`useBlock vec3Pos ${vec3Pos}`); // debug用
  // console.table({ vec3Pos }); // debug用
  // 取別名 定義資料庫版本
  const mcData = bot.mcData;

  // 檢查引用正確與否
  if (!mcData) {
    bot.safeChat("Minecraft 資料未正確初始化！", `❌`);
    return;
  }

  // 定義 useTheBlock 函數
  const useTheBlock = async (block) => {
    // 沒有該方塊 返回
    if (block == null) {
      // console.log({ block } + `${block.position}`);
      bot.safeChat("沒有目標方塊！", `❌`);
      return;
    }
    // 沒有方塊位置的資訊 返回
    if (block.position == null) {
      bot.safeChat(
        `啥啥啥? 你自己看看在 ${block.position} 的 ${block.displayName} 是個啥?`,
        `❓`
      );
      return;
    }

    // 方塊是空氣
    if (block.displayName === "Air") {
      // 看向方塊的位置
      await bot.lookAt(block.position, (force = true));
      await bot.swingArm();
      bot.safeChat("你有看到我在玩空氣嗎?", `❓`);
      return;
    }
    // 方塊離玩家大於 5.5
    const distance = bot.entity.position.distanceTo(block.position);
    if (distance > 5.5) {
      // 看向方塊的位置
      await bot.lookAt(block.position, (force = true));
      bot.safeChat(`我離 ${block.displayName} 有 ${distance} 格這麼遠`, `❌`);
      return;
    }
    // 看向方塊的位置
    await bot.lookAt(block.position, (force = true));
    await bot.activateBlock(block);
    bot.safeChat(`正在使用在 ${block.position} 的 ${block.displayName}`);
  };

  // 都沒有輸入
  if (block == null && vec3Pos == null) {
    // 嘗試從準心獲取方塊
    const useBlockFromCursor = await bot.blockAtCursor(5);
    if (useBlockFromCursor == null) {
      await bot.safeChat("無法找到準心指向的方塊！", `❌`);
      return;
    }
    // 使用該方塊
    await useTheBlock(useBlockFromCursor);
  }
  // 沒有輸入 block
  else if (block == null) {
    // 檢查輸入座標完整性
    blockPos = new Vec3(vec3Pos.x, vec3Pos.y, vec3Pos.z);
    if (
      blockPos == null ||
      blockPos.x == null ||
      blockPos.y == null ||
      blockPos.z == null
    ) {
      bot.safeChat(`無效的座標！請提供正確的座標，例如：<use 100 64 50>`, `❌`);
      return;
    }
    // 看向方塊的位置
    await bot.lookAt(blockPos, (force = true));
    // 嘗試從座標獲取方塊
    const useBlockAtPos = bot.blockAt(blockPos);
    if (useBlockAtPos == null) return;
    // 使用該方塊
    await useTheBlock(useBlockAtPos);
  }
  // 沒有輸入 方向
  else if (vec3Pos == null) {
    // console.log(`!direction D:${direction}, Y${yawDegree}, P:${pitchDegree}`); // Debug 用
    let blockName = block;
    let range = 6;
    const useBlockFromName = bot.findBlock({
      matching: (block) => block && block.name.includes(blockName), // 篩選方塊型別為 lever
      maxDistance: range, // 檢測範圍
      count: 1, // 只尋找一個
    });
    if (useBlockFromName) {
      bot.safeChat(`發現 ${useBlockFromName.displayName}`, `🔎`);
      await useTheBlock(useBlockFromName);
    } else {
      bot.safeChat(`找不到 ${block}，好人你幫幫人民的辣`, `❓`);
    }
  }
}

module.exports = { useBlock };
