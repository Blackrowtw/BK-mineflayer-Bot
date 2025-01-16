// 注入 fs 模組 (處理檔案存取)
const fs = require("fs");
// 注入 path 模組 (處理檔案路徑)
const path = require("path");
// 讀取 .env 環境變數  (保護敏感資料)
require("dotenv").config();

// 環境引數載入並確認合法性
async function envLoader() {
  let env;
  try {
    env = process.env.ENV_SEVER_SELECTOR;
    if (!env || env.trim() === "") {
      throw new Error(
        `ENV_SEVER_SELECTOR="${env}" is undefined or blank. Please check the <.env> file`
      );
    }
  } catch (error) {
    console.error(`[.env] Something wrong... Now try using <.env.local> file.`);
    console.log(`[.env] Error: ${error.message}`);
    env = "local";
  }

  // 使用相對於根目錄的路徑
  const envPath = path.resolve(process.cwd(), `.env.${env}`); // 這裡會指向 app.js 根目錄的 .env 或 .env.local

  if (!fs.existsSync(envPath)) {
    console.error(
      `[.env] File <${envPath}> does not exist. Now try using <.env.local> file.`
    );
    require("dotenv").config({
      path: path.resolve(process.cwd(), ".env.local"),
    });
  } else {
    require("dotenv").config({ path: envPath });
  }
}

module.exports = { envLoader };
