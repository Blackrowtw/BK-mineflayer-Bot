# A Minecraft multifunctional Bot 1.21

[Mineflayer](https://github.com/PrismarineJS/mineflayer)，由 JavaScript [API](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md)寫成，運行在 Node.js 上的機器人項目。

支持環境感知、實體互動、物理運動引擎、背包資源管理、挖掘和建造甚至更多的功能，

豐富的接口幾乎可以實現遊戲的任何功能。

---

## BK's mineflayer Bot

配合自己的遊玩習慣設計的Bot，靈感來源於 Carpet 的 fakeplayer (假人)

可以在遊戲中用指令控制機器人的動作，主要用來維持機器運作，農場生產。

主程式功能受 [fubira/TemzinBot](https://github.com/fubira/TemzinBot) 啟發，作為參考並重構。

另外以 MakkusuOtaku/[Github](https://github.com/MakkusuOtaku)/[YouTube](https://www.youtube.com/@MakkusuOtaku) 的各種神奇的 Bot 功能為未來開發的目標。

## 使用方式

1. 首先安裝 [Node.js](https://nodejs.org/zh-tw) 版本 >= 18
2. 下載本倉庫並解壓所文件，在同文件資料夾下運行 `npm init` 初始化並安裝所依賴的模組
3. 調整 .env 文件選擇伺服器的登入檔案，可不做更動，會使用預設 lacal 本地服務器
4. 本地測試 Bot 可進入單人遊戲 > 在區網上公開 > 允許指令：開啟 > 連接埠號碼 25565 > 開始區網世界
5. 命令行執行 `npm start` 即可看到 mineflayer 登入遊戲中


## 功能介紹

### 目前已實現的主要功能

- **可自訂登入訊息**。  可以分開儲存不同伺服器和帳號資料。
- **敏感訊息保護**。     .env 檔案作為環境變量引入程式碼。
- **模組化設計**。      除了基本功能外的函數由模塊引入，方便切換不同功能與開發。
- **安全引入模組**。    用來引入模組的模組，防止檔案有問題造成程式崩潰。
- **錯誤處理模組**。    偵測未預期的錯誤，防止程式停止，一段時間後重新嘗試登入。
- **命令行操作**。      使用 Readline [API](https://nodejs.org/api/readline.html) 可在命令行操控 Bot 說話與接受指令。
- **安全聊天模塊**。    防止 Bot 洗頻與重複發話。
- **紀錄聊天訊息。**    加上時間標籤並回傳到命令行。
- **命令系統**。        用 fakeplayer 的方式用指令控制 Bot 行為。

### 待開發的模組

- **待機模式**。            讓 Bot 自動轉頭看向最近的玩家。與玩家互動，*開發中 ...*
- **定時開關機器**。        *...*
- **行為樹系統**。          *...*
- **PVE模式**。             *...*
- **空置域鋪地板模式**。    *...*
- **村民種田模式**。        *...*

### TO(probably not)DO

- [ ] 部分參數放入 .env 統一管理
- [ ] 命令系統追加主人識別
- [ ] 重新建構 Readline 功能
- [ ] 讓 主 Bot 控制 子Bot 共同協作
- [ ] 使用 pkg 將 Bot 包裝成 exe

## Commands

指令仍在開發中，部分功能不可用或未完成。

指令解析前綴 `@bot`

<details>
### 暫時整理<summary></summary>

#### "say":

      讓 Bot 重複你輸入的內容

#### "attack":

      左鍵攻擊一次最近的實體

#### "use":

      右鍵操作 5 格內準心所指的方塊
      或輸入指定座標

#### "move":

        控制 Bot 動作，例如：`<move forward>`
        ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']
        可追加持續秒數，例如：<move back 10>

#### "look":

        看向最近的實體
        或追加指定方向，例如：`<look up>`, <look 北>
        ["forward","back","left","right","up","down","north","east","south","west"]
        ["前","後","左","右","上","下","北","東","南","西]
       或輸入 3 個數字座標，例如：<look 100 64 200>

#### "turn" :

      操作 Bot 轉向指定方向，並維持俯仰角
      ["back","left","right","後","左","右"] 例如：`<turn back>`
      或旋轉角度（360°） 與 俯仰角度（±90°），例如：<turn 90 5>

#### "drop":

      丟出手上的一個
      或是輸入指定欄位 0-3（裝備）, 4（副手）, 9-35（背包）, 36-44（快捷欄）

#### "equip", "穿上":

      穿上手上拿的裝備

#### "unequip", "脫下", "脫掉":

      脫掉所有穿著的裝備

#### "dropStack":

      丟棄整組

#### "swapHand", "swingArm", "揮手":

      揮手一次

#### "jump", "跳":

      跳躍一次

#### "sneak", "蹲下", "蹲":

      開啟或切換蹲下狀態

#### "unsneak":

      停止蹲下狀態

#### "sprint", "衝刺", "跑":

      開啟或切換衝刺狀態

#### "unsprint":

      停止衝刺狀態

#### "mount", "ride", "上車":

      乘上騎乘物

#### "dismount", "getoff", "下車":

      從騎乘物下來

#### "close":

      關閉開啟的頁面

#### "quit":

      讓 Bot 斷線重新登入

#### "kill":

      退出整個主程式

#### "stop":

      停下目前的狀態

</details>
