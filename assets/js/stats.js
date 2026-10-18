// ============================================================
// stats.js — АТРИБУТИ персонажа та їхній вплив на бій
//   Сила (str), Спритність (agi), Інтелект (int),
//   Витривалість (vit), Дух (spi)
//
// Атрибути зберігаються в сейві: save.character.attrs
// За кожен новий рівень персонаж отримує POINTS_PER_LEVEL вільних очок
// (save.character.freePoints), які гравець вкладає на сторінці «Персонаж».
// Речі теж можуть давати атрибути: stats: { str: 1, agi: 1 }.
//
// Підключається ПІСЛЯ data/classes.js і ДО character.js.
// ============================================================

(function (RPG) {
  const ATTRS = {
    str: "Сила",
    agi: "Спритність",
    int: "Інтелект",
    vit: "Витривалість",
    spi: "Дух"
  };

  // Скільки вільних очок дається за кожен новий рівень
  const POINTS_PER_LEVEL = 3;

  // Верхні межі (у відсотках), щоб не було 100% криту чи блоку
  const CAP = {
    critFromAttr: 30,   // атрибути додають до криту не більше +30%
    blockFromAttr: 25,  // атрибути дають блок не більше 25%
    crit: 60,           // загальний шанс криту (з речами) — макс. 60%
    block: 50           // загальний шанс блоку (з щитом) — макс. 50%
  };

  // «М'яке» зростання: перші очки дають багато, далі все менше,
  // значення ніколи не перевищить cap. k — скільки очок дає половину cap.
  function soft(points, k, cap) {
    if (points <= 0) return 0;
    return cap * points / (points + k);
  }

  // Що дають атрибути. Результат ДОДАЄТЬСЯ до характеристик професії.
  //   hp/mp            — максимум здоров'я та мани
  //   attack / magic   — фізична шкода / сила заклинань
  //   defense          — зменшує фізичну шкоду, magicDefense — магічну
  //   speed            — хто б'є першим + шанс додаткового швидкого удару
  //   crit, blockPhys, blockMag — шанси у відсотках
  //   hpRegen / mpRegen — скільки відновлюється кожні 10 секунд
  function attrBonuses(a) {
    return {
      hp:           a.vit * 10,
      mp:           a.int * 6 + a.spi * 2,
      attack:       a.str * 2 + a.agi * 0.5,
      magic:        a.int * 2 + a.spi * 0.5,
      defense:      a.vit * 1 + a.str * 0.5,
      magicDefense: a.spi * 1 + a.int * 0.3,
      speed:        a.agi * 0.5,
      crit:         soft(a.agi, 100, CAP.critFromAttr),
      blockPhys:    soft(a.agi * 0.5 + a.str * 0.5, 120, CAP.blockFromAttr),
      blockMag:     soft(a.spi, 120, CAP.blockFromAttr),
      hpRegen:      1 + a.vit * 0.5,
      mpRegen:      1 + a.spi * 0.5 + a.int * 0.2
    };
  }

  // Атрибути персонажа + бонуси атрибутів з усіх вдягнених речей
  function totalAttrs(save) {
    const own = save.character.attrs || {};
    const total = {};
    for (const key in ATTRS) total[key] = own[key] || 0;
    for (const slot in save.equipment) {
      const item = RPG.ITEMS[save.equipment[slot]];
      for (const key in item?.stats || {}) {
        if (key in ATTRS) total[key] += item.stats[key];
      }
    }
    return total;
  }

  // Вкласти одне вільне очко в атрибут
  function addAttrPoint(save, key) {
    const ch = save.character;
    if (!ATTRS[key] || !(ch.freePoints > 0)) return false;
    ch.attrs[key] = (ch.attrs[key] || 0) + 1;
    ch.freePoints--;
    return true;
  }

  Object.assign(RPG, { ATTRS, POINTS_PER_LEVEL, STAT_CAP: CAP, soft, attrBonuses, totalAttrs, addAttrPoint });
})(window.RPG);
