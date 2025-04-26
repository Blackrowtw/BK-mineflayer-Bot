module.exports = [
  {
    name: "moveBot",
    aliases: ["move", "移動", "動作"],
    paramRules: [
      {
        name: ["direction"],
        desc: ["移動方向"],
        type: ["string"],
        required: [true],
        helpMsg: "<direction>: 移動方向 w, s, a, d, jump, sprint, sneak",
      },
      {
        name: ["direction", "ticks"],
        desc: ["移動方向", "移動時間"],
        type: ["string", "positiveInteger"],
        required: [true, true],
        helpMsg: "<direction>: 移動方向, [ticks]: 移動時間 tick = 1/20 s",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.direction && !parsed?.ticks) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.direction) {
        const direction = parsed.direction;
        const ticks = parsed.ticks || 5;
        await bot.actions.moveBot(bot, direction, ticks);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Action_Advanced`,
    description: `讓 Bot 朝指定的方向移動或進行動作，可指定時間`,
  },
  {
    name: "turnBot",
    aliases: ["turn", "轉", "轉向"],
    paramRules: [
      {
        name: ["direction"],
        desc: ["轉身朝向"],
        type: ["string"],
        required: [true],
        helpMsg: "<direction>: 轉身朝向 w, s, a, d",
      },
      {
        name: ["yawDegree", "pitchDegree"],
        desc: ["身體旋轉角度", "頭部俯仰角度"],
        type: ["integer", "integer"],
        required: [true, true],
        helpMsg: "<yawDegree>: ±180°(身體), <pitchDegree>: ±90°(頭)",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.direction && !parsed?.yawDegree) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.direction) {
        const direction = parsed.direction;
        await bot.actions.turnBot(bot, direction, null, null);
      } else if (parsed.yawDegree && parsed.pitchDegree) {
        const yaw = parsed.yawDegree;
        const pitch = parsed.pitchDegree;
        if (parsed.yawDegree > 180 || parsed.yawDegree < -180) {
          await LCM.cmdFailedMsg(bot, cmd);
          return;
        }
        if (parsed.pitchDegree > 90 || parsed.pitchDegree < -90) {
          await LCM.cmdFailedMsg(bot, cmd);
          return;
        }
        await bot.actions.turnBot(bot, null, yaw, pitch);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Action_Advanced`,
    description: `讓 Bot 朝指定的方向旋轉身體或頭部`,
  },
  {
    name: "lookAt",
    aliases: ["look", "看", "看向"],
    paramRules: [
      {
        name: ["direction"],
        desc: ["面朝方向"],
        type: ["string"],
        required: [true],
        helpMsg: "<direction>: 面朝方向 東, 西, 南, 北, 上, 下, 方塊",
      },
      {
        name: ["x", "y", "z"],
        desc: ["座標:x", "座標:y", "座標:z"],
        type: ["number", "number", "number"],
        required: [true, true, true],
        helpMsg: "<x> <y> <z>: 看向座標",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.direction && !parsed?.x) {
        const entity = await bot.nearestEntity();
        const entityName =
          entity.username || entity.displayName || "Unknown Name";
        let targetPos = entity.position;
        if ("eyeHeight" in entity) {
          targetPos = targetPos.offset(0, entity.eyeHeight, 0);
        }
        await bot.lookAt(targetPos);
        await bot.waitForTicks(4);
        await bot.safeChat(`I'm watching you... ${entityName}`);
        return;
      } else if (parsed.direction) {
        if (parsed.direction === "help") {
          await LCM.cmdFailedMsg(bot, cmd);
          return;
        }
        const direction = parsed.direction;
        await bot.actions.lookAt(bot, direction, null);
      } else if (parsed.x && parsed.y && parsed.z) {
        const Vec3 = {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
        };
        await bot.actions.lookAt(bot, null, Vec3);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Action_Advanced`,
    description: `讓 Bot 看向最近的實體，或是指定的目標`,
  },
  {
    name: "placeBlock",
    aliases: ["place", "放置"],
    paramRules: [
      {
        name: ["blockName"],
        desc: ["目標方塊"],
        type: ["string"],
        required: [true],
        helpMsg: "<blockName>: 將手上的方塊放到目標方塊旁邊",
      },
      {
        name: ["x", "y", "z"],
        desc: ["座標:x", "座標:y", "座標:z"],
        type: ["number", "number", "number"],
        required: [true, true, true],
        helpMsg: "<x> <y> <z>: 將手上的方塊放到指定座標",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.blockName && !parsed?.x) {
        await bot.actions.placeBlock(bot, null, null);
      } else if (parsed.blockName) {
        if (parsed.blockName === "help") {
          await LCM.cmdFailedMsg(bot, cmd);
          return;
        }
        const name = parsed.blockName;
        await bot.actions.placeBlock(bot, name, null);
      } else if (
        parsed &&
        !parsed?.blockName &&
        parsed.x &&
        parsed.y &&
        parsed.z
      ) {
        const Vec3 = {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
        };
        await bot.actions.placeBlock(bot, null, Vec3);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Action_Advanced`,
    description: `讓 Bot 將手上的物品放到指定的方塊或座標上`,
  },
  {
    name: "useBlock",
    aliases: ["use", "互動"],
    paramRules: [
      {
        name: ["blockName"],
        desc: ["目標方塊"],
        type: ["string"],
        required: [true],
        helpMsg: "<blockName>: 找到指定的方塊然後互動",
      },
      {
        name: ["x", "y", "z"],
        desc: ["座標:x", "座標:y", "座標:z"],
        type: ["number", "number", "number"],
        required: [true, true, true],
        helpMsg: "<x> <y> <z>: 與指定位置的方塊互動",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.blockName && !parsed?.x) {
        await bot.actions.useBlock(bot, null, null);
      } else if (parsed.blockName) {
        if (parsed.blockName === "help") {
          await LCM.cmdFailedMsg(bot, cmd);
          return;
        }
        const name = parsed.blockName;
        await bot.actions.useBlock(bot, name, null);
      } else if (
        parsed &&
        !parsed?.blockName &&
        parsed.x &&
        parsed.y &&
        parsed.z
      ) {
        const Vec3 = {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
        };
        await bot.actions.useBlock(bot, null, Vec3);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Action_Advanced`,
    description: `讓 Bot 與指定方塊名稱，或指定座標互動`,
  },
  {
    name: "home",
    aliases: ["home"],
    paramRules: [
      {
        name: ["options"],
        desc: ["選項"],
        type: ["string"],
        required: [true],
        helpMsg: "<options>: ...",
      },
    ],
    interval: null,
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const util = await bot.actions.utils(bot);
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);

      if (parsed?.options) {
        const option = parsed.options.toLowerCase();
        if (option === "info") {
          showHomeMsg();
        } else if (option === "set") {
          const homeConfig = bot.Bot_Config.homeSetting;
          const bedBlock = await util.findBlockByName("bed");
          const containers = await util.findBlocksByArray(
            ["chest", "barrel", "shulker_box"],
            { count: 128 }
          );
          homeConfig.homePos = bot.entity.position.offset(0, 0, 0).floor(); //向下取整
          homeConfig.bedPos = bedBlock?.position ?? homeConfig.bedPos;
          homeConfig.containers = containers ?? homeConfig.containers;
          showSetHomeMsg();
        } else if (option === "sleep") {
          const bedPos = bot.Bot_Config.homeSetting.bedPos;
          await bot.safeChat(
            `前往我的床 (${bedPos.x}, ${bedPos.y}, ${bedPos.z})`,
            `🛌`
          );
          const gotoBed = await util.gotoNear(bedPos);
          if (!gotoBed) {
            await bot.safeChat(`我找不到我家的床`, `😱`);
            return;
          }
          await bot.actions.sleepOnBed(bot);
        } else {
          await LCM.cmdFailedMsg(bot, cmd);
        }
      } else {
        // 如果沒有傳入選項，則默認回家
        const homePos = bot.Bot_Config.homeSetting.homePos;
        await bot.safeChat(
          `前往我的家 (${homePos.x}, ${homePos.y}, ${homePos.z})`,
          `🏕`
        );

        const goHome = await util.gotoNear(homePos, 0);
        if (!goHome) {
          await bot.safeChat(`我不知道怎麼回家`, `😱`);
        }
      }

      function showHomeMsg() {
        const homeConfig = bot.Bot_Config.homeSetting;
        const containerCount = homeConfig.containers.length;
        const containerMsg =
          containerCount > 0
            ? `我家有 ${containerCount} 個容器可以存放物資`
            : `我家沒有地方可以存放物資`;
        bot.safeChat(
          `🏕 我的家在: (${homeConfig.homePos.x}, ${homeConfig.homePos.y}, ${homeConfig.homePos.z})，` +
            `🛌 我的床在: (${homeConfig.bedPos.x}, ${homeConfig.bedPos.y}, ${homeConfig.bedPos.z}) `,
          ``
        );
        bot.safeChat(`${containerMsg}`, `🧰`);
      }

      function showSetHomeMsg() {
        const homeConfig = bot.Bot_Config.homeSetting;
        const containerCount = homeConfig.containers.length;
        const containerMsg =
          containerCount > 0
            ? `重新檢查我家... 有 ${containerCount} 個容器可以存放物資`
            : `重新檢查我家... 沒有地方可以存放物資`;
        bot.safeChat(
          `🏕 我新的家在: (${homeConfig.homePos.x}, ${homeConfig.homePos.y}, ${homeConfig.homePos.z})，` +
            `🛌 我新的床在: (${homeConfig.bedPos.x}, ${homeConfig.bedPos.y}, ${homeConfig.bedPos.z}) `,
          ``
        );
        bot.safeChat(`${containerMsg}`, `🧰`);
      }
    },
    onStop: async (bot, cmd, options) => {},
    group: `Action_Advanced`,
    description: `讓 Bot 前往家的位置，可設定家與床的座標`,
  },
];
