// 初始化 pathfinder
async function initPathfinder(bot) {
  // 注入 pathfinder 模組
  const pathfinder = require("mineflayer-pathfinder").pathfinder;
  const Movements = require("mineflayer-pathfinder").Movements;
  const { goals } = require("mineflayer-pathfinder");

  // 定義參數
  const userPathSet = bot.Bot_Config.pathfinderSetting;
  const canScafBlocksName2ID = (nameArr) => {
    return nameArr
      .map((blockName) => {
        const lowerCaseName = blockName.toLowerCase().trim(); // 統一轉換為小寫匹配
        const block = bot.registry.itemsByName[lowerCaseName]; // 從註冊資料找到 ID
        return block ? block.id : null; // 找不到該名稱 返回 null
      })
      .filter((id) => id !== null); // 過濾掉 null 值;
  };

  // 預設設定檔
  const pathMoveSettings = {
    default: {
      canDig: true, // 尋路時禁用方塊破裂
      allow1by1towers: true, // 上升時不要建造 1x1 柱子
      canOpenDoors: false, // 可以開門 (有點BUG，不可靠)
      digCost: 1,
      placeCost: 1,
      liquidCost: 1,
      entityCost: 1,
      maxDropDown: 4,
      scafoldingBlocks: [28, 35],
    },
    profiles: {
      user: {
        canDig: userPathSet.canDig, // 尋路時禁用方塊破裂
        allow1by1towers: userPathSet.allow1by1towers, // 上升時不要建造 1x1 柱子
        canOpenDoors: userPathSet.canOpenDoors, // 可以開門 (有點BUG，不可靠)
        digCost: 10,
        placeCost: 10,
        scafoldingBlocks: canScafBlocksName2ID(userPathSet.canScafBlocksName),
      },
      dig: {
        canDig: true,
        digCost: 1,
        placeCost: 1,
        scafoldingBlocks: canScafBlocksName2ID(userPathSet.canScafBlocksName),
      },
    },
    applyProfileToMove: async function (profileName = "user", Movements) {
      // 防呆檢查
      if (!this.profiles[profileName])
        throw new Error(`[pathMove] 設定檔 ${profileName} 不存在`);

      // 混合作業邏輯 並
      const applyMovements = this.mergeMovements(profileName, Movements);
      return applyMovements;
    },
    // 可擴充的合併邏輯
    mergeMovements: function (profileName, Movements) {
      const mergedSettings = {
        canDig: this.profiles[profileName].canDig ?? this.default.canDig,
        allow1by1towers:
          this.profiles[profileName].allow1by1towers ??
          this.default.allow1by1towers,
        canOpenDoors:
          this.profiles[profileName].canOpenDoors ?? this.default.canOpenDoors,
        digCost: this.profiles[profileName].digCost ?? this.default.digCost,
        placeCost:
          this.profiles[profileName].placeCost ?? this.default.placeCost,
        liquidCost:
          this.profiles[profileName].liquidCost ?? this.default.liquidCost,
        entityCost:
          this.profiles[profileName].entityCost ?? this.default.entityCost,
        maxDropDown:
          this.profiles[profileName].maxDropDown ?? this.default.maxDropDown,
        scafoldingBlocks:
          this.profiles[profileName].scafoldingBlocks ??
          this.default.scafoldingBlocks,
        // 其他參數依此類推...
      };
      const mergedMovements = Movements;
      Object.assign(mergedMovements, mergedSettings);
      return mergedMovements;
    },
  };

  // 將設定組 綁定到 bot 身上
  bot.Bot_Config.pathMoveSettings = pathMoveSettings;

  // 主邏輯
  setPathfinder(bot, pathfinder, Movements, goals);
  async function setPathfinder(bot, pathfinder, Movements, goals) {
    const pathMoveSets = bot.Bot_Config.pathMoveSettings;
    // 將 pathfinder 外掛載入到 bot
    await bot.loadPlugin(pathfinder);
    // 創建 初始動作設定
    const userMovements = new Movements(bot);
    pathMoveSets.applyProfileToMove("user", userMovements);
    await bot.pathfinder.setMovements(userMovements);
    // 將 goals 掛載到 bot
    bot.goals = goals;
  }
}

module.exports = {
  initPathfinder,
};
