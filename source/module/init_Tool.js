// 初始化 tool 模組
async function initTool(bot) {
  // 注入 mineflayer-tool 模組
  const tool = require("mineflayer-tool").plugin;
  // 初始化 tool 模組
  setTool(bot, tool);

  async function setTool(bot, tool) {
    // 載入 tool 模組
    await bot.loadPlugin(tool);
  }
}
module.exports = {
  initTool,
};
