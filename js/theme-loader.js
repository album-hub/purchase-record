// Fansign Manager V6 Sunrise Theme loader.
// Theme configuration comes from theme.json. User-replaced images are stored as
// resized Blobs in IndexedDB so large Base64 strings never enter app.js or order data.

(() => {
  "use strict";

  const STATE_KEY = "fansign_manager_v6_theme_state";
  const FALLBACK_THEME_ID = "sunrise";
  const requestedThemeId = (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      const candidate = String(saved.activeTheme || FALLBACK_THEME_ID).trim().toLowerCase();
      return /^[a-z0-9][a-z0-9-]*$/.test(candidate) ? candidate : FALLBACK_THEME_ID;
    } catch (error) {
      return FALLBACK_THEME_ID;
    }
  })();
  const THEME_ID = requestedThemeId;
  const THEME_URL = `assets/theme/${THEME_ID}/theme.json`;
  const DB_NAME = "fansign_manager_theme_assets";
  const DB_VERSION = 1;
  const STORE_NAME = "assets";
  const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
  const MAX_IMAGE_EDGE = 1800;
  const MEMBER_ORDER = ["sowon", "yerin", "eunha", "yuju", "sinb", "umji"];
  const MEMBER_LABELS = {
    sowon: "Sowon",
    yerin: "Yerin",
    eunha: "Eunha",
    yuju: "Yuju",
    sinb: "SinB",
    umji: "Umji"
  };

  const fallbackTheme = {
    id: THEME_ID,
    name: "Sunrise",
    logo: "icons/logo.svg",
    background: "background/sunrise-glow.svg",
    members: Object.fromEntries(MEMBER_ORDER.map(name => [name, `members/${name}.svg`])),
    music: { defaultCover: "music/default-cover.svg" },
    colors: {
      background: "#080606",
      surface: "rgba(24, 17, 16, .88)",
      surfaceStrong: "#201614",
      text: "#fff7ef",
      muted: "#c9aea1",
      line: "rgba(232, 190, 126, .25)",
      gold: "#e7bd77",
      roseGold: "#d68f78",
      blush: "#f1b9a7",
      danger: "#ef7f83",
      success: "#72bf9b",
      warning: "#e6a95f"
    }
  };

  let theme = fallbackTheme;
  let databasePromise = null;
  const objectUrls = new Map();

  function writeState(customSlots = []) {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      activeTheme: THEME_ID,
      customSlots,
      updatedAt: new Date().toISOString()
    }));
  }

  function resolveThemeAsset(relativePath) {
    if (!relativePath) return "";
    try {
      return new URL(relativePath, new URL(THEME_URL, document.baseURI)).href;
    } catch (error) {
      return relativePath;
    }
  }

  function openDatabase() {
    if (!window.indexedDB) return Promise.reject(new Error("此瀏覽器不支援 IndexedDB"));
    if (databasePromise) return databasePromise;

    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("無法開啟主題圖片儲存空間"));
    });

    return databasePromise;
  }

  async function readStoredAsset(slot) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(`${THEME_ID}:member:${slot}`);
      request.onsuccess = () => resolve(request.result?.blob || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function writeStoredAsset(slot, blob) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .put({ key: `${THEME_ID}:member:${slot}`, blob, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function removeStoredAsset(slot) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite")
        .objectStore(STORE_NAME)
        .delete(`${THEME_ID}:member:${slot}`);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function listCustomSlots() {
    const slots = [];
    await Promise.all(MEMBER_ORDER.map(async slot => {
      try {
        if (await readStoredAsset(slot)) slots.push(slot);
      } catch (error) {
        // The default theme remains usable if private browsing blocks IndexedDB.
      }
    }));
    return slots;
  }

  function revokeObjectUrl(slot) {
    const previousUrl = objectUrls.get(slot);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    objectUrls.delete(slot);
  }

  async function sourceForMember(slot) {
    try {
      const blob = await readStoredAsset(slot);
      if (blob) {
        if (!objectUrls.has(slot)) objectUrls.set(slot, URL.createObjectURL(blob));
        return { url: objectUrls.get(slot), custom: true };
      }
    } catch (error) {
      // Fall through to the bundled placeholder/default image.
    }
    return { url: resolveThemeAsset(theme.members?.[slot]), custom: false };
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("無法讀取這張圖片"));
      };
      image.src = url;
    });
  }

  async function optimizeImage(file) {
    if (!file?.type?.startsWith("image/")) throw new Error("請選擇圖片檔案");
    if (file.size > MAX_SOURCE_BYTES) throw new Error("圖片請小於 12 MB");

    const image = await loadImageElement(file);
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("圖片壓縮失敗"));
      }, "image/webp", .9);
    });
  }

  function applyThemeTokens() {
    const root = document.documentElement;
    root.dataset.theme = theme.id || THEME_ID;
    root.style.setProperty("--theme-background-image", `url("${resolveThemeAsset(theme.background)}")`);
    root.style.setProperty("--theme-default-cover", `url("${resolveThemeAsset(theme.music?.defaultCover)}")`);

    Object.entries(theme.colors || {}).forEach(([name, value]) => {
      const cssName = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
      root.style.setProperty(`--theme-${cssName}`, value);
    });

    const railLogo = document.getElementById("themeRailLogo");
    if (railLogo) railLogo.src = resolveThemeAsset(theme.logo);
    const brandMark = document.querySelector(".brand-mark");
    if (brandMark) {
      brandMark.textContent = "";
      const image = document.createElement("img");
      image.src = resolveThemeAsset(theme.logo);
      image.alt = "";
      brandMark.appendChild(image);
    }
  }

  async function renderMemberGallery() {
    const grid = document.getElementById("memberGalleryGrid");
    if (!grid) return;
    grid.innerHTML = "";

    for (const slot of MEMBER_ORDER) {
      const source = await sourceForMember(slot);
      const figure = document.createElement("figure");
      figure.className = "member-card";
      figure.dataset.member = slot;
      figure.innerHTML = `
        <img src="${source.url}" alt="${MEMBER_LABELS[slot]} 主題圖片" />
        <figcaption><span>${MEMBER_LABELS[slot]}</span>${source.custom ? "<small>自訂</small>" : ""}</figcaption>
      `;
      grid.appendChild(figure);
    }
  }

  async function renderMemberSettings() {
    const container = document.getElementById("themeMemberSettings");
    if (!container) return;
    container.innerHTML = "";

    for (const slot of MEMBER_ORDER) {
      const source = await sourceForMember(slot);
      const card = document.createElement("article");
      card.className = "theme-member-setting";
      card.dataset.member = slot;
      card.innerHTML = `
        <img src="${source.url}" alt="${MEMBER_LABELS[slot]} 圖片預覽" />
        <div class="theme-member-setting-copy">
          <strong>${MEMBER_LABELS[slot]}</strong>
          <span>${source.custom ? "目前使用自訂圖片" : "目前使用預設素材"}</span>
        </div>
        <label class="theme-upload-btn">
          更換
          <input type="file" accept="image/png,image/jpeg,image/webp" data-theme-file="${slot}" />
        </label>
        <button class="theme-reset-btn" type="button" data-theme-reset="${slot}" ${source.custom ? "" : "disabled"}>重設</button>
      `;
      container.appendChild(card);
    }

    container.querySelectorAll("[data-theme-file]").forEach(input => {
      input.addEventListener("change", async event => {
        const fileInput = event.currentTarget;
        const slot = fileInput.dataset.themeFile;
        const file = fileInput.files?.[0];
        if (!file) return;
        await replaceMemberImage(slot, file);
        fileInput.value = "";
      });
    });

    container.querySelectorAll("[data-theme-reset]").forEach(button => {
      button.addEventListener("click", () => resetMemberImage(button.dataset.themeReset));
    });
  }

  function setStatus(message, type = "") {
    const status = document.getElementById("themeSettingsStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type;
  }

  async function refreshThemeImages(message = "Sunrise Theme 已載入") {
    await Promise.all([renderMemberGallery(), renderMemberSettings()]);
    const customSlots = await listCustomSlots();
    writeState(customSlots);
    setStatus(`${message}｜${customSlots.length} 張自訂圖片`, "ready");
    window.dispatchEvent(new CustomEvent("fansign-theme-assets-updated", {
      detail: { theme: THEME_ID, customSlots }
    }));
  }

  async function replaceMemberImage(slot, file) {
    if (!MEMBER_ORDER.includes(slot)) return;
    setStatus(`正在處理 ${MEMBER_LABELS[slot]} 圖片…`, "loading");
    try {
      const optimized = await optimizeImage(file);
      await writeStoredAsset(slot, optimized);
      revokeObjectUrl(slot);
      await refreshThemeImages(`${MEMBER_LABELS[slot]} 圖片已更新`);
    } catch (error) {
      console.warn("Theme image update failed", error);
      setStatus(error.message || "圖片更新失敗", "error");
    }
  }

  async function resetMemberImage(slot) {
    if (!MEMBER_ORDER.includes(slot)) return;
    await removeStoredAsset(slot);
    revokeObjectUrl(slot);
    await refreshThemeImages(`${MEMBER_LABELS[slot]} 已恢復預設圖片`);
  }

  async function resetAllMemberImages() {
    if (!confirm("確定要把六位成員圖片全部恢復為預設素材嗎？")) return;
    await Promise.all(MEMBER_ORDER.map(removeStoredAsset));
    MEMBER_ORDER.forEach(revokeObjectUrl);
    await refreshThemeImages("全部成員圖片已恢復預設值");
  }

  async function loadThemeConfig() {
    try {
      const response = await fetch(THEME_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`theme.json returned ${response.status}`);
      const loaded = await response.json();
      theme = {
        ...fallbackTheme,
        ...loaded,
        colors: { ...fallbackTheme.colors, ...(loaded.colors || {}) },
        members: { ...fallbackTheme.members, ...(loaded.members || {}) },
        music: { ...fallbackTheme.music, ...(loaded.music || {}) }
      };
    } catch (error) {
      console.warn("Sunrise theme config could not be loaded; using built-in fallback", error);
      theme = fallbackTheme;
    }
  }

  async function init() {
    await loadThemeConfig();
    applyThemeTokens();
    const resetAllButton = document.getElementById("resetAllThemeImages");
    if (resetAllButton) resetAllButton.addEventListener("click", resetAllMemberImages);
    await refreshThemeImages();
    window.dispatchEvent(new CustomEvent("fansign-theme-ready", { detail: theme }));
    return theme;
  }

  window.FansignTheme = {
    id: THEME_ID,
    get config() { return theme; },
    resolveAsset: resolveThemeAsset,
    refresh: refreshThemeImages,
    activate(themeId) {
      const candidate = String(themeId || "").trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]*$/.test(candidate)) throw new Error("無效的 Theme ID");
      let state = {};
      try { state = JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); } catch (error) { state = {}; }
      localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, activeTheme: candidate }));
      window.location.reload();
    },
    ready: null
  };

  const start = () => {
    window.FansignTheme.ready = init().catch(error => {
      console.error("Theme initialization failed", error);
      setStatus("Sunrise Theme 載入失敗，已保留核心功能", "error");
      return fallbackTheme;
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
