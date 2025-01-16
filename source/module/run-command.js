// 引入 Vec3 處理座標
const { Vec3 } = require("vec3");
// 引入 mcData 處理方塊名稱
const minecraftData = require("minecraft-data");

async function runCommand(bot, keys) {
  // 取別名 定義資料庫版本
  const mcData = minecraftData(bot.version);
  // 檢查 keys 是否為數組且長度足夠
  if (!Array.isArray(keys) || keys.length < 2) {
    // console.logTimer(`[runCommand] Incorrectly formatted. keys: ${keys}`); // Debug 用
    return;
  }

  switch (keys[1]) {
    case "say":
      if (keys.length < 3) {
        bot.safeChat("💻 沉默是今晚的康橋");
      } else {
        const message = keys.slice(2).join(" "); // 合併 keys[2] 後的所有部分
        bot.safeChat(message); // 讓 bot 說出整句話
      }
      break;
    case "attack":
      /**
       * continuous
       * interval <tick>
       * once
       */
      attackNear();
      async function attackNear() {
        // 找到最近的實體
        const nearestEntity = bot.nearestEntity();
        // console.logTimer(`[attackNear] bot attack: ${entityName}`);  // Debug 用
        if (!nearestEntity) {
          bot.safeChat(`💻 好人你幫幫人民的辣，哇丟跨謀`);
          return;
        }
        // 計算與實體的距離 處理實體的名稱
        const distance = bot.entity.position.distanceTo(nearestEntity.position);
        const entityName =
          nearestEntity.username || nearestEntity.displayName || "Unknown Name";
        if (distance <= 5.5) {
          if (nearestEntity.type === "player") {
            bot.safeChat(`💻 ${entityName} 吃我一擊!`);
          } else {
            bot.safeChat(`💻 看招! ${entityName}`);
          }
        } else {
          bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
        }
        // 看向實體的座標
        const pos = nearestEntity.position.offset(0, nearestEntity.height, 0);
        await bot.lookAt(pos);
        await bot.waitForTicks(5);
        // 執行攻擊
        bot.attack(bot.nearestEntity());
      }
      break;
    case "use":
      /**
       * continuous
       * interval <tick>
       * once
       */

      useBlock();
      function useBlock() {
        // const block = bot.findBlock({
        //   matching: block => bot.mcData.blocksByName[blockName].id === block.type,
        //   maxDistance: 5
        // });
        // const block = bot.blockAtCursor(5) || mcData.blocksByName["air"];
        if (!keys[2]) {
          const block = bot.blockAtCursor(5) || mcData.blocksByName["air"];
          if (block.displayName === "Air") {
            bot.safeChat(`你有看到我在玩空氣嗎?`);
          } else {
            if (distance <= 5.5) {
              bot.activateBlock(block);
              bot.safeChat(`💻 正在使用：${block.displayName}`);
            } else {
              bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
            }
          }
        } else {
          const x = parseFloat(keys[2]);
          const y = parseFloat(keys[3]);
          const z = parseFloat(keys[4]);

          if (isNaN(x) || isNaN(y) || isNaN(z) || keys.length > 5) {
            bot.safeChat("💻 請 3 提供個數字座標，例如：<use 100 64 200>");
            return;
          }
          const blockPos = new Vec3(x, y, z);
          const block = bot.blockAt(blockPos) || mcData.blocksByName["air"];
          const distance = bot.entity.position.distanceTo(block.position);
          if (block.displayName === "Air") {
            bot.safeChat(`你有看到我在玩空氣嗎?`);
          } else {
            if (distance <= 5.5) {
              bot.activateBlock(block);
              bot.safeChat(`💻 正在使用：${block.displayName}`);
            } else {
              bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
            }
          }
        }
      }
      break;
    case "move":
      /**
       * <direction> backward, forward, left, right, up, down
       * bot.setControlState(control, state)
       * control - one of ['forward', 'back', 'left', 'right', 'jump', 'sprint', 'sneak']
       */
      let direction = keys[2];
      if (!keys[2]) {
        await bot.setControlState(direction, true);
        await bot.waitForTicks(4);
        await bot.setControlState(direction, false);
      } else {
        const second = parseFloat(keys[3]);
        const second2Tick = second * 20;
        if (isNaN(second2Tick) || keys.length > 3) {
          await bot.setControlState(direction, true);
          await bot.waitForTicks(second2Tick);
          await bot.setControlState(direction, false);
        }
      }
      break;
    case "look":
      /**
       * <direction> backward, forward, left, right, up, down
       */
      if (!keys[2]) {
        lookAtNear();
      } else {
        const direction = keys[2].toLowerCase();
        const directions = [
          "forward",
          "back",
          "left",
          "right",
          "up",
          "down",
          "north",
          "east",
          "south",
          "west",
          "前",
          "後",
          "左",
          "右",
          "上",
          "下",
          "北",
          "東",
          "南",
          "西",
        ];

        if (directions.includes(direction)) {
          const { yaw, pitch } = getYawPitchFromDirectionforLook(
            direction,
            bot.entity.yaw,
            bot.entity.pitch
          );
          await bot.look(yaw, pitch, true); // 第三個參數 true 表示立即完成
          bot.safeChat(`💻 看向方向: ${direction}`);
        } else {
          // 檢查是否是數字座標
          const x = parseFloat(keys[2]);
          const y = parseFloat(keys[3]);
          const z = parseFloat(keys[4]);

          if (isNaN(x) || isNaN(y) || isNaN(z) || keys.length > 5) {
            bot.safeChat("💻 請提供正確的方向，例如：<look up>, <look 北>");
            bot.safeChat("💻 或 3 個數字座標，例如：<look 100 64 200>");
            return;
          }

          const targetPosition = new Vec3(x, y, z);
          await bot.lookAt(targetPosition);
          bot.safeChat(`💻 看向座標: (${x}, ${y}, ${z})`);
        }
      }
      // 處理俯仰與旋轉角度
      function getYawPitchFromDirectionforLook(
        direction,
        botEnityYaw,
        botEnityPitch
      ) {
        const halfPI = Math.PI / 2;

        switch (direction) {
          case "forward":
          case "前":
            return { yaw: botEnityYaw, pitch: 0 };
          case "back":
          case "後":
            return { yaw: botEnityYaw + Math.PI, pitch: 0 };
          case "left":
          case "左":
            return { yaw: botEnityYaw + halfPI, pitch: 0 };
          case "right":
          case "右":
            return { yaw: botEnityYaw - halfPI, pitch: 0 };
          case "up":
          case "上":
            return { yaw: botEnityYaw, pitch: 90 };
          case "down":
          case "下":
            return { yaw: botEnityYaw, pitch: -90 };
          case "north":
          case "北":
            return { yaw: 0, pitch: 0 };
          case "east":
          case "東":
            return { yaw: -halfPI, pitch: 0 };
          case "south":
          case "南":
            return { yaw: Math.PI, pitch: 0 };
          case "west":
          case "西":
            return { yaw: 0 + halfPI, pitch: 0 };
          default:
            return { yaw: botEnityYaw, pitch: botEnityPitch };
        }
      }
      // 看向最近的實體
      async function lookAtNear() {
        // 找到最近的實體
        const nearestEntity = bot.nearestEntity();
        // console.logTimer(`[attackNear] bot attack: ${entityName}`);  // Debug 用
        if (!nearestEntity) {
          bot.safeChat(`💻 好人你幫幫人民的辣，哇丟跨謀`);
          return;
        }
        // 處理實體的名稱
        const entityName =
          nearestEntity.username || nearestEntity.displayName || "Unknown Name";
        // 看向實體的座標
        const pos = nearestEntity.position.offset(0, nearestEntity.height, 0);
        await bot.lookAt(pos);
        await bot.waitForTicks(4);
        bot.safeChat(`💻 I'm watching you... ${entityName}`);
      }
      break;
    case "turn":
      /**
       * back
       * left
       * right
       * <option> 偏轉角 0-360, 俯仰角 +-90
       */
      if (!keys[2]) {
        bot.safeChat("💻 請提供正確的方向，例如：<turn left>, <turn 後>");
        bot.safeChat(
          "💻 或 2 個旋轉角度（360°） 與 俯仰角度（±90°），例如：<turn 90 5>"
        );
      } else {
        const direction = keys[2].toLowerCase();
        const directions = ["back", "left", "right", "後", "左", "右"];

        if (directions.includes(direction)) {
          const { yaw, pitch } = getYawPitchFromDirectionforTurn(
            direction,
            bot.entity.yaw,
            bot.entity.pitch
          );
          await bot.look(yaw, pitch, true); // 第三個參數 true 表示立即完成
          bot.safeChat(`💻 轉向: ${direction}`);
        } else {
          // 檢查是否是數字座標
          const inputYaw = parseFloat(keys[2]);
          const inputPitch = parseFloat(keys[3]);

          if (isNaN(inputYaw) || isNaN(inputPitch) || keys.length > 4) {
            bot.safeChat("💻 請提供正確的方向，例如：<turn left>, <turn 後>");
            bot.safeChat(
              "💻 或 2 個旋轉角度（360°） 與 俯仰角度（±90°），例如：<turn 90 5>"
            );
            return;
          }
          await bot.look(
            bot.entity.yaw + inputYaw * (Math.PI / 180),
            inputPitch * (Math.PI / 180),
            true
          ); // 第三個參數 true 表示立即完成
          bot.safeChat(
            `💻 轉向: 旋轉角 = ${inputYaw}°, 俯仰角 = ${inputPitch}°`
          );
        }
      }
      // 處理俯仰與旋轉角度
      function getYawPitchFromDirectionforTurn(
        direction,
        botEnityYaw,
        botEnityPitch
      ) {
        const halfPI = Math.PI / 2;

        switch (direction) {
          case "back":
          case "後":
            return { yaw: botEnityYaw + Math.PI, pitch: botEnityPitch };
          case "left":
          case "左":
            return { yaw: botEnityYaw + halfPI, pitch: botEnityPitch };
          case "right":
          case "右":
            return { yaw: botEnityYaw - halfPI, pitch: botEnityPitch };
          default:
            return { yaw: botEnityYaw, pitch: botEnityPitch };
        }
      }
      break;
    case "hotbar":
      /**
       * <0-9>
       */
      // 將 keys[2] 轉換為整數，並指定基數為 10（十進制）
      let slot = parseInt(keys[2], 10);
      if (isNaN(slot) || slot < 1 || slot > 9) {
        bot.safeChat("💻 無效的欄位數字，請輸入 1 到 9 之間的數字。");
        return;
      }
      bot.setQuickBarSlot(slot - 1);
      break;
    case "drop":
      /**
       * mainhand
       * offhand
       * <0-35> - 指定欄位
       * all
       * continuous 不斷丟出 就像案住Q
       * interval <tick> - 固定時間丟出
       * once 丟一次 並且可以重製間隔
       * slotId 的範圍會根據 Mineflayer 的背包設計而有所不同：
       * 36-44: 快捷欄。
       * 9-35 為背包槽位。
       * 0: 頭盔（Helmet） 1: 胸甲（Chestplate） 2: 褲子（Leggings） 3: 靴子（Boots） 4: 副手（Off-hand / 盾牌）
       * 5-8 的槽位對應的是製作網格（Crafting Grid）
       */

      if (!keys[2]) {
        // 未傳參數
        tossItemFromHand();
      } else {
        // 參數字典
        const option = keys[2].toLowerCase();
        const options = ["off-hand", "head", "torso", "legs", "feet", "all"];
        if (options.includes(option)) {
          switch (option) {
            case "off-hand":
              tossItemFromSlot(4);
              break;
            case "head":
              tossItemFromSlot(0);
              break;
            case "torso":
              tossItemFromSlot(1);
              break;
            case "legs":
              tossItemFromSlot(2);
              break;
            case "feet":
              tossItemFromSlot(3);
              break;
            case "all":
              break;
            default:
              break;
          }
        } else {
          // 其他狀況
          // 將 keys[2] 轉換為整數，並指定基數為 10（十進制）
          let slotId = parseInt(keys[2], 10);
          if (isNaN(slotId) || slotId < 0 || slotId > 44) {
            // 無效
            bot.safeChat(
              "💻 請輸入 0-3（裝備）, 4（副手）, 9-35（背包）, 36-44（快捷欄）。"
            );
            return;
          } else {
            // 指定欄位
            tossItemFromSlot(slotId);
          }
        }
      }
      // 丟出某個特定 slot 的物品
      function tossItemFromSlot(slotId) {
        const item = bot.inventory.slots[slotId];
        // console.log(bot.inventory);
        if (!item) {
          bot.safeChat(`💻 Slot ${slotId} 是空的，無法丟出物品`);
          return;
        }

        bot
          .toss(item.type, item.metadata, item.count)
          .then(() => {
            bot.safeChat(
              `💻 成功丟出來自 Slot ${slotId} 的物品: ${item.displayName}`
            );
          })
          .catch((err) => {
            bot.safeChat(`💻 丟出物品失敗: ${err}`);
          });
      }
      // 丟出手上的物品
      function tossItemFromHand() {
        const barSlotId = bot.quickBarSlot + 36;
        const item = bot.inventory.slots[barSlotId];
        // console.log(bot.inventory);
        if (!item) {
          bot.safeChat(`💻 手上是空的，無法丟出物品`);
          return;
        }

        bot
          .toss(item.type, item.metadata, item.count)
          .then(() => {
            bot.safeChat(`💻 成功丟出手上的物品: ${item.displayName}`);
          })
          .catch((err) => {
            bot.safeChat(`💻 丟出物品失敗: ${err}`);
          });
      }
      bot.safeChat("💻 指令未完成: drop");
      break;
    case "equip":
    case "穿上":
      if (!keys[2]) {
        const equipments = ["head", "torso", "legs", "feet", "off-hand"];
        putOnEquipmentinHand();
        async function putOnEquipmentinHand() {
          for (let index = 0; index < equipments.length; index++) {
            const equipment = equipments[index];
            const slotId = bot.getEquipmentDestSlot("hand");
            const item = bot.inventory.slots[slotId];
            try {
              await bot.equip(item.type, equipment);
            } catch (error) {
              console.log({ error });
              return;
            }
            await bot.waitForTicks(5);
            console.log({ slotId });
            console.log({ item });
          }
        }
      } else {
      }
      break;
    case "unequip":
    case "脫下":
    case "脫掉":
      if (!keys[2]) {
        const equipments = ["head", "torso", "legs", "feet", "off-hand"];
        takeOffAllEquipment();
        async function takeOffAllEquipment() {
          for (let index = 0; index < equipments.length; index++) {
            const equipment = equipments[index];
            try {
              await bot.unequip(equipment);
            } catch (error) {
              console.log({ error });
              return;
            }
            await bot.waitForTicks(5);
          }
        }
      } else {
      }
      break;
    case "dropStack":
      bot.safeChat("💻 指令未完成: dropStack");
      break;
    case "swapHand":
    case "swingArm":
    case "揮手":
      await bot.swingArm();
      break;
    case "jump":
    case "跳":
      /**
       * continuous
       * interval <tick>
       * once
       */
      await bot.setControlState("jump", true);
      await bot.waitForTicks(4);
      await bot.setControlState("jump", false);
      bot.safeChat("💻 指令未完成: jump");
      break;
    case "sneak":
    case "蹲下":
    case "蹲":
      if (!bot.getControlState("sneak")) {
        await bot.setControlState("sneak", true);
      } else {
        await bot.setControlState("sneak", false);
      }
      break;
    case "unsneak":
      await bot.setControlState("sneak", false);
      break;

    case "sprint":
    case "衝刺":
    case "跑":
      if (!bot.getControlState("sprint")) {
        await bot.setControlState("sprint", true);
      } else {
        await bot.setControlState("sprint", false);
      }
      break;
    case "unsprint":
      await bot.setControlState("sprint", false);
      break;
    case "mount":
    case "ride":
    case "上車":
      mountNear();
      async function mountNear() {
        // 找到最近的實體
        const nearestEntity = bot.nearestEntity();
        // console.logTimer(`[attackNear] bot ride: ${entityName}`);  // Debug 用
        if (!nearestEntity) {
          bot.safeChat(`💻 好人你幫幫人民的辣，哇丟跨謀`);
          return;
        }
        // 計算與實體的距離 處理實體的名稱
        const distance = bot.entity.position.distanceTo(nearestEntity.position);
        const entityName =
          nearestEntity.username || nearestEntity.displayName || "Unknown Name";
        if (distance <= 5.5) {
          if (nearestEntity.type === "minecart") {
            bot.safeChat(`💻 沒時間解釋了，快上車`);
          } else if (nearestEntity.type === "boat") {
            bot.safeChat(`💻 𝗡𝗶𝗰𝗲 𝗕𝗼𝗮𝘁`);
          } else {
            bot.safeChat(`💻 ${entityName} 我也是很想上車...`);
          }
        } else {
          bot.safeChat(`太遠拉! 我碰不到 ${entityName}`);
        }

        // 看向實體的座標
        const pos = nearestEntity.position.offset(0, nearestEntity.height, 0);
        await bot.lookAt(pos);
        await bot.waitForTicks(5);
        // 執行騎乘
        bot.mount(bot.nearestEntity());
      }
      break;
    case "dismount":
    case "getoff":
    case "下車":
      bot.dismount();
      break;
    case "close":
      if (bot.open) {
        bot.closeWindow(bot.open);
        bot.safeChat(`💻 關閉目前互動的介面！`);
      } else {
        bot.safeChat(`💻 沒有開啟任何的介面！`);
      }
      break;
    case "quit":
      await bot.waitForTicks(20);
      await bot.safeChat("💻 See you later ~");
      await bot.waitForTicks(20);
      await bot.quit("My boss says so.");
      break;
    case "kill":
      await bot.waitForTicks(20);
      await bot.safeChat("💻 Okay... Q^Q");
      await bot.waitForTicks(20);
      await console.logTimer(
        `\n----------\n[Terminal] 準備結束 mineflayer ...\n----------`
      );
      await process.exit(0);
      break;
    case "stop":
      await bot.clearControlStates();
      bot.safeChat("💻 指令未完成: stop");
      break;
    default:
      console.logTimer(`[runCommand] 未知指令: ${keys[1]}`);
  }
}
module.exports = {
  runCommand,
};
