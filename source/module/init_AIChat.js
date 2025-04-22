const { resetANSI, BLACK } = require("../escapeCodeANSI.js");
const { OllamaManager } = require("./OllamaManager.js");

async function initAIChat(bot) {
  const isEnabled = bot.Bot_Config.aiChatSetting.isEnabled;
  if (!isEnabled) return;

  // 初始化 Ollama 管理器
  const ollamaManager = new OllamaManager(bot.Bot_Config);
  const initialized = await ollamaManager.initialize();

  if (!initialized) {
    console.error("[AIChat] Ollama 初始化失敗，AI 聊天功能將被停用");
    return;
  }

  const cmdPrefix = bot.Bot_Config.commandSitting.prefix;
  const aiChatPrefix = bot.Bot_Config.aiChatSetting.prefix;
  const MAX_DISTANCE = bot.Bot_Config.aiChatSetting.checkPlayerInRange || 16;

  // 檢查玩家是否在範圍內
  function isPlayerNearby(playerName) {
    const player = bot.players[playerName]?.entity;
    if (!player) return false;
    return player.position.distanceTo(bot.entity.position) <= MAX_DISTANCE;
  }

  // 新增隨機延遲函數
  function getRandomDelay(minTicks = 10, maxTicks = 30) {
    return Math.floor(Math.random() * (maxTicks - minTicks + 1)) + minTicks;
  }

  bot.on("chat", async (username, message, translate, jsonMsg) => {
    const msgText = jsonMsg?.json?.with?.[1]?.[""] ?? message;
    // const msgText = jsonMsg?.json?.text ?? message;
    if (username === bot.username) return; // 忽略 bot 自己的訊息
    if (msgText.startsWith(cmdPrefix)) return; // 忽略 @b 開頭的命令訊息
    if (!msgText.startsWith(aiChatPrefix)) return; // 忽略非 @a 開頭的訊息

    if (!isPlayerNearby(username)) {
      bot.safeChat(`${username} 靠近一點再跟我說話吧！`, `🗪`);
      return;
    }

    const question = msgText.slice(aiChatPrefix.length).trim();

    try {
      const prompt = ollamaManager.generatePrompt(bot, username, question);
      bot.safeChat(`讓我想想...`, `🗭`);

      const fullResponse = await ollamaManager.askOllama(prompt);
      const finalAnswer = ollamaManager.processAIResponse(fullResponse);

      await ollamaManager.saveChat(
        username,
        question,
        fullResponse,
        finalAnswer
      );

      const messages = finalAnswer.split("\n");
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i].trim();
        if (!msg) continue;

        // 發送訊息
        await bot.safeChat(`${msg}`, ``);

        // 如果不是最後一條訊息，添加隨機延遲
        if (i < messages.length - 1) {
          // 根據訊息長度決定延遲時間
          const baseDelay = Math.ceil(msg.length / 5); // 每5個字元增加基礎延遲
          const minTicks = baseDelay + 20;
          const maxTicks = baseDelay + 60;

          // 添加隨機延遲
          const delay = getRandomDelay(minTicks, maxTicks);
          await bot.waitForTicks(delay);
        }
      }
    } catch (error) {
      console.error("[AIChat] 處理錯誤:", error);
      bot.safeChat(`${username} 抱歉，我現在有點混亂。`, `💦`);
    }
  });

  // 更新 bot.aiChat
  bot.aiChat = {
    askOllama: ollamaManager.askOllama.bind(ollamaManager),
    isPlayerNearby,
    ollamaManager, // 添加 ollamaManager 實例
  };

  console.log(
    `${BLACK}[AIChat] AI chat module initialized. Run in local Ollama.${resetANSI}`
  );
}

module.exports = { initAIChat };
