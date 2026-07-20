// Fansign Manager V6
// Background music player. The catalog in assets/music.json is the only track source.

(function createFansignMusicPlayer() {
  "use strict";

  const catalogUrl = typeof MUSIC_CATALOG_URL === "string"
    ? MUSIC_CATALOG_URL
    : "assets/music.json";
  const storageKey = typeof MUSIC_STATE_KEY === "string"
    ? MUSIC_STATE_KEY
    : "fansign_manager_v6_music_state";
  const supportedModes = new Set(["list", "single", "shuffle"]);
  const defaultState = {
    volume: 0.65,
    mode: "list",
    currentTrackId: "",
    position: 0,
    autoplay: false,
    collapsed: false,
    collapsePreference: "auto",
    recent: []
  };

  const audio = new Audio();
  audio.preload = "metadata";

  let state = loadState();
  let tracks = [];
  let currentIndex = -1;
  let pendingPosition = 0;
  let lastPositionSave = 0;
  let ui = {};

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        ...defaultState,
        ...saved,
        volume: clamp(saved.volume ?? defaultState.volume, 0, 1),
        mode: supportedModes.has(saved.mode) ? saved.mode : defaultState.mode,
        position: Math.max(0, Number(saved.position || 0)),
        autoplay: Boolean(saved.autoplay),
        collapsed: saved.collapsePreference === "user"
          ? Boolean(saved.collapsed)
          : Boolean(window.matchMedia?.("(max-width: 560px)").matches),
        collapsePreference: saved.collapsePreference === "user" ? "user" : "auto",
        recent: Array.isArray(saved.recent) ? saved.recent.filter(Boolean).slice(0, 10) : []
      };
    } catch (error) {
      console.warn("Music state could not be read", error);
      return { ...defaultState };
    }
  }

  function saveState(includePosition = true) {
    if (includePosition && Number.isFinite(audio.currentTime)) {
      state.position = audio.currentTime;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.warn("Music state could not be saved", error);
    }
  }

  function cacheUi() {
    ui = {
      player: document.getElementById("musicPlayer"),
      collapseButton: document.getElementById("musicCollapseButton"),
      libraryButton: document.getElementById("musicLibraryButton"),
      cover: document.getElementById("musicCover"),
      title: document.getElementById("musicTitle"),
      artist: document.getElementById("musicArtist"),
      previousButton: document.getElementById("musicPreviousButton"),
      playButton: document.getElementById("musicPlayButton"),
      nextButton: document.getElementById("musicNextButton"),
      progress: document.getElementById("musicProgress"),
      currentTime: document.getElementById("musicCurrentTime"),
      duration: document.getElementById("musicDuration"),
      volume: document.getElementById("musicVolume"),
      status: document.getElementById("musicStatus"),
      overlay: document.getElementById("musicLibraryOverlay"),
      closeButton: document.getElementById("musicLibraryClose"),
      libraryList: document.getElementById("musicLibraryList"),
      recentList: document.getElementById("musicRecentList"),
      settingsStatus: document.getElementById("musicSettingsStatus"),
      autoplayToggle: document.getElementById("musicAutoplayToggle"),
      playbackMode: document.getElementById("musicPlaybackMode"),
      settingsVolume: document.getElementById("musicSettingsVolume"),
      settingsVolumeValue: document.getElementById("musicSettingsVolumeValue"),
      settingsRecent: document.getElementById("musicSettingsRecent"),
      settingsLibraryButton: document.getElementById("openMusicLibraryFromSettings")
    };
  }

  function setStatus(message) {
    if (ui.status) ui.status.textContent = message;
  }

  function setSettingsStatus(message) {
    if (ui.settingsStatus) ui.settingsStatus.textContent = message;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
  }

  function resolveAssetUrl(path) {
    if (!path) return "";
    try {
      const absoluteCatalogUrl = new URL(catalogUrl, document.baseURI);
      return new URL(path, absoluteCatalogUrl).href;
    } catch {
      return path;
    }
  }

  function normalizeCatalog(rawCatalog) {
    const source = Array.isArray(rawCatalog)
      ? rawCatalog
      : Array.isArray(rawCatalog?.tracks)
        ? rawCatalog.tracks
        : [];

    const usedIds = new Set();
    return source
      .filter(track => track && track.title && track.file && track.disabled !== true)
      .map((track, index) => {
        let id = String(track.id || track.file || `track-${index + 1}`);
        while (usedIds.has(id)) id = `${id}-${index + 1}`;
        usedIds.add(id);

        return {
          id,
          title: String(track.title),
          artist: String(track.artist || "Unknown Artist"),
          album: String(track.album || ""),
          group: String(track.group || track.pack || track.album || "Music Library"),
          file: resolveAssetUrl(track.file),
          cover: resolveAssetUrl(track.cover || "")
        };
      });
  }

  async function loadCatalog() {
    const response = await fetch(catalogUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`music.json returned ${response.status}`);
    }
    return normalizeCatalog(await response.json());
  }

  function renderCover(container, track, sizeClass = "") {
    if (!container) return;
    container.textContent = "";
    if (sizeClass) container.classList.add(sizeClass);

    if (track?.cover) {
      const image = document.createElement("img");
      image.src = track.cover;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        container.textContent = "";
        const fallback = document.createElement("span");
        fallback.textContent = "FM";
        container.appendChild(fallback);
      }, { once: true });
      container.appendChild(image);
      return;
    }

    const fallback = document.createElement("span");
    fallback.textContent = "FM";
    container.appendChild(fallback);
  }

  function currentTrack() {
    return currentIndex >= 0 ? tracks[currentIndex] : null;
  }

  function updateCurrentTrackUi() {
    const track = currentTrack();
    if (!track) {
      if (ui.title) ui.title.textContent = "尚未加入音樂";
      if (ui.artist) ui.artist.textContent = "請在 music.json 新增歌曲";
      renderCover(ui.cover, null);
      return;
    }

    if (ui.title) ui.title.textContent = track.title;
    if (ui.artist) ui.artist.textContent = [track.artist, track.album].filter(Boolean).join(" · ");
    renderCover(ui.cover, track);
  }

  function updatePlayButton() {
    if (!ui.playButton) return;
    const playing = !audio.paused && !audio.ended;
    ui.playButton.textContent = playing ? "Ⅱ" : "▶";
    ui.playButton.setAttribute("aria-label", playing ? "暫停" : "播放");
  }

  function updateProgressUi() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    if (ui.currentTime) ui.currentTime.textContent = formatTime(current);
    if (ui.duration) ui.duration.textContent = formatTime(duration);
    if (ui.progress) {
      ui.progress.value = duration > 0 ? String(Math.round((current / duration) * 1000)) : "0";
    }
  }

  function updateVolumeUi() {
    const value = Math.round(state.volume * 100);
    if (ui.volume) ui.volume.value = String(value);
    if (ui.settingsVolume) ui.settingsVolume.value = String(value);
    if (ui.settingsVolumeValue) ui.settingsVolumeValue.textContent = `${value}%`;
  }

  function updateSettingsUi() {
    if (ui.autoplayToggle) ui.autoplayToggle.checked = state.autoplay;
    if (ui.playbackMode) ui.playbackMode.value = state.mode;
    updateVolumeUi();
  }

  function updateCollapsedUi() {
    if (!ui.player || !ui.collapseButton) return;
    ui.player.classList.toggle("is-collapsed", state.collapsed);
    ui.collapseButton.textContent = state.collapsed ? "⌃" : "⌄";
    ui.collapseButton.setAttribute("aria-label", state.collapsed ? "展開播放器" : "收合播放器");
    ui.collapseButton.setAttribute("aria-expanded", String(!state.collapsed));
  }

  function setControlsEnabled(enabled) {
    [ui.playButton, ui.previousButton, ui.nextButton, ui.progress]
      .filter(Boolean)
      .forEach(control => { control.disabled = !enabled; });
  }

  function rememberRecent(trackId) {
    state.recent = [trackId, ...state.recent.filter(id => id !== trackId)].slice(0, 10);
    saveState(false);
    renderRecent();
  }

  function createRecentButton(track) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = track.title;
    button.addEventListener("click", () => {
      const index = tracks.findIndex(item => item.id === track.id);
      if (index !== -1) selectTrack(index, { play: true });
    });
    return button;
  }

  function fillRecentContainer(container, recentTracks) {
    if (!container) return;
    container.textContent = "";
    if (!recentTracks.length) {
      const empty = document.createElement("span");
      empty.className = "music-recent-empty";
      empty.textContent = "尚無播放紀錄";
      container.appendChild(empty);
      return;
    }
    recentTracks.forEach(track => container.appendChild(createRecentButton(track)));
  }

  function renderRecent() {
    const recentTracks = state.recent
      .map(id => tracks.find(track => track.id === id))
      .filter(Boolean);
    fillRecentContainer(ui.recentList, recentTracks);
    fillRecentContainer(ui.settingsRecent, recentTracks);
  }

  function createLibraryTrackRow(track, index) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "music-track-row";
    row.classList.toggle("is-active", index === currentIndex);
    row.setAttribute("aria-label", `播放 ${track.title}`);

    const cover = document.createElement("span");
    cover.className = "music-cover";
    renderCover(cover, track);

    const copy = document.createElement("span");
    copy.className = "music-track-row-copy";
    const title = document.createElement("strong");
    title.textContent = track.title;
    const meta = document.createElement("span");
    meta.textContent = [track.artist, track.album].filter(Boolean).join(" · ");
    copy.append(title, meta);

    const indicator = document.createElement("span");
    indicator.className = "music-track-row-indicator";
    indicator.textContent = index === currentIndex && !audio.paused ? "PLAYING" : "PLAY";

    row.append(cover, copy, indicator);
    row.addEventListener("click", () => {
      selectTrack(index, { play: true });
      closeLibrary();
    });
    return row;
  }

  function renderLibrary() {
    if (!ui.libraryList) return;
    ui.libraryList.textContent = "";

    if (!tracks.length) {
      const empty = document.createElement("div");
      empty.className = "music-library-empty";
      const title = document.createElement("strong");
      title.textContent = "音樂庫目前是空的";
      const text = document.createElement("span");
      text.textContent = "把 MP3 放進 assets/music，封面放進 assets/cover，再更新 assets/music.json。";
      empty.append(title, text);
      ui.libraryList.appendChild(empty);
      return;
    }

    tracks.forEach((track, index) => {
      ui.libraryList.appendChild(createLibraryTrackRow(track, index));
    });
  }

  function selectTrack(index, options = {}) {
    if (!tracks.length) return;
    const nextIndex = ((index % tracks.length) + tracks.length) % tracks.length;
    const nextTrack = tracks[nextIndex];
    const isSameTrack = currentIndex === nextIndex && audio.src;

    currentIndex = nextIndex;
    state.currentTrackId = nextTrack.id;
    pendingPosition = options.restorePosition ? Math.max(0, state.position) : 0;

    if (!isSameTrack) {
      audio.src = nextTrack.file;
      audio.load();
      state.position = pendingPosition;
    }

    updateCurrentTrackUi();
    renderLibrary();
    saveState(false);

    if (options.play) playCurrent();
  }

  async function playCurrent() {
    if (!currentTrack()) {
      setStatus("音樂庫目前沒有歌曲");
      return;
    }

    try {
      await audio.play();
      setStatus(state.mode === "shuffle" ? "隨機播放" : state.mode === "single" ? "單曲循環" : "清單循環");
    } catch (error) {
      setStatus("點一下播放鍵以啟用聲音");
      console.info("Playback needs user interaction", error);
    }
  }

  function togglePlayback() {
    if (audio.paused) playCurrent();
    else audio.pause();
  }

  function randomTrackIndex() {
    if (tracks.length <= 1) return currentIndex;
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    }
    return nextIndex;
  }

  function moveTrack(direction, fromEnded = false) {
    if (!tracks.length) return;
    if (state.mode === "single" && fromEnded) {
      audio.currentTime = 0;
      playCurrent();
      return;
    }

    const target = state.mode === "shuffle" && direction > 0
      ? randomTrackIndex()
      : currentIndex + direction;
    selectTrack(target, { play: true });
  }

  function setVolume(value) {
    state.volume = clamp(Number(value) / 100, 0, 1);
    audio.volume = state.volume;
    updateVolumeUi();
    saveState(false);
  }

  function setMode(mode) {
    state.mode = supportedModes.has(mode) ? mode : "list";
    audio.loop = state.mode === "single";
    updateSettingsUi();
    setStatus(state.mode === "shuffle" ? "隨機播放" : state.mode === "single" ? "單曲循環" : "清單循環");
    saveState(false);
  }

  function openLibrary() {
    if (!ui.overlay) return;
    renderLibrary();
    renderRecent();
    ui.overlay.classList.remove("hidden");
    ui.overlay.setAttribute("aria-hidden", "false");
    ui.closeButton?.focus();
  }

  function closeLibrary() {
    if (!ui.overlay) return;
    ui.overlay.classList.add("hidden");
    ui.overlay.setAttribute("aria-hidden", "true");
    ui.libraryButton?.focus();
  }

  function bindUiEvents() {
    ui.collapseButton?.addEventListener("click", () => {
      state.collapsed = !state.collapsed;
      state.collapsePreference = "user";
      updateCollapsedUi();
      saveState(false);
    });
    ui.libraryButton?.addEventListener("click", openLibrary);
    ui.settingsLibraryButton?.addEventListener("click", openLibrary);
    ui.closeButton?.addEventListener("click", closeLibrary);
    ui.overlay?.addEventListener("click", event => {
      if (event.target === ui.overlay) closeLibrary();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !ui.overlay?.classList.contains("hidden")) closeLibrary();
    });

    ui.playButton?.addEventListener("click", togglePlayback);
    ui.previousButton?.addEventListener("click", () => moveTrack(-1));
    ui.nextButton?.addEventListener("click", () => moveTrack(1));
    ui.progress?.addEventListener("input", event => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(event.target.value) / 1000) * audio.duration;
      updateProgressUi();
    });
    ui.volume?.addEventListener("input", event => setVolume(event.target.value));
    ui.settingsVolume?.addEventListener("input", event => setVolume(event.target.value));
    ui.playbackMode?.addEventListener("change", event => setMode(event.target.value));
    ui.autoplayToggle?.addEventListener("change", event => {
      state.autoplay = event.target.checked;
      saveState(false);
    });
  }

  function bindAudioEvents() {
    audio.addEventListener("loadedmetadata", () => {
      if (pendingPosition > 0 && pendingPosition < audio.duration) {
        audio.currentTime = pendingPosition;
      }
      pendingPosition = 0;
      updateProgressUi();
    });
    audio.addEventListener("timeupdate", () => {
      updateProgressUi();
      if (Date.now() - lastPositionSave > 5000) {
        lastPositionSave = Date.now();
        saveState(true);
      }
    });
    audio.addEventListener("play", () => {
      const track = currentTrack();
      updatePlayButton();
      if (track) rememberRecent(track.id);
      renderLibrary();
    });
    audio.addEventListener("pause", () => {
      updatePlayButton();
      saveState(true);
      renderLibrary();
    });
    audio.addEventListener("ended", () => moveTrack(1, true));
    audio.addEventListener("error", () => {
      setStatus("音樂檔案無法播放，請檢查 music.json 路徑");
      updatePlayButton();
    });
    window.addEventListener("beforeunload", () => saveState(true));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") saveState(true);
    });
  }

  async function init() {
    cacheUi();
    if (!ui.player) return;

    audio.volume = state.volume;
    audio.loop = state.mode === "single";
    bindUiEvents();
    bindAudioEvents();
    updateSettingsUi();
    updateCollapsedUi();
    updatePlayButton();
    updateProgressUi();

    try {
      tracks = await loadCatalog();
      setControlsEnabled(tracks.length > 0);

      if (!tracks.length) {
        setStatus("音樂庫目前沒有歌曲");
        setSettingsStatus("尚未加入歌曲；播放器功能已就緒。");
        renderLibrary();
        renderRecent();
        return;
      }

      const restoredIndex = tracks.findIndex(track => track.id === state.currentTrackId);
      selectTrack(restoredIndex >= 0 ? restoredIndex : 0, {
        play: false,
        restorePosition: restoredIndex >= 0
      });
      setStatus(`${tracks.length} 首歌曲 · ${state.mode === "shuffle" ? "隨機播放" : state.mode === "single" ? "單曲循環" : "清單循環"}`);
      setSettingsStatus(`已載入 ${tracks.length} 首歌曲。`);
      renderRecent();

      if (state.autoplay) playCurrent();
    } catch (error) {
      console.warn("Music catalog could not be loaded", error);
      setControlsEnabled(false);
      const message = window.location.protocol === "file:"
        ? "請透過網站或 Live Server 開啟，才能讀取 music.json"
        : "無法讀取 music.json，請檢查檔案格式與路徑";
      setStatus(message);
      setSettingsStatus(message);
      renderLibrary();
      renderRecent();
    }
  }

  window.FansignMusicPlayer = Object.freeze({
    openLibrary,
    closeLibrary,
    getTracks: () => tracks.map(track => ({ ...track }))
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
