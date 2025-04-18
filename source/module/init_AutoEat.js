// 初始化 autoEat
async function initAutoEat(bot) {
  // 注入 mineflayer-auto-eat 模組
  const { loader: autoEat } = await import("mineflayer-auto-eat");
  // 初始化 autoEat 基礎功能
  setAutoEat(bot, autoEat);
  async function setAutoEat(bot, autoEat) {
    // 載入 autoEat 差件
    await bot.loadPlugin(autoEat);
    bot.autoEat.opts = {
      priority: "food",
      minHunger: 14,
      minHealth: 14,
      bannedFood: [
        "rotten_flesh",
        "pufferfish",
        "chorus_fruit",
        "poisonous_potato",
        "spider_eye",
      ],
      eatingTimeout: 3000,
    };

    // 註冊 autoEat 監聽事件
    bot.autoEat.on("eatStart", (opts) => {
      bot.logTimer(
        `[autoEat] Started eating ${opts.food.name} in ${
          opts.offhand ? "offhand" : "hand"
        }`
      );
    });

    bot.autoEat.on("eatFinish", (opts) => {
      bot.logTimer(`[autoEat] Finished eating ${opts.food.name}`);
    });

    bot.autoEat.on("eatFail", (error) => {
      bot.logTimer(`[autoEat] Eating failed: ${error.message}`);
    });
  }
}
module.exports = {
  initAutoEat,
};
