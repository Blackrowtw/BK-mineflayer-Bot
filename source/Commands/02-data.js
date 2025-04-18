module.exports = [
  {
    name: "printBotHealth",
    aliases: ["health", "健康"],
    execute: async (bot, cmd, options) => {
      await bot.actions.printBotHealth(bot);
    },
    group: `Data`,
    description: `輸出 Bot 目前的狀態資訊`,
  },
  {
    name: "ServerResponseChecker",
    aliases: ["pingserver", "pingServer"],
    execute: async (bot, cmd, options) => {
      await bot.actions.exportPingServer(bot);
    },
    group: `Data`,
    description: `輸出 Server 的各種資訊`,
  },
  {
    name: "mcdata",
    aliases: ["mc資料庫"],
    paramRules: [
      {
        name: ["mcdataName"],
        desc: ["資料名稱"],
        type: ["string"],
        required: [true],
        helpMsg: "<name>: entity, enchantments, attributes",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const mcData = bot.mcData; // 獲取 mcData 的位置
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;
      if (parsed && !parsed?.mcdataName) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.mcdataName === "entity") {
        const entities = mcData.entities;
        Object.keys(entities).forEach((entityId) => {
          const entity = entities[entityId];
          console.log(
            `ID: ${entityId}, Name: ${entity.name}, Type: ${entity.type}`
          );
        });
        await bot.safeChat(
          `Print all minecraft v_${bot.version} ${parsed.mcdataName} to Terminal.`
        );
      } else if (parsed.mcdataName === "enchantments") {
        const enchantmentsArr = mcData.enchantmentsArray;
        console.log({ enchantmentsArr });
        await bot.safeChat(
          `Print all minecraft v_${bot.version} ${parsed.mcdataName} to Terminal.`
        );
      } else if (parsed.mcdataName === "attributes") {
        const attributesArr = mcData.attributesArray;
        console.log({ attributesArr });
        await bot.safeChat(
          `Print all minecraft v_${bot.version} ${parsed.mcdataName} to Terminal.`
        );
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Data`,
    description: `將 mcData 的資料輸出到命令行`,
  },
  {
    name: "botRegistryData",
    aliases: ["reg", "註冊資料"],
    paramRules: [
      {
        name: ["registryName"],
        desc: ["註冊資料名稱"],
        type: ["string"],
        required: [true],
        helpMsg: "<name>: entitiesArray...",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;
      if (parsed && !parsed?.registryName) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.registryName === "entitiesArray") {
        await bot.actions.exportRegistryAuto(bot, "entitiesArray", {
          customProcessor: (raw) =>
            raw.map((e) => ({
              id: e.internalId,
              name: e.name,
              category: e.category || "未分類",
            })),
        });
      } else if (parsed?.registryName) {
        await bot.actions.exportRegistryAuto(bot, parsed.registryName);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Data`,
    description: `將註冊於 Bot 的資料輸出成外部文件儲存`,
  },
  {
    name: "getData",
    aliases: ["data"],
    paramRules: [
      {
        name: ["options"],
        desc: ["選項"],
        type: ["string"],
        required: [true],
        helpMsg:
          "<options>: 選項-bot/ player/ block/ entity/ item / recipes/ window",
      },
      {
        name: ["options", "name"],
        desc: ["選項", "名稱"],
        type: ["string", "string"],
        required: [true, true],
        helpMsg: "<options>: 選項, <name>: 指定的名稱 (<type>: 指定的類型)",
      },
      {
        name: ["options", "id"],
        desc: ["選項", "編號"],
        type: ["string", "positiveInteger"],
        required: [true, true],
        helpMsg: "<options>: 選項, <id>: 指定的編號 (<slotID>: 指定的欄位ID)",
      },
      {
        name: ["options", "x", "y", "z"],
        desc: ["選項", "座標:x", "座標:y", "座標:z"],
        type: ["string", "number", "number", "number"],
        required: [true, true, true, true],
        helpMsg: "<options>: 選項, <x> <y> <z>: 指定的座標",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      const tool = bot.actions;
      const opt = parsed?.options ?? null;
      const name = parsed?.name ?? null;
      const id = parsed?.id ?? null;
      const type = parsed?.name ?? null;
      const slot = parsed?.id ?? null;
      if (
        parsed &&
        !parsed?.options &&
        !parsed?.name &&
        !parsed?.id &&
        !parsed?.x
      ) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (
        parsed.options &&
        !parsed?.name &&
        !parsed?.id &&
        !parsed?.x &&
        !parsed?.y &&
        !parsed?.z
      ) {
        if (
          parsed.options === "bot" ||
          parsed.options === "player" ||
          parsed.options === "block" ||
          parsed.options === "entity" ||
          parsed.options === "item" ||
          parsed.options === "recipes" ||
          parsed.options === "window"
        ) {
          await tool.exportInGameData(bot, opt, name, null, id, type, slot);
        } else {
          await LCM.cmdFailedMsg(bot, cmd);
        }
      } else if (
        parsed.options &&
        parsed?.name &&
        !parsed?.id &&
        !parsed.x &&
        !parsed.y &&
        !parsed.z
      ) {
        await tool.exportInGameData(bot, opt, name, null, id, type, slot);
      } else if (
        parsed.options &&
        !parsed?.name &&
        parsed?.id &&
        !parsed.x &&
        !parsed.y &&
        !parsed.z
      ) {
        await tool.exportInGameData(bot, opt, name, null, id, type, slot);
      } else if (
        parsed.options &&
        parsed?.name &&
        parsed?.id &&
        !parsed.x &&
        !parsed.y &&
        !parsed.z
      ) {
        await tool.exportInGameData(bot, opt, name, null, id, type, slot);
      } else if (
        parsed.options &&
        !parsed?.name &&
        !parsed?.id &&
        parsed.x &&
        parsed.y &&
        parsed.z
      ) {
        const Vec3 = {
          x: parsed.x,
          y: parsed.y,
          z: parsed.z,
        };
        await tool.exportInGameData(bot, opt, name, Vec3, id, type, slot);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Data`,
    description: `將 Bot 的可取得的，遊戲中的資料輸出成外部文件儲存`,
  },
];
