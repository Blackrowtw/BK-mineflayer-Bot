// 初始化 mineflayerViewer
async function initMineflayerViewer(bot) {
  const isEnabled = bot.Bot_Config.viewerSetting.isEnabled;
  const configPort = bot.Bot_Config.viewerSetting.port;
  if (!isEnabled || isEnabled !== true) return; // 如果未啟用，則返回

  fixViewerLogOutput();
  let viewerServer = null;
  viewerServer = require("prismarine-viewer").mineflayer;
  bot.mineflayerViewer = viewerServer;
  await bot.mineflayerViewer(bot, { firstPerson: true, port: configPort });

  // 監聽事件處理
  const waitForTicks = bot.Bot_Config.waitForTicks || 60;
  let clickBlock = null;
  let clickGoal = null;
  let clickBox = [];
  let lastClickTime = 0;
  const throttleDelay = 1000; // 設定 2 秒的節流延遲

  bot.viewer.on("blockClicked", async (block, face, button) => {
    if (button == 2) return; // 0 - left click , 1 - middel click , 2 -  right click
    if (clickBlock !== null) return;

    const now = Date.now(); // 綁定當前時間 檢查是否在節流時間內
    if (now - lastClickTime < throttleDelay) return; // 如果在節流時間內，直接返回
    lastClickTime = now; // 更新最後點擊時間

    clickBlock = block; // 綁定方塊資料

    // 清除舊的框線
    if (clickBox.length > 0) {
      bot.viewer.erase("box");
      clickBox = [];
    }

    clickBox = createBoxEdges(clickBlock.position); // 產生新的框線點位
    bot.viewer.drawLine("box", clickBox, 0xff0000); // 繪製框線 // 紅色

    if (button == 0) {
      if (clickGoal == null) {
        const pos = clickBlock.position;
        const { GoalNear } = bot.goals;
        clickGoal = new GoalNear(pos.x, pos.y, pos.z, 0);
        try {
          await bot.pathfinder.setGoal(clickGoal);
          await bot.safeChat(
            `Viewer 點擊了方塊 ${
              clickBlock.displayName
            } 前往位置 ${pos.round()} ...`,
            `🖱`
          );
          // 使用 Promise.race 來實現超時機制
          await Promise.race([
            new Promise((resolve) => bot.once("goal_reached", resolve)),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("時間超時，尋路停止")),
                throttleDelay * 2
              )
            ),
          ]);
        } catch (error) {
          await bot.pathfinder.stop(); // 立即停止 當前的所有動作
          if (!bot.canSeeBlock(clickBlock)) {
            await bot.lookAt(clickBlock.position);
          }
        }
        clickGoal = null;
        await bot.pathfinder.setGoal(clickGoal);
      }
    }

    if (button == 1) {
      // console.log({ clickBlock }); //顯示方塊資料
      await bot.safeChat(
        `Viewer 選擇了方塊 ${clickBlock.displayName} 位置在 ${clickBlock.position}`,
        `🖱`
      );
      await bot.waitForTicks(waitForTicks);
      await bot.lookAt(clickBlock.position);
    }
    clickBlock = null; // 清除上一個方塊的資訊
    // bot.pathfinder.setMovements(defaultMove);
    // bot.pathfinder.setGoal(new GoalBlock(p.x, p.y, p.z));
  });
}

// 檢測 console.log 輸出 並替換文字
function fixViewerLogOutput() {
  const originalConsoleLog = console.log;

  console.log = new Proxy(originalConsoleLog, {
    apply(target, thisArg, args) {
      const [message] = args;

      // 檢測目標日誌格式
      if (
        typeof message === "string" &&
        message.includes("Prismarine viewer")
      ) {
        // 提取 port 並重構訊息
        const port = message.match(/:(\d+)/)?.[1];
        const modified = `Prismarine viewer web server running on \x1b[34mhttp://localhost:${port}/\x1b[0m`;

        // 立即恢復原始 console.log
        console.log = originalConsoleLog;

        // 輸出修改後內容
        return originalConsoleLog.call(thisArg, modified);
      }

      // 非目標日誌直接放行
      return Reflect.apply(target, thisArg, args);
    },
  });
}

// 新增繪製立方體框線的函數
function createBoxEdges(position) {
  const points = [];

  // 取得方塊的最小點座標（方塊的西南下角）
  const minPoint = {
    x: Math.floor(position.x),
    y: Math.floor(position.y),
    z: Math.floor(position.z),
  };

  // 設定偏移量，使線條不會與方塊重疊
  const offset = 0.0001;

  // 計算立方體的8個頂點（從最小點開始）
  const vertices = [
    { x: minPoint.x - offset, y: minPoint.y - offset, z: minPoint.z - offset }, // 0 西南下
    {
      x: minPoint.x + 1 + offset,
      y: minPoint.y - offset,
      z: minPoint.z - offset,
    }, // 1 東南下
    {
      x: minPoint.x + 1 + offset,
      y: minPoint.y - offset,
      z: minPoint.z + 1 + offset,
    }, // 2 東北下
    {
      x: minPoint.x - offset,
      y: minPoint.y - offset,
      z: minPoint.z + 1 + offset,
    }, // 3 西北下
    {
      x: minPoint.x - offset,
      y: minPoint.y + 1 + offset,
      z: minPoint.z - offset,
    }, // 4 西南上
    {
      x: minPoint.x + 1 + offset,
      y: minPoint.y + 1 + offset,
      z: minPoint.z - offset,
    }, // 5 東南上
    {
      x: minPoint.x + 1 + offset,
      y: minPoint.y + 1 + offset,
      z: minPoint.z + 1 + offset,
    }, // 6 東北上
    {
      x: minPoint.x - offset,
      y: minPoint.y + 1 + offset,
      z: minPoint.z + 1 + offset,
    }, // 7 西北上
  ];

  // 定義邊線的連接順序
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0], // 下面的四條邊
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4], // 上面的四條邊
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // 連接上下的四條邊
  ];

  // 依照連接順序產生邊線座標
  edges.forEach(([start, end]) => {
    points.push(vertices[start]);
    points.push(vertices[end]);
  });

  return points;
}

module.exports = {
  initMineflayerViewer,
};
