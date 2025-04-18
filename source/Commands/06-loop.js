module.exports = [
  {
    name: "waving",
    aliases: ["wave", "一直揮手"],
    interval: 1000,
    paramRules: [
      {
        name: ["loopPrompt", "freq"],
        desc: ["循環啟動詞", "頻率"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg:
          "<loopPrompt>: 循環啟動提示詞, [frequency]: 間隔時間(tick)，預設 1 秒(20 tick)",
      },
    ],
    preCheck: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      return accept;
    },
    onStart: async (bot, cmd, options) => {
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ options, parsed, accept });
      const msPerTick = 50;
      if (parsed && !parsed?.loopPrompt) {
        await bot.logTimer(`[cmd.${cmd.name}] ❌ 未傳入循環啟動詞`);
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      } else if (parsed.loopPrompt && !parsed?.freq) {
        cmd.interval = 20 * msPerTick;
      } else if (parsed.loopPrompt && parsed.freq) {
        cmd.interval = parsed.freq * msPerTick;
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      }
      await bot.safeChat(`我封印的右手快壓抑不住啦RRRrrr`);
    },
    execute: async (bot, cmd, options) => {
      await bot.swingArm();
    },
    onStop: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.safeChat(`抱歉，不小心犯中二了`);
    },
    group: `Loop`,
    description: `讓 Bot 不停地揮手，可指定間隔時間(tick)`,
  },
  {
    name: "attackLoop",
    aliases: ["atk", "攻擊"],
    interval: 1000,
    paramRules: [
      {
        name: ["loopPrompt", "freq"],
        desc: ["循環啟動詞", "頻率"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg:
          "<loopPrompt>: 循環啟動提示詞, [frequency]: 間隔時間(tick)，預設 1 秒(20 tick)",
      },
    ],
    preCheck: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      return accept;
    },
    onStart: async (bot, cmd, options) => {
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ options, parsed, accept });
      const msPerTick = 50;
      if (parsed && !parsed?.loopPrompt) {
        await bot.logTimer(`[cmd.${cmd.name}] ❌ 未傳入循環啟動詞`);
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      } else if (parsed.loopPrompt && !parsed?.freq) {
        cmd.interval = 20 * msPerTick;
      } else if (parsed.loopPrompt && parsed.freq) {
        cmd.interval = parsed.freq * msPerTick;
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      }
      let hps = parseFloat((1000 / cmd.interval).toFixed(2));
      await bot.safeChat(`看我每秒 ${hps} 次的貓貓拳!`);
    },
    execute: async (bot, cmd, options) => {
      const targetEntity = await bot.actions.findNearBlackList(bot);
      await bot.attack(targetEntity, (swing = true));
    },
    onStop: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.safeChat(`貓貓拳已停止`);
    },
    group: `Loop`,
    description: `讓 Bot 不停地攻擊最近的實體，可指定間隔`,
  },
  {
    name: "lookLoop",
    aliases: ["lock", "鎖定"],
    interval: 1000,
    paramRules: [
      {
        name: ["loopPrompt", "freq"],
        desc: ["循環啟動詞", "頻率"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg:
          "<loopPrompt>: 循環啟動提示詞, [frequency]: 間隔時間(tick)，預設 1 秒(20 tick)",
      },
    ],
    preCheck: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      return accept;
    },
    onStart: async (bot, cmd, options) => {
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ options, parsed, accept });
      const msPerTick = 50;
      if (parsed && !parsed?.loopPrompt) {
        await bot.logTimer(`[cmd.${cmd.name}] ❌ 未傳入循環啟動詞`);
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      } else if (parsed.loopPrompt && !parsed?.freq) {
        cmd.interval = 20 * msPerTick;
      } else if (parsed.loopPrompt && parsed.freq) {
        cmd.interval = parsed.freq * msPerTick;
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      }
      let lps = parseFloat((1000 / cmd.interval).toFixed(2));
      await bot.safeChat(`看我每秒 ${lps} 次，鎖定我的最愛！`);
    },
    execute: async (bot, cmd, options) => {
      const entity = bot.nearestEntity();
      let targetPos = entity.position;
      if ("eyeHeight" in entity) {
        targetPos = targetPos.offset(0, entity.eyeHeight, 0);
      }
      await bot.lookAt(targetPos);
    },
    onStop: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.safeChat(`心愛雷達鎖定結束。`);
    },
    group: `Loop`,
    description: `讓 Bot 不停地看向最近的實體，可指定間隔`,
  },
];
