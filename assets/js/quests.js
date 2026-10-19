// ============================================================
// quests.js — ЗАВДАННЯ ГІЛЬДІЇ АВАНТЮРИСТІВ
//
// Адміністратор гільдії пропонує 3 завдання; взяти можна до 3 одночасно.
//   kill  — убити N щурів / вовків (рахується після кожної перемоги)
//   bring — принести N хвостів / шкурок / шкур / іклів (забираються при здачі)
// Нагорода: досвід, золото, а за складніші — великі зілля здоров'я/мани.
// Стан у сейві: save.quests = { offers, active, done, nextId }
//
// Підключається ПІСЛЯ items.js / enemies.js і ДО character.js.
// ============================================================

(function (RPG) {
  const MAX_ACTIVE = 3;
  const MAX_OFFERS = 3;

  // Групи ворогів для «вбити N»
  const TARGETS = {
    rat:  { name: "щурів",  match: id => id.startsWith("rat"),  minLevel: 1 },
    wolf: { name: "вовків", match: id => id.startsWith("wolf"), minLevel: 3 }
  };

  // Шаблони: amounts — варіанти кількості; exp/gold — за 1 одиницю
  const TEMPLATES = [
    { kind: "kill",  target: "rat",  amounts: [5, 8, 12], exp: 4,  gold: 3 },
    { kind: "kill",  target: "wolf", amounts: [3, 5, 8],  exp: 25, gold: 8 },
    { kind: "bring", item: "rat_tail",  amounts: [5, 10, 15], exp: 2,  gold: 2, minLevel: 1 },
    { kind: "bring", item: "rat_skin",  amounts: [3, 6],      exp: 5,  gold: 4, minLevel: 1 },
    { kind: "bring", item: "wolf_pelt", amounts: [3, 5],      exp: 18, gold: 7, minLevel: 3 },
    { kind: "bring", item: "wolf_fang", amounts: [3, 5],      exp: 15, gold: 6, minLevel: 3 }
  ];

  function state(save) {
    save.quests ??= {};
    const q = save.quests;
    q.offers ??= [];
    q.active ??= [];
    q.done ??= 0;
    q.nextId ??= 1;
    return q;
  }

  function templateLevel(t) {
    return t.kind === "kill" ? TARGETS[t.target].minLevel : (t.minLevel || 1);
  }

  function makeQuest(save) {
    const q = state(save);
    const lvl = save.character.level;
    const pool = TEMPLATES.filter(t => templateLevel(t) <= lvl);
    const t = pool[Math.floor(Math.random() * pool.length)];
    const ai = Math.floor(Math.random() * t.amounts.length);
    const n = t.amounts[ai];
    const quest = {
      id: "q" + q.nextId++,
      kind: t.kind, target: t.target || null, item: t.item || null,
      need: n, have: 0,
      reward: { exp: t.exp * n, gold: t.gold * n, items: [] }
    };
    // Складніші завдання — великі зілля
    if (ai >= 1) {
      const potion = Math.random() < 0.5 ? "potion_hp_large" : "potion_mp_large";
      quest.reward.items.push({ id: potion, qty: ai });   // 1 або 2
    }
    return quest;
  }

  function fillOffers(save) {
    const q = state(save);
    while (q.offers.length < MAX_OFFERS) q.offers.push(makeQuest(save));
    return q.offers;
  }

  function questTitle(quest) {
    if (quest.kind === "kill") return `Убити ${quest.need} ${TARGETS[quest.target].name}`;
    return `Принести: ${RPG.ITEMS[quest.item].name} × ${quest.need}`;
  }

  function questProgress(save, quest) {
    if (quest.kind === "kill") return Math.min(quest.have, quest.need);
    return Math.min(RPG.countItem(save, quest.item), quest.need);
  }

  function isComplete(save, quest) {
    return questProgress(save, quest) >= quest.need;
  }

  function describeReward(r) {
    const parts = [`${r.exp} EXP`, `${r.gold} золота`];
    for (const it of r.items) parts.push(`${RPG.ITEMS[it.id].name} × ${it.qty}`);
    return parts.join(", ");
  }

  function acceptQuest(save, questId) {
    const q = state(save);
    if (q.active.length >= MAX_ACTIVE) return { ok: false, reason: `Можна мати не більше ${MAX_ACTIVE} завдань.` };
    const i = q.offers.findIndex(o => o.id === questId);
    if (i < 0) return { ok: false, reason: "Завдання вже немає." };
    const [quest] = q.offers.splice(i, 1);
    q.active.push(quest);
    fillOffers(save);
    return { ok: true, quest };
  }

  function abandonQuest(save, questId) {
    const q = state(save);
    const i = q.active.findIndex(o => o.id === questId);
    if (i < 0) return { ok: false, reason: "Завдання немає." };
    q.active.splice(i, 1);
    return { ok: true };
  }

  // Повертає { ok, quest, levelUps }
  function turnInQuest(save, questId) {
    const q = state(save);
    const i = q.active.findIndex(o => o.id === questId);
    if (i < 0) return { ok: false, reason: "Завдання немає." };
    const quest = q.active[i];
    if (!isComplete(save, quest)) return { ok: false, reason: "Завдання ще не виконане." };
    if (quest.kind === "bring") RPG.removeItem(save, quest.item, quest.need);
    q.active.splice(i, 1);
    q.done++;
    save.character.gold += quest.reward.gold;
    for (const it of quest.reward.items) RPG.addItem(save, it.id, it.qty);
    const levelUps = RPG.addExp(save, quest.reward.exp);
    return { ok: true, quest, levelUps };
  }

  // Після перемоги над ворогом. Повертає рядки прогресу для повідомлення.
  function questOnKill(save, enemyId) {
    const q = state(save);
    const lines = [];
    for (const quest of q.active) {
      if (quest.kind !== "kill" || quest.have >= quest.need) continue;
      if (!TARGETS[quest.target].match(enemyId)) continue;
      quest.have++;
      lines.push(`${questTitle(quest)}: ${quest.have}/${quest.need}`);
    }
    return lines;
  }

  Object.assign(RPG, {
    QUEST_MAX_ACTIVE: MAX_ACTIVE,
    questState: state, fillOffers, questTitle, questProgress, isQuestComplete: isComplete,
    describeReward, acceptQuest, abandonQuest, turnInQuest, questOnKill
  });
})(window.RPG);
