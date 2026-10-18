// ============================================================
// ДОВІДНИК ПРЕДМЕТІВ
// Тут лише опис речей. У сейві зберігається тільки ID (ключ).
// ID (ключ об'єкта) НІКОЛИ не перейменовуй — інакше старі сейви
// не знайдуть предмет. Назву, картинку, характеристики міняй вільно.
//
// stats   — бонуси, коли річ вдягнена. Можна вказувати і бойові
//           характеристики (attack, defense...), і атрибути (str, agi...).
// price   — базова вартість. Торговець продає за 150%, купує за 50%.
// noShop  — торговець цю річ НЕ продає (лише здобич з ворогів).
// rarity  — "rare" підсвічується в інвентарі.
// effect  — для зілля: healHp / healMp (одиниці),
//           healHpPct / healMpPct (частка від максимуму: 0.5 = 50%).
// ============================================================

(function (RPG) {
// Папка з картинками предметів (шлях рахує core.js від кореня гри)
const IMG_BASE = RPG.asset("assets/img/items/");

// Слоти екіпірування
const SLOTS = {
  mainHand: "Основна рука",
  offHand: "Друга рука",
  head: "Голова",
  chest: "Тіло",
  legs: "Ноги",
  feet: "Взуття",
  ring: "Кільце",
  amulet: "Амулет"
};

// Назви характеристик для відображення в інтерфейсі
const STAT_NAMES = {
  hp: "Здоров'я",
  mp: "Мана",
  attack: "Атака",
  magic: "Сила магії",
  defense: "Захист",
  magicDefense: "Магічний захист",
  speed: "Швидкість",
  crit: "Шанс криту, %",
  blockPhys: "Блок фіз. шкоди, %",
  blockMag: "Блок маг. шкоди, %",
  hpRegen: "Відновлення HP за 10 с",
  mpRegen: "Відновлення MP за 10 с",
  str: "Сила",
  agi: "Спритність",
  int: "Інтелект",
  vit: "Витривалість",
  spi: "Дух"
};

// Необов'язкове поле classes: ["knight"] — предмет лише для цих професій.
// Без нього предмет підходить усім.

const ITEMS = {
  // ---------- ЗБРОЯ ----------
  sword_wood: {
    name: "Дерев'яний меч", img: "sword_wood.webp",
    type: "weapon", slot: "mainHand", levelReq: 1, price: 10,
    stats: { attack: 3 },
    description: "Тренувальний меч. Краще, ніж кулаки."
  },
  dagger_rusty: {
    name: "Іржавий кинджал", img: "dagger_rusty.webp",
    type: "weapon", slot: "mainHand", levelReq: 2, price: 25,
    stats: { attack: 4, agi: 1, crit: 2 },
    description: "Легкий і швидкий. Знайдений у щурячій норі."
  },
  staff_oak: {
    name: "Дубовий посох", img: "staff_oak.webp",
    type: "weapon", slot: "mainHand", levelReq: 2, price: 45,
    stats: { attack: 1, magic: 5, mp: 10, int: 1 },
    description: "Підсилює заклинання."
  },
  sword_iron: {
    name: "Залізний меч", img: "sword_iron.webp",
    type: "weapon", slot: "mainHand", levelReq: 3, price: 60,
    stats: { attack: 7, crit: 1 },
    description: "Надійна зброя мандрівника."
  },
  club_spiked: {
    name: "Палиця з шипами", img: "club_spiked.webp",
    type: "weapon", slot: "mainHand", levelReq: 4, price: 70,
    stats: { attack: 9, str: 1 },
    description: "Важка, але кожен удар відчутний."
  },
  staff_moon: {
    name: "Посох місячного виття", img: "staff_moon.webp",
    type: "weapon", slot: "mainHand", levelReq: 5, price: 140, noShop: true,
    stats: { attack: 2, magic: 11, mp: 25, int: 2, spi: 1 },
    description: "Холодне сяйво місяця в дереві."
  },
  sword_steel: {
    name: "Сталевий меч", img: "sword_steel.webp",
    type: "weapon", slot: "mainHand", levelReq: 6, price: 160, noShop: true,
    stats: { attack: 12, str: 1, crit: 2 },
    description: "Добре врівноважений клинок."
  },

  // ---------- ДРУГА РУКА ----------
  shield_wood: {
    name: "Дерев'яний щит", img: "shield_wood.webp",
    type: "shield", slot: "offHand", levelReq: 1, price: 15,
    stats: { defense: 3, blockPhys: 10 },
    description: "Затримує легкі удари."
  },
  shield_iron: {
    name: "Окутий щит", img: "shield_iron.webp",
    type: "shield", slot: "offHand", levelReq: 4, price: 80, noShop: true,
    stats: { defense: 6, blockPhys: 14 },
    description: "Дерево, оббите залізом."
  },

  // ---------- БРОНЯ ----------
  cap_leather: {
    name: "Шкіряна шапка", img: "cap_leather.webp",
    type: "armor", slot: "head", levelReq: 2, price: 20,
    stats: { defense: 2 },
    description: "Береже голову від гілок і ударів."
  },
  hood_wolf: {
    name: "Каптур з вовчої шкури", img: "hood_wolf.webp",
    type: "armor", slot: "head", levelReq: 5, price: 75, noShop: true,
    stats: { defense: 4, magicDefense: 2, vit: 1 },
    description: "Теплий і грізний на вигляд."
  },
  shirt_linen: {
    name: "Лляна сорочка", img: "shirt_linen.webp",
    type: "armor", slot: "chest", levelReq: 1, price: 8,
    stats: { defense: 2, hp: 5 },
    description: "Проста одяганка."
  },
  armor_leather: {
    name: "Шкіряна куртка", img: "armor_leather.webp",
    type: "armor", slot: "chest", levelReq: 3, price: 50, noShop: true,
    stats: { defense: 5, hp: 15 },
    description: "Легка та міцна."
  },
  armor_wolf: {
    name: "Кожух з білого вовка", img: "armor_wolf.webp",
    type: "armor", slot: "chest", levelReq: 6, price: 150, noShop: true,
    stats: { defense: 9, hp: 30, magicDefense: 3, vit: 1 },
    description: "Не пропускає ні холоду, ні ікла."
  },
  pants_linen: {
    name: "Лляні штани", img: "pants_linen.webp",
    type: "armor", slot: "legs", levelReq: 1, price: 6,
    stats: { defense: 1, hp: 5 },
    description: "Звичайні сільські штани."
  },
  pants_leather: {
    name: "Шкіряні штани", img: "pants_leather.webp",
    type: "armor", slot: "legs", levelReq: 3, price: 40, noShop: true,
    stats: { defense: 3, hp: 10 },
    description: "Не рвуться об колючки."
  },
  boots_simple: {
    name: "Прості чоботи", img: "boots_simple.webp",
    type: "armor", slot: "feet", levelReq: 1, price: 12,
    stats: { defense: 1, speed: 1 },
    description: "Зручні для довгих мандрів."
  },
  boots_leather: {
    name: "Шкіряні чоботи", img: "boots_leather.webp",
    type: "armor", slot: "feet", levelReq: 4, price: 55, noShop: true,
    stats: { defense: 3, speed: 2, agi: 1 },
    description: "Тихий і швидкий крок."
  },

  // ---------- АКСЕСУАРИ ----------
  ring_copper: {
    name: "Мідне кільце", img: "ring_copper.webp",
    type: "accessory", slot: "ring", levelReq: 2, price: 40, noShop: true,
    stats: { crit: 2 },
    description: "Кажуть, приносить удачу."
  },
  ring_silver: {
    name: "Срібний перстень", img: "ring_silver.webp",
    type: "accessory", slot: "ring", levelReq: 5, price: 120, noShop: true,
    stats: { crit: 3, spi: 1, mp: 10 },
    description: "Холодний на дотик, ясніє думка."
  },
  amulet_fang: {
    name: "Амулет з ікла", img: "amulet_fang.webp",
    type: "accessory", slot: "amulet", levelReq: 4, price: 90, noShop: true,
    stats: { attack: 2, str: 1, agi: 1 },
    description: "Ікло ватажка вовчої зграї на шнурку."
  },

  // ---------- ЗІЛЛЯ ----------
  // Малі та середні продає шинкар; великі та чарівне — лише з ворогів.
  potion_hp_small: {
    name: "Мале зілля здоров'я", img: "potion_hp_small.webp",
    type: "consumable", price: 5, stackable: true, maxStack: 20,
    effect: { healHp: 30 },
    description: "Відновлює 30 здоров'я."
  },
  potion_hp_medium: {
    name: "Середнє зілля здоров'я", img: "potion_hp_medium.webp",
    type: "consumable", price: 15, stackable: true, maxStack: 20,
    effect: { healHp: 80 },
    description: "Відновлює 80 здоров'я."
  },
  potion_hp_large: {
    name: "Велике зілля здоров'я", img: "potion_hp_large.webp",
    type: "consumable", price: 45, stackable: true, maxStack: 20, noShop: true,
    effect: { healHp: 200 },
    description: "Відновлює 200 здоров'я. Торговці таким не торгують."
  },
  potion_mp_small: {
    name: "Мале зілля мани", img: "potion_mp_small.webp",
    type: "consumable", price: 6, stackable: true, maxStack: 20,
    effect: { healMp: 20 },
    description: "Відновлює 20 мани."
  },
  potion_mp_medium: {
    name: "Середнє зілля мани", img: "potion_mp_medium.webp",
    type: "consumable", price: 18, stackable: true, maxStack: 20,
    effect: { healMp: 50 },
    description: "Відновлює 50 мани."
  },
  potion_mp_large: {
    name: "Велике зілля мани", img: "potion_mp_large.webp",
    type: "consumable", price: 50, stackable: true, maxStack: 20, noShop: true,
    effect: { healMp: 120 },
    description: "Відновлює 120 мани. Торговці таким не торгують."
  },
  potion_magic: {
    name: "Чарівне зілля", img: "potion_magic.webp",
    type: "consumable", price: 150, stackable: true, maxStack: 10, noShop: true, rarity: "rare",
    effect: { healHpPct: 0.5, healMpPct: 0.3 },
    description: "Дуже рідкісне. Відновлює 50% здоров'я та 30% мани."
  },

  // ---------- МАТЕРІАЛИ (здобич з ворогів) ----------
  rat_tail: {
    name: "Щурячий хвіст", img: "rat_tail.webp",
    type: "material", price: 2, stackable: true, maxStack: 99,
    description: "Трофей з льоху. Торговці купують за мідяк."
  },
  rat_skin: {
    name: "Щуряча шкурка", img: "rat_skin.webp",
    type: "material", price: 3, stackable: true, maxStack: 99,
    description: "Дрібна, але шкірник візьме."
  },
  wolf_pelt: {
    name: "Вовча шкура", img: "wolf_pelt.webp",
    type: "material", price: 6, stackable: true, maxStack: 99,
    description: "Можна продати торговцю."
  },
  wolf_fang: {
    name: "Вовче ікло", img: "wolf_fang.webp",
    type: "material", price: 5, stackable: true, maxStack: 99,
    description: "Гостре. Згодиться на амулет."
  },
  white_pelt: {
    name: "Біла вовча шкура", img: "white_pelt.webp",
    type: "material", price: 12, stackable: true, maxStack: 99,
    description: "Рідкісне хутро, за нього добре платять."
  },
  slime_gel: {
    name: "Слиз", img: "slime_gel.webp",
    type: "material", price: 2, stackable: true, maxStack: 99,
    description: "Липкий і трохи світиться."
  }
};

// ---------- Допоміжні функції ----------

// Повертає опис предмета або null, якщо такого ID немає
function getItem(id) {
  return ITEMS[id] || null;
}

// Повний шлях до картинки предмета (з запасною картинкою)
function itemImg(id) {
  const item = ITEMS[id];
  return IMG_BASE + (item ? item.img : "unknown.webp");
}

// Чи можна вдягнути предмет
function isEquippable(id) {
  return !!ITEMS[id]?.slot;
}

// Ціни торговця: продає за 150%, купує за 50% (мінімум 1 золотий)
const SHOP_SELL_RATE = 1.5;
const SHOP_BUY_RATE = 0.5;
function shopSellPrice(id) { return Math.ceil((ITEMS[id]?.price || 0) * SHOP_SELL_RATE); }
function shopBuyPrice(id)  { return Math.max(1, Math.floor((ITEMS[id]?.price || 0) * SHOP_BUY_RATE)); }

Object.assign(RPG, {
  SLOTS, STAT_NAMES, ITEMS, getItem, itemImg, isEquippable,
  SHOP_SELL_RATE, SHOP_BUY_RATE, shopSellPrice, shopBuyPrice
});
})(window.RPG);
