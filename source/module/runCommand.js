// 引入 preprocessOptions.js
const { preprocessOptions } = require("./preprocessOptions.js");

// 處理 pathfinder 的 goals 初始化
// const goalFollow = new bot.goals.GoalFollow(null); // 跟隨實體 GoalFollow(entity, range)
// const goalGetToBlock = new bot.goals.GoalGetToBlock(null); // 接近指定座標 GoalGetToBlock(x, y, z)
// const goalInvert = new bot.goals.GoalInvert(null); // 反轉目標 GoalInvert(goal)

/**
 * 執行命令的<< 主函數 >>
 * @param {Object} bot - Mineflayer 機器人實例
 * @param {string} cmdSender - 訊息發送者的名稱
 * @param {Array<string>} keys - 命令關鍵字陣列
 * @returns {Promise<void>}
 */
async function runCommand(bot, keys, cmdSender) {
  // 檢查 keys 是否為有效陣列且不為空
  if (!Array.isArray(keys) || keys.length === 0) {
    // bot.logTimer(`[runCommand] 無效的 keys 格式: ${keys}`); //debug
    return;
  }

  // 檢查 keys 長度是否為 1 代表只有 @bot (commandPrefix)
  if (keys.length < 2) {
    bot.safeChat(`使用 ${keys[0]} help 命令，獲取可用命令列表。`, `🛈`);
    return;
  }

  // 檢查是否有對應的命令處理函數
  await commandHandler(bot, keys, cmdSender);
}

async function commandHandler(bot, keys, cmdSender) {
  // 儲存此函數的 loopManager 對象
  const LCM = bot.loopableCommandManager;

  // 獲取命令名稱（keys[1] 為命令名稱, 之後的是其他參數）
  const [, cmd, ...rawOptions] = keys;
  const commandName = cmd.toLowerCase();
  const perOptions = preprocessOptions(rawOptions);
  const options = {
    ...perOptions,
    cmdSender,
    rawOptions,
  };

  // 嘗試獲取 LoopCommand 對象
  const loopCmdID = LCM._getCommand(commandName);

  // 檢查命令狀態
  if (!loopCmdID) {
    bot.logTimer(`[runCommand] ⚠ 未知命令: ${commandName}`);
    await bot.safeChat(`好人你幫幫人民的啦，阿哇丟誇謀蝦米喜 ${commandName} `);
    return;
  }

  // 嘗試執行
  try {
    // 檢查間隔時間是否為 0
    if (loopCmdID.interval <= 0) {
      // 單次命令
      if (loopCmdID.name == "state" || loopCmdID.name == "stopAll") {
        try {
          await bot.safeChat(`系統命令 ${loopCmdID.name} 已執行`, `⚡`);
          await LCM.start(bot, commandName, options);
        } catch (error) {
          await bot.safeChat(`無法執行 ${commandName}: ${error.message}`, `⚠`);
        }
      } else {
        try {
          await LCM.start(bot, commandName, options);
        } catch (error) {
          await bot.safeChat(`無法執行 ${commandName}: ${error.message}`, `⚠`);
        }
      }
    }
    // 循環命令
    else if ("0" in options) {
      // 將 options[0] 轉換為字串
      const loopKey = options[0].value;
      if (loopKey === "interval" || loopKey === "start" || loopKey === "i") {
        // 檢查是否正在運行中
        if (loopCmdID?.intervalId) {
          try {
            await bot.safeChat(`停止 ${loopCmdID.name}`, `⛔`);
            await LCM.stop(bot, commandName, options);
          } catch (error) {
            await bot.safeChat(
              `無法停止 ${loopCmdID.name}: ${error.message}`,
              `⚠`
            );
          }
        } else {
          try {
            await bot.safeChat(`啟動 ${loopCmdID.name}`, `🔄`);
            await LCM.start(bot, commandName, options);
          } catch (error) {
            await bot.safeChat(
              `無法啟動 ${commandName}: ${error.message}`,
              `⚠`
            );
          }
        }
      } else {
        bot.safeChat(
          `循環命令不支援 ${loopKey} 參數，` +
            `請使用 ${loopCmdID.name} interval( i / start )`,
          `⚠`
        );
      }
    } else {
      bot.safeChat(
        `循環命令需要啟動參數，` +
          `請使用 ${loopCmdID.name} interval( i / start )`,
        `⚠`
      );
    }
  } catch (err) {
    bot.logTimer(
      `[runCommand] ⚠ 執行命令 ${commandName} 時發生錯誤: ${err.message}`
    );
    bot.logTimer(`${err.stack}`);
  }
}

module.exports = {
  runCommand,
};
