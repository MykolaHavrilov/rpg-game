// ============================================================
// ПРОФЕСІЇ ПЕРСОНАЖА
// baseStats  — бойові характеристики на 1 рівні цієї професії
// growth     — скільки додається за КОЖЕН новий рівень
// baseAttrs  — стартові атрибути (Сила, Спритність, Інтелект,
//              Витривалість, Дух) — див. stats.js
// levelAttrs — СТАЛІ бонуси атрибутів за КОЖЕН новий рівень у цій професії
//              (додаються автоматично, окрім 3 вільних очок на вибір)
// changeBonus — разовий бонус атрибутів, коли персонаж ПЕРЕХОДИТЬ на цю професію.
//              Вищі професії мають більші levelAttrs і changeBonus.
//              Бонуси, здобуті в попередніх професіях, лишаються назавжди.
// levelTable — яку таблицю досвіду використовує (levels.js)
// tier       — ранг професії: 1 — стартова, 2 — перша зміна і т.д.
// requires   — умови, щоб отримати цю професію:
//              from  — з яких професій можна перейти
//              level — мінімальний рівень у попередній професії
//
// Підсумкові характеристики = baseStats + growth × (рівень − 1)
//                            + бонуси атрибутів + вдягнені речі
//
// При зміні професії рівень і досвід професії скидаються,
// а характеристики рахуються вже з нової професії.
// ============================================================

(function (RPG) {
  const DEFAULT_CLASS = "peasant";

  const CLASSES = {
    peasant: {
      name: "Рекрут",
      description: "Звичайний мешканець села, що вирушив назустріч пригодам.",
      img: "assets/images/hero_1_farm_sunset.webp",
      tier: 1,
      levelTable: "standard",
      baseStats: { hp: 100, mp: 30, attack: 5, magic: 2, defense: 3, magicDefense: 1, speed: 5, crit: 5 },
      growth:    { hp: 12,  mp: 4,  attack: 2, magic: 1, defense: 1, magicDefense: 0.5, speed: 0.5, crit: 0.2 },
      baseAttrs: { str: 1, agi: 1, int: 1, vit: 1, spi: 1 },
      levelAttrs: { str: 1, agi: 1, vit: 1 },   // +3 атрибути за рівень автоматично
      startItems: [
        { id: "sword_t1", equip: true },
        { id: "linen_chest", equip: true },
        { id: "linen_legs", equip: true },
        { id: "shield_t1", qty: 1 },       // лежить в інвентарі — можна вдягнути
        { id: "linen_feet", qty: 1 },      // лежить в інвентарі — можна вдягнути
        { id: "potion_hp_small", qty: 3 },
        { id: "potion_mp_small", qty: 1 }
      ],
      startGold: 50,
      startLocation: "home"
    }

    // ---------- Майбутні професії (розкоментуй, коли будеш готовий) ----------
    // knight: {
    //   name: "Рицар",
    //   description: "Важка броня і надійний меч.",
    //   img: "assets/images/hero_2_forest_cottage.webp",
    //   tier: 2,
    //   levelTable: "standard",
    //   requires: { from: ["peasant"], level: 10 },
    //   baseStats: { hp: 220, mp: 40, attack: 18, magic: 4, defense: 15, magicDefense: 6, speed: 8, crit: 6 },
    //   growth:    { hp: 20,  mp: 3,  attack: 3,  magic: 0.5, defense: 2, magicDefense: 1, speed: 0.5, crit: 0.2 },
    //   levelAttrs:  { str: 2, agi: 1, vit: 2 },   // +5 за рівень
    //   changeBonus: { str: 5, vit: 5 }
    // },
    // mage: {
    //   name: "Маг",
    //   description: "Сила заклинань замість сили м'язів.",
    //   img: "assets/images/hero_3_night_farm.webp",
    //   tier: 2,
    //   levelTable: "standard",
    //   requires: { from: ["peasant"], level: 10 },
    //   baseStats: { hp: 140, mp: 120, attack: 6, magic: 22, defense: 6, magicDefense: 14, speed: 9, crit: 7 },
    //   growth:    { hp: 10,  mp: 10,  attack: 1, magic: 4,  defense: 1, magicDefense: 2, speed: 0.5, crit: 0.3 },
    //   levelAttrs:  { int: 3, spi: 2 },   // +5 за рівень
    //   changeBonus: { int: 6, spi: 4 }
    // },
    // archer: {
    //   name: "Лучник",
    //   description: "Швидкий і влучний.",
    //   img: "assets/images/hero_2_forest_cottage.webp",
    //   tier: 2,
    //   levelTable: "standard",
    //   requires: { from: ["peasant"], level: 10 },
    //   baseStats: { hp: 170, mp: 50, attack: 15, magic: 5, defense: 9, magicDefense: 6, speed: 15, crit: 12 },
    //   growth:    { hp: 14,  mp: 4,  attack: 3,  magic: 0.5, defense: 1, magicDefense: 1, speed: 1, crit: 0.5 },
    //   levelAttrs:  { str: 1, agi: 3, vit: 1 },   // +5 за рівень
    //   changeBonus: { agi: 6, str: 2, vit: 2 }
    // }
  };

  function getClass(id) {
    return CLASSES[id] || CLASSES[DEFAULT_CLASS];
  }

  // Повний шлях до картинки героя
  function classImg(id) {
    return RPG.asset(getClass(id).img);
  }

  // Список професій, на які персонаж може перейти зараз
  // Повертає масив ID, напр. ["knight", "mage", "archer"]
  function availableClassChanges(currentClassId, currentLevel) {
    return Object.keys(CLASSES).filter(id => {
      const req = CLASSES[id].requires;
      if (!req) return false;
      return req.from.includes(currentClassId) && currentLevel >= req.level;
    });
  }

  Object.assign(RPG, { DEFAULT_CLASS, CLASSES, getClass, classImg, availableClassChanges });
})(window.RPG);
