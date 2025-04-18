module.exports = [
  {
    name: "inventory",
    aliases: ["inv", "背包"],
    paramRules: [
      {
        name: ["option"],
        desc: ["選項"],
        type: ["string"],
        required: [false],
        helpMsg: "[options]: armor-輸出裝備欄, layout-輸出背包結構",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;
      if (parsed && !parsed?.option) {
        await bot.actions.printInventory(bot);
      } else if (parsed.option === "armor") {
        await bot.actions.printArmorStats(bot);
      } else if (parsed.option === "layout") {
        await bot.actions.printInventoryLayout(bot);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `將 Bot 背包中所有的物品資訊，輸出到遊戲中的聊天欄`,
  },
  {
    name: "switch",
    aliases: ["swap", "換手"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.actions.swapMainAndOffHand(bot);
    },
    group: `Inventory`,
    description: `交換 Bot 左右手的物品`,
  },
  {
    name: "hotbar",
    aliases: ["hot", "快捷欄"],
    paramRules: [
      {
        name: ["index"],
        desc: ["編號"],
        type: ["positiveInteger"],
        required: [true],
        helpMsg: "<index>: 輸入 1 到 9 之間的數字",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;
      if (!parsed.index) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.index <= 9) {
        const slot = options[0].value;
        await bot.setQuickBarSlot(slot - 1);
        await bot.safeChat(`切換到快捷欄 第 ${slot} 位`, `⛶`);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `切換 Bot 目前的快捷欄位`,
  },
  {
    name: "drop",
    aliases: ["drop", "丟", "丟出"],
    paramRules: [
      {
        name: ["option"],
        desc: ["選項"],
        type: ["string"],
        required: [true],
        helpMsg: "<option>: one, all, inv, hot, armor, craft, mouse",
      },
      {
        name: ["slotID", "count"],
        desc: ["欄位ID", "數量"],
        type: ["positiveInteger", "positiveInteger"],
        required: [true, false],
        helpMsg: "<slotID>: 欄位的編號, [count]: 物品數量",
      },
      {
        name: ["itemName", "count"],
        desc: ["物品名稱", "數量"],
        type: ["string", "positiveInteger"],
        required: [true, true],
        helpMsg: "<itemName>: 物品英文名稱, [count]: 物品數量",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (
        parsed &&
        !parsed?.option &&
        !parsed?.slotID &&
        !parsed?.itemName &&
        !parsed?.count
      ) {
        await bot.actions.dropItem(bot, null, "one");
      } else if (
        parsed &&
        parsed.option &&
        !parsed?.slotID &&
        !parsed?.itemName &&
        !parsed?.count
      ) {
        const option = parsed.option;
        await bot.actions.dropItem(bot, null, option);
      } else if (
        parsed &&
        !parsed?.option &&
        parsed.slotID <= 45 &&
        !parsed?.itemName
      ) {
        const count = parsed.count || null;
        const slotID = parsed.slotID;
        await bot.actions.dropItem(bot, slotID, null, count);
        // } else if (parsed.count && parsed.count > 64) {
        //   await LCM.cmdFailedMsg(bot, cmd)
      } else if (
        parsed &&
        !parsed?.option &&
        !parsed?.slotID &&
        parsed.itemName &&
        parsed.count
      ) {
        const count = parsed.count || null;
        const itemName = parsed.itemName;
        await bot.actions.dropItem(bot, null, itemName, count);
        // } else if (parsed.count && parsed.count > 64) {
        //   await LCM.cmdFailedMsg(bot, cmd);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `讓 Bot 丟出指定的物品`,
  },
  {
    name: "takeout",
    aliases: ["take", "拿", "拿出"],
    paramRules: [
      {
        name: ["itemName", "index"],
        desc: ["物品名稱", "序號"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg: "<itemName>: 物品英文名稱, [index]: 物品的序號",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.itemName && !parsed?.index) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.itemName) {
        const index = parsed.index || 1;
        const itemName = parsed.itemName;
        // console.log({ index, itemName });
        await bot.actions.takeOut(bot, itemName, index);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `讓 Bot 嘗試拿出背包中符合的物品，並放到手上`,
  },
  {
    name: "putitem",
    aliases: ["put", "放", "放入"],
    paramRules: [
      {
        name: ["itemName", "count"],
        desc: ["物品名稱", "數量"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg: "<itemName>: 物品英文名稱, [count]: 搜尋的容器數量",
      },
      {
        name: ["itemName", "count", "range"],
        desc: ["物品名稱", "數量", "範圍"],
        type: ["string", "positiveInteger", "positiveInteger"],
        required: [true, false, false],
        helpMsg:
          "<itemName>: 物品英文名稱, [count]: 搜尋的容器數量, [range]: 搜尋的範圍",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.itemName) {
        await LCM.cmdFailedMsg(bot, cmd);
      } else if (parsed.itemName) {
        const name = parsed.itemName;
        const count = parsed.count || 1;
        const range = parsed.range || 5;
        // console.log({ name, count, range });
        await bot.actions.putItems(bot, name, count, range);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `讓 Bot 嘗試將指定的物品，放入附近的容器內`,
  },
  {
    name: "putAll",
    aliases: ["putall", "放入全部"],
    paramRules: [
      {
        name: ["count"],
        desc: ["數量"],
        type: ["positiveInteger"],
        required: [false],
        helpMsg: "[count]: 搜尋的容器數量",
      },
      {
        name: ["count", "range"],
        desc: ["數量", "範圍"],
        type: ["positiveInteger", "positiveInteger"],
        required: [false, false],
        helpMsg: "[count]: 搜尋的容器數量, [range]: 搜尋的範圍",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;
      if (parsed && !parsed?.count) {
        await bot.actions.putAll(bot);
      } else if (parsed.count) {
        const count = parsed.count || 1;
        const range = parsed.range || 5;
        // console.log({ name, count, range });
        await bot.actions.putAll(bot, count, range);
      } else {
        await LCM.cmdFailedMsg(bot, cmd);
      }
    },
    group: `Inventory`,
    description: `讓 Bot 嘗試將背包所有的物品，放入附近的容器內`,
  },
  {
    name: "equip",
    aliases: ["穿", "穿上", "裝備"],
    paramRules: [
      {
        name: ["option"],
        desc: ["選項"],
        type: ["string"],
        required: [true],
        helpMsg:
          "<option>: pvp-背包中最佳的戰鬥裝備, tool-裝備挖掘腳下方塊的工具",
      },
      {
        name: ["slotID"],
        desc: ["欄位ID"],
        type: ["positiveInteger"],
        required: [true],
        helpMsg: "<slotID>: 欄位的編號",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      // console.log({ accept, parsed });
      if (!accept) return;

      try {
        if (parsed?.slotID === 0 || typeof parsed?.slotID === "number") {
          // 分支 1: 處理欄位參數 (包含 0)
          await bot.actions.equipOn(bot, parsed.slotID);
          return;
        }

        if (parsed?.option) {
          // 分支 2: 處理選項參數
          const option = parsed.option;
          if (option === "pvp") {
            await bot.actions.equipOn(bot, null, { mode: "pvp" });
          } else if (option === "tool") {
            // 取得 bot 腳下方塊
            const pos = bot.entity.position.offset(0, -1, 0);
            const block = bot.blockAt(pos);

            if (!block) {
              bot.safeChat("腳下沒有方塊!", "❌");
              return;
            }

            await bot.actions.equipOn(bot, null, {
              mode: "tool",
              block: block,
            });
          } else {
            await LCM.cmdFailedMsg(bot, cmd);
          }
          return;
        }

        if (!parsed?.option && !parsed?.slotID) {
          // 分支 3: 無參數時裝備手上物品
          await bot.actions.equipOn(bot);
          return;
        }
        await LCM.cmdFailedMsg(bot, cmd);
      } catch (error) {
        console.error(`[equip] 執行錯誤:`, error);
        await bot.safeChat(`裝備失敗: ${error.message}`, "❌");
      }
    },
    group: `Inventory`,
    description: `讓 Bot 穿上手上或指定位置的裝備`,
  },
  {
    name: "unequip",
    aliases: ["脫", "脫掉", "脫下"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      await bot.actions.equipOff(bot);
    },
    group: `Inventory`,
    description: `讓 Bot 脫下身上全部的裝備`,
  },
  {
    name: "craftItem",
    aliases: ["craft"],
    paramRules: [
      {
        name: ["itemName", "count"],
        desc: ["物品名稱", "數量"],
        type: ["string", "positiveInteger"],
        required: [true, false],
        helpMsg: "<itemName>: 物品名稱 ,[count]: 數量 (預設為 1)",
      },
    ],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      const LCM = bot.loopableCommandManager;
      const { accept, parsed } = await LCM.parseOptions(bot, cmd, options);
      if (!accept) return;
      if (!parsed.itemName) {
        await LCM.cmdFailedMsg(bot, cmd);
        return;
      } else {
        const itemName = parsed.itemName;
        const options = { count: parsed?.count ?? null };
        try {
          await bot.actions.craftItem(bot, itemName, options);
        } catch (error) {
          await bot.safeChat(`[craftItem] 發生錯誤: ${error.code}`, "❌");
          console.error(`[craftItem] 發生錯誤:\n${error.stack}`);
        }
      }
    },
    group: `Inventory`,
    description: `讓 Bot 使用身上的物品進行指定的配方合成`,
  },
  {
    name: "closeWindows",
    aliases: ["close", "關上", "關掉"],
    execute: async (bot, cmd, options) => {
      await bot.waitForTicks(5);
      if (bot.currentWindow) {
        // 檢查是否有開啟的容器
        await bot.closeWindow(bot.currentWindow);
        await bot.safeChat(`關閉目前互動的介面！`);
      } else {
        await bot.safeChat(`沒有開啟任何的介面！`);
      }
    },
    group: `Inventory`,
    description: `關閉目前 Bot 已經開啟的 GUI 介面`,
  },
];
