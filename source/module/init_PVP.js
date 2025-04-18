// 初始化 PVP
async function initPVP(bot) {
  // 注入 mineflayer-pvp 模組
  const pvp = require("mineflayer-pvp").plugin;
  // 初始化 pvp 基礎功能
  setPVP(bot, pvp);

  async function setPVP(bot, pvp) {
    // 載入 pvp 差件
    await bot.loadPlugin(pvp);
    bot.pvp.movements.canDig = false;
  }
}
module.exports = {
  initPVP,
};
