const { EQUIPMENT_CONFIG } = require("./_DATA/EQUIPMENT_CONFIG.js");
const { ENCHANTMENTS } = require("./_DATA/ENCHANTMENTS.js");
const { FOODS } = require("./_DATA/FOODS.js");

class EquipManager {
  constructor(bot) {
    this.bot = bot;
    this.equipmentList = this.initEquipmentMap(EQUIPMENT_CONFIG);
  }

  /**
   * 初始化裝備映射表
   * @param {Object} config - 裝備配置對象
   * @returns {Object} 處理後的裝備映射表
   */
  initEquipmentMap(config) {
    const mapping = {};

    for (const [categoryName, category] of Object.entries(config)) {
      // 跳過非裝備類別或特殊屬性
      if (
        !Array.isArray(category?.filter) ||
        !Array.isArray(category?.destination) ||
        categoryName === "name" ||
        categoryName === "categories"
      ) {
        continue;
      }

      const { filter, destination } = category;

      // 忽略空配置
      if (filter.length === 0) continue;

      try {
        // 情景1: 完美匹配 (filter 和 destinations 長度相同)
        if (filter.length === destination.length) {
          filter.forEach((type, index) => {
            mapping[type] = destination[index];
          });
          continue;
        }

        // 情景2: 單一目標 (一個 destination 對應多個 filter)
        if (destination.length === 1) {
          filter.forEach((type) => {
            mapping[type] = destination[0];
          });
          continue;
        }

        // 情景3: 非法配置
        console.warn(`[裝備配置警告] ${categoryName}: 
          型別列表 (${filter.length}): [${filter.join(", ")}] 
          目標列表 (${destination.length}): [${destination.join(", ")}]
          配置無效，已跳過此類別`);
      } catch (error) {
        console.error(`[裝備配置錯誤] ${categoryName}: ${error.message}`);
      }
    }
    return mapping;
  }

  /**
   * 核心裝備功能
   * @param {number|null} slot - 欄位編號，可以是 null 或數字
   * @param {object} options - 配置選項
   */
  async equip(slot = null, options = {}) {
    try {
      // 1. 裝備手上物品
      if (slot === null && Object.keys(options).length === 0) {
        return await this.equipFromHand();
      }

      // 2. 裝備指定欄位物品
      if (typeof slot === "number") {
        // 檢查欄位範圍
        if (slot < 0) {
          this.bot.safeChat(`欄位【${slot}】可不能是負數阿`, `❌`);
          return;
        }
        if (slot >= 46) {
          this.bot.safeChat(`可沒有編號【${slot}】的欄位阿`, `❌`);
          return;
        }
        return await this.equipFromSlot(slot);
      }

      // 3. PVP最佳裝備
      if (options.mode === "pvp") {
        return await this.equipBestPVP();
      }

      // 4. 工具選擇功能
      if (options.mode === "tool" && options.block) {
        return await this.equipBestTool(options.block);
      }

      // 如果都不符合，返回錯誤訊息
      throw new Error(
        `無效的裝備指令: slot=${slot}, options=${JSON.stringify(options)}`
      );
    } catch (error) {
      // 添加錯誤處理
      console.error(`[EquipManager] equip 錯誤:`, error);
      throw error;
    }
  }

  /**
   * 裝備手上的物品
   */
  async equipFromHand() {
    return await this.handleEquip({
      itemSourceID: this.bot.getEquipmentDestSlot("hand"),
      sourceType: "hand",
    });
  }

  /**
   * 從指定欄位裝備物品
   * @param {number} slot - 欄位編號
   */
  async equipFromSlot(slot) {
    // 先檢查該欄位是否有物品
    const item = this.bot.inventory.slots[slot];
    if (!item) {
      this.bot.safeChat(`欄位【${slot}】中沒有物品`, `❌`);
      return;
    }

    return await this.handleEquip({
      itemSourceID: slot,
      sourceType: "slot",
    });
  }

  /**
   * 裝備最佳 PVP 裝備
   */
  async equipBestPVP() {
    // 階段一：過濾並標記有效裝備
    const rawEquipment = this.getBotAllItems()
      .map((item) => {
        // 1. 檢查裝備類別
        const itemCategory = this.findItemCategory(item);
        if (!itemCategory) return null;

        // 2. 檢查耐久度是否足夠
        const durabilityRate = this.calculateEquipmentDamageRate(item);
        if (durabilityRate <= 0.05) return null; // 排除耐久度低於 5% 的裝備

        // 3. 計算裝備評分
        let itemPriority;
        if (itemCategory === "food") {
          // 食物特殊評分
          itemPriority = this.calculateFoodScore(item);
        } else {
          // 其他裝備正常評分
          itemPriority = this.calculateTotalScore(item);
        }

        return {
          ...item,
          category: itemCategory,
          targetSlotID: this.getSlotIDFromArmorType(item),
          targetSlotDesc: this.getSlotNameFromArmorType(item),
          priority: itemPriority,
        };
      })
      .filter(Boolean);

    // 階段二：排序邏輯
    const sortedEquipment = Object.values(
      rawEquipment.reduce((grouped, item) => {
        // 按裝備位置分組，只保留優先級最高的
        const slot = item.targetSlotDesc;
        if (!grouped[slot] || item.priority > grouped[slot].priority) {
          grouped[slot] = item;
        }
        return grouped;
      }, {})
    ).sort((a, b) => b.priority - a.priority); // 比較優先級高低

    // // **debug**
    // let sortedMap = sortedEquipment.map((item, i) => {
    //   const score = item.priority;
    //   const name = item.displayName;
    //   const text = `{${name} >> P: ${score}}`;
    //   return text;
    // });
    // // console.log({ sortedEquipment });
    // console.log({ sortedMap }); //debug 挑選過的物品清單

    // 階段三：依照排序清單 穿上裝備
    try {
      for (const equipment of sortedEquipment) {
        try {
          // 獲取物品所在背包槽位
          const sourceSlot = equipment.slot;

          // 調用現有裝備邏輯
          await this.handleEquip({
            itemSourceID: sourceSlot,
            sourceType: "pvp",
          });

          // 增加冷卻避免過快操作
          await this.bot.waitForTicks(2);
        } catch (equipErr) {
          console.logTimer(
            `[equipBestPVP] 裝備 ${equipment.name} 失敗: ${equipErr.message}`
          );
        }
      }
      this.bot.safeChat(`This isn't even my final form.`, `😏`);
    } catch (sortErr) {
      this.bot.safeChat("裝備排序失敗，無法自動裝備", "❌");
      console.logTimer(`[equipBestPVP] 錯誤: ${sortErr.message}`);
      console.error(`${sortErr.stack}`);
    }
  }

  /**
   *  裝備最佳挖掘工具
   * @param {object} block 傳入方塊實例
   */
  async equipBestTool(block) {
    // 內部工具函數
    const getToolType = (material) => {
      const match = material.match(/mineable\/(\w+)/);
      return match ? match[1] : null;
    };

    const findToolByType = (toolType) => {
      // 找出所有符合的工具
      const tools = this.bot.inventory
        .items()
        .filter((item) => {
          // 1. 檢查是否為對應工具類型
          const name = item.name.toLowerCase();
          const isMatchTool = name.includes(toolType);

          // 2. 檢查耐久度是否足夠
          const durabilityRate = this.calculateEquipmentDamageRate(item);
          const hasDurability = durabilityRate > 0.05; // 排除耐久度低於 5% 的工具

          return isMatchTool && hasDurability;
        })
        .map((item) => ({
          ...item,
          score: calculateToolTotalScore(item, toolType),
        }))
        .sort((a, b) => b.score - a.score); // 按分數從高到低排序

      // 返回分數最高的工具
      return tools[0] || null;
    };

    const calculateToolTotalScore = (item, toolType) => {
      if (!item || !toolType) return -1;

      // // 1. 基礎分數 (工具類型和材質)
      const baseScore = this.calculateBasePriority(item, "tool");

      // // 2. 效率附魔分數
      const efficiencyScore = this.calculateEnchantmentsScore(item);

      // // 3. 耐久度評分
      const durabilityRate = this.calculateEquipmentDamageRate(item);
      const durabilityPenalty = -(1 - durabilityRate);

      // // 計算總分
      const totalScore = parseFloat(
        (baseScore + efficiencyScore + durabilityPenalty).toFixed(4)
      );

      // // Debug 輸出
      console.log(`\n=== 工具評分計算 ===`);
      console.log(`工具: ${item.displayName}`);
      console.log(`基礎分數: ${baseScore}`);
      console.log(`效率附魔: ${efficiencyScore}`);
      console.log(`耐久度: ${durabilityRate}`);
      console.log(`總分: ${totalScore}`);

      return totalScore;
    };

    try {
      // 1. 取得方塊的 material 資料
      const material = block?.material || "";
      if (!material) {
        this.bot.safeChat("無法判斷方塊資訊", "❌");
        return;
      }

      // 2. 提取工具類型
      const toolType = getToolType(material);
      if (!toolType) {
        this.bot.safeChat(`方塊 ${block.displayName} 沒有合適的開採工具`, "😥");
        return;
      }

      // 3. 尋找對應工具
      const tool = findToolByType(toolType);
      if (!tool) {
        this.bot.safeChat(
          `找不到合適方塊 ${block.displayName} 的開採工具: ${toolType}`,
          "❌"
        );
        return;
      }
      // 4. 裝備工具
      this.bot.safeChat(
        `合適開採方塊 ${block.displayName} 的工具是: ${toolType}`,
        "✅"
      );
      await this.equipFromSlot(tool.slot);
    } catch (error) {
      console.error(`[equipBestTool] 錯誤:`, error);
      this.bot.safeChat(`選擇工具時發生錯誤`, "❌");
    }
  }

  /**
   * 裝備功能 參數輸入處理核心
   */
  async handleEquip({ itemSourceID, sourceType }) {
    try {
      // 動態獲取物品和來源資訊
      const [item, sourceSlot, sourceSlotName] = (() => {
        const fromSlot = parseInt(itemSourceID, 10);
        const oneItem = this.bot.inventory.slots[fromSlot];

        switch (sourceType) {
          case "hand":
            return [oneItem, fromSlot, "手上"];
          case "slot":
          case "pvp":
            return [oneItem, fromSlot, `欄位【${fromSlot}】`];
          default:
            return [null, null, null];
        }
      })();

      // 檢查物品是否存在
      if (!item) {
        this.bot.safeChat(`${sourceSlotName}沒有物品！`, "❌");
        return;
      }

      // 處裡來源欄位是 0 的特殊狀況
      if (sourceSlot === 0) {
        try {
          await this.bot.equip(item, "hand");
          this.bot.safeChat(
            `看看我在合成產物欄發現了什麼? ${sourceSlotName}${item.displayName}`,
            "🔍"
          );
          return;
        } catch (error) {
          this.bot.safeChat(
            `無法裝備 ${item.displayName}，因為: ${error.message}`,
            "❌"
          );
        }
      }

      // 其他裝備邏輯
      const destSlot = this.getSlotIDFromArmorType(item);
      const destSlotName = this.getSlotNameFromArmorType(item, "nameMap");

      // 如果不是裝備類物品，預設放到主手上
      if (destSlot == null) {
        try {
          await this.bot.equip(item, "hand");
          this.bot.safeChat(`已將 ${item.displayName} 拿在手上`, "✅");
          return;
        } catch (error) {
          this.bot.safeChat(
            `無法裝備 ${item.displayName}，因為: ${error.message}`,
            "❌"
          );
          return;
        }
      }

      // 檢查來源與目的 SlotID 的合法性
      if (sourceSlot == null) {
        this.bot.safeChat(`${sourceSlotName}沒有東西呀`, "❓");
        return;
      } else if (destSlot == null) {
        try {
          await this.bot.equip(item, "hand");
          this.bot.safeChat(
            `你看這【${sourceSlot}】${item.displayName} 我得穿到哪去呀`,
            "❓"
          );
        } catch (error) {
          return;
        }
        return;
      }

      // 來源和目標是不是都在同一位置
      if (
        sourceType !== "pvp" &&
        sourceSlot === destSlot &&
        sourceSlot === this.bot.getEquipmentDestSlot("hand")
      ) {
        this.bot.safeChat(`${item.displayName} 就拿在手裡呢!`, `🤔`);
        return;
      } else if (sourceType !== "pvp" && sourceSlot === destSlot) {
        this.bot.safeChat(`${item.displayName} 就穿在身上呢!`, `😌`);
      }

      // 嘗試放入裝備
      // await this.bot.moveSlotItem(itemSource, Item2Slot);
      await this.bot.swingArm();
      await this.bot.waitForTicks(1);
      await this.bot.moveSlotItem(sourceSlot, destSlot);
      await this.bot.waitForTicks(1);

      // 處理輸出訊息
      if (sourceType === "pvp") {
        return;
      } else {
        this.bot.safeChat(
          `${destSlotName} 已成功裝備 ${item.displayName}，來自 ${sourceSlotName}`
        );
        return;
      }
    } catch (err) {
      this.bot.safeChat(`穿上裝備失敗`, `❌`);
      console.logTimer(`[equipOn] bot.moveSlotItem failed: ${err.message}`);
      console.log(err.stack);
    }
  }

  /**
   * 工具函數區
   */
  // 根據物品實例 獲取裝備欄位位置 slotID
  getSlotIDFromArmorType(item) {
    if (!item || !item.name) return null; // 確保 item 存在

    // 預處理物品名稱（移除名稱空間）
    const itemName = item.name;
    const cleanName = itemName.replace(/^minecraft:/, "").toLowerCase();

    // 優先檢查精確匹配
    if (this.equipmentList.hasOwnProperty(cleanName)) {
      return this.bot.getEquipmentDestSlot(this.equipmentList[cleanName]);
    }

    // 找對應的裝備類型（後綴匹配）
    const armorType = Object.keys(this.equipmentList).find((type) =>
      cleanName.endsWith(`_${type}`)
    );

    // 檢查合法性
    if (!armorType) {
      // console.warn(`❗ 未識別的裝備類型 (armorType) ${cleanName} `);
    }

    // 由匹配取得裝備對應的 SlotID
    const armorTypeDestination = this.equipmentList[armorType];
    if (!armorTypeDestination) return null; // 避免 undefined
    const armorSlot = this.bot.getEquipmentDestSlot(armorTypeDestination);

    // 回傳取得的 SlotID
    return armorSlot !== undefined ? armorSlot : null; // 避免 undefined
  }

  // 根據物品名稱 獲取裝備目標位置描述名稱
  getEquipmentDestination(itemName) {
    if (!itemName) return null;

    // 優先檢查精確匹配
    if (this.equipmentList.hasOwnProperty(itemName)) {
      return this.equipmentList[itemName];
    }

    // 找對應的裝備類型（後綴匹配）
    const armorType = Object.keys(this.equipmentList).find((type) =>
      itemName.endsWith(`_${type}`)
    );

    return armorType ? this.equipmentList[armorType] : null;
  }

  // 根據物品實例 獲取裝備目標位置描述名稱
  getSlotNameFromArmorType(item) {
    if (!item?.name) return null;

    const cleanName = item.name.replace(/^minecraft:/, "").toLowerCase();
    const destination = this.getEquipmentDestination(cleanName);

    return destination ? this.convertToDisplayName(destination) : null;
  }

  // 將欄位描述名稱轉換為可讀格式
  convertToDisplayName(destination) {
    const nameMap = {
      head: "頭盔欄",
      torso: "胸甲欄",
      legs: "護腿欄",
      feet: "靴子欄",
      "off-hand": "副手欄",
      hand: "主手",
    };
    return nameMap[destination] || destination;
  }

  // 獲取身上所有物品 (包括裝備和副手)
  getBotAllItems() {
    const inventoryItems = this.bot.inventory.items();
    const armorAndOffhand = [
      this.bot.inventory.slots[5], // 頭盔
      this.bot.inventory.slots[6], // 胸甲
      this.bot.inventory.slots[7], // 護腿
      this.bot.inventory.slots[8], // 靴子
      this.bot.inventory.slots[45], // 副手
    ].filter((item) => item !== null);

    return inventoryItems.concat(armorAndOffhand);
  }

  // 根據物品實例 獲取裝備類別名稱
  findItemCategory(item) {
    if (!item) return null;
    const itemName = item.name;
    return (
      Object.entries(EQUIPMENT_CONFIG)
        .filter(([_, category]) => Array.isArray(category?.filter))
        .find(([__, category]) =>
          category.filter.some((filter) => itemName.includes(filter))
        )?.[0] || null
    );
  }

  /**
   * 計算裝備物品的總評分
   * @param {Object} item - 物品實例
   * @returns {number} 總評分 (基礎分數 + 附魔分數 - 耐久度懲罰)
   */
  calculateTotalScore(item) {
    if (!item) return -1;

    // 基礎分數 (材質和類型)
    const baseScore = this.calculateBasePriority(item, "armor");

    // 附魔分數
    const enchantScore = this.calculateEnchantmentsScore(item) || 0;

    // 耐久度懲罰計算 (範圍在 -1 到 0 之間)
    const durabilityRate = this.calculateEquipmentDamageRate(item);
    const durabilityPenalty = -(1 - durabilityRate); // 轉換為負數懲罰值

    // 計算總分
    const totalScore = parseFloat(
      (baseScore + enchantScore + durabilityPenalty).toFixed(4)
    );

    // // **debug**
    // console.log("\n=== 裝備評分計算 Debug ===");
    // console.log(`物品: ${item.displayName}`);
    // console.log(`基礎分數: ${baseScore}`);
    // console.log(`附魔分數: ${enchantScore}`);
    // console.log(`耐久度比率: ${parseFloat(durabilityRate.toFixed(4))}`);
    // console.log(`耐久度懲罰: ${parseFloat(durabilityPenalty.toFixed(4))}`);
    // console.log(`最終分數: ${totalScore}`);
    return totalScore;
  }

  /**
   * 計算物品的基礎優先級分數
   * @param {Object} item - 物品實例
   * @param {string} category - 裝備類別
   * @returns {number} 基礎優先級分數
   */
  calculateBasePriority(item, category) {
    if (!item?.name) return 0;

    const Category = EQUIPMENT_CONFIG[category];
    if (
      !Category?.materials ||
      !Category?.materialBase ||
      !Category?.orderBase
    ) {
      return 0;
    }

    // 清理物品名稱
    const baseName = item.name.replace("minecraft:", "");
    const [materialPart, typePart] = baseName.split("_");

    // 匹配材質和類型
    const material =
      Category.materials.find((m) => baseName.startsWith(m)) || materialPart;

    const type = Category.filter.find((t) => baseName.endsWith(t)) || typePart;

    // 計算分數
    const materialIndex = Category.materials.indexOf(material);
    const typeIndex = Category.filter.indexOf(type);

    const materialScore = (materialIndex + 1) * Category.materialBase;
    const typeScore = Category.filter.length - typeIndex || 1;

    return Category.orderBase + materialScore + typeScore;
  }

  /**
   * 計算物品的耐久度比率
   * @param {Object} item - 物品實例
   * @returns {number} 耐久度比率 (0-1)
   */
  calculateEquipmentDamageRate(item) {
    if (!item?.maxDurability) return 1; // 無耐久度的物品返回1

    const maxDurability = item.maxDurability;
    const currentDamage = item?.componentMap?.get("damage")?.data || 0;

    // 避免除以零
    if (maxDurability === 0) return 1;

    // 計算並格式化耐久度比率
    const rate = (maxDurability - currentDamage) / maxDurability;
    return rate;
  }

  /**
   * 計算物品的附魔總分
   * @param {Object} item - 物品實例
   * @returns {number} 附魔總分
   */
  calculateEnchantmentsScore(item) {
    if (!item?.componentMap?.get("enchantments")?.data?.enchantments) {
      return 0;
    }

    // 建立附魔查詢表
    const ENCHANTMENTS_MAP = new Map(
      ENCHANTMENTS.map((ench) => [ench.id, ench])
    );

    // 附魔評分係數配置 (可擴展)
    const SCORE_MODIFIERS = {
      binding_curse: () => -50000, // 綁定詛咒
      vanishing_curse: () => -10000, // 消失詛咒
      mending: (level) => level + 4, // 修補加成
      unbreaking: (level) => level + 2, // 耐久加成
      sharpness: (level) => level * 1.5, // 鋒利
      sweeping_edge: (level) => level * 1.25, // 橫掃
      smite: (level) => level * 1.25, // 不死克星
      bane_of_arthropods: (level) => level * 1.25, // 截肢克星
      power: (level) => level * 1.5, // 力量
      impaling: (level) => level * 1.5, // 穿刺 (三叉)
      density: (level) => level * 1.5, // 緻密
      breach: (level) => (level + 1) * 1.5, // 破甲
      wind_burst: (level) => level * 1.25, // 風暴
      fire_aspect: (level) => (level + 3) * 1.25, // 火焰附加
      flame: (level) => (level + 3) * 1.25, // 火焰箭矢
    };

    try {
      return item.componentMap
        .get("enchantments")
        .data.enchantments.reduce((total, ench) => {
          const enchDef = ENCHANTMENTS_MAP.get(ench.id);
          if (!enchDef) return total;

          // 計算基礎分數
          let score = enchDef.weight * ench.level;

          // 應用修正係數
          if (SCORE_MODIFIERS[enchDef.name]) {
            score = SCORE_MODIFIERS[enchDef.name](ench.level);
          }

          // 超等級檢查
          if (ench.level > enchDef.maxLevel) {
            score *= 0.5; // 超等懲罰 分數減半
          }

          return total + Math.round(score) + 10; // 附魔基礎分數 +10
        }, 0);
    } catch (error) {
      console.error("[calculateEnchantmentsScore] 附魔分數計算錯誤:", error);
      return 0;
    }
  }

  /**
   * 計算食物的評分
   * @param {Object} item - 食物物品實例
   * @returns {number} 食物評分
   */
  calculateFoodScore(item) {
    if (!item) return -1;

    // 取得基礎分數 (來自 EQUIPMENT_CONFIG)
    const baseScore = EQUIPMENT_CONFIG.food.orderBase;

    // 取得食物名稱 並去除命名空間
    const foodName = item.name.replace("minecraft:", "");

    // 從 FOODS 查找食物數據
    const foodData = FOODS.find((food) => food.name === foodName);
    if (!foodData) return baseScore; // 若找不到數據，返回基礎分數

    // 計算食物分數
    const hungerScore = foodData.hungerValue; // 飢餓值分數
    const saturationScore = foodData.saturationValue; // 飽食度分數
    const totalScore = baseScore + hungerScore + saturationScore;

    // // Debug 輸出
    // console.log("\n=== 食物評分計算 ===");
    // console.log(`食物: ${item.displayName}`);
    // console.log(`基礎分數: ${baseScore}`);
    // console.log(`飢餓值: ${foodData.hungerValue} (${hungerScore})`);
    // console.log(`飽食度: ${foodData.saturationValue} (${saturationScore})`);
    // console.log(`總分: ${totalScore}`);

    return totalScore;
  }
}

/**
 * 工廠函數 - 統一入口
 */
function equipOn(bot, slot = null, options = {}) {
  const manager = new EquipManager(bot);
  return manager.equip(slot, options);
}

module.exports = { equipOn };

// 使用範例：
/*
1. 基本使用:
await bot.actions.equipOn(bot);  // 裝備手上物品
await bot.actions.equipOn(bot, 5);  // 裝備指定欄位

2. PVP模式:
await bot.actions.equipOn(bot, null, { mode: 'pvp' });

3. 工具模式 (新功能):
await bot.actions.equipOn(bot, null, { 
  mode: 'tool',
  block: block 
});
*/

// // 計算耐久度比率
// function calculateEquipmentDamageRate(item) {
//   if (!item || !item.name) return null; // 確保 item 存在
//   const maxDamage = item.maxDurability ? item.maxDurability : 0;
//   const currDamage = item?.componentMap?.get("damage")?.data || 0;

//   function getDamageRate(curr, max, decimals = 4) {
//     // 處理除零錯誤
//     if (max === 0) return 0;

//     const rate = (max - curr) / max;
//     const answer = rate.toFixed(decimals); // 使用 toFixed 強制四位小數

//     // 將結果轉換回數字，避免後續計算出現字串
//     return parseFloat(answer);
//   }
//   const DamageRate = getDamageRate(currDamage, maxDamage);

//   return DamageRate;
// }

// // 計算附魔的分數
// function calculateEnchantmentsScore(item) {
//   if (!item || !item.name) return null; // 確保 item 存在
//   // 引入 parseKeys.js
//   const { ENCHANTMENTS } = require("./_DATA/ENCHANTMENTS.js");
//   // 建立快速查詢字典
//   const ENCHANTMENTS_LOOKUP = ENCHANTMENTS.reduce((acc, cur) => {
//     acc[cur.id] = cur;
//     return acc;
//   }, {});

//   // 附魔評分係數配置 (可擴展)
//   const SCORE_MODIFIERS = {
//     binding_curse: () => -50000, // 綁定詛咒
//     vanishing_curse: () => -10000, // 消失詛咒
//     mending: (level) => level + 4, // 修補加成
//     unbreaking: (level) => level + 2, // 耐久加成
//     sharpness: (level) => level * 1.5, // 鋒利
//     sweeping_edge: (level) => level * 1.25, // 橫掃
//     smite: (level) => level * 1.25, // 不死克星
//     bane_of_arthropods: (level) => level * 1.25, // 截肢克星
//     power: (level) => level * 1.5, // 力量
//     impaling: (level) => level * 1.5, // 穿刺 (三叉)
//     density: (level) => level * 1.5, // 緻密
//     breach: (level) => (level + 1) * 1.5, // 破甲
//     wind_burst: (level) => level * 1.25, // 風暴
//     fire_aspect: (level) => (level + 3) * 1.25, // 火焰附加
//     flame: (level) => (level + 3) * 1.25, // 火焰箭矢
//   };

//   try {
//     // 深度安全取值
//     const enchantmentsData =
//       item?.componentMap?.get("enchantments")?.data?.enchantments || [];

//     if (!Array.isArray(enchantmentsData)) {
//       throw new Error(
//         "Invalid enchantments data structure. 無效的附魔資料結構"
//       );
//     }

//     return enchantmentsData.reduce((total, ench) => {
//       // 結構驗證
//       if (typeof ench?.id !== "number" || typeof ench?.level !== "number") {
//         console.warn("Invalid enchantment entry. 無效的附魔項 :", ench);
//         return total;
//       }

//       // 獲取附魔定義
//       const enchantmentDef = ENCHANTMENTS_LOOKUP[ench.id];
//       if (!enchantmentDef) {
//         console.warn(`Unknown enchantment ID. 未知的附魔ID: ${ench.id}`);
//         return total;
//       }

//       // 計算基礎分數
//       let score = enchantmentDef.weight * ench.level;

//       // 應用修正係數
//       const modifier = SCORE_MODIFIERS[enchantmentDef.name];
//       if (modifier) score = modifier(ench.level);

//       // 等級上限檢查
//       const maxLevel = enchantmentDef.maxLevel;
//       if (ench.level > maxLevel) {
//         console.warn(
//           `Overleveled 超過最大附魔 ${enchantmentDef.displayName}: ${ench.level} > ${maxLevel}`
//         );
//         score *= 0.5; // 超等級懲罰
//       }

//       // 最後調整
//       let enchScore = 10 + total + Math.round(score);
//       return enchScore;
//       // if (enchScore + 10 > 100) {
//       //   return 99;
//       // } else {
//       //   return enchScore + 10;
//       // }
//     }, 0);
//   } catch (error) {
//     console.error(
//       "Enchantment calculation failed 計算附魔分數函數出現錯誤:",
//       error
//     );
//     return 0;
//   }
// }

// // 最好的裝備優先級 計算函數
// function calculateBasePriority(item, category) {
//   if (!item || !item.name) return null; // 確保 item 存在

//   // 定義配置讀取位置
//   const Category = EQUIPMENT_CONFIG[category];

//   // 安全檢查
//   if (!Category?.materials || !Category?.materialBase || !Category?.orderBase)
//     return 0;

//   // 改進名稱解析算法
//   const baseName = item.name.replace("minecraft:", "");
//   const [materialPart, typePart] = baseName.split("_");

//   // 材質匹配邏輯
//   const material =
//     Category.materials.find((m) => baseName.startsWith(m)) || materialPart;

//   // 類型匹配邏輯
//   const type = Category.types.find((t) => baseName.endsWith(t)) || typePart;

//   // 計算分數
//   const materialScore =
//     (Category.materials.indexOf(material) + 1) * Category.materialBase; // 材料分數 越靠後分數越高
//   const typeScore =
//     (Category.types.length - Category.types.indexOf(type) + 1) * 1; // 類型分數 越靠前分數越高

//   return Category.orderBase + materialScore + typeScore;
// }
