# A Minecraft multifunctional Bot 1.21.1

[![](https://img.shields.io/badge/minecraft-1.21-%2355FF55.svg?style=for-the-badge&labelColor=gray)](https://www.minecraft.net/) [![](https://img.shields.io/badge/mineflayer-4.27.0-%23000000.svg?style=for-the-badge&labelColor=gray)](https://github.com/PrismarineJS/mineflayer)

---

## What is mineflayer?

Mineflayer：由 JavaScript [API](https://github.com/PrismarineJS/mineflayer/blob/master/docs/api.md) 寫成，運行在 Node.js 上的機器人項目。

支持環境感知、實體互動、物理運動引擎、背包資源管理、挖掘和建造甚至更多的功能，

豐富的接口幾乎可以實現遊戲的任何功能。

## BK's mineflayer Bot

配合自己的遊玩習慣設計的Bot，靈感來源於 Carpet 的 fakeplayer (假人)

可以在遊戲中用指令控制機器人的動作，主要用來維持機器運作，農場生產。

本項目開始於 minecatft 1.17 版本的最初版，並在 1.21 版本進行了全面重製。

目前主要開發與測試在 minecatft 1.21.1 版本的單人存檔。

已知在 1.21.4 版本無法直連單人區域網路，但可以連接 1.21.4 paper 服務端。

--

主程式功能受 [fubira/TemzinBot](https://github.com/fubira/TemzinBot) 啟發，作為參考並重構。

以 MakkusuOtaku [[Github](https://github.com/MakkusuOtaku)] [[YouTube](https://www.youtube.com/@MakkusuOtaku)] 作為靈感來源。

以 EmergentGarden [[YouTube](https://www.youtube.com/@EmergentGarden)] 及
kolbytn 的 mindcraft [[Github](https://github.com/kolbytn/mindcraft)] 為未來的開發目標。

## 使用方式 Usage

1. 首先安裝 [Node.js](https://nodejs.org/zh-tw) `版本 >= 18`，可參考 [Mineflayer](https://github.com/PrismarineJS/mineflayer) 官方文檔安裝
2. 下載本倉庫並解壓縮文件，在同文件資料夾下運行 `npm install` 初始化並安裝所依賴的模組
3. 再來調整 `.env` 文件內容，`ENV_SEVER_SELECTOR` 參數為選擇機器人的登入檔案，使用 # 井字註解取消不需要檔案
4. 在不做任何更改的情況下，會使用預設 `.env.sample` 中的配置連接本地的服務器
5. 進行 Bot 本地測試：`進入單人遊戲 > 在區網上公開 > 允許指令：開啟 > 連接埠號碼 25565 > 開始區網世界`
6. 最後於命令行執行 `npm start` 即可看到 mineflayer 登入遊戲中

## 功能介紹 Functions

### 目前已實現的主要功能

- **可自訂登入訊息**。  可以分開儲存不同伺服器和帳號資料。
- **敏感訊息保護**。     .env 檔案作為環境變量引入程式碼。
- **模組化設計**。      使用模塊化開發，方便切換不同功能與維護。
- **安全引入模組**。    用來引入模組的模組，防止檔案有問題造成程式崩潰。
- **錯誤處理模組**。    偵測未預期的錯誤，防止程式直接停止，並在捕捉 5 次後強制關閉避免循環崩潰。
- **命令行操作**。      使用 Readline [API](https://nodejs.org/api/readline.html) 可在命令行使用 Bot 說話與接受指令。
- **安全聊天模塊**。    防止 Bot 發送大量訊息洗頻與過濾重複發話內容。
- **紀錄聊天訊息。**    遊戲內訊息加上時間標籤並回傳到命令行。
- **命令系統**。        模仿 Carpet 的 fakeplayer 的方式用指令控制 Bot 行為。

### TO(probably not)DO

- [ ] **AI 聊天系統**。       接入本地的 Ollama 模型回答玩家的提問，預計擴展為可用API接入，以及建立聊天資料庫。
- [ ] **待機模式**。          讓 Bot 自動轉頭看向最近的玩家，與玩家互動。
- [ ] **空置域鋪地板模式**。   *...*
- [ ] **任務系統**。          *...*

- [ ] 使用 nexe 將 Node.js 的 Bot 代碼包裝成 exe 應用程式
- [ ] 讓 主 Bot 控制 子Bot 共同協作

## 指令系統 Commands

指令仍在開發中，部分功能不可用或未完成。

--

以下是所有 `@b` 可用的命令，共 56 項：

◈ System ◈
- help / 幫助：生成所有 BK-Bot 可用的指令，並輸出到命令行
- killBot / kill / 結束 / 退出：結束 Mineflayer Bot 主程式
- loopCommandState / state / 狀態：取得 LCM 目前執行的循環命令狀態
- quit / 重開 / 重登 / 重連：讓 Bot 離開伺服器，並在之後重新登入
- stopAll / stop / stopall / 停止：讓 LCM 停止 Bot 所有執行中的循環命令

◈ Data ◈
- botRegistryData / reg / 註冊資料：將註冊於 Bot 的資料輸出成外部文件儲存
- getData / data：將 Bot 的可取得的，遊戲中的資料輸出成外部文件儲存
- mcdata / mc資料庫：將 mcData 的資料輸出到命令行
- ping：輸出 Bot 的 Ping 值
- printBotHealth / health / 健康：輸出 Bot 目前的狀態資訊
- ServerResponseChecker / pingserver / pingServer：輸出 Server 的各種資訊

◈ Inventory ◈
- closeWindows / close / 關上 / 關掉：關閉目前 Bot 已經開啟的 GUI 介面
- craftItem / craft：讓 Bot 使用身上的物品進行指定的配方合成
- drop / 丟 / 丟出：讓 Bot 丟出指定的物品
- equip / 穿 / 穿上 / 裝備：讓 Bot 穿上手上或指定位置的裝備
- hotbar / hot / 快捷欄：切換 Bot 目前的快捷欄位
- inventory / inv / 背包：將 Bot 背包中所有的物品資訊，輸出到遊戲中的聊天欄
- putAll / putall / 放入全部：讓 Bot 嘗試將背包所有的物品，放入附近的容器內
- putitem / put / 放 / 放入：讓 Bot 嘗試將指定的物品，放入附近的容器內
- switch / swap / 換手：交換 Bot 左右手的物品
- takeout / take / 拿 / 拿出：讓 Bot 嘗試拿出背包中符合的物品，並放到手上
- unequip / 脫 / 脫掉 / 脫下：讓 Bot 脫下身上全部的裝備

◈ Action_Basic ◈
- attackOnce / atk1 / 攻擊一次：讓 Bot 攻擊一次
- come / 過來：讓 Bot 前往命令者的位置
- dismount / getoff / 下車 / 下來：讓 Bot 離開目前的騎乘物
- eat / 吃：讓 Bot 嘗試吃下手上的物品
- goto / 前往 / 到達：讓 Bot 前往指定位置或指定玩家的身邊
- jumpLoop / jump / 跳 / 跳躍：讓 Bot 持續跳躍，重複輸入可停下所有動作
- mount / ride / 上車 / 坐上：讓 Bot 嘗試騎上附近的騎乘物
- say / 說：讓 Bot 在聊天室說出你輸入的文字
- sleepOnBed / sleep / 睡 / 睡覺：讓 Bot 嘗試睡在附近可互動的床
- sneak / 蹲 / 蹲下 / 蹲著：讓 Bot 進入蹲下狀態，重複輸入可解除
- sprint / 跑 / 衝 / 衝刺：讓 Bot 進入衝刺狀態
- swingArm / swing / 揮手：讓 Bot 揮手一次
- unsneak / 起 / 起來 / 站起來：讓 Bot 解除蹲下狀態
- unsprint / 停 / 別跑 / 站好 / 站住：讓 Bot 停止衝刺狀態
- wakeUp / wake / 起床 / 醒醒 / 太陽曬屁股了：讓 Bot 起床

◈ Action_Advanced ◈
- lookAt / look / 看 / 看向：讓 Bot 看向最近的實體，或是指定的目標
- moveBot / move / 移動 / 動作：讓 Bot 朝指定的方向移動或進行動作，可指定時間
- placeBlock / place / 放置：讓 Bot 將手上的物品放到指定的方塊或座標上
- turnBot / turn / 轉 / 轉向：讓 Bot 朝指定的方向旋轉身體或頭部
- useBlock / use / 互動：讓 Bot 與指定方塊名稱，或指定座標互動

◈ Loop ◈
- attackLoop / atk / 攻擊：讓 Bot 不停地攻擊最近的實體，可指定間隔
- bodyGuard / guard / 保鑣：讓 Bot 跟隨並保護指定目標
- follow / 跟隨：讓 Bot 跟隨指定目標
- lookLoop / lock / 鎖定：讓 Bot 不停地看向最近的實體，可指定間隔
- waving / wave / 一直揮手：讓 Bot 不停地揮手，可指定間隔時間(tick)

◈ dev ◈
- craftingStation / craftst / craftingstation / 合成站：讓 bot 使用合成站，將 9 格原材料 
壓縮合成為 1 格產物
- digBlock / dig：讓 bot 挖掘指定範圍內的方塊
- drawLine / line：Draw a Line on mineflayer-viewer
- entity：a command for test entity cmd in util
- task：a command for test task
- treeFarm2x2 / tree2x2：讓 Bot 種植 2x2 的樹苗
- wheat：讓 bot 搜尋附近的 wheat 作物，並自動收穫、種植、撿起掉落物品

◈ *Uncategorized ◈
- _sample：just a command sample for copy
- test：a command for quick test