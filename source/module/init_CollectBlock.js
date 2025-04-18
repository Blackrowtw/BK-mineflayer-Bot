// 初始化 collectBlock
async function initCollectBlock(bot) {
  // 注入 collectBlock 模組
  const collectBlock = require("mineflayer-collectblock").plugin;
  // 初始化 pvp 基礎功能
  setCollectBlock(bot, collectBlock);

  async function setCollectBlock(bot, collectBlock) {
    // 載入 collectBlock 差件
    await bot.loadPlugin(collectBlock);
    // bot.collectblock.movements.canDig = true; // 允許挖掘
  }
}
module.exports = {
  initCollectBlock,
};
