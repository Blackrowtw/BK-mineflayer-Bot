// 文字顏色 ANSI 控制碼常量
const { resetANSI, BOLD_RED, BOLD_MAGENTA } = require("../escapeCodeANSI.js");

const fs = require("fs"); // 注入 fs 模組 (處理檔案存取)
const path = require("path"); // 注入 path 功能 (處理檔案路徑)

// Bot 被踢出
async function botOnKicked(bot) {
  // 初始化變量
  const mcData = bot.mcData;

  bot.on("kicked", (reason) => {
    bot.logTimer(`${BOLD_RED}[Trigger]${resetANSI} "kicked" Event.`); // debug 用
    // console.log("[kicked] Parsing NBT:", JSON.stringify(reason, null, 2)); // Debug用 原始輸出
    const kickMsg = parseNBT(reason);
    const transMsg = mcData.language[parseNBT(reason)];

    // 如果消息以 "This server requires" 開頭，拼接上 "額外的mod"
    const finalKickMsg = kickMsg.startsWith("This server requires")
      ? `${kickMsg}extra mods.` //, plz contact your server administrator
      : kickMsg;

    bot.logTimer(
      `[bot.on-kick] Bot been ${BOLD_MAGENTA}kicked${resetANSI}. reason: [ ${
        transMsg ? transMsg : finalKickMsg
      } ]`
    );

    const filePath = `./_log/bot-errors.log`;
    const dir = path.dirname(filePath);
    const kickedTime = new Date().toISOString();
    const dividerLine =
      `--------------\n` +
      `[bot.on.kicked] >> 👟 ${kickMsg}\n` +
      `--------------`;
    const kickedReason = `${transMsg ? transMsg : finalKickMsg}`;
    const rawKickMsg = JSON.stringify(reason, null, 2);
    const kickedLog =
      `\n${dividerLine}\n` +
      `[${kickedTime}] >> Kick_Reason: ${kickedReason}\n` +
      `Raw reason: ${rawKickMsg}\n`;

    // 踢除原因到檔案
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(filePath, kickedLog);

    // 將 NBT 結構轉換為人類可讀的訊息
    function parseNBT(nbt) {
      if (!nbt) return ""; // 如果是空值，返回空字串

      // 如果是字符串類型，直接返回值
      if (typeof nbt === "string") return nbt;

      // 如果是 { type: 'string', value: '...' } 格式，返回 value
      if (nbt.type === "string" && nbt.value) {
        return nbt.value;
      }

      // 如果是 list 類型，遞歸處理每一個元素，並且拼接成一個字符串
      if (nbt.type === "list" && Array.isArray(nbt.value?.value)) {
        return nbt.value.value.map(parseNBT).join(""); // 遞歸處理每個元素並拼接
      }

      // 如果是 compound 類型，遞歸處理每個鍵值對
      if (nbt.type === "compound" && typeof nbt.value === "object") {
        let result = "";

        // 處理 text 字段
        if (nbt.value.text && nbt.value.text.type === "string") {
          result += nbt.value.text.value; // 將文本內容拼接到結果
        }

        // 處理 extra 字段
        if (
          nbt.value.extra &&
          nbt.value.extra.type === "list" &&
          Array.isArray(nbt.value.extra.value?.value)
        ) {
          for (let key in nbt.value.extra.value.value) {
            if (
              key === "" &&
              nbt.value.extra.value.value.value[key].text.type === "string"
            ) {
              result += parseNBT(
                nbt.value.extra.value.value.value[key].text.value
              ); // 遞歸解析其他部分
            }
          }
          result += nbt.value.extra.value.value.map(parseNBT).join(""); // 遞歸解析 extra 列表
        }

        // 處理 translate 字段
        if (nbt.value.translate && nbt.value.translate.type === "string") {
          result += nbt.value.translate.value; // 將文本內容拼接到結果
        }

        return result; // 返回拼接後的結果
      }

      return ""; // 如果是其他未知類型，返回空字符串
    }
  });
}

module.exports = { botOnKicked };
