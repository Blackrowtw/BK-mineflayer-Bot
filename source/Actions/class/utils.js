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
    const {
      r = 16, // maxDistance 的縮寫
      m = null, // metadata 的縮寫
      p = null, // point 的縮寫
      exactMatch = true,
      fuzzyMatch = true,
      maxDistance = r,
      metadata = m,
      point = p,
    } = options;

    const searchConfig = {
      point: point,
      maxDistance: maxDistance,
      matching: (block) => {
        if (!block) return false;

        const nameMatch =
          (exactMatch && block.name === blockName) ||
          (fuzzyMatch && block.name.includes(blockName));

        if (metadata !== null) {
          return nameMatch && block.metadata === metadata;
        }

        return nameMatch;
      },
    };

    return this.bot.findBlock(searchConfig);
  }

  findBlocksByNameArray(blockNames = [], options = {}) {
    const {
      r = 16, // maxDistance 的縮寫
      c = 16, // count 的縮寫
      m = null, // metadata 的縮寫
      p = null, // point 的縮寫
      exactMatch = true,
      fuzzyMatch = true,
      maxDistance = r,
      count = c,
      metadata = m,
      point = p,
    } = options;

    const searchConfig = {
      maxDistance: maxDistance,
      count: count,
      point: point,
      matching: (block) => {
        if (!block) return false;

        const nameMatch = blockNames.some(
          (name) =>
            (exactMatch && block.name === name) ||
            (fuzzyMatch && block.name.includes(name))
        );

        if (metadata !== null) {
          return nameMatch && block.metadata === metadata;
        }

        return nameMatch;
      },
    };

    return this.bot.findBlocks(searchConfig);
  }

  async findBlockWithRule(blockNameA, blockNameB, rule = "top", range = 16) {
    // 定義檢查方向
    const directions = {
      top: [{ x: 0, y: 1, z: 0 }],
      bottom: [{ x: 0, y: -1, z: 0 }],
      side: [
        { x: 1, y: 0, z: 0 }, // 東
        { x: -1, y: 0, z: 0 }, // 西
        { x: 0, y: 0, z: 1 }, // 南
        { x: 0, y: 0, z: -1 }, // 北
      ],
      near: [
        { x: 0, y: 1, z: 0 }, // 上
        { x: 0, y: -1, z: 0 }, // 下
        { x: 1, y: 0, z: 0 }, // 東
        { x: -1, y: 0, z: 0 }, // 西
        { x: 0, y: 0, z: 1 }, // 南
        { x: 0, y: 0, z: -1 }, // 北
      ],
    };

    // 檢查參數是否有效
    if (!this.bot.registry.blocksByName[blockNameA]) {
      return null;
    }
    if (!this.bot.registry.blocksByName[blockNameB]) {
      return null;
    }

    // 獲取要檢查的方向陣列
    const checkDirections = directions[rule.toLowerCase()] || directions.top;

    try {
      return this.bot.findBlock({
        matching: this.bot.registry.blocksByName[blockNameA].id,
        maxDistance: range,
        useExtraInfo: (block) => {
          if (!block) return false;

          // 檢查指定方向是否有符合條件的方塊
          return checkDirections.some((dir) => {
            const checkPos = block.position.offset(dir.x, dir.y, dir.z);
            const checkBlock = this.bot.blockAt(checkPos);
            return checkBlock && checkBlock.name === blockNameB;
          });
        },
      });
    } catch (error) {
      console.log(`[utils] findBlockWithRule 錯誤: ${error.message}`);
      return null;
    }
  }

  async equipItemByName(itemName) {
    try {
      const items = this.bot.inventory.items(); // 取得背包中的所有物品
      const item = items.find((item) => item.name === itemName);
      if (!item) return false; // 如果找不到物品，返回 false
      await this.bot.equip(this.bot.registry.itemsByName[itemName].id, "hand");
      return true;
    } catch (e) {
      console.log(`[utils] equipItemByName Error(${itemName}): ${e.message}`);
      return false;
    }
  }

  async moveItemsByGUI(gui, itemName, keepCount = 0) {
    const items = this.bot.inventory
      .items()
      .filter((item) => item.name === itemName);

    // 如果沒有指定物品，直接返回 false
    if (!items || items.length === 0) return false;

    try {
      for (const item of items) {
        const count = item.count;
        if (keepCount > 0) {
          if (count <= keepCount) {
            keepCount -= count;
            continue;
          }
          await gui.deposit(item.type, null, count - keepCount);
          keepCount = 0;
        } else {
          await gui.deposit(item.type, null, count);
        }
        await this.bot.waitForTicks(2);
      }
      return true;
    } catch (error) {
      console.log(
        `[utils] moveItemsByGUI 存放 ${itemName} 時發生錯誤: ${error.message}`
      );
      return false;
    }
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
      await this.bot.pathfinder.setGoal(null);
      await this.bot.lookAt(pos);
      await this.bot.waitForTicks(4);
      // 前往目標 並且進行超時檢查
      await this.bot.pathfinder.setGoal(goal);
      await Promise.race([
        new Promise((resolve) => this.bot.once("goal_reached", resolve)),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("尋路超時")), timeout)
        ),
      ]);
      return true;
    } catch (error) {
      // 處理尋路過程中的錯誤
      await this.bot.pathfinder.stop();
      const timeSpent = (timeout / 1000).toFixed(0);
      if (error.message === "尋路超時") {
        await this.bot.safeChat(`[utils] gotoNear 超時 ${timeSpent} 秒`, `⛔`);
      } else {
        await this.bot.safeChat(`[utils] gotoNear 錯誤: ${error.name}`, `⛔`);
      }
      // console.log(`${error.stack}`);
      console.logTimer("當前 Bot 狀態:", {
        position: this.bot.entity.position,
        onGround: this.bot.entity.onGround,
        isInWater: this.bot.entity.isInWater,
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
