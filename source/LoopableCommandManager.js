const path = require("path");
const fs = require("fs");

// 文字顏色 ANSI 控制碼常量
const {
  resetANSI,
  BOLD_RED,
  BOLD_SKY,
  SKY,
  BLACK,
} = require("./escapeCodeANSI.js");

class LoopableCommandManager {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.lowerCaseNames = new Map();
    // 參數驗證器實例
    this.validator = new CommandValidator();

    // 系統命令 全部停止 (直接綁定執行函數)
    this.addCommand({
      name: "stopAll",
      aliases: ["stop", "stopall", "停", "停止"],
      execute: async (bot) => {
        await bot.pvp.stop();
        if (bot.pathfinder.isMoving()) {
          bot.pathfinder.stop();
          bot.pathfinder.setGoal(null);
        }

        if (bot.currentWindow) {
          await bot.closeWindow(bot.currentWindow);
        }
        await bot.clearControlStates();
        const stopResult = await this.stopAll();
        const report = this.stopAllReport(stopResult);
        await bot.safeChat(report.chatMessage, "");
      },
      group: `System`,
      description: `讓 LCM 停止 Bot 所有執行中的循環命令`,
    });
    // 系統命令 運行狀態 (直接綁定執行函數)
    this.addCommand({
      name: "loopCommandState",
      aliases: ["state", "狀態"],
      execute: async (bot) => {
        const runningCommands = this.getRunningCommands();
        const statusMessage = this._formatStatusMessage(runningCommands);
        await bot.safeChat(statusMessage, "");
      },
      group: `System`,
      description: `取得 LCM 目前執行的循環命令狀態`,
    });
    // 系統命令 生成指令列表
    this.addCommand({
      name: "help",
      aliases: ["幫助"],
      paramRules: [
        {
          name: ["groupName"],
          desc: ["分類"],
          type: ["string"],
          required: [true],
          helpMsg: "<groupName>: 命令組的分類名稱",
        },
      ],
      execute: async (bot, cmd, options) => {
        await bot.waitForTicks(5);
        const { accept, parsed } = await this.parseOptions(bot, cmd, options);
        if (!accept) return;

        try {
          const group = parsed?.groupName ?? "";
          const help = this._generateCommandHelp(bot, group);
          const helpMsg = help.consoleMessage;
          const infoMsg = help.infoMessage;
          const chatMsg = help.chatMessages;
          const ticks = bot.Bot_Config.waitForTicks || 20;
          console.log(helpMsg); // 輸出到終端
          await bot.safeChat(infoMsg, "💾");
          // 逐條發送遊戲內訊息
          for (const msg of chatMsg) {
            await bot.safeChat(msg, ``);
            await bot.waitForTicks(ticks); // 避免訊息發送過快
          }
        } catch (error) {
          await bot.safeChat(`指令列表生成失敗: ${error.message}`, `❌`);
          console.error(`${error.stack}`);
        }
      },
      group: `System`,
      description: `生成所有 BK-Bot 可用的指令，並輸出到命令行`,
    });
    // 初始化模組載入流程
    this._loadAllCommands();
  }

  // 創建新命令
  addCommand(config) {
    const defaultConfig = {
      name: "",
      aliases: [],
      paramRules: [],
      interval: null, // 循環函數的觸發間隔
      preCheck: async () => true, // 執行前檢查
      onStart: async () => {}, // 啟動時回調
      execute: async () => {}, // 主要執行邏輯
      onStop: async () => {}, // 停止時回調
      minInterval: 50,
      group: "",
      description: "",
      type: "",
      nickname: "",
      duration: "",
    };

    const cmd = { ...defaultConfig, ...config };
    // 小寫名稱衝突檢查
    const lowerName = cmd.name.toLowerCase();
    if (this.lowerCaseNames.has(lowerName)) {
      throw new Error(
        `[LCM] 命令名稱衝突檢測失敗:\n` +
          `新命令: ${cmd.name} (小寫: ${lowerName})\n` +
          `已存在: ${existing} (小寫: ${existing.toLowerCase()})\n`
      );
    }

    // 檢查是否有主函數
    if (!cmd.execute)
      throw new Error(`[LCM] ERROR: ${cmd.name} 缺少 execute 定義`);

    // 參數規則驗證函數
    if (config.paramRules) {
      cmd.paramRules = config.paramRules;
    }

    // 自動判斷執行模式
    cmd.interval = cmd.interval === null ? 0 : Number(cmd.interval);

    // 間隔時間驗證
    if (isNaN(cmd.interval) || cmd.interval < 0) {
      throw new Error(`[LCM] ERROR: ${cmd.name} 的間隔時間設定無效`);
    }

    // 僅在循環模式應用最小間隔限制
    cmd.interval =
      cmd.interval > 0 ? Math.max(cmd.interval, cmd.minInterval) : 0;

    // 註冊命令對象
    this.commands.set(cmd.name, {
      intervalId: null,
      ...cmd,
    });

    // 註冊別名表
    cmd.aliases.forEach((alias) => this.aliases.set(alias, cmd.name));

    // 註冊小寫名稱
    this.lowerCaseNames.set(lowerName, cmd.name);
  }

  // 開始命令
  async start(bot, commandName, options) {
    const cmd = this._getCommand(commandName);
    if (!cmd || cmd.intervalId) return false;

    try {
      if (!(await cmd.preCheck(bot, cmd, options))) {
        return false;
      }
    } catch (err) {
      console.error(`[LCM] preCheck 檢查失敗 (${cmd.name}):`, err);
      return false;
    }

    // 記錄啟動時間戳 屬性 以及第一項別名
    cmd.startTime = Date.now();
    cmd.type = cmd.interval > 0 ? "🔄 循環" : "⚡ 單次";
    cmd.nickname = cmd.aliases[0] || "";

    // 立即更新到 Map
    this.commands.set(cmd.name, cmd);

    // 執行啟動回調
    if (cmd.onStart) {
      try {
        await cmd.onStart(bot, cmd, options);
      } catch (err) {
        console.error(`[LCM] onStart 回調失敗 (${cmd.name}):`, err);
      }
    }

    // 核心邏輯
    if (cmd.interval > 0) {
      // 循環命令
      cmd.intervalId = setInterval(async () => {
        try {
          await cmd.execute(bot, cmd, options);
        } catch (err) {
          console.error(`[LCM] 循環命令執行失敗 (${cmd.name}):`, err);
          await bot.safeChat(`${cmd.name} 執行失敗: ${err.message}`, `⛔`);
          this.stop(bot, cmd.name, options);
        }
      }, cmd.interval);
    } else {
      // 單次命令
      try {
        await cmd.execute(bot, cmd, options);
      } catch (err) {
        console.error(`[LCM] 單次執行失敗 (${cmd.name}):`, err);
      }
      // 清理單次命令的執行狀態
      cmd.intervalId = setTimeout(async () => {
        cmd.intervalId = null;
        if (cmd.onStop) {
          try {
            await cmd.onStop(bot, cmd, options);
          } catch (err) {
            console.error(`[LCM] onStop 回調失敗 (${cmd.name}):`, err);
          }
        }
      }, 50);
    }
    return true;
  }

  // 停止命令
  async stop(bot, commandName, options) {
    const cmd = this._getCommand(commandName);
    if (!cmd || !cmd.startTime) return false; // 防止未啟動命令進入

    // 紀錄停止時間
    const stopTime = Date.now();
    cmd.stopTime = stopTime; // 新增停止時間屬性

    // 計算執行次數
    if (cmd.interval === 0 || cmd.interval === null) {
      cmd.runtimeCounter = 1; // 單次命令直接記1次
    } else {
      const duration = stopTime - cmd.startTime;
      cmd.lastDuration = this._formatDuration(cmd.startTime);
      cmd.runCount = Math.floor(duration / cmd.interval) + 1; // 包含首次執行
    }

    // 清除定時器
    clearInterval(cmd.intervalId);
    cmd.intervalId = null;
    cmd.startTime = null;

    // 異步執行停止回調
    if (cmd.onStop) {
      try {
        await cmd.onStop(bot, cmd, options);
      } catch (err) {
        console.error(`[LCM] onStop 回調失敗 (${cmd.name}):`, err);
      }
    }
    return true;
  }

  // 內部用函數 強制停止
  async _stop(commandName) {
    const cmd = this._getCommand(commandName);
    if (!cmd || !cmd.startTime) return false; // 防止未啟動命令進入

    // 紀錄停止時間
    const stopTime = Date.now();
    cmd.stopTime = stopTime; // 新增停止時間屬性

    // 計算執行次數（添加默認值處理）
    if (cmd.interval === 0 || cmd.interval === null) {
      cmd.runtimeCounter = 1; // 單次命令直接記1次
      cmd.runCount = 1; // 確保單次命令也有 runCount
    } else {
      const duration = stopTime - cmd.startTime;
      cmd.lastDuration = this._formatDuration(cmd.startTime);
      cmd.runCount = Math.floor(duration / cmd.interval) + 1; // 包含首次執行
    }

    // 清除定時器
    clearInterval(cmd.intervalId);
    cmd.intervalId = null;
    cmd.startTime = null;
    return true;
  }

  async stopAll() {
    const result = {
      stoppedCommands: [],
      errorCount: 0,
      total: 0,
    };

    for (const [name, cmd] of this.commands) {
      // 運行狀態檢查
      if (!cmd.intervalId || name === "stopAll" || name === "state") continue;
      result.total++;
      try {
        // 紀錄停止時間
        const stopTime = Date.now();
        cmd.stopTime = stopTime; // 新增停止時間屬性
        if (await this._stop(cmd.name)) {
          result.stoppedCommands.push({
            name: cmd.name,
            nickname: cmd.nickname,
            lastDuration: cmd.lastDuration,
            runCount: cmd.runCount,
          });
        }
      } catch (err) {
        result.errorCount++;
        console.logTimer(`[LCM] 停止 ${name} 失敗: ${err.message}`);
        console.error(err.stack);
      }
    }
    return result;
  }

  stopAllReport(result) {
    const successCount = result.stoppedCommands?.length || 0;
    const { errorCount, total } = result;
    // 訊息模板
    const statusLines = [
      `📊 命令停止報告: ▸ 成功: ${successCount} ▸ 失敗: ${errorCount} ▸ 總計: ${total}`,
    ];

    // 添加詳細列表
    if (successCount > 0) {
      statusLines.push(
        "\n⛔ 已停止命令列表:",
        ...result.stoppedCommands.map((cmd, index) => {
          // 安全地取得執行次數，如果是 undefined 則顯示 0
          const runCount = cmd.runCount ?? 0;

          return (
            `${index + 1}. ${cmd.name} (${cmd.nickname})` +
            ` ▸ 執行時間: ${cmd.lastDuration || "無紀錄"}` +
            ` ▸ 次數: ⏱ ${runCount.toLocaleString("en-US")}`
          );
        })
      );
    }

    // 生成最終訊息
    const finalMessage =
      successCount > 0
        ? statusLines.join("\n")
        : errorCount > 0
        ? "❌ 所有停止操作均失敗"
        : "🛈 無運行中命令";

    // 控制台專用格式
    const consoleMessage = `[LCM] 停止全部命令完成\n${finalMessage.replace(
      /\n/g,
      " | "
    )}`;

    return {
      chatMessage: finalMessage,
      logMessage: consoleMessage,
      rawData: result,
    };
  }

  // 初始化 模組批量載入方法
  _loadAllCommands() {
    const commandsDir = path.join(__dirname, "Commands"); // 獲取路徑 檔案來源的資料夾

    try {
      // 1. 檢查目錄是否存在
      if (!fs.existsSync(commandsDir)) {
        throw new Error(`[LCM] Error: 命令目錄不存在: ${commandsDir}`);
      }

      // 2. 讀取目錄下所有文件
      const files = fs.readdirSync(commandsDir).filter(
        (file) => file.endsWith(".js") && !file.startsWith("_") // 排除以底線開頭的文件
      );

      let totalLoaded = 0;

      // 3. 遍歷處理每個文件
      files.forEach((file) => {
        const filePath = path.join(commandsDir, file);

        try {
          // 4. 動態載入模組
          const module = require(filePath);

          // 5. 驗證模組格式
          if (!Array.isArray(module)) {
            console.logTimer(
              `${BLACK}[LCM] 跳過 ${file}: 導出格式須為陣列${resetANSI}`
            );
            return;
          }

          // 6. 載入有效模組
          this.loadModule(module);
          totalLoaded++;

          // console.logTimer(
          //   `[LCM] 成功載入 ${path.basename(file, ".js")} ` +
          //     `(${module.length} 個命令)`
          // ); //debug 用
        } catch (err) {
          console.logTimer(
            `${BLACK}[LCM] 載入 ${file} 失敗: ${
              err.message.split("\n")[0]
            }${resetANSI}`
          );
        }
      });

      // 7. 最終統計報告
      console.log(
        `${BLACK}[LCM] Loading completed. ` +
          `Files: ${totalLoaded}/${files.length}, ` +
          `Total Commands: ${this.commands.size}${resetANSI}`
      );
    } catch (err) {
      console.logTimer(
        `[LCM] 初始化 ${BOLD_RED}嚴重錯誤${resetANSI} : ${err.message}`
      );
      process.exit(1);
    }
  }

  // 載入模組方法
  loadModule(moduleConfig) {
    // console.log("[LCM] 正在加載模組:", moduleConfig); // debug 用
    moduleConfig.forEach((config) => {
      if (this.commands.has(config.name)) {
        throw new Error(`[LCM] Error: 命令 ${config.name} 已存在！`);
      }
      this.addCommand({
        ...config,
      });
    });
  }

  // 狀態查詢方法
  getRunningCommands() {
    const running = [];
    this.commands.forEach((cmd, name) => {
      if (cmd.intervalId && name !== "state" && name !== "stopAll") {
        running.push({
          name: name,
          type: cmd.interval > 0 ? "🔄 循環" : "⚡ 單次",
          nickname: cmd.aliases[0] || "",
          duration: this._formatDuration(cmd.startTime),
        });
      }
    });
    return running;
  }

  // 狀態訊息格式化
  _formatStatusMessage(commands) {
    const header = `📊 目前有 ${commands.length} 個命令執行中：`;
    if (commands.length === 0) return header + "\n▫ 無執行中命令";

    const list = commands
      .map(
        (cmd, index) =>
          `${index + 1}. ${cmd.name} (${cmd.nickname}) ▸ 類型: ${
            cmd.type
          } ▸ 執行時間: ${cmd.duration}`
      )
      .join("\n\n");

    const footer = `💡 使用 stopAll 停止全部命令`;

    return `${header}\n${list}\n\n${footer}`;
  }

  // 持續時間格式化
  _formatDuration(startTime) {
    if (!startTime) return "尚未開始";
    const seconds = Math.floor((Date.now() - startTime) / 1000);

    // 人性化時間格式
    const units = [];
    const days = Math.floor(seconds / 86400);
    if (days > 0) units.push(`${days}天`);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (hours > 0) units.push(`${hours}小時`);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (minutes > 0) units.push(`${minutes}分`);
    const remainingSeconds = seconds % 60;
    units.push(`${remainingSeconds}秒`);

    return "⏳ " + units.join(" ");
  }

  // 傳遞對象 並且可以接收小名
  _getCommand(commandName) {
    // 分三步查找：
    // 1. 查找小寫命令名稱
    const lowerInput = commandName.toLowerCase();
    const resolvedByLower = this.lowerCaseNames.get(lowerInput);
    if (resolvedByLower) return this.commands.get(resolvedByLower);

    // 2. 查找原始別名映射
    const aliasResolved = this.aliases.get(commandName);
    if (aliasResolved) return this.commands.get(aliasResolved);

    // 3. 最後嘗試直接查找原始名稱
    return this.commands.get(commandName);
  }

  // 建立指令列表
  _generateCommandHelp(bot, group) {
    const filterGroup = [null, undefined, ""].includes(group) ? "" : group;
    const commandPrefix = bot.Bot_Config.commandSitting.prefix;
    const commandAliasMap = new Map();

    // 建立反向映射表
    for (const [alias, mainCmd] of this.aliases) {
      if (!commandAliasMap.has(mainCmd)) {
        commandAliasMap.set(mainCmd, new Set());
      }
      commandAliasMap.get(mainCmd).add(alias);
    }

    // 初始化分組容器
    const groupedCommands = new Map();
    groupedCommands.set("*Uncategorized", []);

    // 迭代主命令
    for (const mainCmd of this.commands.keys()) {
      const displayCmd =
        this.lowerCaseNames.get(mainCmd.toLowerCase()) || mainCmd;
      const cmdInstance = this._getCommand(displayCmd);

      // 提取分組資訊 (假設命令實例有 group 屬性)
      const group = cmdInstance?.group || "";
      const normalizedGroup = group.trim() || "*Uncategorized";

      // 初始化分組容器
      if (!groupedCommands.has(normalizedGroup)) {
        groupedCommands.set(normalizedGroup, []);
      }

      // 組合別名列表
      const aliases = [...(commandAliasMap.get(mainCmd) || [])]
        .filter((a) => a !== displayCmd)
        .join(" / ");
      const aliasList = aliases ? ` / ${aliases}` : "";

      // 加入分組
      groupedCommands.get(normalizedGroup).push({
        main: displayCmd,
        aliases: aliasList,
        orderKey: displayCmd.toLowerCase(),
        description:
          cmdInstance?.description || `執行 ${displayCmd} 相關功能。`,
      });
    }

    // 分組排序邏輯
    const sortedGroups = [...groupedCommands.keys()].sort((a, b) => {
      const PRIORITY_GROUPS = {
        System: 1, // 最高優先級
        Data: 2,
        Inventory: 3,
        Action_Basic: 4,
        Action_Advanced: 5,
        Loop: 6,
        Pathfinder: 7,
        未分類: 998,
        "*Uncategorized": 999, // 最低優先級
      };
      const priorityA = PRIORITY_GROUPS[a] || 100;
      const priorityB = PRIORITY_GROUPS[b] || 100;
      // 先按權重排序
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      // 同權重按字母排序
      return a.localeCompare(b);
    });

    // 構建幫助訊息
    let helpMessage = ``;
    let chatMessages = [];
    let infoMessage = ``;
    let matchCommandCount = 0;
    let matchGroupCount = 0;
    if (filterGroup) {
      helpMessage = `${BLACK}以下是含有 ${SKY}${filterGroup}${BLACK} 字符的分類，其中可用的命令：${resetANSI}\n`;
      infoMessage = `已將含有 ${filterGroup} 字符的分類所包含的命令清單，生成於終端。`;
    } else {
      helpMessage =
        `${BLACK}以下是所有 ${SKY}${commandPrefix}${BLACK} 可用的命令，` +
        `共 ${this.commands.size} 項：${resetANSI}\n`;
      infoMessage = `已將完整命令清單，生成於終端。`;
    }

    // 為遊戲內聊天準備簡短別名
    const getShortestAlias = (mainCmd, aliasSet) => {
      const allNames = [mainCmd, ...(aliasSet || [])];
      return (
        allNames
          .filter((name) => /^[A-Za-z0-9]+$/.test(name)) // 只保留純英文別名
          .sort((a, b) => a.length - b.length)[0] || // 選擇最短的
        mainCmd
      ); // 如果沒有英文別名，使用主命令名
    };

    // 構建聊天訊息
    let currentMessage = "";

    // 處理分組輸出
    const appendToChat = (text) => {
      if (currentMessage.length + text.length > 240) {
        // 留一些餘地
        chatMessages.push(currentMessage);
        currentMessage = text;
      } else {
        currentMessage += text;
      }
    };

    // 遍歷分組生成 help 訊息
    for (const groupName of sortedGroups) {
      if (filterGroup) {
        const lowerFilter = filterGroup.toLowerCase();
        const lowerGroup = groupName.toLowerCase();
        if (!lowerGroup.includes(lowerFilter)) continue;
      }

      const commands = groupedCommands.get(groupName);
      if (commands.length === 0) continue;

      // 開始新的分組
      appendToChat(`\n[◈ ${groupName} ◈]`);

      // 收集該分組的所有短命令
      const shortCmds = commands
        .map((cmd) => {
          const shortAlias = getShortestAlias(
            cmd.main,
            commandAliasMap.get(cmd.main)
          );
          return shortAlias;
        })
        .join(", ");

      appendToChat(` ${shortCmds}`);
      matchCommandCount += commands.length;
      matchGroupCount++;
    }

    // 添加最後一條訊息
    if (currentMessage) {
      chatMessages.push(currentMessage);
    }

    // 添加摘要訊息
    if (matchGroupCount > 0) {
      chatMessages.unshift(
        `📖 命令清單 (${matchCommandCount} 條命令, ${matchGroupCount} 項分類)：`
      );
    } else {
      chatMessages = [``];
    }

    // 將命令分組並輸出 help 訊息
    for (const groupName of sortedGroups) {
      if (filterGroup) {
        // 無視大小寫 且模糊比對
        const lowerFilter = filterGroup.toLowerCase();
        const lowerGroup = groupName.toLowerCase();
        if (!lowerGroup.includes(lowerFilter)) continue;
      }

      const commands = groupedCommands
        .get(groupName)
        .sort((a, b) => a.orderKey.localeCompare(b.orderKey));

      if (commands.length === 0) continue;

      helpMessage += `\n${BOLD_SKY}◈ ${groupName} ◈${resetANSI}\n`;

      commands.forEach(({ main, aliases, description }) => {
        helpMessage += `- ${SKY}${main}${aliases}${resetANSI}：${description}\n`;
        matchCommandCount++;
      });
      matchGroupCount++;
    }

    if (matchGroupCount === 0) {
      helpMessage = `${SKY}${filterGroup}${BLACK} 分類下並沒有可用的命令${resetANSI}\n`;
      infoMessage =
        `並沒有命令分類含有 ${filterGroup} 字符，目前共有 ${sortedGroups.length} 個分類：\n` +
        `[◈ ${sortedGroups.join(" ◈] [◈ ")} ◈]`;
    }

    return {
      consoleMessage: helpMessage,
      infoMessage: infoMessage,
      chatMessages: chatMessages, // 新增：遊戲內聊天訊息陣列
      matchCommands: matchCommandCount,
      matchGroups: matchGroupCount,
    };
  }

  // 驗證命令參數規則 並解析
  async parseOptions(bot, cmd, options) {
    if (!cmd) return { accept: false };

    // 無參數規則直接通過
    if (!cmd.paramRules || cmd.paramRules.length === 0) {
      return { accept: true, parsed: {} };
    }

    // 執行驗證流程
    const parsedOpt = await this.validator.validate(bot, cmd, options);
    return parsedOpt;
  }

  // 指令觸發失敗 提示訊息
  async cmdFailedMsg(bot, cmd) {
    const commandPrefix = bot.Bot_Config.commandSitting.prefix;
    const failedHeader = [`⛔ 命令 ${cmd.name} 觸發失敗`];
    if (!cmd.paramRules || cmd.paramRules.length === 0) return;
    const helpMsgs = cmd.paramRules.map((rule) => {
      const params = rule.desc
        .map((n, i) => `${rule.required[i] ? `<${n}>` : `[${n}]`}`)
        .join(" ");
      return `▸ ${commandPrefix} ${cmd.name} ${params} ( ${rule.helpMsg} )`;
    });
    const cmdHelps = [`🛈 可用格式:`, ...helpMsgs];
    await bot.safeChat(failedHeader, "");
    await bot.safeChat(cmdHelps.join("\n "), "");
  }
}

// 命令參數規則驗證器 功能類
class CommandValidator {
  async validate(bot, cmd, rawOptions) {
    const result = { accept: true, parsed: {}, errors: [] };
    let lastError = [];

    const optionsMap = this._mapOptions(rawOptions);
    const inputCount = Object.keys(optionsMap).length;

    // 沒有輸入參數
    if (inputCount === 0) return result;

    if (!cmd?.paramRules || cmd.paramRules.length === 0) {
      result.accept = false;
      result.errors.push(`命令 ${cmd.name} 沒有參數規則，無法驗證`);
      await this._sendValidationError(bot, cmd, result.errors);
      return result;
    }

    // 步驟 1: 篩選符合參數數量的規則
    const acpRules = this._acceptedRules(cmd, inputCount);
    if (acpRules.length === 0) {
      result.accept = false;

      // 使用 Set 過濾重複數值
      const uniqueLengths = [
        ...new Set(cmd.paramRules.map((r) => r.name.length)),
      ];

      // 組合錯誤訊息時採用去重後的數值
      const lengthDisplay = uniqueLengths.join(", ");
      result.errors.push(
        `參數數量不符 (輸入 ${inputCount} 個，可接受 ${lengthDisplay} 個)`
      );

      await this._sendValidationError(bot, cmd, result.errors);
      return result;
    }

    // 步驟 2: 依序嘗試匹配規則
    for (const rule of acpRules) {
      const { paramSet, isValid, errors } = this._validateRule(
        rule,
        optionsMap
      );

      // 匹配成功立即返回
      if (isValid) {
        result.accept = true;
        result.parsed = paramSet;
        result.errors = []; // 清空先前錯誤
        return result;
      }

      // 保存最後一組錯誤
      lastError = errors;
    }

    // 所有規則匹配失敗
    result.accept = false;
    result.errors = lastError; // 只保留最後一組錯誤
    await this._sendValidationError(bot, cmd, result.errors);
    return result;
  }

  // 私有工具函數：取出純參數部分 Options
  _mapOptions(rawOptions) {
    const filteredOpt = {};

    // 核心邏輯：僅保留純數字鍵
    Object.keys(rawOptions).forEach((key) => {
      if (/^\d+$/.test(key)) {
        // 嚴格匹配純數字鍵
        filteredOpt[key] = rawOptions[key];
      }
    });
    return filteredOpt;
  }

  // 私有工具函數：匹配符合的參數規則
  _acceptedRules(cmd, inputCount) {
    // Step 1: 基本名稱長度匹配
    const lengthMatch = cmd.paramRules.filter(
      (rule) => rule.name.length === inputCount
    );

    // Step 2: 動態參數容錯匹配
    const dynamicMatch = cmd.paramRules.filter((rule) => {
      const optionalParams = rule.required.filter((r) => !r).length;
      const effectiveLength = Math.max(rule.name.length - optionalParams, 1);
      return effectiveLength === inputCount;
    });

    // 合併兩組結果並去重
    return [...lengthMatch, ...dynamicMatch].sort((a, b) => {
      // 必填參數多的規則優先
      const aRequired = a.required.filter((r) => r).length;
      const bRequired = b.required.filter((r) => r).length;
      return bRequired - aRequired;
    });
  }

  // 私有工具函數：規則驗證方法
  _validateRule(rule, optionsMap) {
    const paramSet = {};
    const errors = [];
    let isValid = true;
    const typeMapping = {
      integer: ["positiveInteger", "negativeInteger", "zero"],
      float: ["positiveFloat", "negativeFloat", "zero"],
      positiveNumber: ["positiveInteger", "positiveFloat"],
      negativeNumber: ["negativeInteger", "negativeFloat"],
      number: [
        "positiveInteger",
        "negativeInteger",
        "positiveFloat",
        "negativeFloat",
        "zero",
      ],
    };

    for (let i = 0; i < rule.name.length; i++) {
      const paramName = rule.name[i];
      const expectedType = rule.type[i];
      const inputParam = optionsMap[i];

      const index = i + 1;
      const paramSymbol = rule.required[i]
        ? `<${paramName}>`
        : `[${paramName}]`;
      const expTypeName = this._readableTypeName(expectedType);
      const inputTypeName = this._readableTypeName(inputParam?.type);

      // 參數類型檢查
      if (inputParam) {
        // 第一步：直接比對
        let typeChecker = inputParam.type === expectedType;
        if (!typeChecker) {
          // 第二步：從 mapType 中查找 expectedType
          const keyType = Object.keys(typeMapping).find(
            (key) =>
              key === expectedType ||
              (typeMapping[key] && typeMapping[key].includes(expectedType))
          );
          if (keyType) {
            typeChecker = typeMapping[keyType].includes(inputParam.type);
          }
        }

        // 兩步匹配不通過
        if (!typeChecker) {
          const errorMsg = `第 ${index} 個參數 ${paramSymbol} 類型錯誤，應為 ${expTypeName}，並非 ${inputTypeName}`;
          errors.push(errorMsg);
          isValid = false;
          // console.log(`[LCM] _validateRule 驗證失敗 ${errorMsg}`); // 顯示日誌提示
        }

        paramSet[paramName] = inputParam.value;
      }
      // 其餘選填參數補默認值
      else {
        paramSet[paramName] = null;
      }
    }

    return { paramSet, isValid, errors };
  }

  // 私有工具函數：類型名稱中文可讀性轉換
  _readableTypeName(type) {
    const typeNameMap = {
      string: "字串",
      number: "數字",
      positiveNumber: "正數",
      negativeNumber: "負數",
      zero: "零值",
      integer: "整數",
      positiveInteger: "正整數",
      negativeInteger: "負整數",
      float: "浮點數",
      positiveFloat: "正浮點數",
      negativeFloat: "負浮點數",
      percentage: "百分比",
      boolean: "布林值",
      object: "對象",
    };
    return typeNameMap[type] || type;
  }

  // 錯誤訊息生成
  async _sendValidationError(bot, cmd, errors) {
    const commandPrefix = bot.Bot_Config.commandSitting.prefix;
    // 動態生成參數語法模板
    const syntaxList = cmd.paramRules.map((rule) => {
      const params = rule.name
        .map((n, i) => `${rule.required[i] ? `<${n}>` : `[${n}]`}`)
        .join(" ");
      return `▸ ${commandPrefix} ${cmd.name} ${params}\n   └─ ${rule.helpMsg}`;
    });

    // 結構化錯誤輸出
    const errorHeader = [`⛔ 命令 ${cmd.name} 參數錯誤`];
    const errorReasons = [`❌ 錯誤原因:`, ...errors.map((e) => `▸ ${e}`)];
    const syntaxSection = [`✅ 可用格式:`, ...syntaxList];
    const paramDescriptions = [
      `📖 參數說明:`,
      ...cmd.paramRules.flatMap((rule) =>
        rule.name.map(
          (n, i) =>
            `▸ ${n.padEnd(8)} ${rule.required[i] ? "<必填>" : "[選填]"} ${
              rule.desc[i]
            } (${this._readableTypeName(rule.type[i])}: ${rule.type[i]})`
        )
      ),
    ];

    // 組合最終 errorBlocks
    const errorBlocks = [];
    errorBlocks.push(
      ...errorHeader,
      ...errorReasons,
      ...syntaxSection,
      ...paramDescriptions
    );

    // 雙重日誌輸出
    await bot.safeChat(errorHeader, "");
    await bot.safeChat(errorReasons.join("\n "), "");
    console.log(
      `${BLACK}[LCM] Command validator fails.\n ` +
        errorBlocks.join("\n ") +
        `${resetANSI}`
    );
  }
}

module.exports = { LoopableCommandManager };
