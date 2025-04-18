/** 定義 裝備的各種資料
 * （頭盔、胸甲、褲子、靴子、副手、主手）
 *  參考：MineflayerArmorManager
 *  */
const { FOODS } = require("./FOODS.js");
const EQUIPMENT_CONFIG = {
  name: "EQUIPMENT_CONFIG",
  categories: [
    "armor",
    "weapon",
    "tool",
    "bow",
    "shield",
    "food",
    "specialItem",
  ],
  armor: {
    filter: ["helmet", "chestplate", "leggings", "boots"],
    destination: ["head", "torso", "legs", "feet"],
    materials: [
      "leather",
      "golden",
      "chainmail",
      "iron",
      "turtle",
      "diamond",
      "netherite",
    ],
    orderBase: 40000,
    materialBase: 1000,
  },
  weapon: {
    filter: ["sword", "axe", "mace", "trident", "pickaxe", "shovel", "hoe"],
    destination: ["hand"],
    materials: ["wooden", "stone", "iron", "diamond", "netherite"],
    orderBase: 60000,
    materialBase: 1000,
  },
  tool: {
    filter: [
      "sword",
      "axe",
      "pickaxe",
      "shovel",
      "hoe",
      "shears",
      "on_a_stick",
      "flint_and_steel",
      "fishing_rod",
      "brush",
    ],
    destination: ["hand"],
    materials: ["wooden", "stone", "iron", "diamond", "netherite"],
    orderBase: 50000,
    materialBase: 1000,
  },
  bow: {
    filter: ["bow", "crossbow"],
    destination: ["hand"],
    materials: ["bow"],
    orderBase: 50000,
    materialBase: 1000,
  },
  shield: {
    filter: ["shield", "totem_of_undying"],
    destination: ["off-hand"],
    materials: ["shield", "totem"],
    orderBase: 30000,
    materialBase: 1000,
  },
  specialItem: {
    filter: ["carved_pumpkin", "elytra"],
    destination: ["head", "torso"],
    materials: ["special_item"],
    orderBase: 20000,
    materialBase: 1000,
  },
  food: {
    filter: FOODS.map((food) => food.name),
    destination: ["off-hand"],
    materials: ["food"],
    orderBase: 10000, // 設定較低的基礎優先級
    materialBase: 0, // 食物的材質基礎分數
  },
};

module.exports = { EQUIPMENT_CONFIG };
