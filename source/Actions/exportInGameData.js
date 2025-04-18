const { Vec3 } = require("vec3");
async function exportInGameData(
  bot,
  options,
  name = null,
  position = null,
  id = null,
  type = null,
  slot = null
) {
  let result;
  try {
    switch (options) {
      case "bot":
        result = await getBotData(bot);
        break;
      case "window":
        result = await getCurrentWindowData(bot);
        break;
      case "player":
        result = await getPlayerData(bot, name);
        break;
      case "block":
        result = await getBlockData(bot, name, position, id);
        break;
      case "entity":
        result = await getEntityData(bot, name, id, type);
        break;
      case "item":
        result = await getItemData(bot, name, id, slot);
        break;
      case "recipes":
        result = await getRecipesData(bot, name);
        break;
      default:
        throw new Error(`[exportInGameData] 無效的選項: ${options}`);
    }
    // 將結果導出到 JSON 文件
    await exportData(result, options);
    return result;
  } catch (err) {
    console.error(`[exportInGameData] 發生錯誤: ${err.message}`);
    bot.safeChat(`[exportInGameData] 發生錯誤: ${err.message}`, "❌");
    throw err; // 重新拋出異常以便進一步調試
  }

  async function getBotData(bot) {
    return bot;
  }

  async function getCurrentWindowData(bot) {
    try {
      const currentWindow = bot.currentWindow;
      if (!currentWindow) {
        console.log(
          `[exportInGameData] getCurrentWindowData: 找不到當前窗口資料`
        );
        return null;
      }
      await bot.safeChat(
        `[exportInGameData] 輸出當前窗口資料 ${currentWindow.type}`,
        "✅"
      );
      return currentWindow;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getCurrentWindowData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  async function getPlayerData(bot, name) {
    try {
      if (name) {
        const player = bot.players[name];
        if (!player) {
          console.log(`[exportInGameData] getPlayerData: 找不到玩家: ${name}`);
          return null;
        }
        return player;
      }
      return bot.players;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getPlayerData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  async function getBlockData(bot, name, position, id) {
    try {
      if (position) {
        const blockPos = new Vec3(position.x, position.y, position.z);
        const block = await bot.blockAt(blockPos);
        if (!block) {
          console.log(
            `[exportInGameData] getBlockData: 找不到位置為 ${position} 的方塊`
          );
          return null;
        }
        await bot.safeChat(
          `[exportInGameData] 輸出方塊資料 ${block.displayName} ${block.position}`,
          "✅"
        );
        return block;
      }
      if (name || id) {
        const block = await bot.findBlock({
          matching: (block) =>
            (name ? block.name === name : true) &&
            (id ? block.type === id : true),
          maxDistance: 64,
        });
        if (!block) {
          console.log(`[exportInGameData] getBlockData: 找不到符合條件的方塊`);
          return null;
        }
        await bot.safeChat(
          `[exportInGameData] 輸出方塊資料 ${block.displayName} ${block.position}`,
          "✅"
        );
        return block;
      }

      // 默認功能：輸出 10 個周圍的方塊
      const blocks = await bot.findBlocks({
        matching: (block) => block && block.name !== "air",
        maxDistance: 5,
        count: 10,
      });

      // 將方塊組合成新的對象
      const blockData = {};
      for (let i = 0; i < blocks.length; i++) {
        const block = await bot.blockAt(blocks[i]);
        if (block) {
          blockData[i] = block;
        }
      }
      console.log({ blocks, blockData });
      if (Object.keys(blockData).length === 0) return null; // 如果沒有找到任何方塊，則返回 null
      await bot.safeChat(`[exportInGameData] 輸出了周圍的 10 個方塊`, "✅");
      return blockData;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getBlockData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  async function getEntityData(bot, name, id, type) {
    try {
      const entities = bot.entities;
      if (name || id || type) {
        const filteredEntities = Object.values(entities).filter(
          (entity) =>
            (name ? entity.name === name : true) &&
            (id ? entity.id === id : true)
        );
        if (filteredEntities.length === 0) {
          console.log(`[exportInGameData] getEntityData: 找不到符合條件的實體`);
          return null;
        }
        await bot.safeChat(
          `[exportInGameData] 輸出實體資料 ${filteredEntities.displayName} ${filteredEntities.position}`,
          "✅"
        );
        return filteredEntities;
      }
      const entityCount = Object.entries(entities).length;
      await bot.safeChat(
        `[exportInGameData] 輸出周圍 ${entityCount} 個實體資料`,
        "✅"
      );
      return entities;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getEntityData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  async function getItemData(bot, name, id, slot) {
    try {
      const items = await bot.inventory.items();
      if (name || id || slot) {
        const filteredItems = items.filter(
          (item) =>
            (name ? item.name === name : true) &&
            (slot ? item.slot === slot : true)
        );
        if (filteredItems.length === 0) {
          console.log(`[exportInGameData] getItemData: 找不到符合條件的物品`);
          return null;
        }
        await bot.safeChat(
          `[exportInGameData] 輸出物品資料 ${filteredItems.displayName} ${filteredItems.position}`,
          "✅"
        );
        return filteredItems;
      }
      const itemCount = Object.entries(items).length;
      await bot.safeChat(
        `[exportInGameData] 輸出了 ${itemCount} 個物品資料`,
        "✅"
      );
      return items;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getItemData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  async function getRecipesData(bot, name) {
    try {
      if (name) {
        const itemId = _getItemId(bot, name);
        const recipes = bot.recipesAll(itemId, null, 1);
        if (!recipes) {
          console.log(`[exportInGameData] getRecipesData: 找不到配方: ${name}`);
          return null;
        }
        return recipes;
      }
      await bot.safeChat(
        `[exportInGameData] getRecipesData 需要參數 name`,
        "❌"
      );
      return null;
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] getRecipesData 發生錯誤: ${err.message}`,
        "❌"
      );
      console.error(`\n${err.stack}`);
      return null;
    }
  }

  function _getItemId(bot, name) {
    // 名稱標準化處理
    const searchKey = name.toLowerCase().trim().replace(/\s+/g, "_");

    // 完全匹配優先
    const exactMatch = bot.registry.itemsByName[searchKey];
    if (exactMatch) return exactMatch.id;

    // 模糊匹配流程
    return fuzzyMatchItem(bot, searchKey)?.id || null;
    function fuzzyMatchItem(bot, searchKey) {
      const candidates = Object.entries(bot.registry.itemsByName)
        .map(([itemName, item]) => ({
          item,
          score: calculateMatchScore(itemName, searchKey),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score);

      return candidates[0]?.item;
    }
    function calculateMatchScore(itemName, searchKey) {
      const lowerItem = itemName.toLowerCase();

      // 分級評分規則
      if (lowerItem === searchKey) return 100; // 完全匹配
      if (lowerItem.startsWith(searchKey)) return 80; // 前綴匹配
      if (lowerItem.endsWith(searchKey)) return 70; // 後綴匹配
      if (lowerItem.includes(searchKey)) return 60; // 包含匹配

      // 分詞匹配 (例: "wood_sword" → "wooden_sword")
      const searchParts = searchKey.split("_");
      const itemParts = lowerItem.split("_");
      const partMatches = searchParts.filter((p) =>
        itemParts.includes(p)
      ).length;
      return partMatches * 10; // 每個匹配部分加 10 分
    }
  }

  async function exportData(data, options) {
    const fs = require("fs");
    const util = require("util");
    const path = require("path");

    if (!data) {
      await bot.safeChat(
        `[exportInGameData] exportData: 未傳入 data 無資料可處理 `,
        "❌"
      );
      return;
    }

    if (typeof data !== "object") {
      const errorMessage = `[exportInGameData] exportData: 傳入的 data 不是對象，無法導出: ${typeof data}`;
      await bot.safeChat(errorMessage, "❌");
      console.error(errorMessage);
      return;
    }

    const exportFolder = bot.Bot_Config.exportFolder;
    const filePath = `./${exportFolder}/getData/Data_inGame_${options}.log`;
    const dir = path.dirname(filePath);

    try {
      fs.mkdirSync(dir, { recursive: true });

      const inspectedData = util.inspect(data, { depth: null, colors: false });
      fs.writeFileSync(filePath, inspectedData);
      await bot.safeChat(
        `[exportInGameData] ${options} 資料類型: ${typeof result}, 已成功寫入：\n → ${filePath}`,
        "💾"
      );
      console.log(
        `[成功] exportInGameData: 資料 ${options} 已成功寫入 ${filePath}`
      );
    } catch (err) {
      await bot.safeChat(
        `[exportInGameData] 資料 ${options} 寫入失敗: ${err.message}`,
        "❌"
      );
      console.error(
        `[失敗] exportInGameData: 資料 ${options} 導出錯誤: \n${err.stack}`
      );
    }
  }
}

module.exports = { exportInGameData };
