class Utils {
  constructor(bot) {
    this.bot = bot;
  }

  getEntityList(Category) {
    const arr = this.bot.registry.entitiesArray;
    return arr
      .filter(
        (entity) =>
          entity.category === Category &&
          entity.name &&
          typeof entity.name === "string"
      )
      .map((entity) => entity.name);
  }

  //  Filter Entity By Distance And Height
  /*
const setFilterArr = new Set(filterArr);
return;
Object.entries(bot.entities)
   .map(([_, entity]) => entity)
   .filter((e) => setFilterArr.has(e?.name));
*/

  filterNearEntities(nameFilter = [], maxDistance = 16, yRange = 3) {
    // 處理輸入參數，統一轉換為陣列
    const filterArr = Array.isArray(nameFilter)
      ? nameFilter
      : typeof nameFilter === "string"
      ? [nameFilter]
      : [];

    if (filterArr.length === 0) {
      return []; // 如果沒有有效的過濾條件，直接返回空陣列
    }

    const botPos = this.bot.entity.position;
    return (
      Object.values(this.bot.entities)
        // 階段一：預處理並緩存距離
        .map((entity) => ({
          entity,
          dx: Math.abs(entity.position.x - botPos.x),
          dz: Math.abs(entity.position.z - botPos.z),
          dy: entity.position.y - botPos.y,
        }))
        // 階段二：快速過濾
        .filter(({ dx, dz, dy, entity }) => {
          const isTarget = filterArr.some((name) => entity?.name === name);
          const inHorizontalRange = dx <= maxDistance && dz <= maxDistance;
          const inVerticalRange = Math.abs(dy) <= yRange;
          // 命名檢測
          const hasNamedMetadata = () => {
            try {
              const custom_name = entity.metadata?.[2] ?? null;
              return (
                custom_name !== null &&
                typeof custom_name === "object" &&
                "type" in custom_name &&
                "value" in custom_name
              );
            } catch {
              return false;
            }
          };
          return (
            isTarget &&
            inHorizontalRange &&
            inVerticalRange &&
            !hasNamedMetadata()
          );
        })
        // 階段三：精確計算並排序
        .map(({ entity, dx, dy, dz }) => {
          const distance = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
          entity.distance = distance; // 將距離數值存入實體對象
          return { entity, distance };
        })
        .filter(({ distance }) => distance <= maxDistance)
        .sort((a, b) => a.distance - b.distance)
        .map(({ entity }) => entity)
    ); // 最終返回純實體陣列
  }

  findBlockByName(blockName, options = {}) {
    const { maxDistance = 16, exactMatch = true, fuzzyMatch = true } = options;

    const searchConfig = {
      maxDistance,
      matching: (block) => {
        if (!block) return false;
        return (
          (exactMatch && block.name === blockName) ||
          (fuzzyMatch && block.name.includes(blockName))
        );
      },
    };

    return this.bot.findBlock(searchConfig);
  }

  findBlocksByArray(blockNames = [], options = {}) {
    const {
      maxDistance = 16,
      exactMatch = true,
      fuzzyMatch = true,
      count = 16, // 預設返回數量
    } = options;

    const searchConfig = {
      matching: (block) => {
        if (!block) return false;
        // 對陣列中的每個方塊名稱進行匹配
        return blockNames.some(
          (name) =>
            (exactMatch && block.name === name) ||
            (fuzzyMatch && block.name.includes(name))
        );
      },
      maxDistance,
      count,
    };

    return this.bot.findBlocks(searchConfig);
  }

  async gotoNear(pos, range = 3, timeout = 15000) {
    // 檢查目標位置是否有效
    try {
      const block = this.bot.blockAt(pos);
      if (!block) return false;
    } catch (error) {
      return false;
    }
    // 執行目標設定與尋路過程
    try {
      const { GoalNear } = this.bot.goals;
      const goal = new GoalNear(pos.x, pos.y, pos.z, range);
      const startTime = Date.now();
      // 前往目標 並且進行超時檢查
      await this.bot.pathfinder.setGoal(goal);
      await Promise.race([
        new Promise((resolve) => this.bot.once("goal_reached", resolve)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("尋路超時")), timeout)
        ),
      ]);
      const timeSpent = ((Date.now() - startTime) / 1000).toFixed(1);
      await this.bot.safeChat(`已到達，路程花了 ${timeSpent} 秒`, `✅`);
      return true;
    } catch (error) {
      // 處理尋路過程中的錯誤
      await this.bot.pathfinder.stop();
      const timeSpent = (timeOut / 1000).toFixed(0);

      if (error.message === "尋路超時") {
        await this.bot.safeChat(`尋路時間已超過 ${timeSpent} 秒，已停止`, `⛔`);
      } else {
        await this.bot.safeChat(`尋路過程出現錯誤: ${error.name}`, `⛔`);
      }
      // console.log(`${error.stack}`);
      console.logTimer("當前 Bot 狀態:", {
        position: this.bot.entity.position,
        onGround: this.bot.entity.onGround,
        isInWater: this.bot.entity.isInWater,
        isInLava: this.bot.entity.isInLava,
      });
      return false;
    }
  }
}

// 工廠函數
function utils(bot) {
  return new Utils(bot);
}

module.exports = { utils };
