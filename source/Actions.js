const fs = require("fs");
const path = require("path");
const { resetANSI, BLACK } = require("./escapeCodeANSI.js");

// 定義 Actions 類
class Actions {
  constructor(bot) {
    // debug 模式開關
    this.debug = false;
    // this.debug = true;

    // 動態加載 ./module/Action/ 資料夾中的模組
    this._dynamicLoadActions();
  }

  // 動態加載 ./module/Action/ 資料夾中的模組
  _dynamicLoadActions() {
    const actionDir = path.join(__dirname, "Actions"); // 獲取路徑 檔案來源的資料夾
    let loadedCount = 0; // 改用 loadedCount 記錄實際載入的模組數
    let errorCount = 0;
    const errorList = [];

    // 遞歸掃描所有.js文件（含子目錄）
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // 遞歸掃描子目錄，排除 _DATA 和 _dev 目錄
          if (!["_DATA", "_dev"].includes(entry.name)) {
            scanDir(fullPath);
          }
        } else if (
          // 檢查是否為.js檔案，且不以 _ 開頭
          entry.isFile() &&
          entry.name.endsWith(".js") &&
          !entry.name.startsWith("_")
        ) {
          try {
            const moduleKey = path.basename(entry.name, ".js");
            const actionModule = require(fullPath);

            const actionFunc =
              typeof actionModule === "function"
                ? actionModule
                : actionModule[moduleKey];

            if (!actionFunc) {
              errorCount++;
              errorList.push({
                file: entry.name,
                error: `導出的函數名 '${moduleKey}' 與檔案名不符合或未找到`,
                exports: Object.keys(actionModule),
              });
            } else {
              this[moduleKey] = async (...args) => actionFunc(...args);
              loadedCount++; // 只在成功載入時增加計數
            }
          } catch (error) {
            errorCount++;
            errorList.push({
              file: entry.name,
              error: error.message,
            });
          }
        }
      });
    };

    scanDir(actionDir);

    // 排除掉 debug 和 _dynamicLoadActions 方法
    const actionsList = Object.keys(this).filter(
      (key) => key !== "debug" && key !== "_dynamicLoadActions"
    );

    // 基本資訊永遠都會輸出
    console.log(
      `${BLACK}[Actions] Loading completed. ` +
        `Files: ${loadedCount}/${loadedCount + errorCount}, ` +
        `Total Actions: ${actionsList.length}${resetANSI}`
    );
    if (errorCount > 0) {
      const errorFiles = errorList.map((item) => item.file).join(", ");
      console.log(
        `${BLACK}[Actions] Error Files(${errorCount}): ${errorFiles}${resetANSI}`
      );
    }

    // 詳細錯誤資訊只在 debug 模式下輸出
    if (this.debug) {
      console.log(`Loaded actions(${actionsList.length}):`, actionsList);
      if (errorCount > 0) {
        console.log(`[Actions] Error details(${errorCount}):`);
        errorList.forEach(({ file, error, exports }) => {
          console.log(`- ${file}: ${error}`);
          if (exports) {
            console.log(`  Available exports:`, exports);
          }
        });
      }
    }
  }
}

module.exports = { Actions };
