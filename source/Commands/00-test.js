module.exports = [
  {
    name: "_sample",
    aliases: ["_sample"],
    paramRules: [
      {
        name: ["slotID", "count"],
        desc: ["欄位ID", "數量"],
        type: ["positiveInteger", "positiveInteger"],
        required: [true, false],
        helpMsg: "<slotID>: ... ,[count]: ...",
      },
      {
        name: ["itemName", "count"],
        desc: ["物品名稱", "數量"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg: "<itemName>: ... ,[count]: ...",
      },
    ],
    interval: null,
    preCheck: async (bot, cmd, options) => true,
    onStart: async (bot, cmd, options) => {
      bot.safeChat(`${cmd.name}!`);
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      console.log({ accept, parsed });
      if (!accept) return;
      await LCM.cmdFailedMsg(bot, cmd);
    },
    onStop: async (bot, cmd, options) => {},
    group: ``,
    description: `just a command sample for copy`,
  },
  {
    name: "test",
    aliases: ["test"],
    onStart: async (bot, cmd, options) => {
      bot.safeChat(`${cmd.name}!`);
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      // await LCM.cmdFailedMsg(bot, cmd);
    },
    group: ``,
    description: `a command for quick test`,
  },
  {
    name: "drawLine",
    aliases: ["line"],
    execute: async (bot, cmd, options) => {
      const points = [];
      points.push(
        entities[0].position,
        bot.entity.position.offset(-4, bot.entity.eyeHeight, -4),
        bot.entity.position.offset(-4, bot.entity.eyeHeight, 4),
        bot.entity.position.offset(4, bot.entity.eyeHeight, 4),
        bot.entity.position.offset(4, bot.entity.eyeHeight, -4)
      );
      console.log({ points });
      // bot.viewer.drawLine("test", points, (color = 0xff0000));
    },
    group: `dev`,
    description: `Draw a Line on mineflayer-viewer`,
  },
  {
    name: "entity",
    aliases: ["entity"],
    onStart: async (bot, cmd, options) => {
      bot.safeChat(`${cmd.name}!`);
    },
    execute: async (bot, cmd, options) => {
      const util = await bot.actions.utils(bot);
      console.log({ util });
      const hosList = util.getEntityList("Hostile mobs"); // 直接取得名稱陣列
      const UNKNOWNList = util.getEntityList("UNKNOWN"); // 直接取得名稱陣列
      const filter = util.filterNearEntities(UNKNOWNList);
      const filter2 = util.filterNearEntities("item");
      console.log({ hosList }, { UNKNOWNList });
      console.log({ filter }, { filter2 });
      // const entities = bot.entities;
      // console.log({ entities });
    },
    group: `dev`,
    description: `a command for test entity cmd in util`,
  },
  {
    name: "task",
    aliases: ["task"],
    onStart: async (bot, cmd, options) => {
      bot.safeChat(`${cmd.name}!`);
    },
    execute: async (bot, cmd, options) => {
      const brain = await bot.actions.brain(bot);

      // 創建並添加任務
      const task = brain.createTask(
        "測試任務",
        async (progress) => {
          bot.safeChat(`hello task!`);
        },
        {
          priority: 1,
          timeout: 5000,
        }
      );

      brain.addTask(task);

      // 查看狀態
      const status = brain.getStatus();
      console.log(status);
    },
    group: `dev`,
    description: `a command for test task`,
  },
];
