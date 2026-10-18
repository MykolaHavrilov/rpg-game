// ============================================================
// game.js — логіка сторінок гри.
// Кожна сторінка має <body data-page="...">, і тут запускається
// відповідний обробник: new-game, load, settings, game, character,
// inventory, maps.
// ============================================================

(function (RPG) {

  // ---------- Допоміжні функції ----------

  function $(id) { return document.getElementById(id); }

  // Створює елемент: el("div", "wf wf-slot", "текст")
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function link(text, href, className = "wf wf-link") {
    const a = el("a", className, text);
    a.href = href;
    return a;
  }

  function button(text, className, onClick) {
    const b = el("button", className, text);
    b.type = "button";
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  // Встановлює ширину смужки HP / MP / EXP і її підпис.
  function setBar(bar, current, max, label) {
    if (!bar) return;
    current = Math.floor(current);
    const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    bar.style.setProperty("--value", percent + "%");
    const lbl = bar.querySelector(".bar-label");
    if (lbl) lbl.textContent = label || `${bar.dataset.name} ${current} / ${max}`;
  }

  function fmtNum(n) { return Number(n).toLocaleString("uk-UA"); }

  function fmtDate(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleString("uk-UA", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }

  function fmtStat(key, value) {
    const pct = ["crit", "blockPhys", "blockMag"].includes(key);
    return fmtNum(value) + (pct ? "%" : "");
  }

  // Коротке повідомлення в блоці #msg (зникає через кілька секунд)
  let msgTimer = null;
  function showMsg(node, text, isError) {
    if (!node) return;
    node.textContent = text;
    node.hidden = false;
    node.classList.toggle("msg-error", !!isError);
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { node.hidden = true; }, 4000);
  }

  // Якщо активної гри немає — замість сторінки показуємо підказку
  function showNoGame() {
    const main = document.querySelector("main");
    main.innerHTML = "";
    const box = el("div", "panel stack narrow");
    box.append(el("h2", null, "Немає активної гри"));
    box.append(el("p", null, "Створіть нового персонажа або завантажте збереження."));
    box.append(link("Нова гра", "new-game.html"), link("Завантажити гру", "load.html"),
               link("Головне меню", "../index.html"));
    main.append(box);
  }

  // Завантажує поточну гру й одразу нараховує відновлення за час відсутності
  async function requireSave() {
    try {
      const save = await RPG.loadCurrentGame();
      if (!save) { showNoGame(); return null; }
      if (RPG.applyRegen(save)) await RPG.saveGame(save);
      return save;
    } catch (e) {
      console.error(e);
      showNoGame();
      return null;
    }
  }

  // Щосекунди перевіряє, чи настав час відновлення (кожні 10 с).
  // isPaused() — напр. під час бою відновлення не застосовується.
  function startRegenTimer(save, onChange, isPaused) {
    setInterval(async () => {
      if (isPaused && isPaused()) return;
      if (RPG.applyRegen(save)) {
        await RPG.saveGame(save).catch(e => console.error(e));
        onChange();
      }
    }, 1000);
  }

  function itemLabel(entry) {
    const item = RPG.ITEMS[entry.id];
    return item.name + (entry.qty > 1 ? ` ×${entry.qty}` : "");
  }

  // Наповнює клітинку предмета: картинка + кількість.
  // Якщо картинки в assets/img/items/ немає — показує назву текстом,
  // тож нову іконку достатньо просто покласти в папку.
  function fillItemCell(cell, id, qty = 1) {
    const item = RPG.ITEMS[id];
    cell.textContent = "";
    cell.title = item.name + (qty > 1 ? ` ×${qty}` : "");
    cell.classList.add("has-icon");
    const img = el("img", "item-icon");
    img.alt = item.name;
    img.src = RPG.itemImg(id);
    img.addEventListener("error", () => {
      img.remove();
      cell.classList.remove("has-icon");
      cell.prepend(el("span", "item-name", item.name));
    });
    cell.append(img);
    if (qty > 1) cell.append(el("span", "item-qty", `×${qty}`));
    return cell;
  }

  // Маленька іконка поруч із текстом (спорядження, шинок, опис)
  function smallIcon(id, className = "mini-icon") {
    const img = el("img", className);
    img.alt = "";
    img.src = RPG.itemImg(id);
    img.addEventListener("error", () => img.remove());
    return img;
  }

  function slotClass(id, extra = "") {
    const rare = RPG.ITEMS[id]?.rarity === "rare" ? " rarity-rare" : "";
    return "wf wf-slot" + rare + (extra ? " " + extra : "");
  }

  // Оновлює блок героя: картинка, ім'я, HP / MP / EXP / LVL, відновлення
  function renderHeroBars(save) {
    const st = RPG.calcStats(save);
    const ch = save.character;
    const img = $("hero-img");
    if (img) img.src = RPG.classImg(ch.classId);
    const name = $("hero-name");
    if (name) name.textContent = `${ch.name} — ${RPG.getClass(ch.classId).name}`;

    setBar($("hero-hp"), ch.hp, st.hp);
    setBar($("hero-mp"), ch.mp, st.mp);

    const p = RPG.expProgress(save);
    const expBar = $("hero-exp");
    if (expBar) {
      if (p.max) setBar(expBar, 1, 1, `EXP ${fmtNum(p.exp)} (максимум)`);
      else setBar(expBar, p.current, p.needed, `EXP ${fmtNum(p.exp)} / ${fmtNum(p.nextLevelAt)}`);
    }
    const lvl = $("hero-lvl");
    if (lvl) lvl.textContent = `LVL ${ch.level}`;

    const regen = $("regen-info");
    if (regen) {
      const per = RPG.regenPerTick(save);
      regen.textContent = `Відновлення за 10 с: +${per.hp.toFixed(1)} HP, +${per.mp.toFixed(1)} MP` +
        (per.home ? " (з бонусом Домівки)" : "");
    }
  }

  function describeStats(item) {
    if (!item.stats) return "";
    return Object.entries(item.stats)
      .map(([k, v]) => `${RPG.STAT_NAMES[k] || k} ${v > 0 ? "+" : ""}${v}`)
      .join(", ");
  }

  function describeEffect(item) {
    const e = item.effect || {};
    const parts = [];
    if (e.healHp) parts.push(`${e.healHp} HP`);
    if (e.healHpPct) parts.push(`${Math.round(e.healHpPct * 100)}% HP`);
    if (e.healMp) parts.push(`${e.healMp} MP`);
    if (e.healMpPct) parts.push(`${Math.round(e.healMpPct * 100)}% MP`);
    return parts.length ? "Відновлює " + parts.join(" і ") : "";
  }

  function useResultText(item, r) {
    const parts = [];
    if (r.healedHp) parts.push(`+${r.healedHp} HP`);
    if (r.healedMp) parts.push(`+${r.healedMp} MP`);
    return `${item.name}: ${parts.join(", ") || "нічого не змінилось"}`;
  }

  // ============================================================
  // НОВА ГРА
  // ============================================================
  function pageNewGame() {
    const form = $("new-game-form");
    const msg = $("msg");
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const name = form.elements.name.value.trim();
      if (!name) { showMsg(msg, "Введіть ім'я персонажа.", true); return; }
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const save = RPG.createNewSave(name);
        await RPG.saveGame(save);
        RPG.setCurrentSlot(save.id);
        location.href = "game.html";
      } catch (e) {
        console.error(e);
        showMsg(msg, "Не вдалося створити гру: " + e.message, true);
        btn.disabled = false;
      }
    });
  }

  // ============================================================
  // ЗАВАНТАЖИТИ ГРУ
  // ============================================================
  async function pageLoad() {
    const list = $("save-list");
    const msg = $("msg");

    async function render() {
      list.innerHTML = "";
      let saves = [];
      try { saves = await RPG.listSaves(); }
      catch (e) { console.error(e); showMsg(msg, "Помилка читання збережень: " + e.message, true); }

      if (!saves.length) {
        list.append(el("div", "wf wf-text", "Збережень поки немає"));
        return;
      }
      const current = RPG.getCurrentSlot();
      for (const s of saves) {
        const row = el("div", "save-row");
        const cls = RPG.getClass(s.character?.classId).name;
        const place = RPG.getLocation(s.location?.map).name;
        const btn = button("", "wf wf-link save-load", () => {
          RPG.setCurrentSlot(s.id);
          location.href = "game.html";
        });
        btn.append(el("strong", null, `${s.character?.name || "Герой"} — ${cls}, рівень ${s.character?.level || 1}`));
        btn.append(el("span", "save-date",
          `${place} · збережено: ${fmtDate(s.savedAt)}${s.id === current ? " · поточна гра" : ""}`));

        const del = button("Видалити", "wf wf-danger save-del", async () => {
          if (!confirm(`Видалити збереження «${s.character?.name}»? Цю дію не можна скасувати.`)) return;
          await RPG.deleteSave(s.id);
          render();
        });
        del.title = "Видалити це збереження";

        row.append(btn, del);
        list.append(row);
      }
    }

    $("import-btn").addEventListener("click", async () => {
      const file = await RPG.pickJsonFile();
      if (!file) return;
      try {
        const save = await RPG.importSave(file);
        showMsg(msg, `Імпортовано: ${save.character.name}, рівень ${save.character.level}.`);
        render();
      } catch (e) {
        showMsg(msg, e.message, true);
      }
    });

    render();
  }

  // ============================================================
  // НАЛАШТУВАННЯ
  // ============================================================
  async function pageSettings() {
    const msg = $("msg");
    const settings = RPG.getSettings();

    document.querySelectorAll('input[name="battle-mode"]').forEach(radio => {
      radio.checked = radio.value === settings.battleView;
      radio.addEventListener("change", () => {
        if (radio.checked) {
          RPG.setSettings({ battleView: radio.value });
          showMsg(msg, "Налаштування збережено.");
        }
      });
    });

    const volume = $("volume");
    const volumeValue = $("volume-value");
    if (volume) {
      volume.value = settings.volume;
      volumeValue.textContent = settings.volume + "%";
      volume.addEventListener("input", () => { volumeValue.textContent = volume.value + "%"; });
      volume.addEventListener("change", () => RPG.setSettings({ volume: Number(volume.value) }));
    }

    const exportBtn = $("export-btn");
    const current = await RPG.loadCurrentGame().catch(() => null);
    if (!current) {
      exportBtn.disabled = true;
      exportBtn.title = "Немає активної гри";
    }
    exportBtn.addEventListener("click", async () => {
      const save = await RPG.loadCurrentGame();
      if (!save) { showMsg(msg, "Немає активної гри для експорту.", true); return; }
      RPG.exportSave(save);
      showMsg(msg, "Файл збереження завантажується.");
    });

    $("import-btn").addEventListener("click", async () => {
      const file = await RPG.pickJsonFile();
      if (!file) return;
      try {
        const save = await RPG.importSave(file);
        RPG.setCurrentSlot(save.id);
        exportBtn.disabled = false;
        showMsg(msg, `Імпортовано й обрано поточною грою: ${save.character.name}, рівень ${save.character.level}.`);
      } catch (e) {
        showMsg(msg, e.message, true);
      }
    });
  }

  // ============================================================
  // ЕКРАН ЛОКАЦІЇ (бій, Домівка, Храм, Шинок)
  // ============================================================
  async function pageGame() {
    const save = await requireSave();
    if (!save) return;

    const msg = $("msg");

    // Перехід з мапи: game.html?loc=village_start
    const locParam = new URLSearchParams(location.search).get("loc");
    if (locParam && RPG.LOCATIONS[locParam] && !RPG.LOCATIONS[locParam].locked && save.location.map !== locParam) {
      save.location.map = locParam;
      await RPG.saveGame(save);
    }
    const locId = save.location.map;
    const locData = RPG.getLocation(locId);
    $("location-name").textContent = locData.name;
    $("location-desc").textContent = locData.description;

    const combat = RPG.isCombatLocation(locId);
    $("enemy-col").hidden = !combat;
    $("combat-ui").hidden = !combat;
    $("place-panel").hidden = combat;
    document.querySelector(".battle").classList.toggle("no-enemy", !combat);

    let fighting = false;

    function renderQuickSlots() {
      const box = $("quick-slots");
      box.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const entry = save.inventory[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const item = RPG.ITEMS[entry.id];
        const cell = fillItemCell(button("", slotClass(entry.id)), entry.id, entry.qty);
        cell.title = itemLabel(entry) + " — " + item.description +
          (item.type === "consumable" ? " (натисніть, щоб використати)" : "");
        if (item.type === "consumable") {
          cell.classList.add("slot-usable");
          cell.addEventListener("click", async () => {
            if (fighting) return;
            const r = RPG.useItem(save, entry.id);
            if (!r.ok) { showMsg(msg, r.reason, true); return; }
            showMsg(msg, useResultText(item, r));
            await RPG.saveGame(save);
            renderAll();
          });
        } else {
          cell.disabled = true;
        }
        box.append(cell);
      }
      $("gold").textContent = `Золото: ${fmtNum(save.character.gold)}`;
    }

    // ---------- Мирні локації ----------
    const place = $("place-panel");

    function renderPlace() {
      place.innerHTML = "";
      place.append(el("h2", null, locData.name));
      if (locData.type === "home") renderHome();
      else if (locData.type === "temple") renderTemple();
      else if (locData.type === "tavern") renderTavern();
    }

    function renderHome() {
      const per = RPG.regenPerTick(save);
      place.append(el("p", null, "Тут битися заборонено — монстри сюди не заходять."));
      place.append(el("p", null,
        `Відпочинок: додатково +${Math.round(RPG.HOME_REGEN_PCT * 100)}% здоров'я та мани кожні 10 секунд ` +
        `понад звичайне відновлення. Зараз: +${per.hp.toFixed(1)} HP і +${per.mp.toFixed(1)} MP за 10 с.`));
      const used = save.chest.length;
      place.append(el("p", null, `Сундук: ${used ? `${used} клітинок зайнято` : "порожній"}. Речі в сундуку не зникають, навіть якщо герой загине.`));
      const row = el("div", "row");
      row.append(link("Інвентар і сундук", "inventory.html"), link("Вирушити (Мапа)", "maps.html"));
      place.append(row);
    }

    function renderTemple() {
      place.append(el("p", null,
        `Сюди повертаються загиблі. Відроджені мають ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я та 0% мани — ` +
        "відновіться зіллям або вирушайте відпочити в Домівку."));
      place.append(el("p", "note",
        "Якщо в групі хтось загинув, а інші вижили, живим треба прийти сюди й помолитися, щоб відродити полеглих."));
      const row = el("div", "row");
      row.append(
        button("Помолитися", "wf wf-button", async () => {
          const r = RPG.pray(save);
          if (!r.ok) { showMsg(msg, r.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, r.revived.length
            ? `Відроджено: ${r.revived.join(", ")}.`
            : "У вашій групі немає полеглих. Боги чують вас.");
        }),
        link("До Домівки", "game.html?loc=home"),
        link("Мапа", "maps.html")
      );
      place.append(row);
    }

    function renderTavern() {
      place.append(el("p", null,
        `${locData.merchant || "Торговець"} продає за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості, ` +
        `а купує за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%. Великі та чарівні зілля тут не купиш — лише здобути в бою.`));
      place.append(el("p", null, `Ваше золото: ${fmtNum(save.character.gold)}`));

      const cols = el("div", "row shop");
      const buyBox = el("div", "stack");
      buyBox.append(el("h3", null, "Купити"));
      for (const id of locData.shop || []) {
        const item = RPG.ITEMS[id];
        if (!item || item.noShop) continue;
        const price = RPG.shopSellPrice(id);
        const r = el("div", "shop-row");
        r.append(smallIcon(id));
        const info = el("span", "shop-name", item.name);
        info.title = [item.description, describeStats(item), describeEffect(item)].filter(Boolean).join(" · ");
        if (item.levelReq > 1) info.append(el("small", null, ` · рів. ${item.levelReq}`));
        const b = button(`${price} зол.`, "wf wf-button", async () => {
          const res = RPG.buyItem(save, id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Куплено: ${item.name} за ${res.price} золота.`);
          renderAll();
        });
        b.disabled = save.character.gold < price;
        r.append(info, b);
        buyBox.append(r);
      }

      const sellBox = el("div", "stack");
      sellBox.append(el("h3", null, "Продати (з інвентаря)"));
      if (!save.inventory.length) sellBox.append(el("p", "note", "Інвентар порожній. Вдягнені речі спершу зніміть."));
      save.inventory.forEach((entry, index) => {
        const r = el("div", "shop-row");
        r.append(smallIcon(entry.id), el("span", "shop-name", itemLabel(entry)));
        r.append(button(`+${RPG.shopBuyPrice(entry.id)} зол.`, "wf wf-secondary", async () => {
          const item = RPG.ITEMS[entry.id];
          const res = RPG.sellItem(save, index);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Продано: ${item.name} за ${res.price} золота.`);
          renderAll();
        }));
        sellBox.append(r);
      });

      cols.append(buyBox, sellBox);
      place.append(cols);
      const row = el("div", "row");
      row.append(link("До Домівки", "game.html?loc=home"), link("Мапа", "maps.html"));
      place.append(row);
    }

    // ---------- Бій ----------
    const startBtn = $("start-btn");
    const rerollBtn = $("reroll-btn");
    const saveBtn = $("save-btn");
    const logBox = $("battle-log");
    const arena = $("arena");
    let enemyId = combat ? RPG.pickEnemy(locId, save.character.level) : null;

    function renderEnemy(hp) {
      const enemy = RPG.getEnemy(enemyId);
      $("enemy-img").src = RPG.enemyImg(enemyId);
      $("enemy-img").alt = enemy.name;
      $("enemy-name").textContent = `${enemy.name} (рівень ${enemy.level})`;
      setBar($("enemy-hp"), hp, enemy.stats.hp);
      const mpBar = $("enemy-mp");
      mpBar.hidden = !enemy.stats.mp;
      if (enemy.stats.mp) setBar(mpBar, enemy.stats.mp, enemy.stats.mp);
    }

    function renderQueue() {
      const box = $("queue");
      box.innerHTML = "";
      const weaponItem = RPG.ITEMS[save.equipment.mainHand];
      const magicWeapon = weaponItem && (weaponItem.stats?.magic || 0) > (weaponItem.stats?.attack || 0);
      for (let i = 0; i < 10; i++) {
        const action = save.battleQueue[i];
        let label = "—";
        if (action === "attack") label = magicWeapon ? "Іскра" : "Удар";
        if (action === "spell") label = "Іскра";
        box.append(el("div", action ? "wf wf-slot" : "wf wf-slot slot-empty", `${i + 1}. ${label}`));
      }
      $("weapon-info").textContent = weaponItem
        ? `Зброя: ${weaponItem.name}${magicWeapon ? " (магічна — витрачає MP)" : ""}`
        : "Зброя: немає (бій кулаками)";
    }

    function renderAll() {
      renderHeroBars(save);
      renderQuickSlots();
      if (combat) renderQueue();
      else renderPlace();
    }

    function setArena(title, lines) {
      arena.innerHTML = "";
      arena.append(el("div", "arena-title", title));
      for (const line of lines || []) arena.append(el("div", "arena-line", line));
    }

    function showReady() {
      const e = RPG.getEnemy(enemyId);
      const warn = e.level >= save.character.level + 2 ? " Обережно: він значно сильніший!" : "";
      setArena("Готові до бою", [`Попереду: ${e.name} (рівень ${e.level}).${warn}`,
        "Натисніть «Почати бій» або пошукайте іншого суперника."]);
    }

    function addLogLine(ev) {
      const li = el("li", "log-" + ev.who + (ev.crit ? " log-crit" : ""), ev.text);
      logBox.append(li);
      logBox.scrollTop = logBox.scrollHeight;
    }

    function applyEventToBars(ev, maxStats, enemy) {
      setBar($("hero-hp"), ev.heroHp, maxStats.hp);
      setBar($("hero-mp"), ev.heroMp, maxStats.mp);
      setBar($("enemy-hp"), ev.enemyHp, enemy.stats.hp);
    }

    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setFighting(on) {
      fighting = on;
      startBtn.disabled = rerollBtn.disabled = saveBtn.disabled = on;
      document.body.classList.toggle("is-fighting", on);
    }

    async function startBattle() {
      if (fighting) return;
      setFighting(true);

      const enemy = RPG.getEnemy(enemyId);
      renderEnemy(enemy.stats.hp);
      logBox.innerHTML = "";

      const maxStats = RPG.calcStats(save);
      const result = RPG.simulateBattle(save, enemyId);

      // Результат застосовуємо і зберігаємо ОДРАЗУ — щоб не можна було
      // уникнути поразки, просто закривши сторінку під час показу бою
      const summary = [];
      save.character.hp = result.heroHp;
      save.character.mp = result.heroMp;
      let levelUps = [];
      let death = null;
      if (result.win) {
        const loot = RPG.rollLoot(enemyId);
        levelUps = RPG.applyReward(save, enemy.exp, loot);
        save.character.kills = (save.character.kills || 0) + 1;
        summary.push(`+${enemy.exp} EXP`);
        if (loot.gold) summary.push(`+${loot.gold} золота`);
        for (const it of loot.items) summary.push(`${RPG.ITEMS[it.id].name} ×${it.qty}`);
      } else if (!result.draw) {
        death = RPG.applyDeath(save, result.enemyIds);
      }
      await RPG.saveGame(save).catch(e => console.error(e));

      // Показ бою
      const stepByStep = RPG.getSettings().battleView !== "result";
      setArena(`${save.character.name} проти «${enemy.name}»`, ["Бій триває…"]);
      if (stepByStep) {
        for (const ev of result.events) {
          addLogLine(ev);
          applyEventToBars(ev, maxStats, enemy);
          await sleep(ev.who === "info" ? 400 : 550);
        }
      } else {
        result.events.forEach(addLogLine);
        applyEventToBars(result.events[result.events.length - 1], maxStats, enemy);
      }

      // Підсумок
      if (death) {
        const lines = [
          `Штраф досвіду: −${fmtNum(death.expLost)} EXP` +
            (death.expLost < death.penalty ? ` (з ${fmtNum(death.penalty)}; рівень не знижується)` : ""),
          death.lostItems.length
            ? "Втрачено в бою: " + death.lostItems.map(id => RPG.ITEMS[id].name).join(", ")
            : "Усі вдягнені речі вціліли.",
          `Ви відродилися в Храмі з ${Math.round(RPG.RESPAWN_HP_PCT * 100)}% здоров'я і без мани.`
        ];
        setArena("Загибель", lines);
        addLogLine({ who: "info", text: lines.join(" ") });
        arena.append(link("Прокинутися в Храмі", "game.html?loc=temple"));
        renderHeroBars(save);
        renderQuickSlots();
        document.body.classList.remove("is-fighting");
        fighting = false;
        startBtn.disabled = rerollBtn.disabled = true;   // бій звідси вже неможливий
        saveBtn.disabled = false;
        return;
      }

      if (result.win) {
        const lines = [summary.join(" · ")];
        if (levelUps.length) {
          lines.push(`Новий рівень: ${levelUps[levelUps.length - 1]}! Здоров'я та мана відновлені. ` +
            `Вільних очок атрибутів: ${save.character.freePoints} (сторінка «Персонаж»).`);
        }
        lines.push(`Переможено ворогів: ${save.character.kills}`);
        setArena("Перемога!", lines);
        addLogLine({ who: "info", text: "Нагорода: " + summary.join(", ") });
      } else {
        setArena("Ворог утік", ["Нагороди немає."]);
      }

      // Наступний суперник
      enemyId = RPG.pickEnemy(locId, save.character.level);
      const next = RPG.getEnemy(enemyId);
      arena.append(el("div", "arena-line", `Далі на вас чекає: ${next.name} (рівень ${next.level}).`));
      renderEnemy(next.stats.hp);

      renderAll();
      setFighting(false);
    }

    // Не даємо піти зі сторінки посеред показу бою без попередження
    document.querySelectorAll("nav a, a.wf").forEach(a => {
      a.addEventListener("click", ev => {
        if (fighting && !confirm("Бій ще показується. Результат уже збережено. Вийти?")) ev.preventDefault();
      });
    });

    saveBtn.addEventListener("click", async () => {
      try {
        await RPG.saveGame(save);
        showMsg(msg, `Гру збережено (${fmtDate(save.savedAt)}).`);
      } catch (e) {
        showMsg(msg, "Не вдалося зберегти: " + e.message, true);
      }
    });

    if (combat) {
      startBtn.addEventListener("click", startBattle);
      rerollBtn.addEventListener("click", () => {
        if (fighting) return;
        enemyId = RPG.pickEnemy(locId, save.character.level);
        renderEnemy(RPG.getEnemy(enemyId).stats.hp);
        showReady();
      });
      renderEnemy(RPG.getEnemy(enemyId).stats.hp);
      showReady();
    }

    renderAll();
    // У мирних локаціях не перемальовуємо панель щосекунди — лише смужки героя
    startRegenTimer(save, () => { renderHeroBars(save); }, () => fighting);
  }

  // ============================================================
  // ПЕРСОНАЖ
  // ============================================================
  async function pageCharacter() {
    const save = await requireSave();
    if (!save) return;

    const DERIVED = ["hp", "mp", "attack", "magic", "defense", "magicDefense", "speed",
                     "crit", "blockPhys", "blockMag", "hpRegen", "mpRegen"];

    function render() {
      renderHeroBars(save);
      const st = RPG.calcStats(save);
      const ch = save.character;

      // Атрибути
      const attrBox = $("attrs-list");
      attrBox.innerHTML = "";
      const total = RPG.totalAttrs(save);
      attrBox.append(el("p", "note", ch.freePoints
        ? `Вільних очок: ${ch.freePoints}. Натисніть «+», щоб вкласти.`
        : `Вільних очок немає. За кожен новий рівень — ${RPG.POINTS_PER_LEVEL}.`));
      for (const key in RPG.ATTRS) {
        const row = el("div", "stat-row");
        const fromItems = total[key] - (ch.attrs[key] || 0);
        const value = el("strong", null, String(total[key]) + (fromItems ? ` (+${fromItems} з речей)` : ""));
        row.append(el("span", null, RPG.ATTRS[key]), value);
        if (ch.freePoints > 0) {
          const plus = button("+", "wf wf-button attr-plus", async () => {
            if (!RPG.addAttrPoint(save, key)) return;
            await RPG.saveGame(save);
            render();
          });
          plus.title = `Додати очко: ${RPG.ATTRS[key]}`;
          row.append(plus);
        }
        attrBox.append(row);
      }

      // Бойові характеристики
      const list = $("stats-list");
      list.innerHTML = "";
      for (const key of DERIVED) {
        const row = el("div", "stat-row");
        row.append(el("span", null, RPG.STAT_NAMES[key]), el("strong", null, fmtStat(key, st[key] || 0)));
        list.append(row);
      }

      const info = $("char-info");
      info.innerHTML = "";
      const p = RPG.expProgress(save);
      const infoRows = [
        ["Професія", RPG.getClass(ch.classId).name],
        ["Рівень", ch.level],
        ["Досвід", p.max ? `${fmtNum(p.exp)} (максимум)` : `${fmtNum(p.exp)} / ${fmtNum(p.nextLevelAt)}`],
        ["Весь здобутий досвід", fmtNum(ch.totalExp)],
        ["Золото", fmtNum(ch.gold)],
        ["Локація", RPG.getLocation(save.location.map).name],
        ["Переможено ворогів", fmtNum(ch.kills || 0)],
        ["Загибелей", fmtNum(ch.deaths || 0)]
      ];
      for (const [k, v] of infoRows) {
        const row = el("div", "stat-row");
        row.append(el("span", null, k), el("strong", null, String(v)));
        info.append(row);
      }

      const slots = $("equip-slots");
      slots.innerHTML = "";
      for (const slot in RPG.SLOTS) {
        const item = RPG.ITEMS[save.equipment[slot]];
        const cell = el("div", item ? "wf wf-slot equip-cell" : "wf wf-slot equip-cell slot-empty");
        if (item) cell.append(smallIcon(save.equipment[slot], "equip-icon"));
        cell.append(el("span", "equip-slot-name", RPG.SLOTS[slot]));
        cell.append(el("strong", null, item ? item.name : "порожньо"));
        if (item) cell.title = describeStats(item);
        slots.append(cell);
      }
    }

    render();
    startRegenTimer(save, () => renderHeroBars(save));
  }

  // ============================================================
  // ІНВЕНТАР + СУНДУК
  // ============================================================
  async function pageInventory() {
    const save = await requireSave();
    if (!save) return;

    const msg = $("msg");
    const desc = $("item-desc");
    const btnEquip = $("btn-equip");
    const btnUnequip = $("btn-unequip");
    const btnUse = $("btn-use");
    const btnDrop = $("btn-drop");
    const btnToChest = $("btn-to-chest");
    const btnFromChest = $("btn-from-chest");
    const atHome = RPG.isAtHome(save);

    // selected: { kind: "inv", index } | { kind: "eq", slot } | { kind: "chest", index }
    let selected = null;

    function gridOf(list, minCells, kind, box) {
      box.innerHTML = "";
      const total = Math.max(minCells, Math.ceil(list.length / 12) * 12);
      for (let i = 0; i < total; i++) {
        const entry = list[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const cell = fillItemCell(button("", slotClass(entry.id)), entry.id, entry.qty);
        if (selected?.kind === kind && selected.index === i) cell.classList.add("is-selected");
        cell.addEventListener("click", () => { selected = { kind, index: i }; render(); });
        box.append(cell);
      }
    }

    function render() {
      const eq = $("equip-list");
      eq.innerHTML = "";
      for (const slot in RPG.SLOTS) {
        const item = RPG.ITEMS[save.equipment[slot]];
        const cell = button("", "wf wf-slot equip-cell" + (item ? "" : " slot-empty"));
        if (item) cell.append(smallIcon(save.equipment[slot], "equip-icon"));
        cell.append(el("span", "equip-slot-name", RPG.SLOTS[slot]));
        cell.append(el("strong", null, item ? item.name : "порожньо"));
        if (selected?.kind === "eq" && selected.slot === slot) cell.classList.add("is-selected");
        cell.addEventListener("click", () => { selected = item ? { kind: "eq", slot } : null; render(); });
        eq.append(cell);
      }

      gridOf(save.inventory, 36, "inv", $("item-grid"));
      $("chest-note").textContent = atHome
        ? "Речі тут не зникають навіть після загибелі."
        : "Сундук стоїть у Домівці — тут його можна лише переглянути.";
      gridOf(save.chest, 24, "chest", $("chest-grid"));

      $("gold").textContent = `Золото: ${fmtNum(save.character.gold)}`;
      renderDesc();
    }

    function selectedItemId() {
      if (!selected) return null;
      if (selected.kind === "eq") return save.equipment[selected.slot] || null;
      if (selected.kind === "chest") return save.chest[selected.index]?.id || null;
      return save.inventory[selected.index]?.id || null;
    }

    function renderDesc() {
      const id = selectedItemId();
      desc.innerHTML = "";
      for (const b of [btnEquip, btnUnequip, btnUse, btnDrop, btnToChest, btnFromChest]) b.disabled = true;
      btnToChest.title = btnFromChest.title = atHome ? "" : "Доступно лише в Домівці";
      if (!id) {
        desc.append(el("div", null, "Оберіть предмет, щоб побачити опис."));
        return;
      }
      const item = RPG.ITEMS[id];
      desc.append(smallIcon(id, "desc-icon"));
      desc.append(el("strong", null, item.name + (item.rarity === "rare" ? " · рідкісне" : "")));
      desc.append(el("div", null, item.description));
      const st = describeStats(item);
      if (st) desc.append(el("div", null, "Характеристики: " + st));
      if (item.slot) desc.append(el("div", null, `Слот: ${RPG.SLOTS[item.slot]} · потрібен рівень ${item.levelReq || 1}`));
      const eff = describeEffect(item);
      if (eff) desc.append(el("div", null, eff));
      desc.append(el("div", null,
        `Вартість: ${item.price || 0} золота · шинкар купить за ${RPG.shopBuyPrice(id)}` +
        (item.noShop ? " · у продажу не буває" : "")));

      if (selected.kind === "inv" && item.slot) {
        const diff = RPG.previewEquip(save, id);
        const txt = Object.entries(diff).map(([k, v]) => `${RPG.STAT_NAMES[k] || k} ${v > 0 ? "+" : ""}${v}`).join(", ");
        desc.append(el("div", "item-diff", "Якщо вдягнути: " + (txt || "без змін")));
        const check = RPG.canEquip(save, id);
        btnEquip.disabled = !check.ok;
        btnEquip.title = check.ok ? "" : check.reason;
      }
      if (selected.kind === "eq") btnUnequip.disabled = false;
      if (selected.kind === "inv" && item.type === "consumable") btnUse.disabled = false;
      if (selected.kind === "inv") btnDrop.disabled = false;
      if (selected.kind === "inv" && atHome) btnToChest.disabled = false;
      if (selected.kind === "chest" && atHome) btnFromChest.disabled = false;
    }

    async function commit(text, isError) {
      if (!isError) await RPG.saveGame(save);
      showMsg(msg, text, isError);
      render();
    }

    btnEquip.addEventListener("click", async () => {
      const id = selectedItemId();
      const old = RPG.ITEMS[save.equipment[RPG.ITEMS[id].slot]];
      if (old && !confirm(`Замінити «${old.name}» на «${RPG.ITEMS[id].name}»?`)) return;
      const r = RPG.equipItem(save, id);
      selected = r.ok ? { kind: "eq", slot: RPG.ITEMS[id].slot } : selected;
      await commit(r.ok ? `Вдягнено: ${RPG.ITEMS[id].name}` : r.reason, !r.ok);
    });

    btnUnequip.addEventListener("click", async () => {
      const id = selectedItemId();
      const r = RPG.unequipItem(save, selected.slot);
      selected = null;
      await commit(r.ok ? `Знято: ${RPG.ITEMS[id].name}` : r.reason, !r.ok);
    });

    btnUse.addEventListener("click", async () => {
      const id = selectedItemId();
      const r = RPG.useItem(save, id);
      if (!save.inventory[selected.index] || save.inventory[selected.index].id !== id) selected = null;
      await commit(r.ok ? useResultText(RPG.ITEMS[id], r) : r.reason, !r.ok);
    });

    btnDrop.addEventListener("click", async () => {
      const entry = save.inventory[selected.index];
      const item = RPG.ITEMS[entry.id];
      if (!confirm(`Викинути «${item.name}»${entry.qty > 1 ? ` ×${entry.qty}` : ""}?`)) return;
      save.inventory.splice(selected.index, 1);
      selected = null;
      await commit(`Викинуто: ${item.name}`);
    });

    btnToChest.addEventListener("click", async () => {
      const r = RPG.moveToChest(save, selected.index);
      selected = null;
      await commit(r.ok ? `У сундук: ${RPG.ITEMS[r.id].name}${r.qty > 1 ? ` ×${r.qty}` : ""}` : r.reason, !r.ok);
    });

    btnFromChest.addEventListener("click", async () => {
      const r = RPG.takeFromChest(save, selected.index);
      selected = null;
      await commit(r.ok ? `Забрано з сундука: ${RPG.ITEMS[r.id].name}${r.qty > 1 ? ` ×${r.qty}` : ""}` : r.reason, !r.ok);
    });

    render();
  }

  // ============================================================
  // МАПА
  // ============================================================
  const LOCATION_ORDER = ["home", "temple", "village_start", "tavern", "forest_path", "forest_cave"];
  const TYPE_LABEL = { home: "Безпечно", temple: "Безпечно", tavern: "Торговець", combat: "Бої" };

  async function pageMaps() {
    const save = await requireSave();
    if (!save) return;
    const grid = $("loc-list");
    const details = $("loc-details");
    const ids = [...LOCATION_ORDER, ...Object.keys(RPG.LOCATIONS).filter(id => !LOCATION_ORDER.includes(id))];
    let selected = save.location.map;

    function render() {
      grid.innerHTML = "";
      for (const id of ids) {
        const loc = RPG.LOCATIONS[id];
        if (!loc) continue;
        const here = save.location.map === id;
        const cell = button("", "wf loc-card " + (loc.locked ? "wf-locked" : "wf-link"));
        cell.append(el("strong", null, loc.name));
        cell.append(el("span", "loc-desc", loc.locked ? "Закрито" : here ? "Ви тут" : TYPE_LABEL[loc.type]));
        if (selected === id) cell.classList.add("is-selected");
        if (loc.locked) cell.setAttribute("aria-disabled", "true");
        cell.addEventListener("click", () => { selected = id; render(); });
        grid.append(cell);
      }
      renderDetails();
    }

    function renderDetails() {
      const loc = RPG.LOCATIONS[selected];
      details.innerHTML = "";
      details.append(el("h2", null, loc.name));
      if (loc.locked) {
        details.append(el("p", null, "Закрито — відкриється згодом."));
        return;
      }
      details.append(el("p", null, loc.description));
      if (loc.type === "combat") {
        const enemies = (loc.enemies || []).map(e => `${RPG.getEnemy(e).name} (рів. ${RPG.getEnemy(e).level})`).join(", ");
        details.append(el("p", "note", "Вороги: " + enemies));
      } else {
        details.append(el("p", "note", "Тут не б'ються, монстрів немає."));
      }
      if (save.location.map === selected) {
        details.append(link("Ви тут — відкрити локацію", "game.html"));
      } else {
        details.append(link("Перейти сюди", "game.html?loc=" + encodeURIComponent(selected)));
      }
    }

    render();
  }

  // ---------- Запуск ----------
  const PAGES = {
    "new-game": pageNewGame,
    "load": pageLoad,
    "settings": pageSettings,
    "game": pageGame,
    "character": pageCharacter,
    "inventory": pageInventory,
    "maps": pageMaps
  };

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    if (PAGES[page]) {
      Promise.resolve(PAGES[page]()).catch(e => console.error("[game]", e));
    }
  });

  Object.assign(RPG, { setBar });
})(window.RPG);
