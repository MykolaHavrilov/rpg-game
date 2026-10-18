// sw.js — service worker: гра працює офлайн і встановлюється як застосунок.
// HTML / JS / CSS: спершу мережа (щоб оновлення гри підтягувались одразу),
// а без інтернету — з кешу. Картинки: спершу кеш.
// Після великих змін можна збільшити номер версії — старий кеш видалиться.
const CACHE = "rpg-game-v6";
const PRECACHE = [
  "./",
  "./assets/css/game.css",
  "./assets/css/main.css",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/images/bg_scroll_1280x720.webp",
  "./assets/images/bg_scroll_1920x1080.webp",
  "./assets/images/bg_scroll_3840x2160.webp",
  "./assets/images/enemy_rat_1_barn_cellar.webp",
  "./assets/images/enemy_rat_2_sewer.webp",
  "./assets/images/enemy_rat_3_plague.webp",
  "./assets/images/enemy_wolf_1_forest.webp",
  "./assets/images/enemy_wolf_2_moon_howl.webp",
  "./assets/images/enemy_wolf_3_snow.webp",
  "./assets/images/hero_1_farm_sunset.webp",
  "./assets/images/hero_2_forest_cottage.webp",
  "./assets/images/hero_3_night_farm.webp",
  "./assets/img/items/amulet_fang.webp",
  "./assets/img/items/armor_leather.webp",
  "./assets/img/items/armor_wolf.webp",
  "./assets/img/items/boots_leather.webp",
  "./assets/img/items/boots_simple.webp",
  "./assets/img/items/cap_leather.webp",
  "./assets/img/items/club_spiked.webp",
  "./assets/img/items/dagger_rusty.webp",
  "./assets/img/items/hood_wolf.webp",
  "./assets/img/items/pants_leather.webp",
  "./assets/img/items/pants_linen.webp",
  "./assets/img/items/potion_hp_large.webp",
  "./assets/img/items/potion_hp_medium.webp",
  "./assets/img/items/potion_hp_small.webp",
  "./assets/img/items/potion_magic.webp",
  "./assets/img/items/potion_mp_large.webp",
  "./assets/img/items/potion_mp_medium.webp",
  "./assets/img/items/potion_mp_small.webp",
  "./assets/img/items/rat_skin.webp",
  "./assets/img/items/rat_tail.webp",
  "./assets/img/items/ring_copper.webp",
  "./assets/img/items/ring_silver.webp",
  "./assets/img/items/shield_iron.webp",
  "./assets/img/items/shield_wood.webp",
  "./assets/img/items/shirt_linen.webp",
  "./assets/img/items/slime_gel.webp",
  "./assets/img/items/staff_moon.webp",
  "./assets/img/items/staff_oak.webp",
  "./assets/img/items/sword_iron.webp",
  "./assets/img/items/sword_steel.webp",
  "./assets/img/items/sword_wood.webp",
  "./assets/img/items/white_pelt.webp",
  "./assets/img/items/wolf_fang.webp",
  "./assets/img/items/wolf_pelt.webp",
  "./assets/img/items/sword_wood_broken.webp",
  "./assets/img/items/sword_wood_magic.webp",
  "./assets/img/items/sword_wood_epic.webp",
  "./assets/img/items/sword_wood_legendary.webp",
  "./assets/img/items/dagger_rusty_broken.webp",
  "./assets/img/items/dagger_rusty_magic.webp",
  "./assets/img/items/dagger_rusty_epic.webp",
  "./assets/img/items/dagger_rusty_legendary.webp",
  "./assets/img/items/staff_oak_broken.webp",
  "./assets/img/items/staff_oak_magic.webp",
  "./assets/img/items/staff_oak_epic.webp",
  "./assets/img/items/staff_oak_legendary.webp",
  "./assets/img/items/sword_iron_broken.webp",
  "./assets/img/items/sword_iron_magic.webp",
  "./assets/img/items/sword_iron_epic.webp",
  "./assets/img/items/sword_iron_legendary.webp",
  "./assets/img/items/club_spiked_broken.webp",
  "./assets/img/items/club_spiked_magic.webp",
  "./assets/img/items/club_spiked_epic.webp",
  "./assets/img/items/club_spiked_legendary.webp",
  "./assets/img/items/staff_moon_broken.webp",
  "./assets/img/items/staff_moon_magic.webp",
  "./assets/img/items/staff_moon_epic.webp",
  "./assets/img/items/staff_moon_legendary.webp",
  "./assets/img/items/sword_steel_broken.webp",
  "./assets/img/items/sword_steel_magic.webp",
  "./assets/img/items/sword_steel_epic.webp",
  "./assets/img/items/sword_steel_legendary.webp",
  "./assets/img/items/shield_wood_broken.webp",
  "./assets/img/items/shield_wood_magic.webp",
  "./assets/img/items/shield_wood_epic.webp",
  "./assets/img/items/shield_wood_legendary.webp",
  "./assets/img/items/shield_iron_broken.webp",
  "./assets/img/items/shield_iron_magic.webp",
  "./assets/img/items/shield_iron_epic.webp",
  "./assets/img/items/shield_iron_legendary.webp",
  "./assets/img/items/cap_leather_broken.webp",
  "./assets/img/items/cap_leather_magic.webp",
  "./assets/img/items/cap_leather_epic.webp",
  "./assets/img/items/cap_leather_legendary.webp",
  "./assets/img/items/hood_wolf_broken.webp",
  "./assets/img/items/hood_wolf_magic.webp",
  "./assets/img/items/hood_wolf_epic.webp",
  "./assets/img/items/hood_wolf_legendary.webp",
  "./assets/img/items/shirt_linen_broken.webp",
  "./assets/img/items/shirt_linen_magic.webp",
  "./assets/img/items/shirt_linen_epic.webp",
  "./assets/img/items/shirt_linen_legendary.webp",
  "./assets/img/items/armor_leather_broken.webp",
  "./assets/img/items/armor_leather_magic.webp",
  "./assets/img/items/armor_leather_epic.webp",
  "./assets/img/items/armor_leather_legendary.webp",
  "./assets/img/items/armor_wolf_broken.webp",
  "./assets/img/items/armor_wolf_magic.webp",
  "./assets/img/items/armor_wolf_epic.webp",
  "./assets/img/items/armor_wolf_legendary.webp",
  "./assets/img/items/pants_linen_broken.webp",
  "./assets/img/items/pants_linen_magic.webp",
  "./assets/img/items/pants_linen_epic.webp",
  "./assets/img/items/pants_linen_legendary.webp",
  "./assets/img/items/pants_leather_broken.webp",
  "./assets/img/items/pants_leather_magic.webp",
  "./assets/img/items/pants_leather_epic.webp",
  "./assets/img/items/pants_leather_legendary.webp",
  "./assets/img/items/boots_simple_broken.webp",
  "./assets/img/items/boots_simple_magic.webp",
  "./assets/img/items/boots_simple_epic.webp",
  "./assets/img/items/boots_simple_legendary.webp",
  "./assets/img/items/boots_leather_broken.webp",
  "./assets/img/items/boots_leather_magic.webp",
  "./assets/img/items/ring_copper_broken.webp",
  "./assets/img/items/ring_copper_magic.webp",
  "./assets/img/items/ring_copper_epic.webp",
  "./assets/img/items/ring_copper_legendary.webp",
  "./assets/img/items/ring_silver_broken.webp",
  "./assets/img/items/ring_silver_magic.webp",
  "./assets/img/items/ring_silver_epic.webp",
  "./assets/img/items/ring_silver_legendary.webp",
  "./assets/img/items/amulet_fang_broken.webp",
  "./assets/img/items/amulet_fang_magic.webp",
  "./assets/img/items/amulet_fang_epic.webp",
  "./assets/img/items/amulet_fang_legendary.webp",
  "./assets/img/items/boots_leather_epic.webp",
  "./assets/img/items/boots_leather_legendary.webp",
  "./assets/js/battle.js",
  "./assets/js/character.js",
  "./assets/js/core.js",
  "./assets/js/data/classes.js",
  "./assets/js/data/enemies.js",
  "./assets/js/data/items.js",
  "./assets/js/data/levels.js",
  "./assets/js/game.js",
  "./assets/js/menu.js",
  "./assets/js/pwa.js",
  "./assets/js/rarity.js",
  "./assets/js/save.js",
  "./assets/js/stats.js",
  "./index.html",
  "./manifest.webmanifest",
  "./pages/character.html",
  "./pages/game.html",
  "./pages/inventory.html",
  "./pages/load.html",
  "./pages/maps.html",
  "./pages/new-game.html",
  "./pages/settings.html"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  if (req.destination === "image") {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
