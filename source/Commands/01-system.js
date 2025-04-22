module.exports = [
  {
    name: "ping",
    aliases: ["ping"],
    execute: async (bot, cmd, options) => {
      const ping = bot.player.ping;
      const randomTicks = Math.floor(Math.random() * 20);
      await bot.waitForTicks(randomTicks);
      await bot.safeChat(`Pong!${ping !== 0 ? ` - ${ping}` : ``}`, `🏓`);
    },
    group: `Data`,
    description: `輸出 Bot 的 Ping 值`,
  },
  {
    name: "quit",
    aliases: ["重開", "重登", "重連"],
    execute: async (bot, cmd, options) => {
      const botConfig = bot.Bot_Config;
      const waitForTicks = botConfig.waitForTicks || 60;
      await bot.waitForTicks(5);
      await bot.safeChat("See you later ~");
      await bot.waitForTicks(waitForTicks);
      await bot.quit("My boss says so.");
    },
    group: `System`,
    description: `讓 Bot 離開伺服器，並在之後重新登入`,
  },
  {
    name: "killBot",
    aliases: ["kill", "結束", "退出"],
    execute: async (bot, cmd, options) => {
      // 文字顏色 ANSI 控制碼常量
      const { resetANSI, BLACK, REVERSE } = require("../escapeCodeANSI.js");
      const botConfig = bot.Bot_Config;
      const waitForTicks = botConfig.waitForTicks || 60;
      await bot.waitForTicks(5);
      await bot.safeChat("Okay, bey... Q^Q");
      await bot.waitForTicks(waitForTicks);
      console.log(`${BLACK}[LCM] End bot by commamd: ${cmd.name}${resetANSI}`);
      console.log(
        `\n${REVERSE}   Stop   ${resetANSI} :: Process exit. See you again!\n`
      );
      process.exit(0);
    },
    group: `System`,
    description: `結束 Mineflayer Bot 主程式`,
  },
];
