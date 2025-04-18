const fs = require("fs");
const path = require("path");

async function exportRegistryAuto(bot, dataType, options = {}) {
  const {
    customProcessor = null, // 自訂處理函數
    indexGenerators = [], // 索引生成器陣列
    filter = () => true, // 預設過濾器
  } = options;
  const exportFolder = bot.Bot_Config.exportFolder;

  try {
    // 驗證 registry 存在性
    if (!bot.registry.hasOwnProperty(dataType)) {
      throw new Error(`registry 不存在 ${dataType} 屬性`);
    }

    const rawData = bot.registry[dataType];
    let processedData = rawData;

    // 套用自訂處理邏輯
    if (typeof customProcessor === "function") {
      processedData = customProcessor(rawData);
    }

    // 自動判斷資料類型進行標準化處理
    const dataTypeFlag = detectDataType(rawData);
    const standardizedData = standardizeData(processedData, dataTypeFlag);

    // 自動生成索引
    const autoIndexes = generateAutoIndexes(standardizedData, indexGenerators);

    // 組合輸出結構
    const output = {
      meta: {
        game_version: bot.version,
        data_type: dataType,
        data_structure: dataTypeFlag,
        entry_count: getEntryCount(standardizedData),
        generated_at: new Date().toISOString(),
      },
      indexes: autoIndexes,
      data: standardizedData.filter(filter), // 套用過濾條件
    };

    // 產生檔案內容
    const fileContent = JSON.stringify(output, serializer, 2);
    const filename = `RegistryExport_${dataType}_${bot.version}`;
    const filePath = `./${exportFolder}/exportRegistryAuto/${filename}.json`;
    const dir = path.dirname(filePath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, fileContent);
    await bot.safeChat(`Registry 資料已成功導出 →\n ${filePath}`, `💾`);
    console.log(`[成功] Registry: ${dataType} 已成功導出 ${filePath}`);
    return true;
  } catch (err) {
    await bot.safeChat(`Registry 資料導出錯誤: ${err.message}`, `❌`);
    console.error(`[失敗] Registry: ${dataType} 導出錯誤: \n${err.stack}`);
    return false;
  }
}

// 輔助函數 ==============================================

// 自動檢測資料類型
function detectDataType(data) {
  if (Array.isArray(data)) return "array";
  if (data instanceof Map) return "map";
  if (data instanceof Set) return "set";
  if (Buffer.isBuffer(data)) return "buffer";
  if (data && typeof data === "object") return "object";
  return "primitive";
}

// 取得陣列內元素的數量
function getEntryCount(data) {
  return data.length || 0; // 適用於已標準化為陣列的資料
}

// 資料標準化處理
function standardizeData(data, type) {
  switch (type) {
    case "map":
      return Array.from(data.entries());
    case "set":
      return Array.from(data.values());
    case "buffer":
      return data.toString("base64");
    case "object":
      return Object.entries(data).map(([key, value]) => ({ key, value }));
    default:
      return data;
  }
}

// 自動索引生成系統
function generateAutoIndexes(data, customGenerators) {
  const indexes = {};

  try {
    // 預設索引只處理陣列型資料
    if (Array.isArray(data) && data.length > 0) {
      const numericalKeys = detectNumericalFields(data);

      numericalKeys.forEach((key) => {
        if (data.some((item) => item[key] !== undefined)) {
          indexes[`auto_${key}_range`] = createRangeIndex(data, key);
        }
      });
    }
  } catch (err) {
    console.error("[索引生成警告]", err.message);
  }

  // 執行自訂索引生成器
  customGenerators.forEach((generator) => {
    try {
      Object.assign(indexes, generator(data));
    } catch (genErr) {
      console.error("[自訂索引錯誤]", genErr.message);
    }
  });

  return indexes;
}

// 數值型字段檢測函數
function detectNumericalFields(data) {
  if (!Array.isArray(data) || data.length === 0) return [];

  const sample = data[0];
  const excludeFields = new Set(["id", "internalId"]); // 需排除的字段名

  return Object.keys(sample).filter((key) => {
    return (
      !excludeFields.has(key) &&
      typeof sample[key] === "number" &&
      !isNaN(sample[key])
    );
  });
}

// 範圍索引建立函數
function createRangeIndex(data, keyName) {
  const ranges = {
    "< 0.5": [],
    "< 1.0": [],
    "< 1.8": [],
    "< 2.0": [],
    "< 16": [],
    "< 64": [],
    "64+": [],
  };

  data.forEach((item) => {
    const value = item[keyName];
    if (value >= 0 && value < 0.5) {
      ranges["< 0.5"].push(item.name || item.id);
    } else if (value >= 0.5 && value < 1) {
      ranges["< 1.0"].push(item.name || item.id);
    } else if (value >= 1 && value < 1.8) {
      ranges["< 1.8"].push(item.name || item.id);
    } else if (value >= 1.8 && value < 2) {
      ranges["< 2.0"].push(item.name || item.id);
    } else if (value >= 2 && value < 16) {
      ranges["< 16"].push(item.name || item.id);
    } else if (value >= 16 && value < 64) {
      ranges["< 64"].push(item.name || item.id);
    } else {
      ranges["64+"].push(item.name || item.id);
    }
  });

  // 過濾空範圍
  return Object.fromEntries(
    Object.entries(ranges).filter(([_, items]) => items.length > 0)
  );
}

// JSON 序列化處理器
function serializer(key, value) {
  if (value === undefined) return null;
  if (value instanceof RegExp) return value.toString();
  if (typeof value === "function") return "Function";
  return value;
}

module.exports = { exportRegistryAuto };
