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
];
