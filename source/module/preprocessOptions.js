class PreprocessError extends Error {
  constructor(position, rawValue, reason) {
    super(`參數預處理失敗 (位置 ${position}): ${reason}`);
    this.detail = { position, rawValue, reason };
  }
}

// 科學記號判斷
const isScientificNotation = (v) =>
  /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(v.trim());

// 百分比判斷
const isPercentage = (v) => /^[-+]?(?:\d+\.?\d*|\.\d+)%$/.test(v.trim());

// 步驟1. 防禦性數字轉換(支援百分比)
const safeNumberConvert = (str) => {
  const trimmed = str.trim();

  // 空字串處理
  if (trimmed === "") return NaN;

  // 百分比處理
  if (isPercentage(trimmed)) {
    const numPart = trimmed.replace(/%/g, "");
    const num = Number(numPart) / 100;
    return Number(numPart) / 100;
  }

  // 特殊零值處理
  if (/^[-+]?0+(?:\.0+)?(?:[eE][-+]?0+)?$/.test(trimmed)) return 0;

  // 科學記號處理
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
};

// 步驟2. 數字型參數處理過程
function processNumberType(rawValue) {
  const num = safeNumberConvert(rawValue);

  // NaN 處理
  if (Number.isNaN(num)) {
    return processors.zero();
  }

  // 原始值檢查 明確浮點數
  const isExplicitFloat = rawValue.includes(".") || /[eE]/.test(rawValue);

  // 零值判斷（包含 -0）
  if (num === 0 || Object.is(num, -0)) {
    return processors.zero();
  }

  // 整數判斷
  if (Number.isInteger(num)) {
    return num > 0
      ? processors.positiveInteger(num)
      : processors.negativeInteger(num);
  }

  // 非顯示浮點數判斷
  if (!isExplicitFloat) {
    return num > 0
      ? processors.positiveInteger(num)
      : processors.negativeInteger(num);
  }

  // 浮點數分支
  return num > 0
    ? processors.positiveFloat(num)
    : processors.negativeFloat(num);
}

// 步驟3. 嚴格布林判斷函數
function isStrictBoolean(str) {
  const lowerStr = str.trim().toLowerCase();
  return lowerStr === "true" ? true : lowerStr === "false" ? false : undefined;
}

// 類型處理器
const processors = {
  string: (value) => ({
    type: "string",
    typeName: "字串參數",
    value: value.trim().replace(/\s+/g, " "),
  }),
  positiveInteger: (value) => ({
    type: "positiveInteger",
    subType: "number",
    typeName: "正整數",
    value,
  }),
  negativeInteger: (value) => ({
    type: "negativeInteger",
    subType: "number",
    typeName: "負整數",
    value,
  }),
  zero: () => ({
    type: "zero",
    subType: "number",
    typeName: "零值",
    value: 0,
  }),
  positiveFloat: (value) => ({
    type: "positiveFloat",
    subType: "number",
    typeName: "正浮點數",
    value,
  }),
  negativeFloat: (value) => ({
    type: "negativeFloat",
    subType: "number",
    typeName: "負浮點數",
    value,
  }),
  percentage: (value) => ({
    type: "percentage",
    subType: "number",
    typeName: "百分比值",
    value: Number(value.toFixed(6)),
    original: value * 100 + "%",
  }),
  boolean: (value) => ({
    type: "boolean",
    typeName: "布林值",
    value: value,
    original: value.toString(), // 保留原始字符串表示
  }),
  object: (value) => ({
    type: "object",
    typeName: "對象",
    value: Object.entries(value).reduce((acc, [k, v]) => {
      if (k !== "__proto__") acc[k] = v;
      return acc;
    }, {}),
  }),
};

function preprocessOptions(options) {
  return options.map((opt, index) => {
    try {
      // 優先處理對象類型
      if (typeof opt === "object" && opt !== null) {
        return processors.object(opt);
      }

      const strValue = String(opt);

      // NaN 特殊處理
      if (strValue.toLowerCase() === "nan") {
        return processors.zero();
      }

      // 步驟1：百分比優先
      if (isPercentage(strValue)) {
        const numValue = safeNumberConvert(strValue);
        if (!Number.isNaN(numValue)) {
          return processors.percentage(numValue);
        }
      }

      // 步驟2：科學記號數字
      if (isScientificNotation(strValue)) {
        const numResult = processNumberType(strValue);
        if (numResult.type === "zero" || strValue === "0") {
          return processors.zero();
        } else {
          return numResult;
        }
      }

      // 步驟3：嚴格布林判斷（僅接受 true/false）
      const boolValue = isStrictBoolean(strValue);
      if (boolValue !== undefined) {
        return processors.boolean(boolValue);
      }

      // 步驟4：默認字符串處理
      return processors.string(strValue);
    } catch (err) {
      throw new PreprocessError(index + 1, opt, err.message || "未知錯誤");
    }
  });
}

// 測試工具函數
function runTests() {
  const testCases = [
    // 數字應保持為數字類型
    { input: "1", expected: { type: "positiveInteger", value: 1 } },
    { input: "1.0", expected: { type: "positiveInteger", value: 1.0 } },
    { input: "0", expected: { type: "zero", value: 0 } },
    { input: "0.0", expected: { type: "zero", value: 0 } },
    { input: "+0", expected: { type: "zero", value: 0 } },
    { input: "-0", expected: { type: "zero", value: 0 } },
    { input: "0.000", expected: { type: "zero", value: 0 } },
    { input: "0e0", expected: { type: "zero", value: 0 } },
    { input: "-0.00e+0", expected: { type: "zero", value: 0 } },
    { input: "NaN", expected: { type: "zero", value: 0 } },

    // 嚴格布林判斷
    { input: "true", expected: { type: "boolean", value: true } },
    { input: "TRUE", expected: { type: "boolean", value: true } },
    { input: "false", expected: { type: "boolean", value: false } },
    { input: "FaLsE", expected: { type: "boolean", value: false } },

    // 非嚴格布林應轉為字符串
    { input: "yes", expected: { type: "string", value: "yes" } },
    { input: "no", expected: { type: "string", value: "no" } },
    { input: "on", expected: { type: "string", value: "on" } },
    { input: "off", expected: { type: "string", value: "off" } },
    { input: "123true", expected: { type: "string", value: "123true" } },
    { input: "true123", expected: { type: "string", value: "true123" } },

    // 其他案例
    { input: "2e3", expected: { type: "positiveInteger", value: 2000 } },
    { input: "-5e2", expected: { type: "negativeInteger", value: -500 } },
    { input: "123e-2", expected: { type: "positiveFloat", value: 1.23 } },
    { input: "9.99", expected: { type: "positiveFloat", value: 9.99 } },
    { input: "-3.14", expected: { type: "negativeFloat", value: -3.14 } },
    { input: ".5", expected: { type: "positiveFloat", value: 0.5 } },
    { input: "-.3", expected: { type: "negativeFloat", value: -0.3 } },
    { input: "50%", expected: { type: "percentage", value: 0.5 } },
    { input: "-25.5%", expected: { type: "percentage", value: -0.255 } },
    { input: "100%", expected: { type: "percentage", value: 1.0 } },
    { input: ".5%", expected: { type: "percentage", value: 0.005 } },
    { input: "200%", expected: { type: "percentage", value: 2.0 } },
    { input: "text", expected: { type: "string", value: "text" } },
    { input: "%30", expected: { type: "string", value: "%30" } }, // 無效格式
    { input: "50%%", expected: { type: "string", value: "50%%" } }, // 無效格式
  ];

  testCases.forEach((tc, idx) => {
    try {
      const result = preprocessOptions([tc.input])[0];

      // 修改判斷邏輯
      const typeMatch = result.type === tc.expected.type;
      let valueMatch = true;

      // 僅在非字符串類型時檢查數值精度
      if (result.type !== "string") {
        valueMatch = Math.abs(result.value - tc.expected.value) < 0.0001;
      } else {
        // 字符串類型直接比較原始值
        valueMatch = result.value === tc.expected.value;
      }

      console.log(
        `Test ${idx} :`,
        typeMatch && valueMatch ? "✅" : "❌",
        `Got ${result.type} [${tc.input}] => (${result.value})`
      );
    } catch (e) {
      console.log(`Test ${idx} [${tc.input}]: ❌ Error - ${e.message}`);
    }
  });
  console.log(``);
}

// 執行測試
// runTests();

module.exports = { preprocessOptions, runTests };
