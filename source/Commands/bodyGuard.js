module.exports = [
  {
    name: "bodyGuard",
    aliases: ["guard", "保鑣"],
    interval: 1000,
    paramRules: [
      {
        name: ["loopPrompt", "playerName"],
        desc: ["循環啟動詞", "目標玩家"],
        type: ["string", "string"],
        required: [true, false],
        helpMsg: "[playerName]: 跟隨目標玩家",
      },
      {
        name: ["loopPrompt", "range"],
        desc: ["循環啟動詞", "範圍"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg: "[range]: 跟隨的範圍，預設為範圍 2 格內",
      },
      {
        name: ["loopPrompt", "playerName", "range"],
        desc: ["循環啟動詞", "目標玩家", "範圍"],
        type: ["string", "string", "positiveInteger"],
        required: [true, true, false],
        helpMsg:
          "[playerName]: 跟隨目標玩家, [range]: 跟隨的範圍，預設為範圍 2 格內",
      },
    ],
    preCheck: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      const botName = bot.entity.username;
      const target = parsed.playerName;
      let targetGuard = null;
      if (target) {
        targetGuard =
          (await bot.actions.findPlayerFuzzy(bot, parsed.playerName)) ?? null;
      }
      if (targetGuard?.username == botName) {
        await bot.safeChat(`${botName}... It’s-A Me, Mario! 🍄`, `❌`);
        return false;
      }
      return accept;
    },
    onStart: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (parsed && !parsed?.loopPrompt) {
        await bot.logTimer(`[cmd.${cmd.name}] ❌ 未傳入循環啟動詞`);
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      } else if (parsed.loopPrompt) {
        cmd.followRange = 4;
        cmd.guardRange = 16; // 檢查怪物的範圍，可依需求調整
        cmd.blackListEntities = ["creeper"];
        cmd.chatQueue = []; // 訊息緩存陣列
        cmd.loopCounter = 0;
        cmd.targetEnemy = null;
        cmd.isEatting = null;
        cmd.wait = 60;
        if (!parsed?.playerName && !parsed?.range) {
          cmd.targetName = options.cmdSender;
        } else if (parsed.playerName && !parsed?.range) {
          cmd.targetName = parsed.playerName;
        } else if (!parsed?.playerName && parsed.range) {
          cmd.targetName = options.cmdSender;
          cmd.guardRange = parsed.range;
        } else if (parsed.playerName && parsed.range) {
          cmd.targetName = parsed.playerName;
          cmd.guardRange = parsed.range;
        }
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      }

      // 創建 guard 實例並保存到 cmd 中
      cmd.guard = await bot.actions.bodyGuard(bot, {
        targetName: cmd.targetName,
        followRange: cmd.followRange,
        guardRange: cmd.guardRange,
        blackListEntities: cmd.blackListEntities,
        interval: cmd.interval,
        wait: cmd.wait,
        chatCooldown: 5000,
      });

      await bot.actions.equipOn(bot, null, { mode: "pvp" });
      await bot.waitForTicks(5);
      const targetName = cmd.targetName;
      const guard = await bot.actions.findPlayerFuzzy(bot, targetName);
      await bot.safeChat(`是的我的主人 ${guard.username}，我永遠保護您`);
    },
    execute: async (bot, cmd, options) => {
      try {
        await cmd.guard.loop();
      } catch (error) {
        await bot.safeChat(`${cmd.name} 執行出現錯誤: ${error.name}`, `⛔`);
        console.error(`\n${error.stack}`);
        await bot.loopableCommandManager.stop(bot, cmd.name);
      }
    },
    onStop: async (bot, cmd, options) => {
      // 停止並清理 guard 實例
      if (cmd.guard) {
        await cmd.guard.stop();
        cmd.guard = null;
      }

      cmd.targetName = null;
      cmd.followRange = null;
      cmd.guardRange = null;
      cmd.blackListEntities = null;
      cmd.chatQueue = [];
      cmd.loopCounter = 0;
      cmd.targetEnemy = null;
      cmd.isEatting = null;
      await bot.pathfinder.setGoal(null);
      await bot.safeChat(`下班啦，大家可以回家啦！`, `⛔`);
    },
    group: `Loop`,
    description: `讓 Bot 跟隨並保護指定目標`,
  },
];
