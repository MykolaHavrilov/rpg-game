// ============================================================
// battle.js — автобій
//
// Бій рахується повністю одразу (simulateBattle), а сторінка
// потім або показує його покроково, або одразу весь результат
// (режим у налаштуваннях).
//
// Формули (характеристики героя — RPG.calcStats: професія + атрибути + речі):
//   Шкода = атака × (0.85…1.15) × 100 / (100 + захист цілі)
//   Заклинання «Іскра» (4 MP) = сила магії × 1.6, проти магічного захисту.
//   Магічна зброя (магія > атаки, напр. посох) — герой кидає «Іскру»,
//       коли мани немає — б'є зброєю.
//   Крит — шкода × 1.5. Блок (фізичний / магічний) — половина шкоди.
//   Швидкість — хто б'є першим + шанс додаткового «швидкого» удару
//       (до 30%), якщо ти швидший за суперника.
// ============================================================

(function (RPG) {
  const MAX_ROUNDS = 60;
  const SPELL_COST = 4;
  const SPELL_MULT = 1.6;
  const CRIT_MULT = 1.5;
  const MAX_EXTRA_HIT = 0.3;

  function variance() {
    return 0.85 + Math.random() * 0.3;   // ±15%
  }

  function mitigate(damage, defense) {
    return damage * 100 / (100 + Math.max(0, defense || 0));
  }

  // Шанс додаткового удару завдяки швидкості
  function extraHitChance(mySpeed, otherSpeed) {
    if (mySpeed <= otherSpeed) return 0;
    return Math.min(MAX_EXTRA_HIT, (mySpeed - otherSpeed) / (mySpeed + otherSpeed));
  }

  // Опис того, чим б'є герой, залежно від спорядження
  function heroWeapon(save) {
    const item = RPG.ITEMS[save.equipment.mainHand];
    if (!item) return { name: "кулаками", magic: false };
    const st = item.stats || {};
    return { name: item.name, magic: (st.magic || 0) > (st.attack || 0) };
  }

  function finishHit(dmg, crit, blocked) {
    if (crit) dmg *= CRIT_MULT;
    if (blocked) dmg *= 0.5;
    return Math.max(1, Math.round(dmg));
  }

  // Одна дія героя з черги
  function heroAction(action, ctx, quick) {
    const { hero, enemy, state, weapon } = ctx;
    const es = enemy.stats;
    const crit = Math.random() * 100 < hero.crit;
    let text, dmg, blocked;

    const castSpell = (action === "spell" || weapon.magic) && state.heroMp >= SPELL_COST;
    if (castSpell) {
      state.heroMp -= SPELL_COST;
      blocked = Math.random() * 100 < (es.blockMag || 0);
      dmg = finishHit(mitigate(hero.magic * SPELL_MULT * variance(), es.magicDefense ?? Math.floor(es.defense / 2)), crit, blocked);
      text = `${ctx.heroName} кидає «Іскру» (−${SPELL_COST} MP): ${dmg} шкоди`;
    } else {
      blocked = Math.random() * 100 < (es.blockPhys || 0);
      dmg = finishHit(mitigate(hero.attack * variance(), es.defense), crit, blocked);
      text = weapon.name === "кулаками"
        ? `${ctx.heroName} б'є кулаками: ${dmg} шкоди`
        : `${ctx.heroName} б'є (${weapon.name}): ${dmg} шкоди`;
    }
    if (quick) text = "Швидкий удар! " + text;
    if (blocked) text += " (ворог частково заблокував)";
    if (crit) text += " — КРИТ!";
    state.enemyHp = Math.max(0, state.enemyHp - dmg);
    return { who: "hero", text, crit };
  }

  function enemyAction(ctx, quick) {
    const { hero, enemy, state } = ctx;
    const crit = Math.random() * 100 < (enemy.stats.crit || 0);
    const blocked = Math.random() * 100 < hero.blockPhys;
    const dmg = finishHit(mitigate(enemy.stats.attack * variance(), hero.defense), crit, blocked);

    let text = blocked
      ? `${enemy.name} кусає, але ${ctx.heroName} блокує частину удару: ${dmg} шкоди`
      : `${enemy.name} кусає: ${dmg} шкоди`;
    if (quick) text = "Швидкий напад! " + text;
    if (crit) text += " — КРИТ!";
    state.heroHp = Math.max(0, state.heroHp - dmg);
    return { who: "enemy", text, crit };
  }

  // Повертає { win, draw, rounds, heroHp, heroMp, events, enemyId, enemyIds }
  // кожна подія: { who, text, heroHp, heroMp, enemyHp, crit }
  function simulateBattle(save, enemyId) {
    const enemy = RPG.getEnemy(enemyId);
    const hero = RPG.calcStats(save);
    const queue = (save.battleQueue && save.battleQueue.length ? save.battleQueue : ["attack"]).slice(0, 10);

    const ctx = {
      hero, enemy,
      heroName: save.character.name,
      weapon: heroWeapon(save),
      state: { heroHp: Math.floor(save.character.hp), heroMp: Math.floor(save.character.mp), enemyHp: enemy.stats.hp }
    };
    const { state } = ctx;
    const events = [];
    const push = ev => events.push(Object.assign(ev, {
      heroHp: state.heroHp, heroMp: state.heroMp, enemyHp: state.enemyHp
    }));

    push({ who: "info", text: `Бій починається: ${ctx.heroName} проти «${enemy.name}» (рівень ${enemy.level}).` });

    const heroFirst = hero.speed >= enemy.stats.speed;
    const heroExtra = extraHitChance(hero.speed, enemy.stats.speed);
    const enemyExtra = extraHitChance(enemy.stats.speed, hero.speed);
    let round = 0;
    let q = 0;
    const alive = () => state.heroHp > 0 && state.enemyHp > 0;

    while (alive() && round < MAX_ROUNDS) {
      round++;
      const turns = heroFirst ? ["hero", "enemy"] : ["enemy", "hero"];
      for (const t of turns) {
        if (!alive()) break;
        if (t === "hero") {
          push(heroAction(queue[q++ % queue.length], ctx, false));
          if (alive() && Math.random() < heroExtra) push(heroAction(queue[q++ % queue.length], ctx, true));
        } else {
          push(enemyAction(ctx, false));
          if (alive() && Math.random() < enemyExtra) push(enemyAction(ctx, true));
        }
      }
    }

    const win = state.enemyHp <= 0;
    const draw = !win && state.heroHp > 0;
    if (win) push({ who: "info", text: `«${enemy.name}» переможений за ${round} раунд(ів).` });
    else if (draw) push({ who: "info", text: `«${enemy.name}» втік із бою.` });
    else push({ who: "info", text: `${ctx.heroName} загинув…` });

    return { win, draw, rounds: round, heroHp: state.heroHp, heroMp: state.heroMp, events, enemyId, enemyIds: [enemyId] };
  }

  Object.assign(RPG, { simulateBattle });
})(window.RPG);
