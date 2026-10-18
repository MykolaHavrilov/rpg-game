// ============================================================
// ДОВІДНИК ВОРОГІВ ТА ЛОКАЦІЙ
// stats: hp, mp, attack, magic, defense, magicDefense, speed,
//        crit (%), blockPhys (%), blockMag (%)
// exp  — скільки досвіду дає КОЖЕН убитий ворог
//        (і від нього ж рахується штраф при загибелі героя: exp × 10)
// gold — [мін, макс]
// loot — chance — шанс від 0 до 1, qty — [мін, макс]
//        Чим вищий рівень ворога, тим кращі речі та більші зілля.
// img  — шлях від кореня гри (game_00004)
// ============================================================

(function (RPG) {
  const DEFAULT_ENEMY_IMG = "assets/images/enemy_rat_1_barn_cellar.webp";

  const ENEMIES = {
    // ---------- Щури (1–3 рівень) ----------
    rat: {
      name: "Щур з льоху",
      img: "assets/images/enemy_rat_1_barn_cellar.webp",
      level: 1,
      stats: { hp: 30, mp: 0, attack: 7, defense: 1, magicDefense: 0, speed: 4, crit: 3 },
      exp: 2,
      gold: [0, 2],
      loot: [
        { id: "rat_tail",        chance: 0.50, qty: [1, 1] },
        { id: "potion_hp_small", chance: 0.06, qty: [1, 1] },
        { id: "pants_linen",     chance: 0.01, qty: [1, 1] }
      ]
    },
    rat2: {
      name: "Щур з поля",
      img: "assets/images/enemy_rat_2_sewer.webp",
      level: 2,
      stats: { hp: 45, mp: 0, attack: 10, defense: 2, magicDefense: 1, speed: 5, crit: 4 },
      exp: 6,
      gold: [1, 4],
      loot: [
        { id: "rat_tail",        chance: 0.55, qty: [1, 2] },
        { id: "rat_skin",        chance: 0.25, qty: [1, 1] },
        { id: "potion_hp_small", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_small", chance: 0.04, qty: [1, 1] },
        { id: "cap_leather",     chance: 0.012, qty: [1, 1] },
        { id: "dagger_rusty",    chance: 0.010, qty: [1, 1] }
      ]
    },
    rat3: {
      name: "Щур з підвалу",
      img: "assets/images/enemy_rat_3_plague.webp",
      level: 3,
      stats: { hp: 65, mp: 0, attack: 14, defense: 3, magicDefense: 1, speed: 6, crit: 5 },
      exp: 20,
      gold: [3, 8],
      loot: [
        { id: "rat_tail",         chance: 0.60, qty: [1, 2] },
        { id: "rat_skin",         chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.10, qty: [1, 1] },
        { id: "potion_mp_small",  chance: 0.06, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.02, qty: [1, 1] },
        { id: "ring_copper",      chance: 0.012, qty: [1, 1] },
        { id: "pants_leather",    chance: 0.012, qty: [1, 1] },
        { id: "armor_leather",    chance: 0.008, qty: [1, 1] },
        { id: "sword_iron",       chance: 0.008, qty: [1, 1] }
      ]
    },

    // ---------- Вовки (4–6 рівень) ----------
    wolf: {
      name: "Сірий вовк",
      img: "assets/images/enemy_wolf_1_forest.webp",
      level: 4,
      stats: { hp: 110, mp: 0, attack: 20, defense: 5, magicDefense: 2, speed: 8, crit: 6, blockPhys: 3 },
      exp: 40,
      gold: [5, 12],
      loot: [
        { id: "wolf_pelt",        chance: 0.45, qty: [1, 1] },
        { id: "wolf_fang",        chance: 0.25, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.08, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.025, qty: [1, 1] },
        { id: "boots_leather",    chance: 0.012, qty: [1, 1] },
        { id: "club_spiked",      chance: 0.010, qty: [1, 1] },
        { id: "shield_iron",      chance: 0.008, qty: [1, 1] },
        { id: "amulet_fang",      chance: 0.006, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.003, qty: [1, 1] }
      ]
    },
    wolf2: {
      name: "Чорний вовк",
      img: "assets/images/enemy_wolf_2_moon_howl.webp",
      level: 5,
      stats: { hp: 150, mp: 0, attack: 26, defense: 7, magicDefense: 3, speed: 9, crit: 8, blockPhys: 4 },
      exp: 60,
      gold: [8, 18],
      loot: [
        { id: "wolf_pelt",        chance: 0.50, qty: [1, 2] },
        { id: "wolf_fang",        chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.07, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.045, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.008, qty: [1, 1] },
        { id: "hood_wolf",        chance: 0.012, qty: [1, 1] },
        { id: "staff_moon",       chance: 0.008, qty: [1, 1] },
        { id: "ring_silver",      chance: 0.006, qty: [1, 1] },
        { id: "amulet_fang",      chance: 0.008, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.005, qty: [1, 1] }
      ]
    },
    wolf3: {
      name: "Білий вовк",
      img: "assets/images/enemy_wolf_3_snow.webp",
      level: 6,
      stats: { hp: 200, mp: 0, attack: 32, defense: 9, magicDefense: 4, speed: 10, crit: 10, blockPhys: 5 },
      exp: 90,
      gold: [12, 25],
      loot: [
        { id: "white_pelt",       chance: 0.45, qty: [1, 1] },
        { id: "wolf_fang",        chance: 0.40, qty: [1, 2] },
        { id: "potion_hp_medium", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.015, qty: [1, 1] },
        { id: "potion_mp_large",  chance: 0.010, qty: [1, 1] },
        { id: "armor_wolf",       chance: 0.010, qty: [1, 1] },
        { id: "sword_steel",      chance: 0.008, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.008, qty: [1, 1] }
      ]
    }
  };

  // ---------- Локації ----------
  // type:
  //   "home"   — Домівка: битися заборонено, сундук, +5% HP/MP кожні 10 с
  //   "temple" — Храм: тут відроджуються загиблі, молитва за полеглих у групі
  //   "tavern" — Шинок: торговець (shop — що він продає)
  //   "combat" — бойова локація (enemies — хто трапляється)
  // locked: true — «Закрито — відкриється згодом»
  // ID локацій НЕ перейменовувати (вони в сейвах). village_start — це Ферма.
  const LOCATIONS = {
    home: {
      name: "Домівка",
      type: "home",
      description: "Рідна хата. Тут не б'ються: можна перепочити, розібрати речі й сховати цінне в сундук."
    },
    temple: {
      name: "Храм",
      type: "temple",
      description: "Сюди повертаються полеглі. Молитва тут відроджує загиблих побратимів."
    },
    village_start: {
      name: "Ферма",
      type: "combat",
      description: "Звідки беруться ці щури — з льоху під коморою, з підвалу під амбаром чи з поля? Та й вони тут не найстрашніші…",
      enemies: ["rat", "rat2", "rat3", "wolf", "wolf2", "wolf3"]
    },
    tavern: {
      name: "Шинок біля млина",
      type: "tavern",
      description: "Пахне хлібом і пивом. Шинкар купує все, але дешево, а продає — дорожче.",
      merchant: "Шинкар Остап",
      shop: [
        "potion_hp_small", "potion_hp_medium", "potion_mp_small", "potion_mp_medium",
        "sword_wood", "dagger_rusty", "staff_oak", "shield_wood",
        "cap_leather", "shirt_linen", "pants_linen", "boots_simple"
      ]
    },
    forest_path: {
      name: "Лісова стежка",
      type: "combat",
      locked: true,
      description: "Закрито — відкриється згодом.",
      enemies: []
    },
    forest_cave: {
      name: "Печера в лісі",
      type: "combat",
      locked: true,
      description: "Закрито — відкриється згодом.",
      enemies: []
    }
  };
  const DEFAULT_LOCATION = "home";
  const RESPAWN_LOCATION = "temple";

  function getEnemy(id) {
    return ENEMIES[id] || null;
  }

  function enemyImg(id) {
    return RPG.asset(ENEMIES[id]?.img || DEFAULT_ENEMY_IMG);
  }

  function getLocation(id) {
    return LOCATIONS[id] || LOCATIONS[DEFAULT_LOCATION];
  }

  // Чи можна на локації битися
  function isCombatLocation(id) {
    const loc = getLocation(id);
    return loc.type === "combat" && !loc.locked && (loc.enemies || []).length > 0;
  }

  // Випадковий ворог для локації.
  // Вороги близького до героя рівня трапляються частіше, а набагато
  // сильніші — рідко (але трапляються, тож обережно!).
  function enemyWeight(enemyLevel, heroLevel) {
    const diff = enemyLevel - heroLevel;
    if (diff >= 3) return 0.08;
    if (diff === 2) return 0.3;
    if (diff <= -3) return 0.3;
    return 1;
  }

  function pickEnemy(locationId, heroLevel = 1) {
    const list = getLocation(locationId).enemies || [];
    if (!list.length) return null;
    const weights = list.map(id => enemyWeight(ENEMIES[id].level, heroLevel));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) {
      r -= weights[i];
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  // Випадкова здобич після перемоги: { gold, items: [{id, qty}] }
  function rollLoot(enemyId) {
    const enemy = ENEMIES[enemyId];
    if (!enemy) return { gold: 0, items: [] };
    const items = [];
    for (const drop of enemy.loot) {
      if (Math.random() < drop.chance) {
        items.push({ id: drop.id, qty: RPG.randInt(drop.qty[0], drop.qty[1]) });
      }
    }
    return { gold: RPG.randInt(enemy.gold[0], enemy.gold[1]), items };
  }

  Object.assign(RPG, {
    ENEMIES, LOCATIONS, DEFAULT_LOCATION, RESPAWN_LOCATION,
    getEnemy, enemyImg, getLocation, isCombatLocation, pickEnemy, rollLoot
  });
})(window.RPG);
