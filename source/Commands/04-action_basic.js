module.exports = [
  {
    name: "say",
    aliases: ["說"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (!("0" in options)) {
        await bot.safeChat("沉默是今晚的康橋");
      }
      if ("0" in options) {
        const message = options.rawOptions.join(" ") || "";
        await bot.chat(`${message}`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 在聊天室說出你輸入的文字`,
  },
  {
    name: "attackOnce",
    aliases: ["atk1", "攻擊一次"],
    execute: async (bot, cmd, options) => {
      const targetEntity = await bot.actions.findNearBlackList(bot);
      await bot.waitForTicks(5);
      await bot.attack(targetEntity, (swing = true));
      await bot.waitForTicks(5);
      if (targetEntity.type === "player") {
        const entityName = targetEntity.username || "";
        await bot.safeChat(`${entityName} 吃我一擊!`);
      } else {
        const entityName = targetEntity.displayName || "";
        await bot.safeChat(`看招! ${entityName}`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 攻擊一次`,
  },
  {
    name: "swingArm",
    aliases: ["swing", "揮手"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.swingArm();
    },
    group: `Action_Basic`,
    description: `讓 Bot 揮手一次`,
  },
  {
    name: "eat",
    aliases: ["eat", "吃"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      try {
        await bot.actions.eatFoods(bot);
      } catch (error) {
        console.logTimer(`[eatFoods] Error: ${error.message}`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 嘗試吃下手上的物品`,
  },
  {
    name: "jumpLoop",
    aliases: ["jump", "跳", "跳躍"],
    interval: 1000,
    onStart: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if ("1" in options) {
        if (options[1].type === "positiveInteger" && options[1].value >= 4) {
          const tick2ms = options[1].value * 50;
          cmd.interval = tick2ms;
        } else {
          cmd.interval = 1000;
          await bot.safeChat(
            `無效的 ${options[1].typeName}(${options[1].value})，使用預設跳躍頻率`,
            `⚠`
          );
        }
      }
      const jps = parseFloat((1000 / cmd.interval).toFixed(2));
      bot.safeChat(`看我每秒 ${jps} 次的華麗跳躍!`);
    },
    execute: async (bot, cmd, options) => {
      await bot.setControlState("jump", true);
      await bot.waitForTicks(2);
      await bot.setControlState("jump", false);
      await bot.waitForTicks(2);
    },
    onStop: async (bot, cmd, options) => {
      await bot.clearControlStates();
      await bot.waitForTicks(5);
      await bot.safeChat(`累了，不想動了`);
    },
    group: `Action_Basic`,
    description: `讓 Bot 持續跳躍，重複輸入可停下所有動作`,
  },
  {
    name: "sneak",
    aliases: ["蹲", "蹲下", "蹲著"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (!(await bot.getControlState("sneak"))) {
        await bot.setControlState("sneak", true);
      } else {
        await bot.setControlState("sneak", false);
        const cmdSenderID =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        const check = Boolean(cmdSenderID !== null);
        if (check) {
          const e = cmdSenderID.entity;
          await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        } else {
          await bot.waitForTicks(5);
          await bot.safeChat(`Ooh, where's my lover?`);
        }
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`不蹲了，起來 Hight!`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 進入蹲下狀態，重複輸入可解除`,
  },
  {
    name: "unsneak",
    aliases: ["起", "起來", "站起來"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (await bot.getControlState("sneak")) {
        await bot.setControlState("sneak", false);
      } else {
        const cmdSenderID =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        const check = Boolean(cmdSenderID !== null);
        if (check) {
          const e = cmdSenderID.entity;
          await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        } else {
          await bot.waitForTicks(5);
          await bot.safeChat(`Ooh, where's my lover?`);
        }
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`你覺得我正蹲著是嘛？`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 解除蹲下狀態`,
  },
  {
    name: "sprint",
    aliases: ["跑", "衝", "衝刺"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (!(await bot.getControlState("sprint"))) {
        await bot.setControlState("sprint", true);
      } else {
        const cmdSenderID =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        const check = Boolean(cmdSenderID !== null);
        if (check) {
          const e = cmdSenderID.entity;
          await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        } else {
          await bot.waitForTicks(5);
          await bot.safeChat(`Ooh, where's my lover?`);
        }
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`有看到我腳邊酷酷的粒子嗎？`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 進入衝刺狀態`,
  },
  {
    name: "unsprint",
    aliases: ["停", "別跑", "站好", "站住"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (await bot.getControlState("sprint")) {
        await bot.setControlState("sprint", false);
      } else {
        const cmdSenderID =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        const check = Boolean(cmdSenderID !== null);
        if (check) {
          const e = cmdSenderID.entity;
          await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        } else {
          await bot.waitForTicks(5);
          await bot.safeChat(`Ooh, where's my lover?`);
        }
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`你覺得我正在跑是嘛？`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 停止衝刺狀態`,
  },
  {
    name: "mount",
    aliases: ["ride", "上車", "坐上"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.actions.mountNear(bot);
    },
    group: `Action_Basic`,
    description: `讓 Bot 嘗試騎上附近的騎乘物`,
  },
  {
    name: "dismount",
    aliases: ["getoff", "下車", "下來"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (await bot.vehicle) {
        await bot.setControlState("sneak", true);
        await bot.waitForTicks(5);
        await bot.setControlState("sneak", false);
        await bot.safeChat(`抱歉了大雄，這裡沒有位置讓你坐了`);
      } else {
        const cmdSenderID =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        const check = Boolean(cmdSenderID !== null);
        if (check) {
          const e = cmdSenderID.entity;
          await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        } else {
          await bot.waitForTicks(5);
          await bot.safeChat(`Ooh, where's my lover?`);
        }
        await bot.waitForTicks(5);
        await bot.safeChat(`我還沒上車阿！`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 離開目前的騎乘物`,
  },
  {
    name: "sleepOnBed",
    aliases: ["sleep", "睡", "睡覺"],
    preCheck: async (bot, cmd, options) => {
      const cmdSenderID =
        (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
      const check = Boolean(cmdSenderID !== null);
      if (check) {
        const e = cmdSenderID.entity;
        await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
      } else {
        await bot.waitForTicks(5);
        await bot.safeChat(`Ooh, where's my lover?`);
      }
      return check;
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.actions.sleepOnBed(bot);
    },
    group: `Action_Basic`,
    description: `讓 Bot 嘗試睡在附近可互動的床`,
  },
  {
    name: "wakeUp",
    aliases: ["wake", "起床", "醒醒", "太陽曬屁股了"],
    preCheck: async (bot, cmd, options) => {
      const cmdSenderID =
        (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
      const check = Boolean(cmdSenderID !== null);
      if (check) {
        const e = cmdSenderID.entity;
        await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
      } else {
        await bot.waitForTicks(5);
        await bot.safeChat(`Ooh, where's my lover?`);
      }
      return check;
    },
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (await bot.isSleeping) {
        await bot.safeChat(`垂死夢中驚坐起`);
        await bot.wake();
      } else {
        const e =
          (await bot.actions.findPlayerFuzzy(bot, options.cmdSender)) || null;
        await bot.lookAt(e.position.offset(0, e.eyeHeight, 0));
        await bot.waitForTicks(5);
        await bot.swingArm();
        await bot.safeChat(`醒著呢，別喊`);
      }
    },
    group: `Action_Basic`,
    description: `讓 Bot 起床`,
  },
];
