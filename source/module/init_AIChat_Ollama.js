const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const { resetANSI, BLACK } = require("../escapeCodeANSI.js");

async function initAIChat(bot) {
  const isEnabled = bot.Bot_Config.aiChatSetting.isEnabled;
  const cmdPrefix = bot.Bot_Config.commandSitting.prefix;
  const aiChatPrefix = bot.Bot_Config.aiChatSetting.prefix;
  const playerInRange = bot.Bot_Config.aiChatSetting.checkPlayerInRange;
  if (!isEnabled || isEnabled !== true) return; // 如果未啟用，則返回

  const OLLAMA_API = "http://127.0.0.1:11434/api/generate";
  const MAX_DISTANCE = playerInRange || 16; // 玩家距離範圍
  const DATA_DIR = "../minecraft_data";

  const TOPICS = {
    blocks: "方塊",
    items: "物品",
    mobs: "生物",
    redstone: "紅石",
    enchanting: "附魔",
    crafting: "合成",
    game_modes: "遊戲模式",
  };

  // 檢查玩家是否在範圍內
  function isPlayerNearby(playerName) {
    const player = bot.players[playerName]?.entity;
    if (!player) return false;

    const distance = player.position.distanceTo(bot.entity.position);
    return distance <= MAX_DISTANCE;
  }

  // 檢索 Minecraft 資料
  // async function retrieveContent(query) {
  //   const topics = Object.keys(TOPICS);
  //   const lang = /[\u4e00-\u9fa5]/.test(query) ? "zh" : "en";

  //   for (const topic of topics) {
  //     if (
  //       query.toLowerCase().includes(topic) ||
  //       (lang === "zh" && query.includes(TOPICS[topic]))
  //     ) {
  //       const filePath = path.join(DATA_DIR, `${topic}_${lang}.txt`);
  //       try {
  //         const content = await fs.readFile(filePath, "utf-8");
  //         return content;
  //       } catch (error) {
  //         console.error(`無法讀取檔案 ${filePath}:`, error);
  //         return null;
  //       }
  //     }
  //   }
  //   return null;
  // }

  // 發送訊息給 Ollama API
  async function askOllama(prompt, context = "") {
    try {
      const fullPrompt = context ? `Context: ${context}\n\n${prompt}` : prompt;
      const response = await fetch(OLLAMA_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen:7b-chat",
          prompt: fullPrompt,
          stream: false,
        }),
      });

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error("[AIChat] Ollama API 錯誤:", error);
      return "抱歉，我現在無法回應。";
    }
  }

  // 儲存對話日誌
  async function saveChat(username, question, fullResponse, finalAnswer) {
    const now = new Date();
    const logEntry = `
      時間: ${now.toLocaleString()}
      玩家: ${username}
      問題: ${question}
      思考過程: ${fullResponse}
      最終回答: ${finalAnswer}
      ----------------------------------------
      `;

    const logDir = path.join(process.cwd(), "_log", "ai_chat");
    const logFile = path.join(logDir, `${now.toISOString().split("T")[0]}.log`);

    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, logEntry, "utf8");
    } catch (error) {
      console.error("[AIChat] 儲存日誌失敗:", error);
    }
  }

  // 處理 AI 回應
  function processAIResponse(response) {
    let finalAnswer = response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    finalAnswer = finalAnswer
      .split("\n")
      .filter((line) => line.trim())
      .join("\n");
    return finalAnswer;
  }

  // AI 回應模板
  const AI_TEMPLATE = {
    systemPrompt: `你是一個在 Minecraft 世界中的 AI 助手。
      回答時請遵循以下規則：

      1. 使用繁體中文回答
      2. 答案要簡短，通常不超過兩行
      3. 回答要友善、有趣
      4. 回答要符合 Minecraft 遊戲情境
      5. 直接給出答案，不要思考或分析
      6. 如果問題不清楚，請請求更多信息
      7. 如果問題無法回答，請說明你無法回答

      格式範例：
      問：如何製作工作台？
      答：在物品欄將4個木材板排成2x2的方形就能製作工作台囉！

      問：要怎麼找到鑽石？
      答：通常在Y值-59到-5之間最容易挖到鑽石，記得帶上鐵鎬或更好的工具！
      
      ---
      `,

    generatePrompt: (username, question) => `${AI_TEMPLATE.systemPrompt}
      當前玩家: ${username}
      問題: ${question}
      `,
  };

  // 處理聊天訊息
  bot.on("chat", async (username, message, translate, jsonMsg) => {
    const msgText = jsonMsg?.json?.with?.[1]?.[""] ?? "";

    if (username === bot.username) return; // 忽略 bot 自己的訊息
    if (msgText.startsWith(cmdPrefix)) return; // 忽略 @b 開頭的命令訊息
    if (!msgText.startsWith(aiChatPrefix)) return; // 忽略非 @a 開頭的訊息

    if (!isPlayerNearby(username)) {
      bot.safeChat(`${username} 靠近一點再跟我說話吧！`);
      return;
    }

    const question = msgText.slice(3).trim();

    try {
      const prompt = AI_TEMPLATE.generatePrompt(username, question);
      bot.safeChat(`讓我想想...`, `🗭`);
      const fullResponse = await askOllama(prompt);

      const finalAnswer = processAIResponse(fullResponse);
      await saveChat(username, question, fullResponse, finalAnswer);

      const messages = finalAnswer.split("\n");
      for (const msg of messages) {
        if (msg.trim()) {
          await bot.safeChat(`${msg.trim()}`, ``);
          await bot.waitForTicks(10);
        }
      }
    } catch (error) {
      console.error("[AIChat] 處理錯誤:", error);
      bot.safeChat(`${username} 抱歉，我現在有點混亂。`, `💦`);
    }
  });

  bot.aiChat = {
    askOllama,
    isPlayerNearby,
  };

  console.log(
    `${BLACK}[AIChat] AI chat module initialized. Run in local Ollama.${resetANSI}`
  );
}

module.exports = { initAIChat };
