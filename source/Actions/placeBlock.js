const { Vec3 } = require("vec3");

async function placeBlock(bot, name, rawPos, isBotSlience = false) {
  // 檢查手上是否有物品
  if (!bot.heldItem) {
    if (!isBotSlience) await bot.safeChat(`手上沒有物品!`, `❌`);
    return;
  }

  let vec3Pos;
  if (rawPos == null) {
    vec3Pos = null;
  } else {
    vec3Pos = new Vec3(rawPos.x, rawPos.y, rawPos.z);
  }

  if (vec3Pos && !(vec3Pos instanceof Vec3)) {
    console.log(`[placeBlock] Error: vec3Pos 需為 Vec3 實例`);
    return false;
  }

  let targetBlock;

  // 根據參數取得目標方塊
  if (name) {
    // 確保 name 為字串
    if (typeof name !== "string") {
      console.log(`[placeBlock] Error: name 需為字串`);
      return false;
    }
    const blockVec3Pos = await bot.findBlocks({
      matching: (block) => block && block.name === name,
      maxDistance: 4.5,
      count: 1,
    });
    if (blockVec3Pos.length === 0) {
      if (!isBotSlience)
        await bot.safeChat(`找不到名稱為 ${name} 的方塊`, `❌`);
      return;
    }
    targetBlock = await bot.blockAt(blockVec3Pos[0]);
  } else if (vec3Pos) {
    targetBlock = await bot.blockAt(vec3Pos);
    if (!targetBlock) {
      if (!isBotSlience) await bot.safeChat(`在指定座標找不到方塊`, `❌`);
      return;
    }
  } else {
    targetBlock = await bot.blockAtCursor(4.5);
    if (!targetBlock) {
      if (!isBotSlience) await bot.safeChat(`視線內找不到方塊`, `❌`);
      return;
    }
  }

  // 若 targetBlock 還是 null，則退出
  if (!targetBlock) {
    if (!isBotSlience) await bot.safeChat("無法取得目標方塊", `❌`);
    return;
  }

  // 根據 targetBlock 與 bot 的 Y 值差異來決定優先候選面
  const botY = bot.entity.position.y;
  const blockY = targetBlock.position.y;
  let candidateFaces = [];

  if (blockY < botY) {
    // 方塊在 bot 之下，優先嘗試放在上表面
    candidateFaces = [
      { name: "up", vector: { x: 0, y: 1, z: 0 } },
      { name: "north", vector: { x: 0, y: 0, z: -1 } },
      { name: "south", vector: { x: 0, y: 0, z: 1 } },
      { name: "east", vector: { x: 1, y: 0, z: 0 } },
      { name: "west", vector: { x: -1, y: 0, z: 0 } },
      { name: "down", vector: { x: 0, y: -1, z: 0 } },
    ];
  } else if (blockY === botY || blockY === botY + 1) {
    // 方塊與 bot 同高或高一格，優先嘗試四周的水平面
    candidateFaces = [
      { name: "north", vector: { x: 0, y: 0, z: -1 } },
      { name: "south", vector: { x: 0, y: 0, z: 1 } },
      { name: "east", vector: { x: 1, y: 0, z: 0 } },
      { name: "west", vector: { x: -1, y: 0, z: 0 } },
      { name: "up", vector: { x: 0, y: 1, z: 0 } },
      { name: "down", vector: { x: 0, y: -1, z: 0 } },
    ];
  } else if (blockY >= botY + 2) {
    // 方塊在 bot 高2格以上，優先嘗試下表面
    candidateFaces = [
      { name: "down", vector: { x: 0, y: -1, z: 0 } },
      { name: "north", vector: { x: 0, y: 0, z: -1 } },
      { name: "south", vector: { x: 0, y: 0, z: 1 } },
      { name: "east", vector: { x: 1, y: 0, z: 0 } },
      { name: "west", vector: { x: -1, y: 0, z: 0 } },
      { name: "up", vector: { x: 0, y: 1, z: 0 } },
    ];
  } else {
    // 保險起見的預設順序
    candidateFaces = [
      { name: "up", vector: { x: 0, y: 1, z: 0 } },
      { name: "north", vector: { x: 0, y: 0, z: -1 } },
      { name: "south", vector: { x: 0, y: 0, z: 1 } },
      { name: "east", vector: { x: 1, y: 0, z: 0 } },
      { name: "west", vector: { x: -1, y: 0, z: 0 } },
      { name: "down", vector: { x: 0, y: -1, z: 0 } },
    ];
  }

  let chosenFace = null;
  // 依照候選順序嘗試
  for (const candidate of candidateFaces) {
    const candidatePos = targetBlock.position.offset(
      candidate.vector.x,
      candidate.vector.y,
      candidate.vector.z
    );
    const candidateBlock = await bot.blockAt(candidatePos);
    // 如果候選位置已有方塊（且不是 air），則跳過
    if (candidateBlock && candidateBlock.name !== "air") continue;
    // 選取第一個符合的候選面
    chosenFace = candidate.vector;
    break;
  }

  if (!chosenFace) {
    if (!isBotSlience)
      await bot.safeChat(`找不到可放置的面，可能全部被阻擋了`, `❌`);
    return;
  }

  try {
    // 嘗試在 targetBlock 的 chosenFace 放置方塊
    await bot.placeBlock(targetBlock, chosenFace);
    // 稍待伺服器更新
    await new Promise((resolve) => setTimeout(resolve, 50));

    const placedBlockPos = targetBlock.position.offset(
      chosenFace.x,
      chosenFace.y,
      chosenFace.z
    );
    const placedBlock = await bot.blockAt(placedBlockPos);
    if (placedBlock && placedBlock.name !== "air") {
      if (!isBotSlience) await bot.safeChat(`方塊放置成功！`, `✅`);
    } else {
      if (!isBotSlience) await bot.safeChat(`方塊放置失敗！`, `❌`);
    }
  } catch (err) {
    function formatErrorMsg(err) {
      if (err.message && err.message.toLowerCase().includes("timeout")) {
        return `placeBlock 處理超時`;
      }
      return err.message;
    }
    if (!isBotSlience) await bot.safeChat(`發生錯誤: ${formatErrorMsg(err)}`);
    console.logTimer(`${err.message}`, `❌`);
  }
}

module.exports = { placeBlock };
