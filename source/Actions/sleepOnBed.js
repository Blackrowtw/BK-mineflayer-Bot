async function sleepOnBed(bot) {
  await bot.waitForTicks(5);
  if (!bot.isSleeping) {
    // 查找附近可用的床
    const bedBlock = await bot.findBlock({
      matching: (block) => block.name.endsWith("_bed"),
      maxDistance: 4.5,
    });

    if (bedBlock) {
      await bot.activateBlock(bedBlock);
      if (bot.time.isDay === false) {
        try {
          // 嘗試睡眠
          await bot.sleep(bedBlock);
          await bot.safeChat("晚安，馬卡巴卡");
        } catch (err) {
          console.error("睡眠失敗:", err);
        }
      } else {
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`這個時間你怎麼睡得著的？`);
      }
    } else {
      await bot.waitForTicks(5);
      await bot.swingArm();
      await bot.safeChat(`床在哪兒阿？`);
    }
  } else {
    await bot.safeChat(`別吵吵，在睡覺覺呢`);
  }
}

module.exports = { sleepOnBed };
