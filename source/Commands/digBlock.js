// module.exports = [
//   {
//     name: "digBlock",
//     aliases: ["dig"],
//     execute: async (bot, cmd, options) => {
//       const radius = options[0]?.value ?? 3;
//       const direction = options[1]?.value ?? "down";
//       const depth = options[2]?.value ?? radius;
//       console.log({ radius }, { direction }, { depth });
//       const miningQueue = bot.actions.MiningQueue;
//       miningQueue.addQueueAuto(bot, radius, direction, depth);
//       miningQueue.start(bot);
//     },
//     group: `dev`,
//     description: ``,
//   },
// ];

module.exports = [
  {
    name: "digBlock",
    aliases: ["dig"],
    execute: async (bot, cmd, options) => {
      const radius = options[0]?.value ?? 3;
      const direction = options[1]?.value ?? "down";
      const depth = options[2]?.value ?? radius;

      // 如果已存在實例，先停止並清理
      if (cmd.digInstance) {
        await cmd.digInstance.stop();
        cmd.digInstance = null;
      }

      // 創建新實例
      const dig = await bot.actions.diging(bot);
      cmd.digInstance = dig; // 保存實例引用

      // 添加挖掘任務
      dig.addQueueAuto(radius, direction, depth);

      // 開始挖掘
      await dig.start();
    },
    group: `dev`,
    description: `讓 bot 挖掘指定範圍內的方塊`,
  },
];
