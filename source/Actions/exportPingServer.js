async function exportPingServer(bot) {
  const mc = require("minecraft-protocol");
  const IP = process.env.MC_HOST;
  const PORT = process.env.MC_PORT;
  const serverOptions = { host: IP, port: PORT };
  const exportFolder = bot.Bot_Config.exportFolder;

  mc.ping(serverOptions, (err, response) => {
    if (err) {
      console.error("[pingServer] 失敗:", err);
      return;
    }

    if (response) {
      const playerList = response.players.sample;
      const description = response.description;
      bot.safeChat(
        `Server description: ${response.description}\n` +
          `🔎 Version: ${response.version.name}, ` +
          `Protocol: ${response.version.protocol}\n` +
          `🔎 Players: ${response.players.online}/${response.players.max}, ` +
          `ChatReports: ${response.preventsChatReports}`,
        `🔎`
      );
      console.log({ description });
      if (response.favicon) {
        exportServerIcon(response, exportFolder);
      }
    } else {
      bot.logTimer("[pingServer] 伺服器沒有回應 no response");
    }

    // 輸出 Server 圖片
    function exportServerIcon(response, exportFolder) {
      const IP = process.env.MC_HOST;
      const fs = require("fs");
      const path = require("path");

      // 處理文件路徑
      const serverIcon = response.favicon;
      const filePath = `./${exportFolder}/pingServer/favicon_${IP}.png`;
      const dir = path.dirname(filePath);

      // 原始的 data URL 字串（請根據實際情況替換）
      const dataUrl = serverIcon;
      // 移除 data URL 的前綴，取得純 base64 字串
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      // 將 base64 字串轉換為二進位 Buffer
      const imgBuffer = Buffer.from(base64Data, "base64");

      // 寫入檔案，這裡將圖片儲存為 favicon.png
      try {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, imgBuffer);
        bot.safeChat(`PingServer 縮圖已成功寫入：\n → ${filePath}`, `💾`);
        console.log(`[成功] PingServer: 伺服器縮圖已成功寫入 ${filePath}`);
      } catch (err) {
        bot.safeChat(`縮圖寫入失敗: ${err.message}`, `❌`);
        console.error(`[失敗] pingServer: 縮圖導出錯誤: \n${err.stack}`);
      }
    }
  });
}
module.exports = { exportPingServer };
