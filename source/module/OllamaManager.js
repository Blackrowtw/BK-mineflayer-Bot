const { exec } = require("child_process");
const fetch = require("node-fetch");
const { resetANSI, YELLOW, GREEN, RED } = require("../escapeCodeANSI.js");
const fs = require("fs").promises;
const path = require("path");
const OpenCC = require("opencc-js");

class OllamaManager {
  constructor(config) {
    this.config = config;
    this.set = this.config.aiChatSetting;
    this.isRunning = false;
    this.modelName = this.set.modelName;
    this.apiUrl = this.set.apiUrl;
    this.template = require(this.set.templateFolder);
    this.currentTemplateId = this.set.templateId || 1;
    // 從配置中獲取生成參數，如果未提供則使用默認值
    this.generationParams = this.set.generationParams || {
      temperature: this.set.generationParams.temperature || 0.7, // 控制創意度，0.7-0.8 適合活潑回應
      top_p: this.set.generationParams.top_p || 0.9, // 控制多樣性
      max_tokens: this.set.generationParams.max_tokens || 150, // 限制回答長度
      frequency_penalty: this.set.generationParams.frequency_penalty || 0.2, // 減少重複
      presence_penalty: this.set.generationParams.presence_penalty || 0.2, // 鼓勵引入新話題
    };

    // 初始化簡繁轉換器
    this.converter = OpenCC.Converter({ from: "cn", to: "tw" });
  }

  // temperature (溫度):
  // 0.2-0.5: 更保守、事實性回答
  // 0.7-0.8: 平衡創意與準確性，適合活潑但不過於瘋狂的回答
  // 0.9-1.0: 更具創意和變化，但可能偶爾不夠準確

  // top_p (核心採樣):
  // 0.5: 保守採樣，回答更可預測
  // 0.9: 平衡多樣性和連貫性
  // 0.99: 更高的多樣性，可能產生更意外的回答

  // max_tokens (最大令牌數):
  // 50-100: 非常簡短的回答
  // 100-150: 適合一到兩行的回答
  // 200+: 更詳細的回答

  // frequency_penalty (頻率懲罰):
  // 0.0: 無懲罰
  // 0.2-0.5: 減少重複詞彙和短語
  // 1.0+: 強烈避免重複

  // presence_penalty (存在懲罰):
  // 0.0: 無懲罰
  // 0.2-0.5: 鼓勵引入新的話題和概念
  // 1.0+: 強烈鼓勵新穎性

  async checkOllamaService() {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async checkModel() {
    try {
      const response = await fetch(`${this.apiUrl}/api/tags`);
      const data = await response.json();
      return data.models?.some((model) => model.name === this.modelName);
    } catch (error) {
      return false;
    }
  }

  async startOllama() {
    console.log(`${YELLOW}・正在啟動 Ollama 服務...${resetANSI}`);

    return new Promise((resolve, reject) => {
      exec("ollama serve", (error) => {
        if (error) {
          console.error(`${RED}啟動 Ollama 服務失敗:${resetANSI}`, error);
          reject(error);
        }
      });

      this.waitForService(resolve);
    });
  }

  async waitForService(resolve, attempts = 0) {
    if (attempts > 30) {
      throw new Error("Ollama 服務啟動超時");
    }

    const isRunning = await this.checkOllamaService();
    if (isRunning) {
      this.isRunning = true;
      resolve();
    } else {
      setTimeout(() => this.waitForService(resolve, attempts + 1), 1000);
    }
  }

  async startModel() {
    try {
      console.log(`${YELLOW}・檢查模型狀態...${resetANSI}`);
      const modelExists = await this.checkModel();

      if (!modelExists) {
        console.log(
          `${YELLOW}・正在下載模型，這可能需要一些時間...${resetANSI}`
        );
        await fetch(`${this.apiUrl}/api/pull`, {
          method: "POST",
          body: JSON.stringify({ name: this.modelName }),
        });
      }

      console.log(`${YELLOW}・正在啟動 ${this.modelName} 模型...${resetANSI}`);
      await fetch(`${this.apiUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          prompt: "你好",
          stream: false,
        }),
      });

      return true;
    } catch (error) {
      console.error(`${RED}啟動模型失敗:${resetANSI}`, error);
      return false;
    }
  }

  async askOllama(prompt, context = "", options = {}) {
    try {
      const fullPrompt = context ? `Context: ${context}\n\n${prompt}` : prompt;

      // 使用構造函數中定義的參數，並允許被 options 覆蓋
      const requestOptions = { ...this.generationParams, ...options };

      const response = await fetch(`${this.apiUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.modelName,
          prompt: fullPrompt,
          stream: false,
          ...requestOptions, // 展開所有生成參數
        }),
      });

      const data = await response.json();
      // 轉換回應為繁體
      return this.converter(data.response);
    } catch (error) {
      console.error(`${RED}Ollama API 錯誤:${resetANSI}`, error);
      return "抱歉，我現在無法回應。";
    }
  }

  async saveChat(username, question, fullResponse, finalAnswer) {
    const now = new Date();
    // 檢查是否為思考模型的回應
    const hasThinkTag = /<think>[\s\S]*?<\/think>/g.test(fullResponse);

    // 提取思考內容
    const thinkContent = hasThinkTag
      ? fullResponse
          .match(/<think>([\s\S]*?)<\/think>/g)
          ?.map((t) => t.replace(/<\/?think>/g, "").trim())
          ?.join("\n")
      : "無思考過程 (模型直接回應)";

    const logEntry = `
      時間: ${now.toLocaleString()}
      模型: ${this.modelName}
      玩家: ${username}
      問題: ${question}

      思考過程:
      ${thinkContent}

      回答內容:
      ${finalAnswer}
      
      ---------------------------
      `;

    const logDir = path.join(process.cwd(), "_log", "ai_chat");
    const logFile = path.join(logDir, `${now.toISOString().split("T")[0]}.log`);

    try {
      await fs.mkdir(logDir, { recursive: true });
      await fs.appendFile(logFile, logEntry, "utf8");
    } catch (error) {
      console.error(`${RED}[AIChat] 儲存日誌失敗:${resetANSI}`, error);
    }
  }

  processAIResponse(response) {
    let finalAnswer = response.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    // 確保思考過程移除後的內容也經過繁體轉換
    finalAnswer = this.converter(finalAnswer);
    return finalAnswer
      .split("\n")
      .filter((line) => line.trim())
      .join("\n");
  }

  formatGameTime(ticks) {
    // Minecraft 時間換算常數
    const TICKS_PER_DAY = 24000;
    const TICKS_PER_HOUR = TICKS_PER_DAY / 24; // 1000 ticks 每小時
    const TICKS_PER_MINUTE = TICKS_PER_HOUR / 60; // 約 16.67 ticks 每分鐘
    const HOUR_OFFSET = 6; // Minecraft 時間偏移量

    // 確保 ticks 在 0-24000 範圍內
    const normalizedTicks =
      ((ticks % TICKS_PER_DAY) + TICKS_PER_DAY) % TICKS_PER_DAY;

    // 計算小時和分鐘（加入6小時偏移）
    let hours = Math.floor(normalizedTicks / TICKS_PER_HOUR) + HOUR_OFFSET;
    // 確保小時數在 0-23 範圍內
    hours = hours % 24;

    const minutes = Math.floor(
      (normalizedTicks % TICKS_PER_HOUR) / TICKS_PER_MINUTE
    );

    // 判斷時段
    let period;
    if (hours >= 5 && hours < 12) {
      period = "早晨";
    } else if (hours >= 12 && hours < 17) {
      period = "下午";
    } else if (hours >= 17 && hours < 19) {
      period = "黃昏";
    } else if (hours >= 19 || hours < 5) {
      period = "夜晚";
    }

    // 格式化時間
    return {
      time: `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`,
      period,
    };
  }

  generatePrompt(bot, username, question) {
    const template =
      this.template.templates[this.currentTemplateId] ||
      this.template.templates[1];
    const gameTime = this.formatGameTime(bot.time.timeOfDay);

    // 判斷天氣狀況
    let weather;
    if (bot.thunderState > 0) {
      weather = "雷雨天";
    } else if (bot.isRaining) {
      weather = "雨天";
    } else {
      weather = "晴天";
    }

    const contextInfo = {
      botName: bot.entity.username,
      playerName: username,
      question: question,
      gameTime: `${gameTime.period} ${gameTime.time}`,
      weather: weather,
      personality: template.name,
    };

    return `${template.systemPrompt}
      當前對話情境：
      - 你的身份是: ${contextInfo.personality}
      - 你的玩家名稱是: ${contextInfo.botName}
      - 對話玩家名稱是: ${contextInfo.playerName}
      - 當前遊戲時間: ${contextInfo.gameTime}
      - 天氣狀況: ${contextInfo.weather}
      玩家問題: ${contextInfo.question}`;
  }

  switchTemplate(templateId) {
    if (this.template.templates[templateId]) {
      this.currentTemplateId = templateId;
      return true;
    }
    return false;
  }

  async initialize() {
    if (!this.config.aiChatSetting.isEnabled) {
      console.log("AI 聊天功能未啟用，跳過 Ollama 初始化");
      return true;
    }

    try {
      const serviceRunning = await this.checkOllamaService();
      if (!serviceRunning) {
        await this.startOllama();
      }

      const modelStarted = await this.startModel();
      if (!modelStarted) {
        throw new Error("模型啟動失敗");
      }

      console.log(`${GREEN}・Ollama ${this.modelName} 已就緒${resetANSI}`);
      return true;
    } catch (error) {
      console.error(`${RED}Ollama 初始化失敗:${resetANSI}`, error);
      return false;
    }
  }

  async shutdown() {
    try {
      console.log(`${YELLOW}・正在關閉 Ollama 服務...${resetANSI}`);

      if (process.platform === "win32") {
        await new Promise((resolve, reject) => {
          exec("taskkill /F /IM ollama.exe", (error, stdout, stderr) => {
            if (error && error.code !== 128) {
              console.error(`${RED}Ollama 關閉失敗:${resetANSI}`, error);
              reject(error);
            } else {
              resolve();
            }
          });
        });
      } else {
        await new Promise((resolve, reject) => {
          exec("pkill ollama", (error, stdout, stderr) => {
            if (error && error.code !== 1) {
              console.error(`${RED}Ollama 關閉失敗:${resetANSI}`, error);
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      this.isRunning = false;
      console.log(`${GREEN}・Ollama 服務已關閉${resetANSI}`);
    } catch (error) {
      console.error(`${RED}關閉 Ollama 時發生錯誤:${resetANSI}`, error);
    }
  }
}

module.exports = { OllamaManager };
