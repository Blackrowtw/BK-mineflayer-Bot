async function craftItem(bot, itemName = null, options = {}) {
  const { metadata = null, count = 1 } = options;

  if (!itemName || itemName == null) throw new Error("請提供物品名稱");

  // 核心模糊匹配邏輯 ▼
  const searchKey = itemName.toLowerCase().replace(/\s+/g, "_"); // 轉換為物品命名格式
  const itemEntries = Object.entries(bot.registry.itemsByName);
  const matchedItems = itemEntries
    .map((entry) => ({
      item: entry[1],
      ...createMatcher(searchKey)(entry),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = matchedItems[0]?.item;

  if (!bestMatch) {
    throw new Error(`找不到符合「${itemName}」的物品`);
  }

  // 配方處理流程 (保持不變) ▼
  let craftingTable = null;
  let recipes = bot.recipesFor(bestMatch.id, metadata, 1);
  if (recipes.length === 0) {
    craftingTable = bot.findBlock({
      matching: bot.registry.blocksByName.crafting_table.id,
      maxDistance: 8,
    });
    if (!craftingTable) throw new Error("需要工作台但未找到");
    recipes = bot.recipesFor(bestMatch.id, metadata, 1, craftingTable);
    if (recipes.length === 0) {
      craftingTable = null;
      throw new Error(`${bestMatch.displayName} 無可用合成配方`);
    }
  }

  // 工作台處理 (保持不變) ▼
  const requireCraftingTable = recipes[0]?.requiresTable ?? true;
  if (requireCraftingTable) {
    craftingTable = bot.findBlock({
      matching: bot.registry.blocksByName.crafting_table.id,
      maxDistance: 8,
    });
    if (!craftingTable) throw new Error("需要工作台但未找到");
  }

  // 執行合成 ▼
  try {
    await bot.craft(recipes[0], count, craftingTable);
    // 獲取格式化訊息
    const delta = recipes[0].delta;
    // console.log({ recipes, requireCraftingTable, delta });
    const message = await formatCraftMessage(bot, delta);
    const countMsg = count > 1 ? ` (${count} 次)` : "";
    await bot.safeChat(`${message}${countMsg}`, "🛠");
  } catch (error) {
    if (error.message.includes("missing ingredient")) {
      const delta = recipes[0].delta;
      const message = await formatCraftMessage(bot, delta);
      const countMsg = count > 1 ? ` (${count} 次)` : "";
      await bot.safeChat(`材料不足，無法${message}${countMsg}`, "❌");
      return;
    }
    throw error;
  }

  // 分層匹配功能函數 ▼
  function createMatcher(searchKey) {
    const minLength = 3;
    const searchParts = searchKey.split("_");

    return ([name]) => {
      const lowerName = name.toLowerCase();

      // Layer 1: 精確匹配 (權重最高)
      if (lowerName === searchKey) return { score: 100 };

      // Layer 2: 前綴匹配 (例: 'stick' → 'stick_xxx')
      if (lowerName.startsWith(searchKey)) return { score: 80 };

      // Layer 3: 分段精確匹配 (例: 'wood_sword')
      if (searchParts.every((p) => lowerName.split("_").includes(p))) {
        return { score: 70 };
      }

      // Layer 4: 模糊包含匹配 (需達最小長度)
      if (searchKey.length >= minLength) {
        const containsScore = lowerName.includes(searchKey) ? 60 : 0;
        if (containsScore) return { score: containsScore };
      }

      return { score: 0 };
    };
  }

  // 合成成功後的訊息處理邏輯 ▼
  async function formatCraftMessage(bot, delta) {
    // 數據分類器：分離消耗與產生物品
    const materials = { used: {}, produced: {} };

    delta.forEach((entry) => {
      const isConsume = entry.count < 0;
      const absCount = Math.abs(entry.count);
      const item = bot.registry.items[entry.id];

      if (!item) {
        console.warn(`找不到物品 ID: ${entry.id}`);
        return;
      }

      // 合併相同物品的數量
      const category = isConsume ? "used" : "produced";
      if (count > 1) {
        if (materials[category][item.displayName]) {
          materials[category][item.displayName] += absCount * count;
        } else {
          materials[category][item.displayName] = absCount * count;
        }
      } else {
        if (materials[category][item.displayName]) {
          materials[category][item.displayName] += absCount;
        } else {
          materials[category][item.displayName] = absCount;
        }
      }
    });

    // 格式轉換器：生成可讀文本
    const formatEntries = (items) => {
      return Object.entries(items)
        .map(([displayName, count]) => `${displayName} ${count} 個`)
        .join(", ");
    };

    // 訊息組裝
    const usedMsg = formatEntries(materials.used);
    const producedMsg = formatEntries(materials.produced);

    return `使用: ${usedMsg}, 合成: ${producedMsg}`;
  }
}

module.exports = { craftItem };
