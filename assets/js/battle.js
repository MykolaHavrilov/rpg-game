// ============================================================
// battle.js — автобій
//
// Бій рахується повністю одразу (simulateBattle), а сторінка
// потім або показує його покроково, або одразу весь результат
// (режим у налаштуваннях).
//
// Формули (характеристики героя — RPG.calcStats: професія + атрибути + речі + володіння):
//   Шкода = атака × (0.85…1.15) × 100 / (100 + захист цілі)
//   Заклинання «Іскра» (4 MP) = сила магії × 1.6, проти магічного захисту.
//   Магічна зброя (магія > атаки, напр. посох) — герой кидає «Іскру»,
//       коли мани немає — б'є зброєю.
//   Крит — шкода × 1.5. Блок (фізичний / магічний) — половина шкоди.
//   Ухилення (dodge, %) — удар зовсім не влучає.
//   Швидкість — хто б'є першим + шанс додаткового «швидкого» удару
//       (до 30%), якщо ти швидший за суперника.
//
// Черга дій (save.battleQueue, до 10): "attack" — звичайний удар,
//   або ID активної навички (data/skills.js). Навичка спрацьовує, якщо
//   вона вивчена, вдягнена її зброя і вистачає мани — інакше звичайний удар.
//   Бафи діють кілька раундів, отрута — 3 ходи ворога.
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
    const ref = save.equipment.mainHand;
    const item = RPG.ITEMS[RPG.refId(ref)];
    if (!item) return { name: "кулаками", magic: false, type: null };
    const st = RPG.itemStats(ref);
    return { name: item.name, magic: (st.magic || 0) > (st.attack || 0), type: item.weaponType || null };
  }

  function finishHit(dmg, crit, blocked) {
    if (crit) dmg *= CRIT_MULT;
    if (blocked) dmg *= 0.5;
    return Math.max(1, Math.round(dmg));
  }

  // Характеристики героя з урахуванням бафів
  function heroNow(ctx) {
    const h = { ...ctx.base };
    const sum = {};
    for (const b of Object.values(ctx.state.buffs)) {
      for (const [k, v] of Object.entries(b.effects)) sum[k] = (sum[k] || 0) + v;
    }
    if (sum.attackPct) h.attack *= 1 + sum.attackPct / 100;
    if (sum.defensePct) h.defense *= 1 + sum.defensePct / 100;
    if (sum.magicDefensePct) h.magicDefense *= 1 + sum.magicDefensePct / 100;
    if (sum.crit) h.crit += sum.crit;
    if (sum.dodge) h.dodge = (h.dodge || 0) + sum.dodge;
    if (sum.speedPct) h.speed = Math.min(h.speed * (1 + sum.speedPct / 100), RPG.STAT_CAP.speed * 2);
    return h;
  }

  function enemyDefense(ctx) {
    return ctx.enemy.stats.defense * (1 - ctx.state.enemyDefDown / 100);
  }

  // Чи можна зараз використати навичку з черги
  function usableSkill(action, ctx) {
    const sk = RPG.SKILLS?.[action];
    if (!sk) return null;
    const lvl = ctx.skillLevels[action] || 0;
    if (lvl < 1 || sk.weapon !== ctx.weapon.type || ctx.state.heroMp < sk.mp) return null;
    return { sk, lvl };
  }

  // Удар навичкою (може бути кілька ударів)
  function skillAttack(sk, lvl, ctx, quick) {
    const { enemy, state } = ctx;
    const es = enemy.stats;
    const h = heroNow(ctx);
    const hits = sk.hits || 1;
    const mult = RPG.skillValue(sk.mult, lvl);
    const critBonus = RPG.skillValue(sk.critBonus, lvl);
    const dmgs = [];
    let anyCrit = false;
    for (let i = 0; i < hits && state.enemyHp > 0; i++) {
      if (!sk.magic && Math.random() * 100 < (es.dodge || 0)) { dmgs.push("промах"); continue; }
      const crit = Math.random() * 100 < h.crit + critBonus;
      anyCrit = anyCrit || crit;
      const blocked = Math.random() * 100 < (sk.magic ? (es.blockMag || 0) : (es.blockPhys || 0));
      const raw = (sk.magic ? h.magic : h.attack) * mult * variance();
      const def = sk.magic ? (es.magicDefense ?? Math.floor(es.defense / 2)) : enemyDefense(ctx);
      const dmg = finishHit(mitigate(raw, def), crit, blocked);
      state.enemyHp = Math.max(0, state.enemyHp - dmg);
      dmgs.push(dmg + (crit ? " (крит)" : ""));
    }
    let text = `${quick ? "Швидкий удар! " : ""}${ctx.heroName} — «${sk.name}» (−${sk.mp} MP): ${dmgs.join(" + ")} шкоди`;
    if (sk.dot && state.enemyHp > 0) {
      state.dot = { dmg: Math.round(RPG.skillValue(sk.dot, lvl)), turns: 3 };
      text += `, ворог отруєний`;
    }
    if (sk.debuff?.defensePct) {
      state.enemyDefDown = Math.max(state.enemyDefDown, RPG.skillValue(sk.debuff.defensePct, lvl));
      text += `, захист ворога −${state.enemyDefDown}%`;
    }
    if (sk.debuff?.attackPct) {
      state.enemyAtkDown = { pct: RPG.skillValue(sk.debuff.attackPct, lvl), turns: RPG.skillTurns(lvl) };
      text += `, атака ворога −${state.enemyAtkDown.pct}%`;
    }
    return { who: "hero", text, crit: anyCrit };
  }

  function castBuff(id, sk, lvl, ctx) {
    const effects = {};
    for (const [k, pair] of Object.entries(sk.effects)) effects[k] = RPG.skillValue(pair, lvl);
    const turns = RPG.skillTurns(lvl);
    ctx.state.buffs[id] = { effects, turns };
    return { who: "hero", text: `${ctx.heroName} — «${sk.name}» (−${sk.mp} MP): ${RPG.describeSkill(id, lvl).split(" · ")[0]}`, crit: false };
  }

  // Одна дія героя з черги
  function heroAction(action, ctx, quick) {
    const { enemy, state, weapon } = ctx;
    const es = enemy.stats;

    const use = usableSkill(action, ctx);
    if (use) {
      state.heroMp -= use.sk.mp;
      return use.sk.kind === "buff"
        ? castBuff(action, use.sk, use.lvl, ctx)
        : skillAttack(use.sk, use.lvl, ctx, quick);
    }

    const h = heroNow(ctx);
    const crit = Math.random() * 100 < h.crit;
    let text, dmg, blocked;

    const castSpell = (action === "spell" || weapon.magic) && state.heroMp >= SPELL_COST;
    if (!castSpell && Math.random() * 100 < (es.dodge || 0)) {
      return { who: "hero", text: `${quick ? "Швидкий удар! " : ""}${ctx.heroName} б'є, але ${enemy.name} ухиляється`, crit: false };
    }
    if (castSpell) {
      state.heroMp -= SPELL_COST;
      blocked = Math.random() * 100 < (es.blockMag || 0);
      dmg = finishHit(mitigate(h.magic * SPELL_MULT * variance(), es.magicDefense ?? Math.floor(es.defense / 2)), crit, blocked);
      text = `${ctx.heroName} кидає «Іскру» (−${SPELL_COST} MP): ${dmg} шкоди`;
    } else {
      blocked = Math.random() * 100 < (es.blockPhys || 0);
      dmg = finishHit(mitigate(h.attack * variance(), enemyDefense(ctx)), crit, blocked);
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
    const { enemy, state } = ctx;
    const hero = heroNow(ctx);
    if (Math.random() * 100 < (hero.dodge || 0)) {
      return { who: "enemy", text: `${quick ? "Швидкий напад! " : ""}${enemy.name} кидається, але ${ctx.heroName} ухиляється!`, crit: false };
    }
    const crit = Math.random() * 100 < (enemy.stats.crit || 0);
    const blocked = Math.random() * 100 < hero.blockPhys;
    const atkDown = state.enemyAtkDown.turns > 0 ? state.enemyAtkDown.pct : 0;
    const dmg = finishHit(mitigate(enemy.stats.attack * (1 - atkDown / 100) * variance(), hero.defense), crit, blocked);

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
  // champion = true — бій з чемпіоном (показники ×3, див. data/enemies.js)
  function simulateBattle(save, enemyId, champion = false) {
    const enemy = RPG.getEnemy(enemyId, champion);
    const base = RPG.calcStats(save);
    const queue = (save.battleQueue || []).filter(Boolean).slice(0, 10);
    if (!queue.length) queue.push("attack");

    const ctx = {
      base, enemy,
      heroName: save.character.name,
      weapon: heroWeapon(save),
      skillLevels: { ...(save.character.skills || {}) },
      state: {
        heroHp: Math.floor(save.character.hp), heroMp: Math.floor(save.character.mp), enemyHp: enemy.stats.hp,
        buffs: {}, dot: null, enemyDefDown: 0, enemyAtkDown: { pct: 0, turns: 0 }
      }
    };
    const { state } = ctx;
    const events = [];
    const push = ev => events.push(Object.assign(ev, {
      heroHp: state.heroHp, heroMp: state.heroMp, enemyHp: state.enemyHp
    }));

    push({ who: "info", text: `Бій починається: ${ctx.heroName} проти «${enemy.name}» (рівень ${enemy.level}).` });

    let round = 0;
    let q = 0;
    const alive = () => state.heroHp > 0 && state.enemyHp > 0;

    while (alive() && round < MAX_ROUNDS) {
      round++;
      const h = heroNow(ctx);
      const heroFirst = h.speed >= enemy.stats.speed;
      const heroExtra = extraHitChance(h.speed, enemy.stats.speed);
      const enemyExtra = extraHitChance(enemy.stats.speed, h.speed);
      const turns = heroFirst ? ["hero", "enemy"] : ["enemy", "hero"];
      for (const t of turns) {
        if (!alive()) break;
        if (t === "hero") {
          push(heroAction(queue[q++ % queue.length], ctx, false));
          if (alive() && Math.random() < heroExtra) push(heroAction(queue[q++ % queue.length], ctx, true));
        } else {
          if (state.dot && state.dot.turns > 0) {
            state.enemyHp = Math.max(0, state.enemyHp - state.dot.dmg);
            state.dot.turns--;
            push({ who: "hero", text: `Отрута: ${state.dot.dmg} шкоди «${enemy.name}»`, crit: false });
            if (!alive()) break;
          }
          push(enemyAction(ctx, false));
          if (alive() && Math.random() < enemyExtra) push(enemyAction(ctx, true));
        }
      }
      // Кінець раунду — бафи й послаблення слабшають
      for (const [id, b] of Object.entries(state.buffs)) {
        if (--b.turns <= 0) {
          delete state.buffs[id];
          if (alive()) push({ who: "info", text: `Дія «${RPG.SKILLS[id].name}» закінчилась.` });
        }
      }
      if (state.enemyAtkDown.turns > 0) state.enemyAtkDown.turns--;
    }

    const win = state.enemyHp <= 0;
    const draw = !win && state.heroHp > 0;
    if (win) push({ who: "info", text: `«${enemy.name}» переможений за ${round} раунд(ів).` });
    else if (draw) push({ who: "info", text: `«${enemy.name}» втік із бою.` });
    else push({ who: "info", text: `${ctx.heroName} загинув…` });

    return { win, draw, rounds: round, heroHp: state.heroHp, heroMp: state.heroMp, events, enemyId, enemyIds: [enemyId], champion };
  }

  Object.assign(RPG, { simulateBattle });
})(window.RPG);
