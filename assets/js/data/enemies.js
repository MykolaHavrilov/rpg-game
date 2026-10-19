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
        { id: "rat_tail",         chance: 0.5, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.06, qty: [1, 1] },
        { id: "linen_legs",       chance: 0.01, qty: [1, 1] },
        { id: "sword_t1",         chance: 0.006, qty: [1, 1] }
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
        { id: "rat_tail",         chance: 0.55, qty: [1, 2] },
        { id: "rat_skin",         chance: 0.25, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_small",  chance: 0.04, qty: [1, 1] },
        { id: "linen_head",       chance: 0.012, qty: [1, 1] },
        { id: "dagger_t1",        chance: 0.01, qty: [1, 1] },
        { id: "knife_t1",         chance: 0.006, qty: [1, 1] }
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
        { id: "rat_tail",         chance: 0.6, qty: [1, 2] },
        { id: "rat_skin",         chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_small",  chance: 0.1, qty: [1, 1] },
        { id: "potion_mp_small",  chance: 0.06, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.02, qty: [1, 1] },
        { id: "ring_t1",          chance: 0.01, qty: [1, 1] },
        { id: "linen_hands",      chance: 0.012, qty: [1, 1] },
        { id: "linen_chest",      chance: 0.01, qty: [1, 1] },
        { id: "axe_t1",           chance: 0.008, qty: [1, 1] },
        { id: "bow_t1",           chance: 0.008, qty: [1, 1] }
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
        { id: "linen_feet",       chance: 0.012, qty: [1, 1] },
        { id: "axe_t1",           chance: 0.01, qty: [1, 1] },
        { id: "shield_t1",        chance: 0.008, qty: [1, 1] },
        { id: "quiver_t1",        chance: 0.008, qty: [1, 1] },
        { id: "amulet_t1",        chance: 0.006, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.006, qty: [1, 1] },
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
        { id: "wolf_pelt",        chance: 0.5, qty: [1, 2] },
        { id: "wolf_fang",        chance: 0.35, qty: [1, 1] },
        { id: "potion_hp_medium", chance: 0.07, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.045, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.008, qty: [1, 1] },
        { id: "linen_head",       chance: 0.012, qty: [1, 1] },
        { id: "staff_t1",         chance: 0.008, qty: [1, 1] },
        { id: "orb_t1",           chance: 0.008, qty: [1, 1] },
        { id: "ring_t1",          chance: 0.006, qty: [1, 1] },
        { id: "amulet_t1",        chance: 0.008, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.006, qty: [1, 1] },
        { id: "leather_hands",    chance: 0.003, qty: [1, 1] },
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
        { id: "wolf_fang",        chance: 0.4, qty: [1, 2] },
        { id: "potion_hp_medium", chance: 0.08, qty: [1, 1] },
        { id: "potion_mp_medium", chance: 0.05, qty: [1, 1] },
        { id: "potion_hp_large",  chance: 0.015, qty: [1, 1] },
        { id: "potion_mp_large",  chance: 0.01, qty: [1, 1] },
        { id: "linen_chest",      chance: 0.01, qty: [1, 1] },
        { id: "bow_t1",           chance: 0.008, qty: [1, 1] },
        { id: "dagger_t1",        chance: 0.008, qty: [1, 1] },
        { id: "earring_t1",       chance: 0.008, qty: [1, 1] },
        { id: "leather_chest",    chance: 0.004, qty: [1, 1] },
        { id: "sword_t2",         chance: 0.002, qty: [1, 1] },
        { id: "shield_t2",        chance: 0.002, qty: [1, 1] },
        { id: "potion_magic",     chance: 0.008, qty: [1, 1] }
      ]
    }
  };

  // ---------- Локації ----------
  // type:
  //   "home"   — Домівка: битися заборонено, сундук, +5% HP/MP кожні 10 с
  //   "temple" — Храм: тут відроджуються загиблі, молитва за полеглих у групі
  //   "tavern" — Шинок: торговець (shop — що він продає)
  //   "city"   — Місто з районами (districts); Гільдія авантюристів — у Південному
  //   "combat" — бойова локація (enemies — хто трапляється)
  // locked: true — «Закрито — відкриється згодом»
  // minLevel: N — вхід лише з N рівня героя
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
      description: "Звідки беруться ці щури — з льоху під коморою, з підвалу під амбаром чи з поля? Тут водяться лише вони, а от за полем, у лісі, вже виють вовки…",
      enemies: ["rat", "rat2", "rat3"]
    },
    tavern: {
      name: "Шинок біля млина",
      type: "tavern",
      description: "Пахне хлібом і пивом. Шинкар купує все, але дешево, а продає — дорожче.",
      merchant: "Шинкар Остап",
      shop: [
        "potion_hp_small", "potion_hp_medium", "potion_mp_small", "potion_mp_medium",
        "sword_t1", "dagger_t1", "staff_t1", "shield_t1",
        "linen_head", "linen_chest", "linen_legs", "linen_hands", "linen_feet"
      ]
    },
    city: {
      name: "Місто",
      type: "city",
      description: "Мури, дзвони й гамір вулиць. Місто ділиться на райони — поки відкрито лише Південний, де стоїть Гільдія авантюристів.",
      // Райони міста. locked: true — «Закрито — відкриється згодом»
      districts: [
        { id: "center", name: "Центральний район", building: "Мерія", locked: true,
          description: "Площа з фонтаном і кам'яна Мерія, де вирішуються справи міста." },
        { id: "trade", name: "Торговий район", building: "Гільдія торговців і Гільдія ремісників", locked: true,
          description: "Крамниці, майстерні й склади. Тут торгують і кують усе, що потрібно мандрівникам." },
        { id: "south", name: "Південний район", building: "Гільдія авантюристів", locked: false,
          description: "Галасливий квартал найманців. У Гільдії авантюристів дають завдання, торгують зброєю й навчають бою." },
        { id: "north", name: "Північний район", building: "Центральна брама", locked: true,
          description: "Велика брама, крізь яку йдуть каравани та загони до далеких земель." },
        { id: "rest", name: "Спальний район", building: "Будинки для відпочинку", locked: true,
          description: "Тихі вулички з будинками, де можна винайняти кімнату й відпочити." }
      ]
    },
    forest_path: {
      name: "Лісова стежка",
      type: "combat",
      minLevel: 3,
      description: "Вузька стежка між темних ялин. Тут полюють вовки — сірі, чорні, а подекуди й білі. Новачкам сюди зарано.",
      enemies: ["wolf", "wolf2", "wolf3"]
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

  // Торговець Гільдії авантюристів (місто): зброя 1–2 виду, малі й середні зілля
  const GUILD_SHOP = [
    "potion_hp_small", "potion_hp_medium", "potion_mp_small", "potion_mp_medium",
    "sword_t1", "dagger_t1", "axe_t1", "bow_t1", "staff_t1",
    "shield_t1", "quiver_t1", "orb_t1", "knife_t1",
    "sword_t2", "dagger_t2", "axe_t2", "bow_t2", "staff_t2",
    "shield_t2", "quiver_t2", "orb_t2", "knife_t2"
  ];
  const RESPAWN_LOCATION = "temple";

  // ---------- Чемпіони ----------
  // З шансом 0,1% замість звичайного ворога з'являється чемпіон (золота рамка):
  //   показники ×3 (здоров'я, мана, атака, магія, захист, маг. захист;
  //   відсоткові шанси і швидкість — як у звичайного),
  //   Гільдія авантюристів платить за нього нагороду ×5 (досвід і золото ворога),
  //   з нього випадає ОДНА річ: спершу перевірка легендарної (5%), якщо ні —
  //   епічної (25%), якщо ні — магічної (50%).
  const CHAMPION = {
    chance: 0.001,
    statMult: 3,
    bountyMult: 5,
    statKeys: ["hp", "mp", "attack", "magic", "defense", "magicDefense"],
    drops: [["legendary", 0.05], ["epic", 0.25], ["magic", 0.50]]
  };

  function rollChampion() {
    return Math.random() < CHAMPION.chance;
  }

  // champion = true — повертає посилену копію ворога
  function getEnemy(id, champion = false) {
    const base = ENEMIES[id];
    if (!base || !champion) return base || null;
    const stats = { ...base.stats };
    for (const k of CHAMPION.statKeys) if (stats[k]) stats[k] = Math.round(stats[k] * CHAMPION.statMult);
    return { ...base, stats, champion: true, baseName: base.name, name: `Чемпіон: ${base.name}` };
  }

  // Трофей чемпіона: { id, r } або null. Річ береться зі здобичі цього ворога
  // (зброя/броня/біжутерія), а якщо такої немає — будь-яка річ 1 виду.
  function rollChampionDrop(enemyId) {
    let r = null;
    for (const [rarity, chance] of CHAMPION.drops) {
      if (Math.random() < chance) { r = rarity; break; }
    }
    if (!r) return null;
    let pool = (ENEMIES[enemyId]?.loot || []).map(d => d.id).filter(id => RPG.hasRarity(id));
    if (!pool.length) pool = Object.keys(RPG.ITEMS).filter(id => RPG.hasRarity(id) && RPG.ITEMS[id].tier === 1);
    return { id: pool[Math.floor(Math.random() * pool.length)], r };
  }

  // Нагорода гільдії за чемпіона: ×5 від досвіду та середнього золота ворога
  function championBounty(enemyId) {
    const e = ENEMIES[enemyId];
    if (!e) return { exp: 0, gold: 0 };
    return {
      exp: e.exp * CHAMPION.bountyMult,
      gold: Math.round((e.gold[0] + e.gold[1]) / 2 * CHAMPION.bountyMult)
    };
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

  // Чи пускають героя на локацію: { ok, reason }
  function canEnterLocation(id, heroLevel = 1) {
    const loc = LOCATIONS[id];
    if (!loc) return { ok: false, reason: "Такої локації немає." };
    if (loc.locked) return { ok: false, reason: "Закрито — відкриється згодом." };
    if (loc.minLevel && heroLevel < loc.minLevel) {
      return { ok: false, reason: `${loc.name}: вхід з ${loc.minLevel} рівня персонажа.` };
    }
    return { ok: true };
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
    ENEMIES, LOCATIONS, DEFAULT_LOCATION, RESPAWN_LOCATION, GUILD_SHOP,
    CHAMPION, rollChampion, rollChampionDrop, championBounty,
    getEnemy, enemyImg, getLocation, isCombatLocation, canEnterLocation, pickEnemy, rollLoot
  });
})(window.RPG);
