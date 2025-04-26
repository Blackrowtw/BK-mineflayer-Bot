module.exports = [
  {
    name: "come",
    aliases: ["過來"],
    preCheck: async (bot, cmd, options) => {
      // 防止錯誤沒有命令輸入者的錯誤情況
      const check = Boolean(options?.cmdSender);
      if (!check) {
        await bot.waitForTicks(5);
        await bot.safeChat(`Ooh, where's my lover?`, `❓`);
      }
      return check;
    },
    execute: async (bot, cmd, options) => {
      const timeOut = 15000; // 15秒超時
      const { GoalNear } = bot.goals;
      const playerName = options.cmdSender;
      const target = await bot.actions.findPlayerFuzzy(bot, playerName);
      if (target && target !== null) {
        const pos = target?.entity?.position ?? null;
        await bot.safeChat(`前往 ${target.username} 的位置 ${pos.round()} ...`);
        try {
          const goal = new GoalNear(pos.x, pos.y, pos.z, 0);
          const startTime = Date.now();
          await bot.pathfinder.setGoal(goal);
          // 使用 Promise.race 來實現超時機制
          await Promise.race([
            new Promise((resolve) => bot.once("goal_reached", resolve)),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("尋路超時")), timeOut)
            ),
          ]);
          const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
          await bot.safeChat(`已到達，路程花了 ${timeSpent} 秒`, `✅`);
        } catch (error) {
          const timeSpent = (timeOut / 1000).toFixed(0);
          await bot.pathfinder.stop(); // 立即停止 當前的所有動作
          // 根據錯誤類型顯示不同訊息
          if (error.message === "尋路超時") {
            await bot.safeChat(`尋路時間已超過 ${timeSpent} 秒，已停止`, `⛔`);
          } else {
            await bot.safeChat(`尋路過程出現錯誤: ${error.name}`, `⛔`);
          }
          console.logTimer("當前 Bot 狀態:", {
            position: bot.entity.position,
            onGround: bot.entity.onGround,
            isInWater: bot.entity.isInWater,
            isInLava: bot.entity.isInLava,
          });
        }
      } else {
        const botName = bot.entity.username;
        // console.log({ playerName, botName });
        if (playerName == botName) {
          await bot.safeChat(`${playerName}... It’s-A Me, Mario! 🍄`, `⛔`);
        } else {
          await bot.safeChat(`Ooh, where's my lover ${playerName}?`, `❓`);
        }
        return;
        // await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    onStop: async (bot, cmd, options) => {},
    group: `Action_Basic`,
    description: `讓 Bot 前往命令者的位置`,
  },
  {
    name: "goto",
    aliases: ["前往", "到達"],
    paramRules: [
      {
        name: ["playerName"],
        desc: ["目標玩家"],
        type: ["string"],
        required: [true],
        helpMsg: "<playerName>: 前往目標玩家身邊",
      },
      {
        name: ["x", "y", "z"],
        desc: ["座標:x", "座標:y", "座標:z"],
        type: ["number", "number", "number"],
        required: [true, true, true],
        helpMsg: "<x> <y> <z>: 前往指定座標",
      },
    ],
    preCheck: async (bot, cmd, options) => {
      // 防止錯誤沒有命令輸入者的錯誤情況
      const check = Boolean(options?.cmdSender);
      if (!check) {
        await bot.waitForTicks(5);
        await bot.safeChat(`Ooh, where's my lover?`, `❓`);
      }
      return check;
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return; // 參數檢查未通過

      const timeOut = 15000; // 15秒超時
      const { GoalNear } = bot.goals;
      let pos = null;

      // 前往玩家位置
      if (parsed.playerName && !parsed?.x) {
        const playerName = parsed.playerName;
        const target = await bot.actions.findPlayerFuzzy(bot, playerName);
        if (!target || target == null) {
          const botName = bot.entity.username;
          // console.log({ playerName, botName });
          if (playerName == botName) {
            await bot.safeChat(`${playerName}... It’s-A Me, Mario! 🍄`, `⛔`);
          } else {
            await bot.safeChat(`Ooh, where's my lover ${playerName}?`, `❓`);
          }
          return;
        }
        pos = target.entity?.position;
        await bot.safeChat(`前往 ${target.username} 的位置 ${pos.round()} ...`);
      }
      // 前往指定座標
      else if (parsed.x && parsed.y && parsed.z) {
        pos = { x: parsed.x, y: parsed.y, z: parsed.z };
        await bot.safeChat(`前往指定位置 (${pos.x}, ${pos.y}, ${pos.z}) ...`);
      } else {
        await LCM.cmdFailedMsg(bot, cmd); // 無效參數
      }

      // 執行目標設定與尋路過程
      try {
        const goal = new GoalNear(pos.x, pos.y, pos.z, 0);
        const startTime = Date.now();
        await bot.pathfinder.setGoal(goal);

        await Promise.race([
          new Promise((resolve) => bot.once("goal_reached", resolve)),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("尋路超時")), timeOut)
          ),
        ]);
        const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
        await bot.safeChat(`已到達，路程花了 ${timeSpent} 秒`, `✅`);
      } catch (error) {
        // 處理尋路過程中的錯誤
        await bot.pathfinder.stop();
        const timeSpent = (timeOut / 1000).toFixed(0);

        if (error.message === "尋路超時") {
          await bot.safeChat(`尋路時間已超過 ${timeSpent} 秒，已停止`, `⛔`);
        } else {
          await bot.safeChat(`尋路過程出現錯誤: ${error.name}`, `⛔`);
        }
        console.logTimer("當前 Bot 狀態:", {
          position: bot.entity.position,
          onGround: bot.entity.onGround,
          isInWater: bot.entity.isInWater,
          isInLava: bot.entity.isInLava,
        });
      }
    },
    onStop: async (bot, cmd, options) => {},
    group: `Action_Basic`,
    description: `讓 Bot 前往指定位置或指定玩家的身邊`,
  },
  {
    name: "follow",
    aliases: ["跟隨"],
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
      const target =
        (await bot.actions.findPlayerFuzzy(bot, parsed.playerName)) ?? null;
      if (target?.username == botName) {
        await bot.safeChat(`${botName}... It’s-A Me, Mario! 🍄`, `⛔`);
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
        cmd.followRange = 2; // 預設跟隨距離 2格
        if (!parsed?.playerName && !parsed?.range) {
          cmd.followName = options.cmdSender;
        } else if (parsed.playerName && !parsed?.range) {
          cmd.followName = parsed.playerName;
        } else if (!parsed?.playerName && parsed.range) {
          cmd.followName = options.cmdSender;
          cmd.followRange = parsed.range;
        } else if (parsed.playerName && parsed.range) {
          cmd.followName = parsed.playerName;
          cmd.followRange = parsed.range;
        }
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      }
      await bot.waitForTicks(5);
      const follow = await bot.actions.findPlayerFuzzy(bot, cmd.followName);
      cmd.target = follow.entity;
      await bot.safeChat(`是的我的主人 ${follow.username}，我永遠跟隨您`);
    },
    execute: async (bot, cmd, options) => {
      updateFollow();
      // 定義更新追蹤目標的函數
      async function updateFollow() {
        const target = cmd.target;
        if (target && target !== null) {
          try {
            const range = cmd.followRange;
            const { GoalFollow } = bot.goals;
            const goal = new GoalFollow(target, range);
            await bot.pathfinder.setGoal(goal, true);
          } catch (error) {
            await bot.safeChat(`${cmd.name} 執行出現錯誤: ${error.name}`, `⛔`);
            console.logTimer(`[LCM] ${cmd.name} cmd failed: ${error.message}`);
            console.error(`\n${error.stack}`);
            await bot.loopableCommandManager.stop(bot, cmd.name);
          }
        } else {
          await bot.safeChat(`主人消失，大家可以回家啦`, `⛔`);
          await bot.loopableCommandManager.stop(bot, cmd.name);
        }
      }
    },
    onStop: async (bot, cmd, options) => {
      cmd.followName = null;
      cmd.followRange = null;
      cmd.target = null;
      await bot.pathfinder.setGoal(null);
    },
    group: `Loop`,
    description: `讓 Bot 跟隨指定目標`,
  },
];
