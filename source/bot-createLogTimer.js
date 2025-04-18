// 注入 dateformat 模組 (處理時間格式)
const dateformat = require("dateformat");
const readline = require("readline");

// 文字顏色 ANSI 控制碼常量
const {
  resetANSI,
  BOLD_SKY,
  BOLD_RED,
  BOLD_MAGENTA,
  DARK_RED,
  SKY,
  BLACK,
  YELLOW,
  REVERSE,
  REVERSE_RED,
} = require("./escapeCodeANSI.js");

// 利用模組層級變數來保存 CLI 參考
let cli = null;
let isOutputting = false;
let outputBuffer = [];

// 處理 Bot 回傳訊息函數 (加入時間戳 並操作輸入介面)
function createLogTimer(bot, currentCli) {
  if (!bot) throw new Error("Invalid bot parameter"); // 防御性检查

  // 允許延後注入 CLI
  if (currentCli) cli = currentCli;

  const lastMessageMap = new Map(); // 存儲最近訊息
  const MAX_MESSAGES = 10; // 訊息最大記錄數量

  // 創建 bot.logTimer 實際功能
  bot.logTimer = (chatmsg) => {
    if (typeof chatmsg !== "string") return;

    const now = new Date();
    const timestamp = `[${dateformat(now, "isoTime")}] >>`;

    // 處理輸出訊息的 CLI控制過程
    const handleMessage = (formattedMessage, showCount = false) => {
      // 將訊息加入緩衝區
      outputBuffer.push({ formattedMessage, showCount });

      // 如果正在輸出中則直接返回
      if (isOutputting) return;

      // 啟動輸出處理
      process.nextTick(processBuffer);
    };

    // 新增緩衝區處理函數
    const processBuffer = () => {
      if (outputBuffer.length === 0) {
        isOutputting = false;
        return;
      }

      isOutputting = true;
      const { formattedMessage, showCount } = outputBuffer.shift();

      // 統一操作流程
      const outputProcess = () => {
        // 開始前強制清除輸入行
        readline.cursorTo(process.stdout, 0);
        readline.clearLine(process.stdout, 1);

        // 輸出訊息
        if (cli?.rl) {
          cli.rl.output.write(`${formattedMessage}\n`);
        } else {
          console.log(formattedMessage);
        }

        // 同步重置提示符
        if (cli?.creatPrompt) {
          cli.creatPrompt();
        } else {
          process.stdout.write("> ");
        }

        // 遞歸處理剩餘緩衝
        process.nextTick(processBuffer);
      };

      // 光標狀態管理
      process.stdout.write("\x1B[?25l"); // 隱藏光標
      outputProcess();
      process.stdout.write("\x1B[?25h"); // 立即恢復光標
    };

    // 如果訊息已存在於存儲最近訊息的 Map 中
    if (lastMessageMap.has(chatmsg)) {
      const data = lastMessageMap.get(chatmsg);
      data.count++; // 增加計數器

      // 根據計數器判斷是否要輸出訊息
      const shouldShowCount = data.count >= 10; // 新增判斷條件
      const shouldLog = checkLogOutput(data.count);
      if (shouldLog) {
        // 只在需要時添加計數
        const countLabel = shouldShowCount
          ? `${REVERSE_RED}(${data.count})${resetANSI}`
          : "";
        const formattedMessage = `${timestamp} ${chatmsg} ${countLabel}`.trim(); // 最後輸出時去除兩端空格
        handleMessage(formattedMessage, true);
      }
    }
    // 當 Map 中記錄的訊息超過 MAX_MESSAGES 時，移除最早的一條記錄
    else {
      if (lastMessageMap.size >= MAX_MESSAGES) {
        const oldestKey = lastMessageMap.keys().next().value; // 取得最早訊息的 key 值
        lastMessageMap.delete(oldestKey); // 刪除最早的訊息
      }

      // 新訊息，初始化計數器
      lastMessageMap.set(chatmsg, { count: 1 });
      handleMessage(`${timestamp} ${chatmsg}`); // 輸出訊息
    }
  };
}

// 控制輸出頻率 前九次不記錄執行次數
function checkLogOutput(count) {
  return (
    count <= 9 ||
    count === 10 || // 第10次強制輸出
    (count > 10 && count <= 100 && count % 10 === 0) ||
    (count > 100 && count <= 1000 && count % 100 === 0) ||
    (count > 1000 && count % 1000 === 0)
  );
}

/**
 * 在 bot-init.js 執行 cli.start() 後
 * 傳入新的 rl 對象用來執行命令行操控
 */
function updateCli(newCli) {
  if (!newCli || !newCli.rl) {
    throw new Error("Invalid CLI instance provided: 無效的 CLI 參數");
  }

  // 驗證必要方法存在
  const requiredMethods = ["moveCursorLeft2", "creatPrompt"];
  const missingMethods = requiredMethods.filter((m) => !newCli[m]);
  if (missingMethods.length > 0) {
    throw new Error(`CLI 缺少必要方法: ${missingMethods.join(", ")}`);
  }

  cli = newCli;
  // console.log(`[CLI Update] 新實例已注入`);
  // console.log(`    - 可用方法: ${Object.keys(cli).join(", ")}`);
}

module.exports = {
  createLogTimer,
  updateCli,
};
