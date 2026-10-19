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
// maxStack — скільки штук в одній клітинці: зілля 100, ресурси 200.
// tier    — вид/клас речі: 1 — дерев'яна/лляна/мідна (з 1 рівня, біжутерія з 2),
//           2 — кам'яна/шкіряна/срібна (з 10 рівня), 3 — залізна/золота (з 20 рівня).
// weaponType — тип основної зброї: sword, dagger, axe, bow, staff (див. data/skills.js).
//           Зброя 2 виду потребує володіння 10, 3 виду — володіння 20.
// offType — річ для лівої руки: shield, quiver (лише з луком), orb, knife.
// img: null — картинки ще немає: показується заглушка з назвою та кольором рідкості.
// effect  — для зілля: healHp / healMp (одиниці),
//           healHpPct / healMpPct (частка від максимуму: 0.5 = 50%).
// ============================================================

(function (RPG) {
// Папка з картинками предметів (шлях рахує core.js від кореня гри)
const IMG_BASE = RPG.asset("assets/img/items/");

// Слоти екіпірування
// Слоти екіпірування (12) — у такому порядку показуються в грі
const SLOTS = {
  mainHand: "Права рука (зброя)",
  offHand: "Ліва рука",
  head: "Голова",
  chest: "Тіло",
  legs: "Штани",
  hands: "Наручі",
  feet: "Взуття",
  earring1: "Сережка 1",
  ring1: "Кільце 1",
  amulet: "Амулет",
  ring2: "Кільце 2",
  earring2: "Сережка 2"
};
// Кільця й сережки можна носити по дві: slot предмета → слоти персонажа
const SLOT_GROUPS = {
  ring: ["ring1", "ring2"],
  earring: ["earring1", "earring2"]
};
function slotsFor(itemSlot) {
  return SLOT_GROUPS[itemSlot] || (itemSlot ? [itemSlot] : []);
}

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
  attackSpeedPct: "Швидкість атаки (володіння), %",
  dodge: "Ухилення, %",
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
  // ---------- ОСНОВНА ЗБРОЯ (права рука) ----------
  sword_t1: {
    name: "Дерев'яний меч", img: "sword_wood.webp",
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 12, weaponType: "sword",
    stats: { attack: 5, crit: 1 },
    description: "Тренувальний меч зі звичайного дерева."
  },
  sword_t2: {
    name: "Кам'яний меч", img: null,
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 180, weaponType: "sword",
    stats: { attack: 20, crit: 2 },
    description: "Важкий меч із тесаного каменю."
  },
  sword_t3: {
    name: "Залізний меч", img: "sword_iron.webp",
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 900, weaponType: "sword", noShop: true,
    stats: { attack: 40, crit: 3 },
    description: "Надійний залізний клинок."
  },
  dagger_t1: {
    name: "Дерев'яний кинджал", img: null,
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 12, weaponType: "dagger",
    stats: { attack: 4, crit: 3, speed: 1 },
    description: "Легкий дерев'яний кинджал."
  },
  dagger_t2: {
    name: "Кам'яний кинджал", img: null,
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 170, weaponType: "dagger",
    stats: { attack: 15, crit: 5, speed: 2 },
    description: "Гострий кремінний кинджал."
  },
  dagger_t3: {
    name: "Залізний кинджал", img: "dagger_rusty.webp",
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 850, weaponType: "dagger", noShop: true,
    stats: { attack: 30, crit: 8, speed: 3 },
    description: "Залізний кинджал — швидкий і підступний."
  },
  axe_t1: {
    name: "Дерев'яна сокира", img: null,
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "axe",
    stats: { attack: 7, str: 1, speed: -1 },
    description: "Груба дерев'яна сокира — б'є сильно, але повільно."
  },
  axe_t2: {
    name: "Кам'яна сокира", img: null,
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "axe",
    stats: { attack: 26, str: 2, speed: -1 },
    description: "Кам'яна сокира з важким обухом."
  },
  axe_t3: {
    name: "Залізна сокира", img: null,
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "axe", noShop: true,
    stats: { attack: 50, str: 3, speed: -2 },
    description: "Залізна сокира лісоруба-воїна."
  },
  bow_t1: {
    name: "Дерев'яний лук", img: null,
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "bow",
    stats: { attack: 5, crit: 2, speed: 1 },
    description: "Простий дерев'яний лук."
  },
  bow_t2: {
    name: "Кам'яний лук", img: null,
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "bow",
    stats: { attack: 19, crit: 3, speed: 2 },
    description: "Лук із кам'яними вістрями стріл."
  },
  bow_t3: {
    name: "Залізний лук", img: null,
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "bow", noShop: true,
    stats: { attack: 38, crit: 4, speed: 3 },
    description: "Лук, окутий залізом."
  },
  staff_t1: {
    name: "Дерев'яний посох", img: "staff_oak.webp",
    type: "weapon", slot: "mainHand", tier: 1, levelReq: 1, price: 14, weaponType: "staff",
    stats: { attack: 1, magic: 6, mp: 10, int: 1 },
    description: "Дерев'яний посох учня. Кидає «Іскру»."
  },
  staff_t2: {
    name: "Кам'яний посох", img: null,
    type: "weapon", slot: "mainHand", tier: 2, levelReq: 10, price: 190, weaponType: "staff",
    stats: { attack: 3, magic: 22, mp: 30, int: 2 },
    description: "Кам'яний посох з рунами."
  },
  staff_t3: {
    name: "Залізний посох", img: null,
    type: "weapon", slot: "mainHand", tier: 3, levelReq: 20, price: 950, weaponType: "staff", noShop: true,
    stats: { attack: 6, magic: 44, mp: 60, int: 3 },
    description: "Залізний посох бойового мага."
  },

  // ---------- ДРУГА РУКА ----------
  shield_t1: {
    name: "Дерев'яний щит", img: "shield_wood.webp",
    type: "shield", slot: "offHand", tier: 1, levelReq: 1, price: 12, offType: "shield",
    stats: { defense: 3, blockPhys: 8 },
    description: "Легкий щит із дощок."
  },
  shield_t2: {
    name: "Шкіряний щит", img: null,
    type: "shield", slot: "offHand", tier: 2, levelReq: 10, price: 160, offType: "shield",
    stats: { defense: 12, blockPhys: 12 },
    description: "Щит, обтягнутий товстою шкірою."
  },
  shield_t3: {
    name: "Залізний щит", img: "shield_iron.webp",
    type: "shield", slot: "offHand", tier: 3, levelReq: 20, price: 800, offType: "shield", noShop: true,
    stats: { defense: 24, blockPhys: 16 },
    description: "Важкий залізний щит."
  },
  quiver_t1: {
    name: "Полотняний колчан", img: null,
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 10, offType: "quiver",
    stats: { attack: 2, speed: 1 },
    description: "Колчан для стріл. Лише разом з луком."
  },
  quiver_t2: {
    name: "Шкіряний колчан", img: null,
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 150, offType: "quiver",
    stats: { attack: 7, speed: 2 },
    description: "Шкіряний колчан — стріли під рукою. Лише з луком."
  },
  quiver_t3: {
    name: "Окутий колчан", img: null,
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 750, offType: "quiver", noShop: true,
    stats: { attack: 14, speed: 3 },
    description: "Окутий колчан для бойових стріл. Лише з луком."
  },
  orb_t1: {
    name: "Скляна сфера", img: null,
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 12, offType: "orb",
    stats: { magic: 3, mp: 10, mpRegen: 0.5 },
    description: "Скляна куля, що тихо світиться."
  },
  orb_t2: {
    name: "Кам'яна сфера", img: null,
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 160, offType: "orb",
    stats: { magic: 11, mp: 30, mpRegen: 1 },
    description: "Кам'яна сфера з магічними рунами."
  },
  orb_t3: {
    name: "Залізна сфера", img: null,
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 800, offType: "orb", noShop: true,
    stats: { magic: 22, mp: 60, mpRegen: 2 },
    description: "Сфера в залізній оправі з кристалом."
  },
  knife_t1: {
    name: "Дерев'яний малий кинджал", img: null,
    type: "offhand", slot: "offHand", tier: 1, levelReq: 1, price: 10, offType: "knife",
    stats: { attack: 2, crit: 2 },
    description: "Короткий клинок для лівої руки."
  },
  knife_t2: {
    name: "Кам'яний малий кинджал", img: null,
    type: "offhand", slot: "offHand", tier: 2, levelReq: 10, price: 150, offType: "knife",
    stats: { attack: 8, crit: 3 },
    description: "Кремінний ніж для лівої руки."
  },
  knife_t3: {
    name: "Залізний малий кинджал", img: null,
    type: "offhand", slot: "offHand", tier: 3, levelReq: 20, price: 750, offType: "knife", noShop: true,
    stats: { attack: 16, crit: 5 },
    description: "Залізний малий кинджал для лівої руки."
  },

  // ---------- БРОНЯ ----------
  linen_head: {
    name: "Лляна шапка", img: null,
    type: "armor", slot: "head", tier: 1, levelReq: 1, price: 6, set: "linen",
    stats: { defense: 1, hp: 5 },
    description: "Частина лляного комплекту."
  },
  linen_chest: {
    name: "Лляна сорочка", img: "shirt_linen.webp",
    type: "armor", slot: "chest", tier: 1, levelReq: 1, price: 10, set: "linen",
    stats: { defense: 2, hp: 10 },
    description: "Частина лляного комплекту."
  },
  linen_legs: {
    name: "Лляні штани", img: "pants_linen.webp",
    type: "armor", slot: "legs", tier: 1, levelReq: 1, price: 8, set: "linen",
    stats: { defense: 1, hp: 5 },
    description: "Частина лляного комплекту."
  },
  linen_hands: {
    name: "Лляні наручі", img: null,
    type: "armor", slot: "hands", tier: 1, levelReq: 1, price: 6, set: "linen",
    stats: { defense: 1, attack: 1 },
    description: "Частина лляного комплекту."
  },
  linen_feet: {
    name: "Лляні черевики", img: "boots_simple.webp",
    type: "armor", slot: "feet", tier: 1, levelReq: 1, price: 8, set: "linen",
    stats: { defense: 1, speed: 1 },
    description: "Частина лляного комплекту."
  },
  leather_head: {
    name: "Шкіряна шапка", img: "cap_leather.webp",
    type: "armor", slot: "head", tier: 2, levelReq: 10, price: 90, set: "leather", noShop: true,
    stats: { defense: 5, hp: 20 },
    description: "Частина шкіряного комплекту."
  },
  leather_chest: {
    name: "Шкіряна куртка", img: "armor_leather.webp",
    type: "armor", slot: "chest", tier: 2, levelReq: 10, price: 150, set: "leather", noShop: true,
    stats: { defense: 9, hp: 35 },
    description: "Частина шкіряного комплекту."
  },
  leather_legs: {
    name: "Шкіряні штани", img: "pants_leather.webp",
    type: "armor", slot: "legs", tier: 2, levelReq: 10, price: 110, set: "leather", noShop: true,
    stats: { defense: 6, hp: 25 },
    description: "Частина шкіряного комплекту."
  },
  leather_hands: {
    name: "Шкіряні наручі", img: null,
    type: "armor", slot: "hands", tier: 2, levelReq: 10, price: 90, set: "leather", noShop: true,
    stats: { defense: 4, attack: 3 },
    description: "Частина шкіряного комплекту."
  },
  leather_feet: {
    name: "Шкіряні чоботи", img: "boots_leather.webp",
    type: "armor", slot: "feet", tier: 2, levelReq: 10, price: 100, set: "leather", noShop: true,
    stats: { defense: 4, speed: 2 },
    description: "Частина шкіряного комплекту."
  },
  iron_head: {
    name: "Залізний шолом", img: null,
    type: "armor", slot: "head", tier: 3, levelReq: 20, price: 450, set: "iron", noShop: true,
    stats: { defense: 10, hp: 40 },
    description: "Частина залізного комплекту."
  },
  iron_chest: {
    name: "Залізна кіраса", img: null,
    type: "armor", slot: "chest", tier: 3, levelReq: 20, price: 750, set: "iron", noShop: true,
    stats: { defense: 18, hp: 70 },
    description: "Частина залізного комплекту."
  },
  iron_legs: {
    name: "Залізні поножі", img: null,
    type: "armor", slot: "legs", tier: 3, levelReq: 20, price: 550, set: "iron", noShop: true,
    stats: { defense: 12, hp: 50 },
    description: "Частина залізного комплекту."
  },
  iron_hands: {
    name: "Залізні наручі", img: null,
    type: "armor", slot: "hands", tier: 3, levelReq: 20, price: 450, set: "iron", noShop: true,
    stats: { defense: 8, attack: 6 },
    description: "Частина залізного комплекту."
  },
  iron_feet: {
    name: "Залізні чоботи", img: null,
    type: "armor", slot: "feet", tier: 3, levelReq: 20, price: 500, set: "iron", noShop: true,
    stats: { defense: 8, speed: 3 },
    description: "Частина залізного комплекту."
  },

  // ---------- БІЖУТЕРІЯ ----------
  ring_t1: {
    name: "Мідне кільце", img: "ring_copper.webp",
    type: "accessory", slot: "ring", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { crit: 2 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  ring_t2: {
    name: "Срібне кільце", img: "ring_silver.webp",
    type: "accessory", slot: "ring", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { crit: 3, str: 2 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  ring_t3: {
    name: "Золоте кільце", img: null,
    type: "accessory", slot: "ring", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { crit: 5, str: 4 },
    description: "Кільце з невеликим бонусом. Можна носити два кільця."
  },
  amulet_t1: {
    name: "Мідний амулет", img: null,
    type: "accessory", slot: "amulet", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { hp: 15, spi: 1 },
    description: "Амулет на шиї."
  },
  amulet_t2: {
    name: "Срібний амулет", img: null,
    type: "accessory", slot: "amulet", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { hp: 50, spi: 3 },
    description: "Амулет на шиї."
  },
  amulet_t3: {
    name: "Золотий амулет", img: null,
    type: "accessory", slot: "amulet", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { hp: 100, spi: 5 },
    description: "Амулет на шиї."
  },
  earring_t1: {
    name: "Мідна сережка", img: null,
    type: "accessory", slot: "earring", tier: 1, levelReq: 2, price: 30, noShop: true,
    stats: { mp: 10, dodge: 1 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },
  earring_t2: {
    name: "Срібна сережка", img: null,
    type: "accessory", slot: "earring", tier: 2, levelReq: 10, price: 250, noShop: true,
    stats: { mp: 30, dodge: 2 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },
  earring_t3: {
    name: "Золота сережка", img: null,
    type: "accessory", slot: "earring", tier: 3, levelReq: 20, price: 1200, noShop: true,
    stats: { mp: 60, dodge: 4 },
    description: "Сережка з невеликим бонусом. Можна носити дві сережки."
  },

  // ---------- ЗІЛЛЯ ----------
  // Малі та середні продає шинкар; великі та чарівне — лише з ворогів.
  potion_hp_small: {
    name: "Мале зілля здоров'я", img: "potion_hp_small.webp",
    type: "consumable", price: 5, stackable: true, maxStack: 100,
    effect: { healHp: 30 },
    description: "Відновлює 30 здоров'я."
  },
  potion_hp_medium: {
    name: "Середнє зілля здоров'я", img: "potion_hp_medium.webp",
    type: "consumable", price: 15, stackable: true, maxStack: 100,
    effect: { healHp: 80 },
    description: "Відновлює 80 здоров'я."
  },
  potion_hp_large: {
    name: "Велике зілля здоров'я", img: "potion_hp_large.webp",
    type: "consumable", price: 45, stackable: true, maxStack: 100, noShop: true,
    effect: { healHp: 200 },
    description: "Відновлює 200 здоров'я. Торговці таким не торгують."
  },
  potion_mp_small: {
    name: "Мале зілля мани", img: "potion_mp_small.webp",
    type: "consumable", price: 6, stackable: true, maxStack: 100,
    effect: { healMp: 20 },
    description: "Відновлює 20 мани."
  },
  potion_mp_medium: {
    name: "Середнє зілля мани", img: "potion_mp_medium.webp",
    type: "consumable", price: 18, stackable: true, maxStack: 100,
    effect: { healMp: 50 },
    description: "Відновлює 50 мани."
  },
  potion_mp_large: {
    name: "Велике зілля мани", img: "potion_mp_large.webp",
    type: "consumable", price: 50, stackable: true, maxStack: 100, noShop: true,
    effect: { healMp: 120 },
    description: "Відновлює 120 мани. Торговці таким не торгують."
  },
  potion_magic: {
    name: "Чарівне зілля", img: "potion_magic.webp",
    type: "consumable", price: 150, stackable: true, maxStack: 100, noShop: true, rarity: "rare",
    effect: { healHpPct: 0.5, healMpPct: 0.3 },
    description: "Дуже рідкісне. Відновлює 50% здоров'я та 30% мани."
  },

  // ---------- МАТЕРІАЛИ (здобич з ворогів) ----------
  rat_tail: {
    name: "Щурячий хвіст", img: "rat_tail.webp",
    type: "material", price: 2, stackable: true, maxStack: 200,
    description: "Трофей з льоху. Торговці купують за мідяк."
  },
  rat_skin: {
    name: "Щуряча шкурка", img: "rat_skin.webp",
    type: "material", price: 3, stackable: true, maxStack: 200,
    description: "Дрібна, але шкірник візьме."
  },
  wolf_pelt: {
    name: "Вовча шкура", img: "wolf_pelt.webp",
    type: "material", price: 6, stackable: true, maxStack: 200,
    description: "Можна продати торговцю."
  },
  wolf_fang: {
    name: "Вовче ікло", img: "wolf_fang.webp",
    type: "material", price: 5, stackable: true, maxStack: 200,
    description: "Гостре. Згодиться на амулет."
  },
  white_pelt: {
    name: "Біла вовча шкура", img: "white_pelt.webp",
    type: "material", price: 12, stackable: true, maxStack: 200,
    description: "Рідкісне хутро, за нього добре платять."
  },
  slime_gel: {
    name: "Слиз", img: "slime_gel.webp",
    type: "material", price: 2, stackable: true, maxStack: 200,
    description: "Липкий і трохи світиться."
  }
};

// ---------- Допоміжні функції ----------

// Повертає опис предмета або null, якщо такого ID немає
function getItem(id) {
  return ITEMS[id] || null;
}

// Повний шлях до картинки предмета; null — картинки немає (буде заглушка)
function itemImg(id) {
  const item = ITEMS[id];
  return item?.img ? IMG_BASE + item.img : null;
}

// Старі ID предметів (до нового списку) → нові. Застосовується при завантаженні сейву.
const ITEM_RENAMES = {
  sword_wood: "sword_t1", sword_iron: "sword_t1", sword_steel: "sword_t1",
  dagger_rusty: "dagger_t1", club_spiked: "axe_t1",
  staff_oak: "staff_t1", staff_moon: "staff_t1",
  shield_wood: "shield_t1", shield_iron: "shield_t1",
  cap_leather: "linen_head", hood_wolf: "linen_head",
  shirt_linen: "linen_chest", armor_leather: "linen_chest", armor_wolf: "linen_chest",
  pants_linen: "linen_legs", pants_leather: "linen_legs",
  boots_simple: "linen_feet", boots_leather: "linen_feet",
  ring_copper: "ring_t1", ring_silver: "ring_t1", amulet_fang: "amulet_t1"
};

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
  SLOTS, SLOT_GROUPS, slotsFor, ITEM_RENAMES, STAT_NAMES, ITEMS, getItem, itemImg, isEquippable,
  SHOP_SELL_RATE, SHOP_BUY_RATE, shopSellPrice, shopBuyPrice
});
})(window.RPG);
