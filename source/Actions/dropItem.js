// 指令配置表 - 方便後續擴展
const COMMAND_CONFIG = {
  // 核心指令
  default: { handler: "handleSingleSlot" },
  one: { handler: "handleMainHand", params: { count: 1 } },
  mouse: { handler: "handleMouseClear" },
  all: { handler: "handleRange", params: { start: 9, end: 45 } },

  // 容器分區
  inventory: { handler: "handleRange", params: { start: 9, end: 35 } },
  inv: { alias: "inventory" },
  背包: { alias: "inventory" },
  hotbar: { handler: "handleRange", params: { start: 36, end: 44 } },
  hot: { alias: "hotbar" },
  快捷欄: { alias: "hotbar" },
  armor: { handler: "handleRange", params: { slots: [5, 6, 7, 8, 45] } },
  裝備欄: { alias: "armor" },
  craftSlot: { handler: "handleRange", params: { start: 0, end: 4 } },
  craft: { alias: "craftSlot" },
  合成欄: { alias: "craftSlot" },

  // 新增物品名稱處理
  item: { handler: "handleItemName" },
  物品: { alias: "item" },
};

// 主函數入口
async function dropItem(bot, slotID, options, count) {
  try {
    // 參數優先級處理 (slotID > options)
    const { handler, params } = parseArguments(slotID, options);

    const mergedParams = {
      ...(count !== undefined && { count }), // 用戶輸入優先
      ...(params || {}), // 指令配置基礎
    };

    const result = await HANDLERS[handler](bot, mergedParams);
    sendResultMessage(bot, handler, result);
  } catch (error) {
    handleError(bot, error);
  }
}
// 參數解析器
function parseArguments(slotID, options) {
  // slotID null/undefined 處理
  if (slotID === undefined && options === undefined) {
    return resolveCommand("default");
  }

  // 優先處理數字型欄位
  if (typeof slotID === "number") {
    validateSlot(slotID);
    return {
      handler: "handleSingleSlot",
      params: { slot: slotID },
    };
  }

  // 處理文字指令
  const commandKey = (options || "default").toLowerCase();
  const command = resolveCommand(commandKey);

  // 如果沒有匹配到預設命令，且 options 是字串，則視為物品名稱
  if (!command && typeof options === "string") {
    return {
      handler: "handleItemName",
      params: { itemName: options },
    };
  }

  // 如果還是沒有匹配到，則拋出錯誤
  if (!command) {
    throw new CommandError("invalid_command", { command: options });
  }

  return command;
}

// 指令解析擴展
function resolveCommand(input) {
  if (!input) return COMMAND_CONFIG.one; // 空輸入返回預設指令

  // 處理別名映射
  const commandName = COMMAND_CONFIG[input]?.alias || input;
  const command = COMMAND_CONFIG[commandName];

  return command || null;
}

// 核心處理模組
const HANDLERS = {
  // 單一欄位處理
  handleSingleSlot: async (bot, { slot, count }) => {
    if (slot == null) slot = bot.getEquipmentDestSlot("hand");
    const item = bot.inventory.slots[slot];
    if (!item) throw new InventoryError("empty_slot", { slot });

    const dropCount = Math.min(
      count ?? item.count, // 當 count 未定義時使用物品全部數量
      item.count
    );
    // 特殊處理：裝備欄(0-9)和副手欄位(45)
    if ((slot >= 0 && slot <= 9) || slot === 45) {
      await bot.tossStack(item);
      return { slot, item, count: dropCount };
    }
    await bot.toss(item.type, null, dropCount);
    return { slot, item, count: dropCount };
  },

  // 主手物品處理
  handleMainHand: async (bot, { count }) => {
    const item = bot.heldItem;
    if (!item) throw new InventoryError("no_item_in_hand");

    // 從 params 獲取 count 並處理優先級
    const dropCount = Math.min(
      count ?? item.count, // 使用配置參數
      item.count
    );

    await bot.toss(item.type, null, dropCount);
    return { item, count: dropCount };
  },

  // 範圍處理 (支援連續區間或指定槽位)
  handleRange: async (bot, { start, end, slots }) => {
    const targetSlots =
      slots || Array.from({ length: end - start + 1 }, (_, i) => start + i);
    let totalDropped = 0;

    for (const slot of targetSlots) {
      const item = bot.inventory.slots[slot];
      if (!item) continue;

      const dropCount = item.count;
      if (dropCount <= 0) break;

      await bot.tossStack(item);
      totalDropped += dropCount;
      await bot.waitForTicks(1);
    }

    await clearMouseHeldItem(bot);
    return { total: totalDropped, slots: targetSlots.length };
  },

  // 滑鼠清除
  handleMouseClear: async (bot) => {
    await clearMouseHeldItem(bot);
    return { cleared: true };
  },

  // 物品名稱
  handleItemName: async (bot, { itemName, count }) => {
    if (!itemName) throw new CommandError("missing_item_name");

    const items = bot.inventory.items();
    if (!items.length) throw new InventoryError("empty_inventory");

    // 1. 精確匹配 - 找出所有符合的物品
    let targetItems = items.filter(
      (item) => item.name.toLowerCase() === itemName.toLowerCase()
    );

    // 2. 如果沒有精確匹配，嘗試模糊匹配
    if (targetItems.length === 0) {
      targetItems = items.filter(
        (item) =>
          item.name.toLowerCase().includes(itemName.toLowerCase()) ||
          item.displayName.toLowerCase().includes(itemName.toLowerCase())
      );
    }

    if (targetItems.length === 0) {
      throw new InventoryError("item_not_found", { itemName });
    }

    // 計算所有符合物品的總數
    const totalItems = targetItems.reduce((sum, item) => sum + item.count, 0);

    // 處理要丟棄的數量
    const dropCount = Math.min(count ?? totalItems, totalItems);
    let remainingToDrop = dropCount;

    // 依序處理每個物品
    for (const item of targetItems) {
      if (remainingToDrop <= 0) break;

      const itemDropCount = Math.min(remainingToDrop, item.count);
      await bot.toss(item.type, null, itemDropCount);
      remainingToDrop -= itemDropCount;
      await bot.waitForTicks(1); // 添加小延遲避免丟棄太快
    }

    return {
      items: targetItems,
      count: dropCount,
      // 返回第一個物品用於顯示名稱
      item: targetItems[0],
    };
  },
};

// 通用工具函數
function validateSlot(slot) {
  if (slot < 0 || slot > 45) {
    throw new RangeError(`Invalid slot: ${slot}, must be 0-45`);
  }
}

async function clearMouseHeldItem(bot) {
  await bot.clickWindow(-999, 0, 0);
}

const inventoryCache = new WeakMap();

function countByNameWithOption(bot, item, checkMetadata = false) {
  try {
    // 快取檢查邏輯
    if (
      !inventoryCache.has(bot) ||
      bot.inventory.items().length !== inventoryCache.get(bot)?.length
    ) {
      inventoryCache.set(bot, {
        timestamp: Date.now(),
        items: [...bot.inventory.items()],
      });
    }

    const cached = inventoryCache.get(bot);
    const targetName = item.name.toLowerCase();

    return cached.items.reduce((total, currentItem) => {
      const isNameMatch = currentItem.name?.toLowerCase() === targetName;
      const isMetaMatch = checkMetadata
        ? currentItem.metadata === item.metadata
        : true;
      return isNameMatch && isMetaMatch ? total + currentItem.count : total;
    }, 0);
  } catch (error) {
    console.error(`[countByNameWithOption] 統計失敗: ${error.message}`);
    return 0;
  }
}

// 錯誤處理體系
class CommandError extends Error {
  constructor(type, context) {
    super(type);
    this.name = "CommandError";
    this.context = context;
  }
}

class InventoryError extends Error {
  constructor(type, context) {
    super(type);
    this.name = "InventoryError";
    this.context = context;
  }
}

// 錯誤訊息結構
const ERROR_MESSAGES = {
  CommandError: {
    invalid_command: {
      text: ({ command }) => `無效參數: ${command || ""}`,
      icon: "❌",
    },
    missing_item_name: {
      text: () => "請指定物品名稱",
      icon: "❓",
    },
  },
  InventoryError: {
    no_item_in_hand: {
      text: () => "主手沒有可丟棄物品",
      icon: "🖐",
    },
    empty_slot: {
      text: ({ slot }) => `欄位 ${slot} 無物品`,
      icon: "⛶",
    },
    empty_inventory: {
      text: () => "背包是空的",
      icon: "🎒",
    },
    item_not_found: {
      text: ({ itemName }) => `找不到物品：${itemName}`,
      icon: "🔍",
    },
  },
  RangeError: {
    text: (msg) => msg,
    icon: "🔢",
  },
};

function handleError(bot, error) {
  let messageConfig;

  if (error instanceof CommandError) {
    const config = ERROR_MESSAGES.CommandError[error.message];
    messageConfig = {
      text: config?.text(error.context) || "未知指令錯誤",
      icon: config?.icon || "❓",
    };
  } else if (error instanceof InventoryError) {
    const config = ERROR_MESSAGES.InventoryError[error.message];
    messageConfig = {
      text: config?.text(error.context) || "未知物品錯誤",
      icon: config?.icon || "❓",
    };
  } else if (error instanceof RangeError) {
    messageConfig = {
      text: ERROR_MESSAGES.RangeError.text(error.message),
      icon: ERROR_MESSAGES.RangeError.icon,
    };
  } else {
    messageConfig = {
      text: `發生未預期錯誤: ${error.message}`,
      icon: "💥",
    };
    console.error(`${error.stack}`);
  }

  bot.safeChat(messageConfig.text, messageConfig.icon);
}

// 結果訊息生成器
function sendResultMessage(bot, handlerType, result) {
  const MESSAGE_CONFIG = {
    handleSingleSlot: {
      text: (result, bot) => {
        const remaining = countByNameWithOption(bot, result.item);

        // 計算組數和餘數
        const stackSize = result.item.stackSize || 64;
        const stacks = Math.floor(remaining / stackSize);
        const remainder = remaining % stackSize;

        // 組合訊息
        const remainingText =
          remaining > 0
            ? ` 剩餘 ${remaining} 個 (${stacks} 組 + ${remainder} 個)`
            : ``;

        return `已從欄位 ${result.slot} 丟棄 ${result.count} 個 ${result.item.displayName}${remainingText}`;
      },
      icon: "✅",
    },
    handleMainHand: {
      text: (result, bot) => {
        const remaining = countByNameWithOption(bot, result.item);

        // 計算組數和餘數
        const stackSize = result.item.stackSize || 64;
        const stacks = Math.floor(remaining / stackSize);
        const remainder = remaining % stackSize;

        // 組合訊息
        const remainingText =
          remaining > 0
            ? ` 剩餘 ${remaining} 個 (${stacks} 組 + ${remainder} 個)`
            : ``;

        return `已丟棄主手 ${result.count} 個 ${result.item.displayName}${remainingText}`;
      },
      icon: "✋",
    },
    handleRange: {
      text: () => `已清空 ${result.slots} 格欄位 (共 ${result.total} 個物品)`,
      icon: "🗑",
    },
    handleDropAll: {
      text: () => `已清空 ${result.slots} 格欄位 (共 ${result.total} 個物品)`,
      icon: "🗑",
    },
    handleMouseClear: {
      text: () => "已清除滑鼠懸浮物品",
      icon: "🖰",
    },
    handleItemName: {
      text: (result, bot) => {
        const remaining = countByNameWithOption(bot, result.item);

        // 計算組數和餘數
        const stackSize = result.item.stackSize || 64; // 預設最大堆疊為64
        const stacks = Math.floor(remaining / stackSize);
        const remainder = remaining % stackSize;

        // 組合訊息
        const remainingText =
          remaining > 0
            ? ` 剩餘 ${remaining} 個 (${stacks} 組 + ${remainder} 個)`
            : ``;

        return `已丟棄 ${result.count} 個 ${result.item.displayName}${remainingText}`;
      },
      icon: "📦",
    },
  };

  const config = MESSAGE_CONFIG[handlerType];
  if (config) {
    const message = config.text(result, bot);
    bot.safeChat(message, config.icon);
  }
}

module.exports = { dropItem };
