// phate server 飛特伺服器 檢查是否進入區域聊天
module.exports = async function (bot) {
  // 如果 IP 不是飛特 就返回
  if (process.env.MC_HOST !== "mc.phate.io") {
    let serverIP =
      process.env.MC_HOST.split(".").slice(0, 2).join(".") + ".*.***";
    console.logTimer(
      `[phate.rc.checker] Module loaded. Bot not in the Phate Server. IP: ${serverIP}`
    );
    return;
  } else {
    console.logTimer(
      `[phate.rc.checker] Module loaded. Bot in the Phate Server try </rc> now.`
    );
    // 輸入 /rc 測試 是否已經在區域聊天
    await bot.waitForTicks(20);
    await bot.safeChat("/rc");
    bot.once("message", async (jsonMsg) => {
      // << 顯示離開 RC >> 所以再次輸入
      if (jsonMsg == "You leaved ranged chat mode") {
        console.logTimer("[phate.rc.checker] Do </rc> again.");
        await bot.waitForTicks(20);
        await bot.chat("/rc");
        console.logTimer(
          `[phate.rc.checker] <${bot.player.displayName}> entered ranged chat mode.`
        );
        await bot.waitForTicks(20);
        await bot.safeChat("Hello Phate world!");
        return;
      }
      // << 顯示已進入 RC >>
      else if (jsonMsg == "You entered ranged chat mode") {
        console.logTimer(
          `[phate.rc.checker] <${bot.player.displayName}> entered ranged chat mode.`
        );
        await bot.waitForTicks(20);
        await bot.safeChat("Hello Phate world!");
        return;
      }
      // << 顯示未知指令 RC >>
      else if (
        jsonMsg == "Unknown or incomplete command, see below for error"
      ) {
        // console.logTimer("[phate.rc.checker] Unknown or incomplete command.");
        return;
      }
      // 其餘狀況 列印不匹配訊息
      else {
        console.logTimer(`[phate.rc.checker] WTF you say??? <${jsonMsg}>\n`);
        console.log(`${JSON.stringify(jsonMsg, null, 2)}`);
        return;
      }
    });
  }
};
