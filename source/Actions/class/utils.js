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
}

// 工廠函數
function utils(bot) {
  return new Utils(bot);
}

module.exports = { utils };
