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
    const pct = ["crit", "dodge", "blockPhys", "blockMag"].includes(key);
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
    return RPG.itemFullName(entry) + (entry.qty > 1 ? ` ×${entry.qty}` : "");
  }

  // Назва речі кольором рідкості
  function rarityName(ref, tag = "strong") {
    const node = el(tag, null, RPG.itemFullName(ref));
    if (RPG.hasRarity(RPG.refId(ref))) node.classList.add("rt-" + RPG.rarityOf(ref));
    return node;
  }

  // Картинка з рідкістю; якщо копії немає — звичайна картинка;
  // якщо картинки немає зовсім — onFail() (заглушка з назвою)
  function setItemImg(img, ref, onFail) {
    const id = RPG.refId(ref);
    const src = RPG.itemImgRef(ref);
    if (!src) { onFail(); return false; }
    img.src = src;
    img.addEventListener("error", function fallback() {
      const plain = RPG.itemImg(id);
      if (plain && !img.src.endsWith(plain.split("/").pop())) { img.src = plain; return; }
      img.removeEventListener("error", fallback);
      onFail();
    });
    return true;
  }

  // Клас кольору рідкості для тексту заглушки
  function rarityTextClass(ref) {
    return RPG.hasRarity(RPG.refId(ref)) ? " rt-" + RPG.rarityOf(ref) : "";
  }

  // Маленька заглушка: перші літери назви кольором рідкості
  function miniPlaceholder(ref, className) {
    const name = RPG.itemName(ref);
    const letters = name.split(/\s+/).map(w => w[0]).join("").slice(0, 3).toUpperCase();
    const ph = el("span", `${className} mini-ph${rarityTextClass(ref)}`, letters);
    ph.title = RPG.itemFullName(ref);
    return ph;
  }

  // Наповнює клітинку предмета: картинка + кількість.
  // Якщо картинки в assets/img/items/ немає — показує назву текстом,
  // тож нову іконку достатньо просто покласти в папку.
  function fillItemCell(cell, ref, qty = 1) {
    const item = RPG.ITEMS[RPG.refId(ref)];
    cell.textContent = "";
    cell.title = RPG.itemFullName(ref) + (qty > 1 ? ` ×${qty}` : "");
    cell.classList.add("has-icon");
    const img = el("img", "item-icon");
    img.alt = item.name;
    const showPlaceholder = () => {
      img.remove();
      cell.classList.remove("has-icon");
      cell.prepend(el("span", "item-name item-ph" + rarityTextClass(ref), item.name));
    };
    if (!setItemImg(img, ref, showPlaceholder)) {   // картинки немає — заглушка вже показана
      if (qty > 1) cell.append(el("span", "item-qty", `×${qty}`));
      return cell;
    }
    cell.append(img);
    if (qty > 1) cell.append(el("span", "item-qty", `×${qty}`));
    return cell;
  }

  // Маленька іконка поруч із текстом (спорядження, шинок, опис)
  function smallIcon(ref, className = "mini-icon") {
    const img = el("img", className);
    img.alt = "";
    const ok = setItemImg(img, ref, () => { if (img.isConnected) img.replaceWith(miniPlaceholder(ref, className)); });
    return ok ? img : miniPlaceholder(ref, className);
  }

  function slotClass(ref, extra = "") {
    const id = RPG.refId(ref);
    let cls = RPG.ITEMS[id]?.rarity === "rare" ? " rarity-rare" : "";
    if (RPG.hasRarity(id)) cls += " rarity-" + RPG.rarityOf(ref);
    return "wf wf-slot" + cls + (extra ? " " + extra : "");
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

  // ref — ID предмета або екземпляр з рідкістю
  function describeStats(ref) {
    return Object.entries(RPG.itemStats(ref))
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
      volume.addEventListener("change", () => {
        RPG.setSettings({ volume: Number(volume.value) });
        showMsg(msg, "Налаштування збережено.");
      });
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
        // Гра завантажена — «Назад» поведе на сторінку персонажа (menu.js)
        document.body.dataset.gameLoaded = "1";
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
    let enterError = null;
    if (locParam && RPG.LOCATIONS[locParam] && save.location.map !== locParam) {
      const can = RPG.canEnterLocation(locParam, save.character.level);
      if (can.ok) {
        save.location.map = locParam;
        await RPG.saveGame(save);
      } else {
        enterError = can.reason;
      }
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
    if (enterError) setTimeout(() => showMsg(msg, enterError + " Ви залишились тут.", true), 0);

    function renderQuickSlots() {
      const box = $("quick-slots");
      box.innerHTML = "";
      for (let i = 0; i < 12; i++) {
        const entry = save.inventory[i];
        if (!entry) { box.append(el("div", "wf wf-slot slot-empty", "")); continue; }
        const item = RPG.ITEMS[entry.id];
        const cell = fillItemCell(button("", slotClass(entry)), entry, entry.qty);
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
      else if (locData.type === "city") renderCity();
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
      renderShop(place, locData.shop || []);
      const row = el("div", "row");
      row.append(link("До Домівки", "game.html?loc=home"), link("Мапа", "maps.html"));
      place.append(row);
    }

    // Купівля / продаж (Шинок, торговець Гільдії)
    function renderShop(box, shopIds) {
      box.append(el("p", null, `Ваше золото: ${fmtNum(save.character.gold)}`));

      const cols = el("div", "row shop");
      const buyBox = el("div", "stack");
      buyBox.append(el("h3", null, "Купити"));
      for (const id of shopIds) {
        const item = RPG.ITEMS[id];
        if (!item || item.noShop) continue;
        const price = RPG.shopSellPrice(id);
        const r = el("div", "shop-row");
        r.append(smallIcon(id));
        const info = el("span", "shop-name", item.name);
        info.title = [item.description, describeStats(id), describeEffect(item)].filter(Boolean).join(" · ");
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
        const item = RPG.ITEMS[entry.id];
        const unit = RPG.refSellPrice(entry);
        const r = el("div", "shop-row");
        const name = el("span", "shop-name", itemLabel(entry));
        if (RPG.hasRarity(entry.id)) {
          name.classList.add("rt-" + RPG.rarityOf(entry));
          name.title = describeStats(entry);
        }
        name.append(el("small", null, ` · ${unit} зол./шт.`));
        r.append(smallIcon(entry), name);

        async function sell(qty) {
          const res = RPG.sellItem(save, index, qty);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Продано: ${RPG.itemFullName(entry)}${res.qty > 1 ? ` × ${res.qty}` : ""} за ${fmtNum(res.price)} золота.`);
          renderAll();
        }

        if (entry.qty > 1) {
          // Своя кількість: поле + «Продати», і окремо — уся стопка
          const qtyInput = el("input", "shop-qty");
          Object.assign(qtyInput, { type: "number", min: 1, max: entry.qty, step: 1, value: 1, inputMode: "numeric" });
          qtyInput.title = `Скільки продати (1–${entry.qty})`;
          qtyInput.setAttribute("aria-label", `Кількість: ${item.name}`);
          const sellSome = button(`+${unit} зол.`, "wf wf-secondary", () => {
            const n = Math.floor(Number(qtyInput.value));
            if (!(n >= 1 && n <= entry.qty)) {
              showMsg(msg, `Вкажіть кількість від 1 до ${entry.qty}.`, true);
              return;
            }
            sell(n);
          });
          const updateLabel = () => {
            const n = Math.min(entry.qty, Math.max(1, Math.floor(Number(qtyInput.value)) || 1));
            sellSome.textContent = `Продати +${fmtNum(unit * n)} зол.`;
          };
          qtyInput.addEventListener("input", updateLabel);
          qtyInput.addEventListener("keydown", e => { if (e.key === "Enter") sellSome.click(); });
          updateLabel();
          const sellAll = button(`Усе (${entry.qty}) +${fmtNum(unit * entry.qty)} зол.`, "wf wf-secondary", () => sell(entry.qty));
          r.append(qtyInput, sellSome, sellAll);
        } else {
          r.append(button(`+${unit} зол.`, "wf wf-secondary", () => sell(1)));
        }
        sellBox.append(r);
      });

      cols.append(buyBox, sellBox);
      box.append(cols);
    }

    // ---------- Місто: райони та Гільдія авантюристів ----------
    let cityDistrict = "south";     // обраний район (Південний відкритий)
    let guildNpc = "admin";         // admin | trader | trainer

    function renderCity() {
      place.append(el("p", null, locData.description));
      const grid = el("div", "district-grid");
      for (const d of locData.districts || []) {
        const card = button("", "wf loc-card " + (d.locked ? "wf-locked" : "wf-link"));
        card.append(el("strong", null, d.name), el("span", "loc-desc", d.locked ? "Закрито" : d.building));
        if (cityDistrict === d.id) card.classList.add("is-selected");
        card.addEventListener("click", () => { cityDistrict = d.id; renderPlace(); });
        grid.append(card);
      }
      place.append(grid);

      const d = (locData.districts || []).find(x => x.id === cityDistrict);
      if (d) {
        const box = el("div", "stack district");
        box.append(el("h3", null, `${d.name} — ${d.building}`), el("p", null, d.description));
        if (d.locked) box.append(el("p", "note", "Закрито — відкриється згодом."));
        else if (d.id === "south") renderGuild(box);
        place.append(box);
      }
      const row = el("div", "row");
      row.append(link("До Домівки", "game.html?loc=home"), link("Мапа", "maps.html"));
      place.append(row);
    }

    function renderGuild(box) {
      const tabs = el("div", "row npc-tabs");
      for (const [id, name] of [["admin", "Адміністратор гільдії"], ["trader", "Торговець"], ["trainer", "Тренер"]]) {
        tabs.append(button(name, "wf " + (guildNpc === id ? "wf-button" : "wf-link"), () => { guildNpc = id; renderPlace(); }));
      }
      box.append(tabs);
      const npc = el("div", "stack npc-panel");
      if (guildNpc === "admin") renderQuestBoard(npc);
      else if (guildNpc === "trader") {
        npc.append(el("p", null,
          `Торговець гільдії продає зброю 1–2 виду, малі й середні зілля (за ${Math.round(RPG.SHOP_SELL_RATE * 100)}% вартості), ` +
          `а купує будь-що за ${Math.round(RPG.SHOP_BUY_RATE * 100)}%.`));
        renderShop(npc, RPG.GUILD_SHOP || []);
      } else renderTrainer(npc);
      box.append(npc);
    }

    // --- Адміністратор гільдії: завдання ---
    function renderQuestBoard(box) {
      const before = RPG.questState(save).offers.length;
      RPG.fillOffers(save);
      if (RPG.questState(save).offers.length !== before) RPG.saveGame(save).catch(e => console.error(e));
      const qs = RPG.questState(save);
      box.append(el("p", null,
        `«Роботи вистачає — беріть до ${RPG.QUEST_MAX_ACTIVE} завдань одночасно.» Виконано завдань: ${qs.done}.`));

      if (qs.bounties.length) {
        box.append(el("h3", null, "Нагороди за чемпіонів"));
        for (const bounty of qs.bounties) {
          const r = el("div", "shop-row quest-row quest-done champion-row");
          const info = el("span", "shop-name", `Переможено чемпіона: ${bounty.name}`);
          info.append(el("small", null, ` · ${bounty.exp} EXP, ${bounty.gold} золота (×${RPG.CHAMPION.bountyMult})`));
          r.append(info, button("Отримати", "wf wf-button", async () => {
            const res = RPG.claimBounty(save, bounty.id);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            await RPG.saveGame(save);
            showMsg(msg, `Нагорода за чемпіона: +${bounty.exp} EXP, +${bounty.gold} золота.` +
              (res.levelUps.length ? ` Новий рівень: ${res.levelUps[res.levelUps.length - 1]}!` : ""));
            renderAll();
          }));
          box.append(r);
        }
      }

      box.append(el("h3", null, "Ваші завдання"));
      if (!qs.active.length) box.append(el("p", "note", "Немає взятих завдань."));
      for (const quest of qs.active) {
        const done = RPG.isQuestComplete(save, quest);
        const r = el("div", "shop-row quest-row" + (done ? " quest-done" : ""));
        const info = el("span", "shop-name", `${RPG.questTitle(quest)} — ${RPG.questProgress(save, quest)}/${quest.need}`);
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const turnIn = button("Здати", "wf wf-button", async () => {
          const res = RPG.turnInQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Завдання виконано! Нагорода: ${RPG.describeReward(quest.reward)}.` +
            (res.levelUps.length ? ` Новий рівень: ${res.levelUps[res.levelUps.length - 1]}!` : ""));
          renderAll();
        });
        turnIn.disabled = !done;
        const drop = button("Відмовитись", "wf wf-secondary", async () => {
          if (!confirm(`Відмовитися від завдання «${RPG.questTitle(quest)}»?`)) return;
          RPG.abandonQuest(save, quest.id);
          await RPG.saveGame(save);
          renderAll();
        });
        r.append(info, turnIn, drop);
        box.append(r);
      }

      box.append(el("h3", null, "Нові завдання"));
      for (const quest of qs.offers) {
        const r = el("div", "shop-row quest-row");
        const info = el("span", "shop-name", RPG.questTitle(quest));
        info.append(el("small", null, ` · нагорода: ${RPG.describeReward(quest.reward)}`));
        const take = button("Взяти", "wf wf-button", async () => {
          const res = RPG.acceptQuest(save, quest.id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `Взято завдання: ${RPG.questTitle(quest)}.`);
          renderAll();
        });
        take.disabled = qs.active.length >= RPG.QUEST_MAX_ACTIVE;
        r.append(info, take);
        box.append(r);
      }
    }

    // --- Тренер: володіння зброєю та навички ---
    function masteryBonusText(type, lvl) {
      const parts = [];
      for (const [k, max] of Object.entries(RPG.MASTERY_BONUS[type] || {})) {
        const v = Math.round(max * lvl / RPG.MASTERY_MAX * 10) / 10;
        parts.push(`${RPG.STAT_NAMES[k] || k} +${v}`);
      }
      return parts.join(", ");
    }

    function renderTrainer(box) {
      const type = RPG.weaponTypeOf(save);
      const cap = RPG.masteryCap(save.character.level);
      box.append(el("p", null, "«Покажи, чим б'єшся, — і я навчу тебе володіти цим краще.» " +
        "Тренер навчає лише тієї зброї, яка зараз у вас у правій руці."));
      box.append(el("p", "note",
        `Межа володіння зараз: ${cap}` + (cap < RPG.MASTERY_MAX ? " (з 10 рівня персонажа — 20)." : ".") +
        " Володіння 10 відкриває зброю 2 виду, 20 — 3 виду."));

      box.append(el("h3", null, "Володіння зброєю"));
      for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
        const lvl = RPG.getMastery(save, t);
        const r = el("div", "shop-row skill-row" + (t === type ? " is-current" : ""));
        const info = el("span", "shop-name", `${wt.mastery}: ${lvl}/${cap}` + (t === type ? " · у руках" : ""));
        info.append(el("small", null, lvl ? ` · ${masteryBonusText(t, lvl)}` : ` · на 20: ${masteryBonusText(t, RPG.MASTERY_MAX)}`));
        r.append(info);
        if (t === type) {
          const cost = RPG.masteryCost(lvl + 1);
          const b = button(lvl >= cap ? "Максимум" : `Тренувати (${fmtNum(cost)} зол.)`, "wf wf-button", async () => {
            const res = RPG.trainMastery(save, t);
            if (!res.ok) { showMsg(msg, res.reason, true); return; }
            await RPG.saveGame(save);
            showMsg(msg, `${wt.mastery}: ${res.level} (−${fmtNum(res.cost)} золота).`);
            renderAll();
          });
          b.disabled = lvl >= cap || save.character.gold < cost;
          r.append(b);
        }
        box.append(r);
      }

      box.append(el("h3", null, "Активні навички та бафи"));
      if (!type) { box.append(el("p", "note", "Вдягніть зброю, щоб тренер показав навички для неї.")); return; }
      const mastery = RPG.getMastery(save, type);
      for (const id of RPG.skillsForWeapon(type)) {
        const sk = RPG.SKILLS[id];
        const lvl = RPG.skillLevel(save, id);
        const r = el("div", "shop-row skill-row");
        const info = el("span", "shop-name", `${sk.kind === "buff" ? "Баф" : "Навичка"}: ${sk.name} — ${lvl}/${RPG.SKILL_MAX}`);
        info.append(el("small", null, ` · ${sk.desc} ${RPG.describeSkill(id, Math.max(1, lvl))}` +
          (mastery < sk.req ? ` · потрібно володіння ${sk.req}` : "")));
        const cost = RPG.skillCost(lvl + 1);
        const label = lvl >= RPG.SKILL_MAX ? "Максимум" : `${lvl ? "Покращити" : "Вивчити"} (${fmtNum(cost)} зол.)`;
        const b = button(label, "wf wf-button", async () => {
          const res = RPG.learnSkill(save, id);
          if (!res.ok) { showMsg(msg, res.reason, true); return; }
          await RPG.saveGame(save);
          showMsg(msg, `«${sk.name}»: рівень ${res.level} (−${fmtNum(res.cost)} золота). Додайте навичку в чергу дій у бою.`);
          renderAll();
        });
        b.disabled = lvl >= RPG.skillCap(save, id) || mastery < sk.req || save.character.gold < cost;
        if (b.disabled && mastery >= sk.req && lvl >= RPG.skillCap(save, id) && lvl < RPG.SKILL_MAX) {
          b.title = "Рівень навички не може перевищувати рівень володіння зброєю";
        }
        r.append(info, b);
        box.append(r);
      }
    }

    // ---------- Бій ----------
    const startBtn = $("start-btn");
    const rerollBtn = $("reroll-btn");
    const saveBtn = $("save-btn");
    const logBox = $("battle-log");
    const arena = $("arena");
    let enemyId = null;
    let champion = false;       // чемпіон: золота рамка, показники ×3
    function nextEnemy() {
      enemyId = RPG.pickEnemy(locId, save.character.level);
      champion = RPG.rollChampion();
    }
    function curEnemy() { return RPG.getEnemy(enemyId, champion); }
    if (combat) nextEnemy();

    function renderEnemy(hp) {
      const enemy = curEnemy();
      $("enemy-img").closest("figure").classList.toggle("is-champion", champion);
      $("enemy-col").classList.toggle("is-champion", champion);
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
      const weaponRef = save.equipment.mainHand;
      const weaponItem = RPG.ITEMS[RPG.refId(weaponRef)];
      const weaponSt = weaponItem ? RPG.itemStats(weaponRef) : {};
      const magicWeapon = weaponItem && (weaponSt.magic || 0) > (weaponSt.attack || 0);
      // Варіанти для кожної клітинки: порожньо, звичайний удар, вивчені навички цієї зброї
      const wtype = weaponItem?.weaponType || null;
      const options = [["", "—"], ["attack", magicWeapon ? "Іскра" : "Удар"]];
      if (wtype) {
        for (const id of RPG.skillsForWeapon(wtype)) {
          if (RPG.skillLevel(save, id) > 0) options.push([id, `${RPG.SKILLS[id].name} (${RPG.SKILLS[id].mp} MP)`]);
        }
      }
      for (let i = 0; i < 10; i++) {
        const action = save.battleQueue[i] || "";
        const sel = el("select", "wf wf-slot queue-select" + (action ? "" : " slot-empty"));
        sel.title = `Дія ${i + 1}`;
        sel.setAttribute("aria-label", `Дія ${i + 1} у черзі`);
        const opts = options.slice();
        if (action && !opts.some(o => o[0] === action)) {
          const sk = RPG.SKILLS[action];
          opts.push([action, sk ? `${sk.name} (інша зброя — буде удар)` : (action === "spell" ? "Іскра" : action)]);
        }
        for (const [val, text] of opts) {
          const o = el("option", null, `${i + 1}. ${text}`);
          o.value = val;
          if (val === action) o.selected = true;
          sel.append(o);
        }
        sel.addEventListener("change", async () => {
          if (fighting) return;
          save.battleQueue[i] = sel.value;
          for (let k = 0; k < 10; k++) save.battleQueue[k] ??= "";
          if (!save.battleQueue.some(Boolean)) save.battleQueue[0] = "attack";
          await RPG.saveGame(save);
          renderQueue();
        });
        box.append(sel);
      }
      $("weapon-info").textContent = weaponItem
        ? `Зброя: ${RPG.itemFullName(weaponRef)}${magicWeapon ? " (магічна — витрачає MP)" : ""}`
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
      const e = curEnemy();
      const warn = e.level >= save.character.level + 2 ? " Обережно: він значно сильніший!" : "";
      const lines = [`Попереду: ${e.name} (рівень ${e.level}).${warn}`];
      if (champion) lines.push("Це рідкісний ЧЕМПІОН: утричі сильніший! За перемогу — трофей і нагорода ×5 у Гільдії авантюристів.");
      lines.push("Натисніть «Почати бій» або пошукайте іншого суперника.");
      setArena(champion ? "Чемпіон!" : "Готові до бою", lines);
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

      const enemy = curEnemy();
      renderEnemy(enemy.stats.hp);
      logBox.innerHTML = "";

      const maxStats = RPG.calcStats(save);
      const result = RPG.simulateBattle(save, enemyId, champion);

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
        summary.push(...RPG.questOnKill(save, enemyId).map(s => "Завдання: " + s));
        summary.push(`+${enemy.exp} EXP`);
        if (loot.gold) summary.push(`+${loot.gold} золота`);
        for (const it of loot.items) {
          if (it.refs) it.refs.forEach(ref => summary.push(RPG.itemFullName(ref)));
          else summary.push(`${RPG.ITEMS[it.id].name} ×${it.qty}`);
        }
        if (champion) {
          // Трофей чемпіона: одна річ (легендарна 5% → епічна 25% → магічна 50%)
          const drop = RPG.rollChampionDrop(enemyId);
          if (drop) {
            const ref = RPG.makeItem(drop.id, drop.r);
            save.inventory.push(ref);
            summary.push(`Трофей чемпіона: ${RPG.itemFullName(ref)}`);
          } else {
            summary.push("Трофей чемпіона: цього разу нічого");
          }
          const b = RPG.addChampionBounty(save, enemyId);
          summary.push(`Гільдія авантюристів заплатить ${b.exp} EXP і ${b.gold} золота (нагорода ×5)`);
        }
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
            ? "Втрачено в бою: " + death.lostItems.map(ref => RPG.itemFullName(ref)).join(", ")
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
          const auto = RPG.describeAttrs(RPG.getClass(save.character.classId).levelAttrs, levelUps.length);
          lines.push(`Новий рівень: ${levelUps[levelUps.length - 1]}! Здоров'я та мана відновлені. ` +
            (auto ? `Бонус рівня: ${auto}. ` : "") +
            `Вільних очок атрибутів: ${save.character.freePoints} (сторінка «Персонаж»).`);
        }
        lines.push(`Переможено ворогів: ${save.character.kills}`);
        setArena("Перемога!", lines);
        addLogLine({ who: "info", text: "Нагорода: " + summary.join(", ") });
      } else {
        setArena("Ворог утік", ["Нагороди немає."]);
      }

      // Наступний суперник
      nextEnemy();
      const next = curEnemy();
      arena.append(el("div", "arena-line", `Далі на вас чекає: ${next.name} (рівень ${next.level}).` +
        (champion ? " Це рідкісний ЧЕМПІОН!" : "")));
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
        nextEnemy();
        renderEnemy(curEnemy().stats.hp);
        showReady();
      });
      renderEnemy(curEnemy().stats.hp);
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
                     "crit", "dodge", "blockPhys", "blockMag", "hpRegen", "mpRegen", "attackSpeedPct"];

    function render() {
      renderHeroBars(save);
      const st = RPG.calcStats(save);
      const ch = save.character;

      // Атрибути
      const attrBox = $("attrs-list");
      attrBox.innerHTML = "";
      const total = RPG.totalAttrs(save);
      const byLevel = RPG.levelAttrs(save);
      const cls = RPG.getClass(ch.classId);
      attrBox.append(el("p", "note", ch.freePoints
        ? `Вільних очок: ${ch.freePoints}. Натисніть «+», щоб вкласти.`
        : `Вільних очок немає. За кожен новий рівень — ${RPG.POINTS_PER_LEVEL}.`));
      const autoTxt = RPG.describeAttrs(cls.levelAttrs);
      if (autoTxt) attrBox.append(el("p", "note", `${cls.name}: за кожен рівень автоматично ${autoTxt}.`));
      for (const key in RPG.ATTRS) {
        const row = el("div", "stat-row");
        const fromLevels = byLevel[key] || 0;
        const fromItems = total[key] - (ch.attrs[key] || 0) - fromLevels;
        const extra = [];
        if (fromLevels) extra.push(`+${fromLevels} за рівні`);
        if (fromItems) extra.push(`+${fromItems} з речей`);
        const value = el("strong", null, String(total[key]) + (extra.length ? ` (${extra.join(", ")})` : ""));
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
        const ref = save.equipment[slot];
        const item = RPG.ITEMS[RPG.refId(ref)];
        const cell = el("div", item ? slotClass(ref, "equip-cell") : "wf wf-slot equip-cell slot-empty");
        if (item) cell.append(smallIcon(ref, "equip-icon"));
        cell.append(el("span", "equip-slot-name", RPG.SLOTS[slot]));
        cell.append(item ? rarityName(ref) : el("strong", null, "порожньо"));
        if (item) cell.title = describeStats(ref);
        slots.append(cell);
      }

      // Володіння зброєю та вивчені навички
      const mBox = $("mastery-list");
      if (mBox) {
        mBox.innerHTML = "";
        const cap = RPG.masteryCap(ch.level);
        const wtype = RPG.weaponTypeOf(save);
        for (const [t, wt] of Object.entries(RPG.WEAPON_TYPES)) {
          const row = el("div", "stat-row");
          row.append(el("span", null, wt.mastery + (t === wtype ? " (у руках)" : "")),
                     el("strong", null, `${RPG.getMastery(save, t)} / ${cap}`));
          mBox.append(row);
        }
        const learned = Object.entries(ch.skills || {}).filter(([, l]) => l > 0);
        mBox.append(el("p", "note", learned.length
          ? "Навички: " + learned.map(([id, l]) => `${RPG.SKILLS[id]?.name || id} ${l}`).join(", ")
          : "Навичок ще немає. Тренер — у Гільдії авантюристів (Місто, Південний район)."));
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
        const cell = fillItemCell(button("", slotClass(entry)), entry, entry.qty);
        if (selected?.kind === kind && selected.index === i) cell.classList.add("is-selected");
        cell.addEventListener("click", () => { selected = { kind, index: i }; render(); });
        box.append(cell);
      }
    }

    function render() {
      const eq = $("equip-list");
      eq.innerHTML = "";
      for (const slot in RPG.SLOTS) {
        const ref = save.equipment[slot];
        const item = RPG.ITEMS[RPG.refId(ref)];
        const cell = button("", item ? slotClass(ref, "equip-cell") : "wf wf-slot equip-cell slot-empty");
        if (item) cell.append(smallIcon(ref, "equip-icon"));
        cell.append(el("span", "equip-slot-name", RPG.SLOTS[slot]));
        cell.append(item ? rarityName(ref) : el("strong", null, "порожньо"));
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

    // Обраний запис: екземпляр речі (з рідкістю) або стопка
    function selectedRef() {
      if (!selected) return null;
      if (selected.kind === "eq") return save.equipment[selected.slot] || null;
      if (selected.kind === "chest") return save.chest[selected.index] || null;
      return save.inventory[selected.index] || null;
    }

    function selectedItemId() {
      return RPG.refId(selectedRef()) || null;
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
      const ref = selectedRef();
      const item = RPG.ITEMS[id];
      desc.append(smallIcon(ref, "desc-icon"));
      if (RPG.hasRarity(id)) desc.append(rarityName(ref));
      else desc.append(el("strong", null, item.name + (item.rarity === "rare" ? " · рідкісне" : "")));
      desc.append(el("div", null, item.description));
      const st = describeStats(ref);
      if (st) desc.append(el("div", null, "Характеристики: " + st));
      if (item.slot) {
        const slotName = RPG.slotsFor(item.slot).map(s => RPG.SLOTS[s]).join(" / ");
        desc.append(el("div", null, `Слот: ${slotName} · потрібен рівень ${item.levelReq || 1}`));
      }
      if (item.weaponType) {
        const need = RPG.TIER_MASTERY[item.tier] || 0;
        desc.append(el("div", null, `Зброя: ${RPG.WEAPON_TYPES[item.weaponType].name}` +
          (need ? ` · потрібно ${RPG.WEAPON_TYPES[item.weaponType].mastery.toLowerCase()} ${need}` : "") +
          (item.weaponType === "bow" ? " · дворучна (у лівій руці — лише колчан)" : "")));
      }
      const eff = describeEffect(item);
      if (eff) desc.append(el("div", null, eff));
      desc.append(el("div", null,
        `Вартість: ${item.price || 0} золота · шинкар купить за ${RPG.refSellPrice(ref)}` +
        (item.noShop ? " · у продажу не буває" : "")));

      if (selected.kind === "inv" && item.slot) {
        const diff = RPG.previewEquip(save, selected.index);
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
      const ref = selectedRef();
      const slot = RPG.equipSlotFor(save, ref.id);
      const old = save.equipment[slot];
      if (old && !confirm(`Замінити «${RPG.itemFullName(old)}» на «${RPG.itemFullName(ref)}»?`)) return;
      const r = RPG.equipItem(save, selected.index);
      selected = r.ok ? { kind: "eq", slot } : selected;
      const extra = r.ok && r.removed?.length ? ` Знято з лівої руки: ${r.removed.map(x => RPG.itemFullName(x)).join(", ")}.` : "";
      await commit(r.ok ? `Вдягнено: ${RPG.itemFullName(ref)}.${extra}` : r.reason, !r.ok);
    });

    btnUnequip.addEventListener("click", async () => {
      const r = RPG.unequipItem(save, selected.slot);
      selected = null;
      await commit(r.ok ? `Знято: ${RPG.itemFullName(r.ref)}` : r.reason, !r.ok);
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
      if (!confirm(`Викинути «${RPG.itemFullName(entry)}»${entry.qty > 1 ? ` ×${entry.qty}` : ""}?`)) return;
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
  const LOCATION_ORDER = ["home", "temple", "village_start", "tavern", "city", "forest_path", "forest_cave"];
  const TYPE_LABEL = { home: "Безпечно", temple: "Безпечно", tavern: "Торговець", city: "Гільдія", combat: "Бої" };

  // Зони локацій на картинці мапи (assets/images/Designer.*), у відсотках:
  // x, y — центр зони; w, h — ширина й висота. Нову локацію достатньо дописати сюди.
  const WORLD_MAP = {
    home:          { x: 8.5, y: 69, w: 15, h: 15 },
    temple:        { x: 13,  y: 31, w: 12, h: 22 },
    village_start: { x: 40,  y: 51, w: 17, h: 17 },
    tavern:        { x: 63,  y: 56, w: 15, h: 15 },
    city:          { x: 52,  y: 20, w: 34, h: 26 },
    forest_path:   { x: 86,  y: 72, w: 13, h: 22 },
    forest_cave:   { x: 92,  y: 19, w: 12, h: 16 }
  };

  // Фігурка героя (SVG)
  const HERO_FIGURE = `<svg viewBox="0 0 24 40" aria-hidden="true">
    <circle cx="12" cy="6" r="5" fill="#f4d3a6" stroke="#3a2a14" stroke-width="1.2"/>
    <path d="M6 13 h12 l2 13 h-4 l-1 13 h-3 l-0.5 -9 h-1 l-0.5 9 h-3 l-1 -13 h-4 z" fill="#2f6fd6" stroke="#10213f" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M7 15 l-4 9" stroke="#f4d3a6" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M17 15 l3 6 l1 -7" stroke="#8a5a2b" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`;

  async function pageMaps() {
    const save = await requireSave();
    if (!save) return;
    const grid = $("loc-list");
    const details = $("loc-details");
    const mapBox = $("world-map");
    const ids = [...LOCATION_ORDER, ...Object.keys(RPG.LOCATIONS).filter(id => !LOCATION_ORDER.includes(id))];
    let selected = save.location.map;
    let traveling = false;

    // Стан локації для героя: here | open | closed
    function locState(id) {
      if (save.location.map === id) return { kind: "here", text: "Ви тут" };
      const loc = RPG.LOCATIONS[id];
      const can = RPG.canEnterLocation(id, save.character.level);
      if (can.ok) return { kind: "open", text: "Можна перейти" };
      if (loc.locked) return { kind: "closed", text: "Закрито — відкриється згодом" };
      return { kind: "closed", text: `Недоступно: потрібен ${loc.minLevel} рівень (у вас ${save.character.level})` };
    }

    function shortText(s, n = 130) {
      return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
    }

    // ---------- Мапа-картинка: зони, підказка, фігурка героя ----------
    let tip = null, hero = null;
    function buildWorldMap() {
      if (!mapBox) return;
      mapBox.querySelectorAll(".map-spot, .map-tip, .map-hero").forEach(n => n.remove());
      for (const id of ids) {
        const pos = WORLD_MAP[id], loc = RPG.LOCATIONS[id];
        if (!pos || !loc) continue;
        const st = locState(id);
        const spot = button("", `map-spot is-${st.kind}`);
        spot.dataset.loc = id;
        Object.assign(spot.style, { left: pos.x + "%", top: pos.y + "%", width: pos.w + "%", height: pos.h + "%" });
        spot.setAttribute("aria-label", `${loc.name} — ${st.text}`);
        spot.addEventListener("mouseenter", () => showTip(id));
        spot.addEventListener("focus", () => showTip(id));
        spot.addEventListener("mouseleave", () => showTip(selected));
        spot.addEventListener("blur", () => showTip(selected));
        spot.addEventListener("click", () => { selected = id; render(); });
        spot.addEventListener("dblclick", () => travel(id));
        mapBox.append(spot);
      }
      tip = el("div", "map-tip");
      tip.hidden = true;
      mapBox.append(tip);

      // Фігурка героя (для групи в майбутньому — по фігурці на кожного)
      hero = el("div", "map-hero");
      hero.innerHTML = HERO_FIGURE;
      hero.append(el("span", "hero-tag", save.character.name));
      placeHero(save.location.map, false);
      mapBox.append(hero);
    }

    function heroPoint(id) {
      const pos = WORLD_MAP[id] || WORLD_MAP.home;
      return { x: pos.x, y: pos.y + pos.h * 0.25 };
    }

    function placeHero(id, animate) {
      if (!hero) return;
      hero.classList.toggle("no-anim", !animate);
      const pt = heroPoint(id);
      hero.style.left = pt.x + "%";
      hero.style.top = pt.y + "%";
    }

    function showTip(id) {
      if (!tip) return;
      mapBox.querySelectorAll(".map-spot").forEach(s => s.classList.toggle("is-selected", s.dataset.loc === selected));
      const pos = WORLD_MAP[id], loc = RPG.LOCATIONS[id];
      if (!pos || !loc) { tip.hidden = true; return; }
      const st = locState(id);
      tip.innerHTML = "";
      tip.append(el("strong", null, loc.name), el("div", `tip-status tip-${st.kind}`, st.text),
                 el("div", "tip-desc", shortText(loc.locked ? "Закрито — відкриється згодом." : loc.description)));
      const below = pos.y < 45;
      tip.style.left = Math.min(82, Math.max(18, pos.x)) + "%";
      tip.style.top = (below ? pos.y + pos.h / 2 : pos.y - pos.h / 2) + "%";
      tip.classList.toggle("tip-below", below);
      tip.hidden = false;
    }

    // Перехід: фігурка йде до нової локації, потім відкривається її сторінка
    function travel(id) {
      if (traveling) return;
      const href = id === save.location.map ? "game.html" : "game.html?loc=" + encodeURIComponent(id);
      if (id !== save.location.map && !RPG.canEnterLocation(id, save.character.level).ok) {
        selected = id; render();
        return;
      }
      traveling = true;
      if (!hero || id === save.location.map) { location.href = href; return; }
      hero.classList.add("is-walking");
      placeHero(id, true);
      setTimeout(() => { location.href = href; }, 950);
    }

    function render() {
      showTip(selected);
      grid.innerHTML = "";
      for (const id of ids) {
        const loc = RPG.LOCATIONS[id];
        if (!loc) continue;
        const here = save.location.map === id;
        const closed = !here && !RPG.canEnterLocation(id, save.character.level).ok;
        const cell = button("", "wf loc-card " + (closed ? "wf-locked" : "wf-link"));
        cell.append(el("strong", null, loc.name));
        const label = loc.locked ? "Закрито"
          : here ? "Ви тут"
          : closed ? `З ${loc.minLevel} рівня`
          : TYPE_LABEL[loc.type] + (loc.minLevel ? ` · від ${loc.minLevel} рів.` : "");
        cell.append(el("span", "loc-desc", label));
        if (selected === id) cell.classList.add("is-selected");
        if (closed) cell.setAttribute("aria-disabled", "true");
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
        return;
      }
      const can = RPG.canEnterLocation(selected, save.character.level);
      if (can.ok) {
        const go = link("Перейти сюди", "game.html?loc=" + encodeURIComponent(selected));
        go.addEventListener("click", ev => { ev.preventDefault(); travel(selected); });
        details.append(go);
      } else {
        details.append(el("p", "note", `Доступ з ${loc.minLevel} рівня персонажа (зараз у вас ${save.character.level}).`));
      }
    }

    buildWorldMap();
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
