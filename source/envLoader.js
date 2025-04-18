const fs = require("fs"); // 注入 fs 模組 (處理檔案存取)
const path = require("path"); // 注入 path 模組 (處理檔案路徑)

// 文字顏色 ANSI 控制碼常量
const { resetANSI, BLACK } = require("./escapeCodeANSI.js");

async function envLoader() {
  const rootFolder = path.basename(process.cwd());
  try {
    // 優先加載通用 .env 文件
    require("dotenv").config();

    // 獲取環境選擇器
    let env = process.env.ENV_SEVER_SELECTOR;

    // 檢查環境選擇器合法性
    if (!env || env.trim() === "") {
      throw new Error(
        `ENV_SEVER_SELECTOR is undefined or blank. Check main .env file. Fallback to 'sample'`
      );
    }
    env = env.trim();

    // 動態加載指定環境文件 這裡會指向 index.js 根目錄的 .env 或 .env.sample

    const envPath = path.resolve(process.cwd(), `.env.${env}`);
    if (!fs.existsSync(envPath)) {
      throw new Error(`Env file not found: <./${rootFolder}/.env.${env}> `);
    }

    // 覆蓋式加載 (後加載的優先)
    require("dotenv").config({
      path: envPath,
      override: true,
    });

    // 調試日誌
    const successMsg = `Environment variables loaded successfully!`;

    if (typeof console.logTimer === "function") {
      console.logTimer(successMsg);
    } else {
      console.log(`[envLoader] ${successMsg}`);
    }
    console.log(
      `${BLACK}[envLoader] By base file </.env> and overlay </.env.${env}>${resetANSI}`
    );
  } catch (error) {
    console.error(`${BLACK}[envLoader] Error: ${error.message}${resetANSI}`);

    // 緊急回退到 .env.sample
    const fallbackPath = path.resolve(process.cwd(), ".env.sample");
    if (fs.existsSync(fallbackPath)) {
      require("dotenv").config({ path: fallbackPath });
      console.warn(
        `${BLACK}[envLoader] Fallback to <./${rootFolder}/.env.sample>${resetANSI}`
      );
      return; // 回退成功後正常返回
    }

    // 無可用回退文件時拋出致命錯誤
    const criticalError = new Error(`
      [envLoader] >> Fatal error! : 
      - Error: ${error.message}
      - The fallback file also does not exist.
      -  <./${rootFolder}/.env.sample>`);
    criticalError.name = "EnvironmentLoadingFailure";
    throw criticalError; // 觸發主程序未捕獲異常機制
  }
}

module.exports = { envLoader };
