
let isRestoringBackup = false;
//
// Uilts
// 共用工具程式
//

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
//
// Default Data
// 系統初始化資料
//

const defaultData = {
  artists: [
    { id: "artist_1", name: "Yuju", note: "", createdAt: now(), updatedAt: now() },
    { id: "artist_2", name: "Yerin", note: "", createdAt: now(), updatedAt: now() },
    { id: "artist_3", name: "여자친구", note: "", createdAt: now(), updatedAt: now() }
  ],
  channels: [
    { id: "channel_1", name: "Soundwave", note: "", createdAt: now(), updatedAt: now() },
    { id: "channel_2", name: "Makestar", note: "", createdAt: now(), updatedAt: now() },
    { id: "channel_3", name: "Minirecord", note: "", createdAt: now(), updatedAt: now() }
  ],
  albumTypes: [
    { id: "type_1", name: "線上", note: "", createdAt: now(), updatedAt: now() },
    { id: "type_2", name: "線下", note: "", createdAt: now(), updatedAt: now() },
    { id: "type_3", name: "特別版", note: "", createdAt: now(), updatedAt: now() }
  ],
  buyers: [],
  channelOrders: [],
  buyerOrders: []
};

let db = loadData();
let buyerOrderFilter = "active";

function normalizeLoadedData(data) {
  data.appName = data.appName || APP_NAME;
  data.appVersion = data.appVersion || APP_VERSION;
  data.schema = Number(data.schema || 1);

  data.artists = (data.artists || []).map(item => ({
    id: item.id || uid("artist"),
    name: item.name || "未命名藝人",
    note: item.note || "",
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now()
  }));

  data.channels = (data.channels || []).map(item => ({
    id: item.id || uid("channel"),
    name: item.name || "未命名通路",
    alias: item.alias || "",
    note: item.note || "",
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now()
  }));

  data.albumTypes = (data.albumTypes || []).map(item => ({
    id: item.id || uid("type"),
    name: item.name || "未命名類型",
    note: item.note || "",
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now()
  }));

  data.buyers = (data.buyers || []).map(item => ({
    id: item.id || uid("buyer"),
    name: item.name || "未命名購買人",
    note: item.note || "",
    createdAt: item.createdAt || now(),
    updatedAt: item.updatedAt || now()
  }));

  data.channelOrders = data.channelOrders || [];

  data.buyerOrders = (data.buyerOrders || []).map(order => {
    const shipped = Boolean(order.shipped || order.delivery?.shipped);

    return {
      ...order,
      id: order.id || uid("buyerOrder"),
      qty: Number(order.qty || 1),
      amount: Number(order.amount || 0),
      paid: Boolean(order.paid),
      shipped,
      delivery: {
        market: Boolean(order.delivery?.market),
        ordered: Boolean(order.delivery?.ordered),
        shipped
      },
      note: order.note || "",
      createdAt: order.createdAt || now(),
      updatedAt: order.updatedAt || now()
    };
  });

  data.appName = APP_NAME;
  data.appVersion = APP_VERSION;
  data.schema = APP_SCHEMA;

  return data;
}
//
// Storage
// LocalStorage 讀取 / 寫入 / 資料初始化
//

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const emptyData = normalizeLoadedData(structuredClone(defaultData));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
    return emptyData;
  }

  try {
    const loadedData = normalizeLoadedData({
      ...structuredClone(defaultData),
      ...JSON.parse(raw)
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedData));
    return loadedData;
  } catch (error) {
    alert("資料讀取失敗，系統會使用空白資料。");
    const emptyData = normalizeLoadedData(structuredClone(defaultData));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyData));
    return emptyData;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

  if (!isRestoringBackup) {
    createAutoBackup();
  }
}

function getAutoBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY)) || [];
  } catch {
    return [];
  }
}

function backupStats(data = db) {
  return {
    artists: (data.artists || []).length,
    channels: (data.channels || []).length,
    albumTypes: (data.albumTypes || []).length,
    buyers: (data.buyers || []).length,
    channelOrders: (data.channelOrders || []).length,
    buyerOrders: (data.buyerOrders || []).length
  };
}

function backupLabel(item) {
  const stats = item.stats || {};
  return `藝人 ${stats.artists || 0}｜通路 ${stats.channels || 0}｜購買人 ${stats.buyers || 0}｜通路訂單 ${stats.channelOrders || 0}｜購買人訂單 ${stats.buyerOrders || 0}`;
}

function createBackup(name = "自動備份", source = "auto") {
  const backups = getAutoBackups();
  const data = JSON.stringify(db);
  const latest = backups[0];

  if (source === "auto" && latest && latest.data === data) {
    return latest;
  }

  const item = {
    id: uid("backup"),
    name: name || (source === "manual" ? "手動備份" : "自動備份"),
    source,
    time: new Date().toLocaleString(),
    createdAt: now(),
    stats: backupStats(db),
    data
  };

  backups.unshift(item);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
  return item;
}

function createAutoBackup() {
  createBackup("自動備份", "auto");
}

function manualCreateBackup() {
  const input = document.getElementById("backupNameInput");
  const name = input?.value.trim() || "手動備份";
  const item = createBackup(name, "manual");
  if (input) input.value = "";
  renderBackupCenter();
  alert(`備份完成：${item.name}\n${backupLabel(item)}`);
}

function restoreAutoBackup(id) {
  const backups = getAutoBackups();
  const backup = backups.find(item => item.id === id);

  if (!backup) {
    alert("找不到這份備份");
    return;
  }

  if (!confirm(`確定還原這份備份嗎？\n${backup.name || "未命名"}\n${backup.time}`)) {
    return;
  }

  try {
    const parsed = JSON.parse(backup.data);
    isRestoringBackup = true;
    db = {
      ...structuredClone(defaultData),
      ...parsed
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    isRestoringBackup = false;
    renderAll();
    alert("已還原備份");
  } catch {
    isRestoringBackup = false;
    alert("還原失敗，這份備份格式可能有問題");
  }
}

function deleteAutoBackup(id) {
  if (!confirm("確定刪除這份備份嗎？")) return;

  const backups = getAutoBackups().filter(item => item.id !== id);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
  renderBackupCenter();
}

function copyBackup(id) {
  const backup = getAutoBackups().find(item => item.id === id);
  if (!backup) return alert("找不到這份備份");

  const text = backup.data;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      alert("已複製備份 JSON");
    }).catch(() => {
      document.getElementById("backupBox").value = text;
      alert("無法自動複製，已放到下方文字框");
    });
  } else {
    document.getElementById("backupBox").value = text;
    alert("已放到下方文字框，請手動複製");
  }
}

function renderBackupCenter() {
  const box = document.getElementById("backupCenterList");
  const countBox = document.getElementById("backupCount");
  const lastBox = document.getElementById("backupLastTime");
  const backups = getAutoBackups();

  if (countBox) countBox.textContent = `${backups.length} / ${MAX_BACKUPS}`;
  if (lastBox) lastBox.textContent = backups[0]?.time || "尚無";

  if (!box) return;

  if (backups.length === 0) {
    box.innerHTML = `<p class="muted">目前還沒有備份。建議更新網站前先建立一份。</p>`;
    return;
  }

  box.innerHTML = backups.map(item => `
    <div class="backup-list-item">
      <div class="backup-list-title">${escapeHtml(item.name || "未命名備份")}</div>
      <div class="backup-list-meta">
        ${escapeHtml(item.time || "")}<br>
        ${escapeHtml(backupLabel(item))}
      </div>
      <div class="button-row">
        <button class="primary-btn" onclick="restoreAutoBackup('${item.id}')">還原</button>
        <button class="secondary-btn" onclick="copyBackup('${item.id}')">複製</button>
        <button class="danger-btn" onclick="deleteAutoBackup('${item.id}')">刪除</button>
      </div>
    </div>
  `).join("");
}

function renderAutoBackups() {
  renderBackupCenter();
}

function byId(collection, id) {
  return db[collection].find(item => item.id === id);
}

function nameOf(collection, id) {
  const item = byId(collection, id);
  return item ? item.name : "未設定";
}

function aliasOf(collection, id) {
  const item = byId(collection, id);
  return item ? (item.alias || "") : "";
}

function channelDisplayName(id) {
  const name = nameOf("channels", id);
  const alias = aliasOf("channels", id);
  return alias ? `${name}（${alias}）` : name;
}
//
//
function escapeHtml(text) {
  return String(text ?? "").replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[s]));
}

function money(value) {
  const num = Number(value || 0);
  return "$" + num.toLocaleString();
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function sameText(a, b) {
  return normalizeText(a) === normalizeText(b);
}

function includesText(text, query) {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(text).includes(q);
}

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
}

function jsString(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

function switchPage(page, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function addMaster(collection, inputId) {
  const input = document.getElementById(inputId);
  const name = input.value.trim().replace(/\s+/g, " ");

  if (!name) return alert("請輸入名稱");

  const existed = db[collection].find(item => sameText(item.name, name));
  if (existed) {
    alert(`這個名稱已存在：${existed.name}`);
    return;
  }

  db[collection].push({
    id: uid(collection),
    name,
    note: "",
    alias: "",
    createdAt: now(),
    updatedAt: now()
  });

  input.value = "";
  saveData();
  renderAll();
}

function renameMaster(collection, id) {
  const item = byId(collection, id);
  if (!item) return;

  const newName = prompt("修改名稱", item.name);
  if (!newName || !newName.trim()) return;

  const clean = newName.trim().replace(/\s+/g, " ");
  const existed = db[collection].find(i => i.id !== id && sameText(i.name, clean));

  if (existed) {
    alert(`這個名稱已存在：${existed.name}`);
    return;
  }

  item.name = clean;
  item.updatedAt = now();
  saveData();
  renderAll();
}

function deleteMaster(collection, id) {
  if (isMasterUsed(collection, id)) {
    alert("這筆資料已被訂單使用，不能刪除。可以用「編輯」改名。");
    return;
  }
  if (!confirm("確定刪除嗎？")) return;
  db[collection] = db[collection].filter(item => item.id !== id);
  saveData();
  renderAll();
}

function isMasterUsed(collection, id) {
  if (collection === "artists") return db.channelOrders.some(o => o.artistId === id);
  if (collection === "channels") return db.channelOrders.some(o => o.channelId === id);
  if (collection === "albumTypes") return db.channelOrders.some(o => o.albumTypeId === id);
  if (collection === "buyers") return db.buyerOrders.some(o => o.buyerId === id);
  return false;
}

function renderMasterList(collection, elementId) {
  const box = document.getElementById(elementId);
  if (!box) return;

  box.innerHTML = "";

  const list = Array.isArray(db[collection]) ? db[collection] : [];

  if (list.length === 0) {
    box.innerHTML = `<p class="muted">尚無資料</p>`;
    return;
  }

  list.forEach(item => {
    const aliasHtml = collection === "channels" && item.alias
      ? `<div class="alias-text">別稱：<span class="alias-badge">${escapeHtml(item.alias)}</span></div>`
      : "";

    const aliasButton = collection === "channels"
      ? `<button class="small-btn secondary-btn" onclick="renameChannelAlias('${item.id}')">別稱</button>`
      : "";

    box.innerHTML += `
      <div class="list-item">
        <div>
          <strong>${escapeHtml(item.name || "未命名")}</strong>
          ${aliasHtml}
        </div>
        ${aliasButton}
        <button class="small-btn edit-btn" onclick="renameMaster('${collection}','${item.id}')">編輯</button>
        <button class="small-btn delete-btn" onclick="deleteMaster('${collection}','${item.id}')">刪除</button>
      </div>
    `;
  });
}

function renameChannelAlias(id) {
  const item = byId("channels", id);
  if (!item) return;

  const value = prompt("設定通路別稱，例如 MS、AM、JJ", item.alias || "");
  if (value === null) return;

  item.alias = value.trim();
  item.updatedAt = now();
  saveData();
  renderAll();
}

function optionList(collection, selectedId = "") {
  return db[collection].map(item => `
    <option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(item.name)}</option>
  `).join("");
}

function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

function openChannelOrderForm(editId = "") {
  const order = db.channelOrders.find(o => o.id === editId) || {};
  openModal(editId ? "編輯通路訂單" : "新增通路訂單", `
    <div class="form-field">
      <label>藝人</label>
      <select id="coArtist">${optionList("artists", order.artistId)}</select>
    </div>
    <div class="form-field">
      <label>通路</label>
      <select id="coChannel">${optionList("channels", order.channelId)}</select>
    </div>
    <div class="form-field">
      <label>專輯類型</label>
      <select id="coType">${optionList("albumTypes", order.albumTypeId)}</select>
    </div>
    <div class="form-field">
      <label>批次名稱</label>
      <input id="coBatch" placeholder="例如 第一批 / 第二批" value="${escapeAttr(order.batch || "")}">
    </div>
    <div class="form-field">
      <label>下單開始日期</label>
      <input id="coOrderStartDate" type="date" value="${escapeAttr(order.orderStartDate || "")}">
    </div>

    <div class="form-field">
      <label>下單開始時間</label>
      <input id="coOrderStartTime" type="time" value="${escapeAttr(order.orderStartTime || "")}">
    </div>

    <div class="form-field">
      <label>下單結束日期</label>
      <input id="coOrderEndDate" type="date" value="${escapeAttr(order.orderEndDate || "")}">
    </div>

    <div class="form-field">
      <label>下單結束時間</label>
      <input id="coOrderEndTime" type="time" value="${escapeAttr(order.orderEndTime || "")}">
    </div>

    <div class="form-field">
      <label>簽售日期</label>
      <input id="coDate" type="date" value="${escapeAttr(order.fansignDate || "")}">
    </div>
    <div class="form-field">
      <label>簽售時間</label>
      <input id="coTime" type="time" value="${escapeAttr(order.fansignTime || "")}">
    </div>
    <div class="form-field">
      <label>總下單數</label>
      <input id="coTotal" type="number" min="0" value="${order.totalQty ?? ""}" placeholder="例如 20">
    </div>
    <div class="form-field">
      <label>狀態</label>
      <select id="coStatus">
        ${["未下單", "未到貨", "已到貨", "已完成"].map(s => `
          <option value="${s}" ${order.status === s ? "selected" : ""}>${s}</option>
        `).join("")}
      </select>
    </div>
    <div class="form-field">
      <label>備註</label>
      <textarea id="coNote">${escapeHtml(order.note || "")}</textarea>
    </div>
    <button class="primary-btn" onclick="saveChannelOrder('${editId}')">儲存</button>
  `);
}

function saveChannelOrder(editId = "") {
  const data = {
    id: editId || uid("channelOrder"),
    artistId: document.getElementById("coArtist").value,
    channelId: document.getElementById("coChannel").value,
    albumTypeId: document.getElementById("coType").value,
    batch: document.getElementById("coBatch").value.trim(),
    orderStartDate: document.getElementById("coOrderStartDate")?.value || "",
    orderStartTime: document.getElementById("coOrderStartTime")?.value || "",
    orderEndDate: document.getElementById("coOrderEndDate")?.value || "",
    orderEndTime: document.getElementById("coOrderEndTime")?.value || "",
    fansignDate: document.getElementById("coDate").value,
    fansignTime: document.getElementById("coTime").value,
    totalQty: Number(document.getElementById("coTotal").value || 0),
    status: document.getElementById("coStatus").value,
    note: document.getElementById("coNote").value.trim(),
    createdAt: editId ? byId("channelOrders", editId).createdAt : now(),
    updatedAt: now()
  };

  if (!data.artistId || !data.channelId || !data.albumTypeId || !data.batch) {
    alert("藝人、通路、類型、批次都要填");
    return;
  }

  const duplicate = db.channelOrders.some(o =>
    o.id !== data.id &&
    o.artistId === data.artistId &&
    o.channelId === data.channelId &&
    o.albumTypeId === data.albumTypeId &&
    sameText(o.batch, data.batch) &&
    o.fansignDate === data.fansignDate &&
    o.fansignTime === data.fansignTime
  );

  if (duplicate) return alert("這筆通路訂單已存在");

  if (editId) db.channelOrders = db.channelOrders.map(o => o.id === editId ? data : o);
  else db.channelOrders.push(data);

  saveData();
  closeModal();
  renderAll();
}

function deleteChannelOrder(id) {
  if (db.buyerOrders.some(o => o.channelOrderId === id)) {
    alert("這筆通路訂單已經有購買人訂單，不能刪除。");
    return;
  }
  if (!confirm("確定刪除這筆通路訂單嗎？")) return;
  db.channelOrders = db.channelOrders.filter(o => o.id !== id);
  saveData();
  renderAll();
}

function cycleChannelStatus(id) {
  const order = byId("channelOrders", id);
  if (!order) return;
  const statuses = ["未下單", "未到貨", "已到貨", "已完成"];
  const currentIndex = statuses.indexOf(order.status);
  order.status = statuses[(currentIndex + 1) % statuses.length];
  order.updatedAt = now();
  saveData();
  renderAll();
}

function orderPeriodText(order) {
  const start = `${order.orderStartDate || ""}${order.orderStartTime ? " " + order.orderStartTime : ""}`.trim();
  const end = `${order.orderEndDate || ""}${order.orderEndTime ? " " + order.orderEndTime : ""}`.trim();

  if (start && end) return `${start} ～ ${end}`;
  if (start) return `${start} 開始`;
  if (end) return `${end} 截止`;
  return "未設定";
}

function channelOrderLabel(order) {
  return `${nameOf("artists", order.artistId)}｜${channelDisplayName(order.channelId)}｜${nameOf("albumTypes", order.albumTypeId)}｜${order.batch}${order.orderStartDate || order.orderEndDate ? "｜下單 " + orderPeriodText(order) : ""}${order.fansignDate ? "｜簽售 " + order.fansignDate : ""}${order.fansignTime ? " " + order.fansignTime : ""}`;
}

function channelOrderShort(order) {
  return {
    artist: nameOf("artists", order.artistId),
    channel: channelDisplayName(order.channelId),
    type: nameOf("albumTypes", order.albumTypeId),
    batch: order.batch,
    orderPeriod: orderPeriodText(order),
    date: order.fansignDate || "未設定日期",
    time: order.fansignTime || ""
  };
}

function registeredQty(channelOrderId, excludeBuyerOrderId = "") {
  return db.buyerOrders
    .filter(o => o.channelOrderId === channelOrderId && o.id !== excludeBuyerOrderId)
    .reduce((sum, o) => sum + Number(o.qty), 0);
}

function statusClass(status) {
  if (status === "已完成") return "green";
  if (status === "已到貨") return "blue";
  if (status === "未到貨") return "orange";
  return "gray";
}

function getCollapsedGroups() {
  try {
    return JSON.parse(localStorage.getItem(GROUP_COLLAPSE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCollapsedGroups(data) {
  localStorage.setItem(GROUP_COLLAPSE_KEY, JSON.stringify(data));
}

function groupKey(artistId, channelId) {
  return `${artistId}||${channelId}`;
}

function toggleChannelGroup(key) {
  const collapsed = getCollapsedGroups();
  collapsed[key] = !collapsed[key];
  saveCollapsedGroups(collapsed);
  renderChannelOrders();
}

function buyerOrdersForChannel(channelOrderId) {
  return db.buyerOrders.filter(order => order.channelOrderId === channelOrderId);
}

function renderBuyerMiniList(channelOrderId) {
  const orders = buyerOrdersForChannel(channelOrderId);

  if (orders.length === 0) {
    return `<div class="buyer-mini-list"><p class="muted">尚無購買人登記</p></div>`;
  }

  const sorted = [...orders].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return nameOf("buyers", a.buyerId).localeCompare(nameOf("buyers", b.buyerId));
  });

  return `
    <div class="buyer-mini-list">
      <strong>購買人名單</strong>
      ${sorted.map(order => `
        <div class="buyer-mini-item">
          <div class="buyer-mini-name">${escapeHtml(nameOf("buyers", order.buyerId))}</div>
          <div>${order.qty} 張</div>
          <button class="pay-toggle ${order.paid ? "primary-btn" : "danger-btn"}" onclick="togglePaid('${order.id}')">
            ${order.paid ? "✅" : "❌"}
          </button>
          <div>${renderDeliveryChecklist(order, true)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSingleChannelOrderCard(order, compact = false) {
  const info = channelOrderShort(order);
  const used = registeredQty(order.id);
  const remain = order.totalQty - used;

  return `
    <div class="order-card ${compact ? "compact-order-card" : ""}">
      <div class="order-title">📦 ${escapeHtml(info.batch)}</div>
      <div class="order-subtitle">
        💿 ${escapeHtml(info.type)}<br>
        📅 ${escapeHtml(info.date)} ${escapeHtml(info.time)}
      </div>

      <button class="status-toggle ${statusClass(order.status)}-btn" onclick="cycleChannelStatus('${order.id}')">
        ${escapeHtml(order.status)}
      </button>

      <div class="stats-row">
        <div class="mini-stat"><strong>${order.totalQty}</strong><span>總下單</span></div>
        <div class="mini-stat"><strong>${used}</strong><span>已登記</span></div>
        <div class="mini-stat"><strong>${remain}</strong><span>剩餘</span></div>
      </div>

      ${remain < 0 ? `<p class="warning">⚠️ 登記數量已超過總下單數</p>` : ""}
      ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}

      ${renderBuyerMiniList(order.id)}

      <div class="button-row">
        <button class="secondary-btn" onclick="openChannelOrderForm('${order.id}')">編輯</button>
        <button class="danger-btn" onclick="deleteChannelOrder('${order.id}')">刪除</button>
      </div>
    </div>
  `;
}

function renderChannelOrders() {
  const box = document.getElementById("channelOrderList");
  const q = document.getElementById("channelOrderSearch")?.value.trim() || "";
  if (!box) return;
  box.innerHTML = "";

  const filtered = db.channelOrders.filter(order => {
    const text = channelOrderLabel(order);
    return includesText(text, q);
  });

  if (filtered.length === 0) {
    box.innerHTML = `<div class="card"><p class="muted">尚無通路訂單</p></div>`;
    return;
  }

  if (q) {
    box.innerHTML = filtered.map(order => {
      const info = channelOrderShort(order);
      return `
        <div class="order-card">
          <div class="order-title">🎤 ${escapeHtml(info.artist)}</div>
          <div class="order-subtitle">
            🏪 ${escapeHtml(info.channel)}<br>
            💿 ${escapeHtml(info.type)}｜📦 ${escapeHtml(info.batch)}<br>
            🕒 下單 ${escapeHtml(info.orderPeriod)}<br>
            📅 簽售 ${escapeHtml(info.date)} ${escapeHtml(info.time)}
          </div>
          ${renderSingleChannelOrderCard(order, true)}
        </div>
      `;
    }).join("");
    return;
  }

  const groups = {};
  filtered.forEach(order => {
    const key = groupKey(order.artistId, order.channelId);
    if (!groups[key]) {
      groups[key] = {
        artistId: order.artistId,
        channelId: order.channelId,
        orders: []
      };
    }
    groups[key].orders.push(order);
  });

  const collapsed = getCollapsedGroups();

  Object.keys(groups).forEach(key => {
    const group = groups[key];
    const orders = group.orders.sort((a, b) => {
      const ad = `${a.fansignDate || ""} ${a.fansignTime || ""} ${a.batch || ""}`;
      const bd = `${b.fansignDate || ""} ${b.fansignTime || ""} ${b.batch || ""}`;
      return ad.localeCompare(bd);
    });

    const totalQty = orders.reduce((sum, o) => sum + Number(o.totalQty), 0);
    const registered = orders.reduce((sum, o) => sum + registeredQty(o.id), 0);
    const remain = totalQty - registered;
    const isCollapsed = collapsed[key];

    box.innerHTML += `
      <div class="group-card">
        <div class="group-header">
          <div class="group-title">🎤 ${escapeHtml(nameOf("artists", group.artistId))}｜🏪 ${escapeHtml(nameOf("channels", group.channelId))}</div>
          <div class="group-summary">
            ${orders.length} 批｜總下單 ${totalQty}｜已登記 ${registered}｜剩餘 ${remain}
          </div>
          <button class="group-toggle" onclick="toggleChannelGroup('${key}')">
            ${isCollapsed ? "▶ 展開批次" : "▼ 收合批次"}
          </button>
        </div>
        <div class="group-body" style="${isCollapsed ? "display:none;" : ""}">
          ${orders.map(order => renderSingleChannelOrderCard(order, true)).join("")}
        </div>
      </div>
    `;
  });
}


function getRecentChannelOrderIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_CHANNEL_ORDERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveRecentChannelOrder(id) {
  if (!id) return;
  const order = byId("channelOrders", id);
  if (!order) return;

  const ids = getRecentChannelOrderIds().filter(itemId => itemId !== id);
  ids.unshift(id);
  localStorage.setItem(RECENT_CHANNEL_ORDERS_KEY, JSON.stringify(ids.slice(0, 8)));
}

function getLastChannelOrder() {
  const ids = getRecentChannelOrderIds();
  for (const id of ids) {
    const order = byId("channelOrders", id);
    if (order) return order;
  }
  return null;
}

function channelOrderSearchText(order) {
  if (!order) return "";
  const info = channelOrderShort(order);
  return [
    channelOrderLabel(order),
    info.artist,
    info.channel,
    info.type,
    info.batch,
    info.orderPeriod,
    info.date,
    info.time,
    order.status,
    order.note
  ].join(" ");
}

function scoreChannelOrder(order, query) {
  const q = normalizeText(query);
  if (!q) return 0;

  const label = normalizeText(channelOrderLabel(order));
  const text = normalizeText(channelOrderSearchText(order));

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (text.includes(q)) return 40;

  const parts = q.split(" ").filter(Boolean);
  if (parts.length && parts.every(part => text.includes(part))) return 30;
  return 0;
}

function channelOrderSuggestionHtml(order, tag = "") {
  const used = registeredQty(order.id);
  const remain = Number(order.totalQty) - used;
  const tagHtml = tag ? `<span class="badge blue">${escapeHtml(tag)}</span>` : "";

  return `
    <div class="suggestion-item" onclick="selectChannelOrder('${order.id}')">
      <div class="suggestion-primary">${tagHtml}${escapeHtml(channelOrderLabel(order))}</div>
      <div class="suggestion-secondary">總 ${order.totalQty}｜已登記 ${used}｜剩餘 ${remain}｜${escapeHtml(order.status)}</div>
    </div>
  `;
}


let quickAddRowCounter = 0;

function openQuickAddForm() {
  if (db.channelOrders.length === 0) {
    alert("請先新增通路訂單");
    return;
  }

  const lastChannelOrder = getLastChannelOrder();

  openModal("快速新增購買人訂單", `
    <div class="quick-add-tabs">
      <button id="quickModeSameChannel" class="quick-add-tab active" onclick="setQuickAddMode('sameChannel')">多人同通路</button>
      <button id="quickModeSameBuyer" class="quick-add-tab" onclick="setQuickAddMode('sameBuyer')">同一人多通路</button>
    </div>

    <div class="quick-entry-tabs">
      <button id="quickEntryFields" class="quick-entry-tab active" onclick="setQuickAddEntryMode('fields')">欄位新增</button>
      <button id="quickEntryPaste" class="quick-entry-tab" onclick="setQuickAddEntryMode('paste')">文字貼上</button>
    </div>

    <input type="hidden" id="quickAddMode" value="sameChannel">
    <input type="hidden" id="quickEntryMode" value="fields">

    <div id="quickSameChannelFields">
      <div class="form-field">
        <label>對應通路訂單</label>
        <input id="quickChannelSearch" placeholder="搜尋或選擇藝人 / 通路 / 別稱 / 批次" oninput="handleQuickMainChannelInput()" onfocus="renderQuickChannelSuggestions()">
        <input type="hidden" id="quickChannelOrderId" value="${lastChannelOrder ? lastChannelOrder.id : ""}">
        <div id="quickChannelSuggestionBox" class="suggestion-box"></div>
        <div id="quickSelectedChannelHint" class="selected-hint">${lastChannelOrder ? "已套用最近使用：" + escapeHtml(channelOrderLabel(lastChannelOrder)) : "尚未選擇通路訂單"}</div>
      </div>

      <div class="quick-field-entry">
        <div class="quick-add-grid-head"><span>購買人</span><span>數量</span><span>金額</span><span>備註</span><span></span></div>
        <div id="quickSameChannelRows" class="quick-add-rows"></div>
        <button class="secondary-btn quick-add-row-button" onclick="addQuickAddRow('sameChannel')">＋ 新增一列</button>
      </div>

      <div class="quick-paste-entry" style="display:none;">
        <div class="form-field">
          <label>貼上名單</label>
          <textarea id="quickListText" placeholder="小美 2 $1800 # 合併寄送&#10;阿凱 1 $900"></textarea>
          <p class="muted">每行：姓名 數量 $金額 # 備註。金額與備註可省略。</p>
        </div>
      </div>
    </div>

    <div id="quickSameBuyerFields" style="display:none;">
      <div class="form-field">
        <label>購買人</label>
        <input id="quickBuyerName" placeholder="輸入或選擇購買人" oninput="renderQuickCommonBuyerSuggestions()" onfocus="renderQuickCommonBuyerSuggestions()">
        <div id="quickBuyerSuggestionBox" class="suggestion-box"></div>
      </div>

      <div class="quick-field-entry">
        <div class="quick-add-grid-head"><span>通路訂單</span><span>數量</span><span>金額</span><span>備註</span><span></span></div>
        <div id="quickSameBuyerRows" class="quick-add-rows"></div>
        <button class="secondary-btn quick-add-row-button" onclick="addQuickAddRow('sameBuyer')">＋ 新增一列</button>
      </div>

      <div class="quick-paste-entry" style="display:none;">
        <div class="form-field">
          <label>貼上通路清單</label>
          <textarea id="quickRouteText" placeholder="JJ 2 $1800 # 指定B版&#10;MS 1 $900"></textarea>
          <p class="muted">每行：通路關鍵字 數量 $金額 # 備註。金額與備註可省略。</p>
        </div>
      </div>
    </div>

    <div class="quick-add-actions">
      <button class="secondary-btn" onclick="previewQuickAdd()">預覽</button>
      <button class="primary-btn" onclick="createQuickAddOrders()">一鍵建立（預設已付款）</button>
    </div>
    <div id="quickAddPreview"></div>
  `);

  addQuickAddRow("sameChannel");
  addQuickAddRow("sameBuyer");
  renderQuickChannelSuggestions();
}

function setQuickAddMode(mode) {
  document.getElementById("quickAddMode").value = mode;
  document.getElementById("quickModeSameChannel").classList.toggle("active", mode === "sameChannel");
  document.getElementById("quickModeSameBuyer").classList.toggle("active", mode === "sameBuyer");
  document.getElementById("quickSameChannelFields").style.display = mode === "sameChannel" ? "" : "none";
  document.getElementById("quickSameBuyerFields").style.display = mode === "sameBuyer" ? "" : "none";
  document.getElementById("quickAddPreview").innerHTML = "";
  if (mode === "sameChannel") renderQuickChannelSuggestions();
  if (mode === "sameBuyer") renderQuickCommonBuyerSuggestions();
}

function setQuickAddEntryMode(mode) {
  document.getElementById("quickEntryMode").value = mode;
  document.getElementById("quickEntryFields").classList.toggle("active", mode === "fields");
  document.getElementById("quickEntryPaste").classList.toggle("active", mode === "paste");
  document.querySelectorAll(".quick-field-entry").forEach(item => item.style.display = mode === "fields" ? "" : "none");
  document.querySelectorAll(".quick-paste-entry").forEach(item => item.style.display = mode === "paste" ? "" : "none");
  document.getElementById("quickAddPreview").innerHTML = "";
}

function quickAddRowHtml(mode, rowId) {
  const primaryCell = mode === "sameChannel"
    ? `<div class="quick-add-cell quick-add-primary-cell"><span class="quick-add-cell-label">購買人</span><input id="quickBuyer_${rowId}" placeholder="輸入或選擇購買人" oninput="renderQuickBuyerSuggestions('${rowId}')" onfocus="renderQuickBuyerSuggestions('${rowId}')" onkeydown="handleQuickAddEnter(event)"><div id="quickBuyerSuggestions_${rowId}" class="suggestion-box quick-row-suggestions"></div></div>`
    : `<div class="quick-add-cell quick-add-primary-cell"><span class="quick-add-cell-label">通路訂單</span><input id="quickChannel_${rowId}" placeholder="搜尋或選擇通路" oninput="handleQuickRowChannelInput('${rowId}')" onfocus="renderQuickRowChannelSuggestions('${rowId}')" onkeydown="handleQuickAddEnter(event)"><input type="hidden" id="quickChannelId_${rowId}" value=""><div id="quickChannelSuggestions_${rowId}" class="suggestion-box quick-row-suggestions"></div></div>`;

  return `
    <div class="quick-add-row" data-row-id="${rowId}" data-mode="${mode}">
      ${primaryCell}
      <div class="quick-add-cell"><span class="quick-add-cell-label">數量</span><input id="quickQty_${rowId}" type="number" min="1" step="1" value="1" inputmode="numeric" onkeydown="handleQuickAddEnter(event)"></div>
      <div class="quick-add-cell"><span class="quick-add-cell-label">金額</span><input id="quickAmount_${rowId}" type="number" min="0" step="1" placeholder="0" inputmode="decimal" onkeydown="handleQuickAddEnter(event)"></div>
      <div class="quick-add-cell quick-add-note-cell"><span class="quick-add-cell-label">備註</span><input id="quickNote_${rowId}" placeholder="可不填" onkeydown="handleQuickAddEnter(event)"></div>
      <button class="quick-add-remove-btn" title="刪除這一列" onclick="removeQuickAddRow('${rowId}')">✕</button>
    </div>
  `;
}

function addQuickAddRow(mode) {
  const container = document.getElementById(mode === "sameBuyer" ? "quickSameBuyerRows" : "quickSameChannelRows");
  if (!container) return;
  quickAddRowCounter += 1;
  const rowId = `qa_${quickAddRowCounter}`;
  container.insertAdjacentHTML("beforeend", quickAddRowHtml(mode, rowId));
}

function removeQuickAddRow(rowId) {
  document.querySelector(`.quick-add-row[data-row-id="${rowId}"]`)?.remove();
  document.getElementById("quickAddPreview").innerHTML = "";
}

function handleQuickAddEnter(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  event.preventDefault();

  const row = event.target.closest(".quick-add-row");
  if (!row) return;
  const inputs = [...row.querySelectorAll("input:not([type='hidden'])")];
  const currentIndex = inputs.indexOf(event.target);
  if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
    inputs[currentIndex + 1].focus();
    return;
  }

  const container = row.parentElement;
  const rows = [...container.querySelectorAll(".quick-add-row")];
  const rowIndex = rows.indexOf(row);
  if (rowIndex < rows.length - 1) {
    rows[rowIndex + 1].querySelector("input:not([type='hidden'])")?.focus();
    return;
  }

  addQuickAddRow(row.dataset.mode);
  container.lastElementChild?.querySelector("input:not([type='hidden'])")?.focus();
}

function renderQuickBuyerPicker(inputId, boxId) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  if (!input || !box) return;

  const q = input.value.trim();
  const matched = db.buyers.filter(buyer => includesText(buyer.name, q)).slice(0, 12);
  let html = matched.map(buyer => `<div class="suggestion-item" onclick="selectQuickBuyer('${inputId}','${boxId}','${jsString(buyer.name)}')"><div class="suggestion-primary">${escapeHtml(buyer.name)}</div></div>`).join("");

  if (q && !db.buyers.some(buyer => sameText(buyer.name, q))) {
    html += `<div class="suggestion-item" onclick="selectQuickBuyer('${inputId}','${boxId}','${jsString(q)}')"><div class="suggestion-primary">＋ 使用「${escapeHtml(q)}」</div></div>`;
  }

  box.innerHTML = html || `<div class="suggestion-item"><div class="suggestion-secondary">尚無購買人，可直接輸入新名字</div></div>`;
}

function renderQuickBuyerSuggestions(rowId) {
  renderQuickBuyerPicker(`quickBuyer_${rowId}`, `quickBuyerSuggestions_${rowId}`);
}

function renderQuickCommonBuyerSuggestions() {
  renderQuickBuyerPicker("quickBuyerName", "quickBuyerSuggestionBox");
}

function selectQuickBuyer(inputId, boxId, name) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  if (input) input.value = name;
  if (box) box.innerHTML = "";
}

function renderQuickChannelPicker(inputId, hiddenId, boxId) {
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const box = document.getElementById(boxId);
  if (!input || !hidden || !box) return;

  const q = input.value.trim();
  const selected = byId("channelOrders", hidden.value);
  if (q && selected && !sameText(channelOrderLabel(selected), q)) hidden.value = "";

  const recentIds = getRecentChannelOrderIds();
  const orders = !q
    ? recentIds.map(id => byId("channelOrders", id)).filter(Boolean).slice(0, 8)
    : db.channelOrders.map(order => ({ order, score: scoreChannelOrder(order, q) })).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 12).map(item => item.order);

  if (orders.length === 0) {
    box.innerHTML = `<div class="suggestion-item"><div class="suggestion-secondary">${q ? "找不到通路訂單" : "開始輸入即可搜尋通路訂單"}</div></div>`;
    return;
  }

  box.innerHTML = orders.map(order => {
    const used = registeredQty(order.id);
    const remain = Number(order.totalQty) - used;
    const tag = recentIds.includes(order.id) ? `<span class="badge blue">最近</span>` : "";
    return `<div class="suggestion-item" onclick="selectQuickChannelPicker('${inputId}','${hiddenId}','${boxId}','${order.id}')"><div class="suggestion-primary">${tag}${escapeHtml(channelOrderLabel(order))}</div><div class="suggestion-secondary">總 ${order.totalQty}｜已登記 ${used}｜剩餘 ${remain}</div></div>`;
  }).join("");
}

function selectQuickChannelPicker(inputId, hiddenId, boxId, orderId) {
  const order = byId("channelOrders", orderId);
  if (!order) return;
  const input = document.getElementById(inputId);
  const hidden = document.getElementById(hiddenId);
  const box = document.getElementById(boxId);
  if (input) input.value = channelOrderLabel(order);
  if (hidden) hidden.value = order.id;
  if (box) box.innerHTML = "";
  if (hiddenId === "quickChannelOrderId") {
    const hint = document.getElementById("quickSelectedChannelHint");
    if (hint) hint.innerHTML = "目前選擇：" + escapeHtml(channelOrderLabel(order));
  }
  saveRecentChannelOrder(order.id);
}

function renderQuickRowChannelSuggestions(rowId) {
  renderQuickChannelPicker(`quickChannel_${rowId}`, `quickChannelId_${rowId}`, `quickChannelSuggestions_${rowId}`);
}

function handleQuickMainChannelInput() {
  const hidden = document.getElementById("quickChannelOrderId");
  const hint = document.getElementById("quickSelectedChannelHint");
  if (hidden) hidden.value = "";
  if (hint) hint.textContent = "尚未選擇通路訂單";
  renderQuickChannelSuggestions();
}

function handleQuickRowChannelInput(rowId) {
  const hidden = document.getElementById(`quickChannelId_${rowId}`);
  if (hidden) hidden.value = "";
  renderQuickRowChannelSuggestions(rowId);
}

function parseQtyAndNote(line) {
  const [mainRaw, ...noteParts] = String(line || "").split("#");
  const note = noteParts.join("#").trim();
  let main = mainRaw.trim();
  if (!main) return null;

  let amount = 0;
  const amountMatch = main.match(/(?:NT\$|TWD\s*|[$＄])\s*([\d,]+(?:\.\d+)?)/i);
  if (amountMatch) {
    amount = Number(amountMatch[1].replace(/,/g, ""));
    main = main.replace(amountMatch[0], " ").trim();
  }

  main = main.replace(/＋/g, "+").replace(/張/g, "").replace(/[xX＊*]/g, " x ");
  const plusMatch = main.match(/^(.+?)\s*\+\s*(\d+)$/);
  if (plusMatch) return { name: plusMatch[1].trim(), qty: Number(plusMatch[2]), amount, note };
  const xMatch = main.match(/^(.+?)\s+x\s+(\d+)$/i);
  if (xMatch) return { name: xMatch[1].trim(), qty: Number(xMatch[2]), amount, note };

  const parts = main.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (/^\d+$/.test(last)) {
    parts.pop();
    return { name: parts.join(" ").trim(), qty: Number(last), amount, note };
  }
  return { name: main.trim(), qty: 1, amount, note };
}

function findBestChannelOrder(keyword) {
  const q = normalizeText(keyword);
  if (!q) return null;

  const scored = db.channelOrders
    .map(order => {
      const label = channelOrderLabel(order);
      const channel = nameOf("channels", order.channelId);
      const alias = aliasOf("channels", order.channelId);
      const artist = nameOf("artists", order.artistId);
      const batch = order.batch || "";
      const type = nameOf("albumTypes", order.albumTypeId);
      const text = `${label} ${channel} ${alias} ${artist} ${batch} ${type}`;
      let score = 0;
      if (normalizeText(channel) === q) score += 100;
      if (normalizeText(alias) === q) score += 120;
      if (normalizeText(batch) === q) score += 60;
      if (normalizeText(label).includes(q)) score += 30;
      if (normalizeText(text).includes(q)) score += 20;
      return { order, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.order || null;
}

function parseQuickAddSameChannel() {
  const channelOrderId = document.getElementById("quickChannelOrderId").value;
  const channelOrder = byId("channelOrders", channelOrderId);
  const lines = document.getElementById("quickListText").value.split(/\n+/).map(l => l.trim()).filter(Boolean);

  return lines.map(line => {
    const parsed = parseQtyAndNote(line);
    return {
      buyerName: parsed?.name || "",
      channelOrderId,
      channelOrder,
      qty: parsed?.qty || 1,
      amount: parsed?.amount || 0,
      note: parsed?.note || "",
      error: !channelOrder ? "尚未選擇通路訂單" : (!parsed?.name ? "缺少購買人名稱" : "")
    };
  });
}

function parseQuickAddSameBuyer() {
  const buyerName = document.getElementById("quickBuyerName").value.trim();
  const lines = document.getElementById("quickRouteText").value.split(/\n+/).map(l => l.trim()).filter(Boolean);

  return lines.map(line => {
    const parsed = parseQtyAndNote(line);
    const channelOrder = findBestChannelOrder(parsed?.name || "");
    return {
      buyerName,
      channelOrderId: channelOrder?.id || "",
      channelOrder,
      qty: parsed?.qty || 1,
      amount: parsed?.amount || 0,
      note: parsed?.note || "",
      error: !buyerName ? "缺少購買人名稱" : (!channelOrder ? `找不到通路：${parsed?.name || ""}` : "")
    };
  });
}

function collectQuickAddFieldRows() {
  const mode = document.getElementById("quickAddMode").value;
  const selector = mode === "sameBuyer" ? "#quickSameBuyerRows .quick-add-row" : "#quickSameChannelRows .quick-add-row";
  const commonBuyerName = document.getElementById("quickBuyerName")?.value.trim() || "";
  const commonChannelOrderId = document.getElementById("quickChannelOrderId")?.value || "";

  return [...document.querySelectorAll(selector)].map(row => {
    const rowId = row.dataset.rowId;
    const buyerName = mode === "sameBuyer" ? commonBuyerName : (document.getElementById(`quickBuyer_${rowId}`)?.value.trim() || "");
    const channelOrderId = mode === "sameBuyer" ? (document.getElementById(`quickChannelId_${rowId}`)?.value || "") : commonChannelOrderId;
    const channelOrder = byId("channelOrders", channelOrderId);
    const qtyText = document.getElementById(`quickQty_${rowId}`)?.value ?? "";
    const amountText = document.getElementById(`quickAmount_${rowId}`)?.value ?? "";
    const qty = Number(qtyText);
    const amount = amountText === "" ? 0 : Number(amountText);
    const note = document.getElementById(`quickNote_${rowId}`)?.value.trim() || "";
    const primaryValue = mode === "sameBuyer" ? (document.getElementById(`quickChannel_${rowId}`)?.value.trim() || "") : buyerName;

    if (!primaryValue && !note && amountText === "" && (qtyText === "" || qtyText === "1")) return null;

    const errors = [];
    if (!buyerName) errors.push("缺少購買人");
    if (!channelOrder) errors.push("尚未選擇通路訂單");
    if (!Number.isInteger(qty) || qty < 1) errors.push("數量需為正整數");
    if (!Number.isFinite(amount) || amount < 0) errors.push("金額格式不正確");

    return { buyerName, channelOrderId, channelOrder, qty, amount, note, error: errors.join("、") };
  }).filter(Boolean);
}

function annotateQuickAddRows(rows) {
  const requestedByChannel = {};
  rows.forEach(row => {
    if (!row.channelOrderId || row.error) return;
    requestedByChannel[row.channelOrderId] = (requestedByChannel[row.channelOrderId] || 0) + Number(row.qty || 0);
  });

  return rows.map(row => {
    const warnings = [];
    if (!row.error && row.channelOrder) {
      const buyer = db.buyers.find(item => sameText(item.name, row.buyerName));
      const duplicate = buyer && db.buyerOrders.some(order => order.buyerId === buyer.id && order.channelOrderId === row.channelOrderId);
      if (duplicate) warnings.push("已有相同購買人／通路訂單");

      const remain = Number(row.channelOrder.totalQty) - registeredQty(row.channelOrderId);
      if ((requestedByChannel[row.channelOrderId] || 0) > remain) warnings.push(`合計超過剩餘 ${remain} 張`);
    }
    return { ...row, warning: warnings.join("、") };
  });
}

function getQuickAddRows() {
  const mode = document.getElementById("quickAddMode").value;
  const entryMode = document.getElementById("quickEntryMode")?.value || "fields";
  const rows = entryMode === "fields"
    ? collectQuickAddFieldRows()
    : (mode === "sameBuyer" ? parseQuickAddSameBuyer() : parseQuickAddSameChannel());
  return annotateQuickAddRows(rows);
}

function previewQuickAdd() {
  const rows = getQuickAddRows();
  const box = document.getElementById("quickAddPreview");

  if (rows.length === 0) {
    box.innerHTML = `<p class="quick-preview-warning">沒有可解析的資料</p>`;
    return;
  }

  const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  box.innerHTML = `
    <p class="muted">共 ${rows.length} 筆｜總數量 ${totalQty}｜總金額 ${money(totalAmount)}｜全部預設已付款</p>
    <div class="quick-preview-scroll">
      <table class="quick-preview-table">
        <thead>
          <tr>
            <th>購買人</th>
            <th>通路訂單</th>
            <th>數量</th>
            <th>金額</th>
            <th>備註</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr>
              <td>${escapeHtml(row.buyerName)}</td>
              <td>${row.channelOrder ? escapeHtml(channelOrderLabel(row.channelOrder)) : "-"}</td>
              <td>${row.qty}</td>
              <td>${money(row.amount)}</td>
              <td>${escapeHtml(row.note || "")}</td>
              <td class="${row.error ? "quick-preview-warning" : (row.warning ? "quick-preview-notice" : "")}">${escapeHtml(row.error || row.warning || "可建立")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function createQuickAddOrders() {
  const rows = getQuickAddRows();

  if (rows.length === 0) {
    alert("沒有可建立的資料");
    return;
  }

  const errors = rows.filter(row => row.error);
  if (errors.length > 0) {
    previewQuickAdd();
    alert("清單內還有錯誤，請先修正。");
    return;
  }

  const warningRows = rows.filter(row => row.warning);
  if (warningRows.length > 0 && !confirm(`有 ${warningRows.length} 筆提醒（重複訂單或數量超過剩餘），仍要建立嗎？`)) {
    return;
  }

  createBackup("快速新增前自動備份", "manual");

  rows.forEach(row => {
    const buyer = findOrCreateBuyer(row.buyerName);
    db.buyerOrders.push({
      id: uid("buyerOrder"),
      buyerId: buyer.id,
      channelOrderId: row.channelOrderId,
      qty: Number(row.qty || 1),
      amount: Number(row.amount || 0),
      paid: true,
      shipped: false,
      delivery: { market: false, ordered: false, shipped: false },
      note: row.note || "",
      createdAt: now(),
      updatedAt: now()
    });
    saveRecentChannelOrder(row.channelOrderId);
  });

  saveData();
  closeModal();
  renderAll();
  const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  alert(`已建立 ${rows.length} 筆訂單\n總數量：${totalQty}\n總金額：${money(totalAmount)}\n付款狀態：已付款`);
}

function renderQuickChannelSuggestions() {
  renderQuickChannelPicker("quickChannelSearch", "quickChannelOrderId", "quickChannelSuggestionBox");
}

function selectQuickChannelOrder(id) {
  selectQuickChannelPicker("quickChannelSearch", "quickChannelOrderId", "quickChannelSuggestionBox", id);
}

function openBuyerOrderForm(editId = "") {
  if (db.channelOrders.length === 0) {
    alert("請先新增通路訂單");
    return;
  }

  const isEdit = Boolean(editId);
  const order = db.buyerOrders.find(o => o.id === editId) || {};
  const buyerName = order.buyerId ? nameOf("buyers", order.buyerId) : "";
  const lastChannelOrder = getLastChannelOrder();
  const selectedChannelOrder = isEdit
    ? (order.channelOrderId ? byId("channelOrders", order.channelOrderId) : null)
    : lastChannelOrder;

  const channelInputValue = isEdit && selectedChannelOrder ? channelOrderLabel(selectedChannelOrder) : "";
  const selectedHint = selectedChannelOrder
    ? `${isEdit ? "目前選擇" : "已套用最近使用"}：${channelOrderLabel(selectedChannelOrder)}`
    : "尚未選擇通路訂單";

  openModal(editId ? "編輯購買人訂單" : "新增購買人訂單", `
    <div class="form-field">
      <label>購買人</label>
      <input id="boBuyerSearch" placeholder="輸入或選擇購買人" value="${escapeAttr(buyerName)}" oninput="renderBuyerSuggestions()" onfocus="renderBuyerSuggestions()">
      <div id="buyerSuggestionBox" class="suggestion-box"></div>
      <p class="muted">輸入關鍵字會即時篩選；找不到會自動新增。</p>
    </div>

    <div class="form-field">
      <label>對應通路訂單</label>
      <input id="boChannelSearch" placeholder="搜尋藝人 / 通路 / 批次 / 日期" value="${escapeAttr(channelInputValue)}" oninput="renderChannelOrderSuggestions()" onfocus="renderChannelOrderSuggestions()">
      <input type="hidden" id="boChannelOrderId" value="${selectedChannelOrder ? selectedChannelOrder.id : ""}">
      <div id="channelOrderSuggestionBox" class="suggestion-box"></div>
      <div id="selectedChannelHint" class="selected-hint">${escapeHtml(selectedHint)}</div>
      <p class="muted">新增時搜尋框會保持空白；可直接用最近使用，或輸入關鍵字更換通路。</p>
    </div>

    <div class="form-field">
      <label>數量</label>
      <input id="boQty" type="number" min="1" value="${order.qty ?? ""}" placeholder="例如 2">
    </div>

    <div class="form-field">
      <label>金額</label>
      <input id="boAmount" type="number" min="0" value="${order.amount ?? ""}" placeholder="可不填，例如 1500">
    </div>

    <div class="form-field">
      <label>付款狀態</label>
      <select id="boPaid">
        <option value="false" ${order.paid ? "" : "selected"}>❌ 未付款</option>
        <option value="true" ${order.paid ? "selected" : ""}>✅ 已付款</option>
      </select>
    </div>

    <div class="form-field">
      <label>備註</label>
      <textarea id="boNote">${escapeHtml(order.note || "")}</textarea>
    </div>

    <button class="primary-btn" onclick="saveBuyerOrder('${editId}')">儲存</button>
  `);

  renderBuyerSuggestions();
  renderChannelOrderSuggestions();
}

function renderBuyerSuggestions() {
  const input = document.getElementById("boBuyerSearch");
  const box = document.getElementById("buyerSuggestionBox");
  if (!input || !box) return;

  const q = input.value.trim();
  const matched = db.buyers
    .filter(b => includesText(b.name, q))
    .slice(0, 10);

  let html = "";

  matched.forEach(buyer => {
    html += `
      <div class="suggestion-item" onclick="selectBuyerName('${jsString(buyer.name)}')">
        <div class="suggestion-primary">${escapeHtml(buyer.name)}</div>
      </div>
    `;
  });

  if (q && !db.buyers.some(b => sameText(b.name, q))) {
    html += `
      <div class="suggestion-item" onclick="selectBuyerName('${jsString(q)}')">
        <div class="suggestion-primary">＋ 新增「${escapeHtml(q)}」</div>
      </div>
    `;
  }

  box.innerHTML = html || `<div class="suggestion-item"><div class="suggestion-secondary">沒有符合資料</div></div>`;
}

function selectBuyerName(name) {
  const input = document.getElementById("boBuyerSearch");
  if (!input) return;
  input.value = name;
  renderBuyerSuggestions();
}

function renderChannelOrderSuggestions() {
  const input = document.getElementById("boChannelSearch");
  const box = document.getElementById("channelOrderSuggestionBox");
  if (!input || !box) return;

  const q = input.value.trim();
  const recentIds = getRecentChannelOrderIds();

  if (!q) {
    const recentOrders = recentIds.map(id => byId("channelOrders", id)).filter(Boolean).slice(0, 5);

    if (recentOrders.length === 0) {
      box.innerHTML = `<div class="suggestion-item"><div class="suggestion-secondary">開始輸入即可搜尋通路訂單</div></div>`;
      return;
    }

    box.innerHTML = `
      <div class="suggestion-item"><div class="suggestion-secondary">最近使用</div></div>
      ${recentOrders.map(order => channelOrderSuggestionHtml(order, "最近使用")).join("")}
    `;
    return;
  }

  const matched = db.channelOrders
    .map(order => ({ order, score: scoreChannelOrder(order, q) }))
    .filter(item => item.score > 0)
    .sort((a, b) => {
      const aRecent = recentIds.indexOf(a.order.id);
      const bRecent = recentIds.indexOf(b.order.id);
      if (aRecent !== -1 && bRecent === -1) return -1;
      if (aRecent === -1 && bRecent !== -1) return 1;
      if (a.score !== b.score) return b.score - a.score;
      return channelOrderLabel(a.order).localeCompare(channelOrderLabel(b.order));
    })
    .slice(0, 12);

  if (matched.length === 0) {
    box.innerHTML = `<div class="suggestion-item"><div class="suggestion-secondary">找不到通路訂單</div></div>`;
    return;
  }

  box.innerHTML = matched.map(item => {
    const tag = recentIds.includes(item.order.id) ? "最近使用" : "";
    return channelOrderSuggestionHtml(item.order, tag);
  }).join("");
}

function selectChannelOrder(id) {
  const order = byId("channelOrders", id);
  if (!order) return;

  const label = channelOrderLabel(order);
  document.getElementById("boChannelOrderId").value = id;
  document.getElementById("boChannelSearch").value = label;
  document.getElementById("selectedChannelHint").innerHTML = escapeHtml(`目前選擇：${label}`);
  renderChannelOrderSuggestions();
}

function findOrCreateBuyer(name) {
  const clean = name.trim().replace(/\s+/g, " ");
  let buyer = db.buyers.find(b => sameText(b.name, clean));

  if (!buyer) {
    buyer = {
      id: uid("buyer"),
      name: clean,
      note: "",
      createdAt: now(),
      updatedAt: now()
    };

    db.buyers.push(buyer);
  }

  return buyer;
}

function saveBuyerOrder(editId = "") {
  const buyerName = document.getElementById("boBuyerSearch").value.trim();
  const channelOrderId = document.getElementById("boChannelOrderId").value;
  const qty = Number(document.getElementById("boQty").value || 0);
  const paid = document.getElementById("boPaid").value === "true";
  const amount = Number(document.getElementById("boAmount")?.value || 0);
  const note = document.getElementById("boNote").value.trim();

  if (!buyerName || !channelOrderId || !qty) {
    alert("購買人、通路訂單、數量都要填");
    return;
  }

  const channelOrder = byId("channelOrders", channelOrderId);
  const currentUsed = registeredQty(channelOrderId, editId);
  const remain = channelOrder.totalQty - currentUsed;

  if (qty > remain && !confirm(`目前剩餘只有 ${remain} 張，確定仍要新增 ${qty} 張嗎？`)) {
    return;
  }

  const buyer = findOrCreateBuyer(buyerName);

  const data = {
    id: editId || uid("buyerOrder"),
    buyerId: buyer.id,
    channelOrderId,
    qty,
    amount,
    paid,
    shipped: editId ? Boolean(byId("buyerOrders", editId).shipped) : false,
    delivery: editId ? (byId("buyerOrders", editId).delivery || { market: false, ordered: false, shipped: Boolean(byId("buyerOrders", editId).shipped) }) : { market: false, ordered: false, shipped: false },
    note,
    createdAt: editId ? byId("buyerOrders", editId).createdAt : now(),
    updatedAt: now()
  };

  if (editId) db.buyerOrders = db.buyerOrders.map(o => o.id === editId ? data : o);
  else db.buyerOrders.push(data);

  saveRecentChannelOrder(channelOrderId);
  saveData();
  closeModal();
  renderAll();
}


function ensureDelivery(order) {
  if (!order.delivery) {
    order.delivery = {
      market: false,
      ordered: false,
      shipped: Boolean(order.shipped)
    };
  }

  if (order.shipped && order.delivery) {
    order.delivery.shipped = true;
  }

  return order.delivery;
}

function deliveryState(order) {
  const delivery = ensureDelivery(order);
  return {
    market: Boolean(delivery.market),
    ordered: Boolean(delivery.ordered),
    shipped: Boolean(delivery.shipped)
  };
}

function isDeliveryComplete(order) {
  const state = deliveryState(order);
  return state.market && state.ordered && state.shipped;
}

function toggleDeliveryStep(id, step) {
  const order = byId("buyerOrders", id);
  if (!order) return;

  const delivery = ensureDelivery(order);
  delivery[step] = !delivery[step];

  if (step === "shipped") {
    order.shipped = Boolean(delivery.shipped);
  }

  order.updatedAt = now();
  saveData();
  renderAll();
}

function renderDeliveryChecklist(order, compact = false) {
  const state = deliveryState(order);
  const labels = [
    ["market", "建立賣場"],
    ["ordered", "下單"],
    ["shipped", "出貨"]
  ];

  return `
    <div class="delivery-checklist">
      ${labels.map(([key, label]) => `
        <button class="delivery-step-btn ${state[key] ? "done" : ""}" onclick="toggleDeliveryStep('${order.id}', '${key}')">
          ${state[key] ? "✅" : "☐"} ${compact ? label.slice(0, 2) : label}
        </button>
      `).join("")}
    </div>
  `;
}

function togglePaid(id) {
  const order = byId("buyerOrders", id);
  if (!order) return;
  order.paid = !order.paid;
  order.updatedAt = now();
  saveData();
  renderAll();
}

function isBuyerOrderArchived(order) {
  return Boolean(order.paid && isDeliveryComplete(order));
}

function toggleShipped(id) {
  const order = byId("buyerOrders", id);
  if (!order) return;
  const delivery = ensureDelivery(order);
  delivery.shipped = !delivery.shipped;
  order.shipped = Boolean(delivery.shipped);
  order.updatedAt = now();
  saveData();
  renderAll();
}

function deleteBuyerOrder(id) {
  if (!confirm("確定刪除這筆購買人訂單嗎？")) return;
  db.buyerOrders = db.buyerOrders.filter(o => o.id !== id);
  saveData();
  renderAll();
}

function setBuyerOrderFilter(filter) {
  buyerOrderFilter = filter;

  const map = {
    active: "buyerFilterActive",
    unpaid: "buyerFilterUnpaid",
    paid: "buyerFilterPaid",
    archived: "buyerFilterArchived",
    all: "buyerFilterAll"
  };

  Object.values(map).forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.remove("active");
  });

  const active = document.getElementById(map[filter]);
  if (active) active.classList.add("active");

  renderBuyerOrders();
}

function goToUnpaidOrders() {
  const buttons = document.querySelectorAll(".bottom-nav button");
  if (buttons[2]) {
    switchPage("buyer-orders", buttons[2]);
  }
  setBuyerOrderFilter("unpaid");
}

function getCollapsedBuyerGroups() {
  try {
    return JSON.parse(localStorage.getItem(BUYER_GROUP_COLLAPSE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCollapsedBuyerGroups(data) {
  localStorage.setItem(BUYER_GROUP_COLLAPSE_KEY, JSON.stringify(data));
}

function toggleBuyerGroup(buyerId) {
  const collapsed = getCollapsedBuyerGroups();
  collapsed[buyerId] = !collapsed[buyerId];
  saveCollapsedBuyerGroups(collapsed);
  renderBuyerOrders();
}

function renderBuyerOrderCard(order, compact = false) {
  const co = byId("channelOrders", order.channelOrderId);

  return `
    <div class="order-card ${compact ? "compact-buyer-order" : ""}">
      <div class="order-title">👤 ${escapeHtml(nameOf("buyers", order.buyerId))}</div>
      <p class="order-subtitle">${co ? escapeHtml(channelOrderLabel(co)) : "通路訂單不存在"}</p>
      <span class="badge blue">${order.qty} 張</span>
      <span class="badge amount-badge">${money(order.amount)}</span>

      <div class="button-row">
        <button class="pay-toggle ${order.paid ? "primary-btn" : "danger-btn"}" onclick="togglePaid('${order.id}')">
          ${order.paid ? "✅ 已付款" : "❌ 未付款"}
        </button>
      </div>

      <strong>配送流程</strong>
      ${renderDeliveryChecklist(order)}

      ${isBuyerOrderArchived(order) ? `<p class="archived-note">已付款且配送流程完成，已進入封存</p>` : ""}
      ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}

      <div class="button-row">
        <button class="secondary-btn" onclick="openBuyerOrderForm('${order.id}')">編輯</button>
        <button class="danger-btn" onclick="deleteBuyerOrder('${order.id}')">刪除</button>
      </div>
    </div>
  `;
}


function getBuyerTreeCollapsed() {
  try {
    return JSON.parse(localStorage.getItem(BUYER_TREE_COLLAPSE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveBuyerTreeCollapsed(data) {
  localStorage.setItem(BUYER_TREE_COLLAPSE_KEY, JSON.stringify(data));
}

function toggleBuyerTreeNode(key) {
  const collapsed = getBuyerTreeCollapsed();
  collapsed[key] = !collapsed[key];
  saveBuyerTreeCollapsed(collapsed);
  renderBuyerOrders();
}

function buyerTreeKey(...parts) {
  return parts.map(part => String(part || "unknown")).join("||");
}

function buyerOrderSearchText(order) {
  const co = byId("channelOrders", order.channelOrderId);
  const buyer = nameOf("buyers", order.buyerId);
  return `${buyer} ${co ? channelOrderLabel(co) : ""} ${order.note || ""}`;
}

function shouldShowBuyerOrderByFilter(order) {
  const archived = isBuyerOrderArchived(order);

  if (buyerOrderFilter === "active" && archived) return false;
  if (buyerOrderFilter === "unpaid" && (order.paid || archived)) return false;
  if (buyerOrderFilter === "paid" && (!order.paid || archived)) return false;
  if (buyerOrderFilter === "archived" && !archived) return false;

  return true;
}

function groupBuyerOrdersForTree(orders) {
  const root = new Map();

  orders.forEach(order => {
    const channelOrder = byId("channelOrders", order.channelOrderId);
    const buyerId = order.buyerId || "unknown_buyer";
    const buyerName = nameOf("buyers", buyerId);
    const artistId = channelOrder?.artistId || "unknown_artist";
    const artistName = channelOrder ? nameOf("artists", artistId) : "未設定藝人";
    const channelId = channelOrder?.channelId || "unknown_channel";
    const channelName = channelOrder ? channelDisplayName(channelId) : "未設定通路";
    const detailId = channelOrder?.id || "unknown_detail";
    const detailName = channelOrder ? channelOrderLabel(channelOrder) : "通路訂單不存在";

    if (!root.has(buyerId)) {
      root.set(buyerId, {
        id: buyerId,
        name: buyerName,
        count: 0,
        artists: new Map()
      });
    }

    const buyerNode = root.get(buyerId);
    buyerNode.count += 1;

    if (!buyerNode.artists.has(artistId)) {
      buyerNode.artists.set(artistId, {
        id: artistId,
        name: artistName,
        count: 0,
        channels: new Map()
      });
    }

    const artistNode = buyerNode.artists.get(artistId);
    artistNode.count += 1;

    if (!artistNode.channels.has(channelId)) {
      artistNode.channels.set(channelId, {
        id: channelId,
        name: channelName,
        count: 0,
        details: new Map()
      });
    }

    const channelNode = artistNode.channels.get(channelId);
    channelNode.count += 1;

    if (!channelNode.details.has(detailId)) {
      channelNode.details.set(detailId, {
        id: detailId,
        name: detailName,
        count: 0,
        orders: []
      });
    }

    const detailNode = channelNode.details.get(detailId);
    detailNode.count += 1;
    detailNode.orders.push(order);
  });

  return [...root.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderTreeHeader(key, levelClass, icon, title, count) {
  const collapsed = getBuyerTreeCollapsed();
  const isCollapsed = Boolean(collapsed[key]);
  return `
    <button class="tree-node-header ${levelClass}" onclick="toggleBuyerTreeNode('${escapeAttr(key)}')">
      <span class="tree-node-title">${isCollapsed ? "▶" : "▼"} ${icon} ${escapeHtml(title)}</span>
      <span class="tree-node-count">${count} 筆</span>
    </button>
  `;
}

function renderBuyerTree(orders) {
  const collapsed = getBuyerTreeCollapsed();
  const buyers = groupBuyerOrdersForTree(orders);

  if (buyers.length === 0) {
    return `<div class="card"><p class="muted">沒有符合條件的購買人訂單。</p></div>`;
  }

  return `
    <div class="buyer-tree">
      ${buyers.map(buyer => {
        const buyerKey = buyerTreeKey("buyer", buyer.id);
        const buyerCollapsed = Boolean(collapsed[buyerKey]);

        return `
          <div class="tree-node">
            ${renderTreeHeader(buyerKey, "", "👤", buyer.name, buyer.count)}
            ${buyerCollapsed ? "" : `
              <div class="tree-node-body">
                ${[...buyer.artists.values()].sort((a, b) => a.name.localeCompare(b.name)).map(artist => {
                  const artistKey = buyerTreeKey("buyer", buyer.id, "artist", artist.id);
                  const artistCollapsed = Boolean(collapsed[artistKey]);

                  return `
                    <div class="tree-node tree-level-artist">
                      ${renderTreeHeader(artistKey, "tree-level-artist-header", "🎤", artist.name, artist.count)}
                      ${artistCollapsed ? "" : `
                        <div class="tree-node-body">
                          ${[...artist.channels.values()].sort((a, b) => a.name.localeCompare(b.name)).map(channel => {
                            const channelKey = buyerTreeKey("buyer", buyer.id, "artist", artist.id, "channel", channel.id);
                            const channelCollapsed = Boolean(collapsed[channelKey]);

                            return `
                              <div class="tree-node tree-level-channel">
                                ${renderTreeHeader(channelKey, "tree-level-channel-header", "🏪", channel.name, channel.count)}
                                ${channelCollapsed ? "" : `
                                  <div class="tree-node-body">
                                    ${[...channel.details.values()].map(detail => {
                                      const detailKey = buyerTreeKey("buyer", buyer.id, "artist", artist.id, "channel", channel.id, "detail", detail.id);
                                      const detailCollapsed = Boolean(collapsed[detailKey]);

                                      return `
                                        <div class="tree-detail-card tree-level-detail">
                                          <button class="tree-detail-header" onclick="toggleBuyerTreeNode('${escapeAttr(detailKey)}')">
                                            ${detailCollapsed ? "▶" : "▼"} 📦 ${escapeHtml(detail.name)}
                                            <span class="tree-node-count">${detail.count} 筆</span>
                                          </button>
                                          ${detailCollapsed ? "" : `
                                            <div class="tree-order-wrap">
                                              ${detail.orders.map(order => renderBuyerOrderCard(order, true)).join("")}
                                            </div>
                                          `}
                                        </div>
                                      `;
                                    }).join("")}
                                  </div>
                                `}
                              </div>
                            `;
                          }).join("")}
                        </div>
                      `}
                    </div>
                  `;
                }).join("")}
              </div>
            `}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderBuyerOrders() {
  const box = document.getElementById("buyerOrderList");
  if (!box) return;

  const q = document.getElementById("buyerOrderSearch")?.value.trim() || "";

  const filtered = db.buyerOrders.filter(order => {
    if (!shouldShowBuyerOrderByFilter(order)) return false;
    return includesText(buyerOrderSearchText(order), q);
  });

  box.innerHTML = renderBuyerTree(filtered);
}

function renderHome() {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);

  const unpaidOrders = db.buyerOrders.filter(o => !o.paid);
  const totalAmount = db.buyerOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const unpaidAmount = unpaidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);

  document.getElementById("statOrders").textContent = db.buyerOrders.length;
  document.getElementById("statUnpaid").textContent = unpaidOrders.length;
  document.getElementById("statNotOrdered").textContent = db.channelOrders.filter(o => o.status === "未下單").length;
  document.getElementById("statNotArrived").textContent = db.channelOrders.filter(o => o.status === "未到貨").length;
  document.getElementById("statTodayFansign").textContent = db.channelOrders.filter(o => o.fansignDate === today).length;
  document.getElementById("statMonthFansign").textContent = db.channelOrders.filter(o => (o.fansignDate || "").slice(0, 7) === currentMonth).length;

  const totalAmountEl = document.getElementById("statTotalAmount");
  const unpaidAmountEl = document.getElementById("statUnpaidAmount");
  if (totalAmountEl) totalAmountEl.textContent = money(totalAmount);
  if (unpaidAmountEl) unpaidAmountEl.textContent = money(unpaidAmount);

  const alerts = document.getElementById("homeAlerts");
  const unpaid = unpaidOrders.length;
  const notOrdered = db.channelOrders.filter(o => o.status === "未下單").length;
  const notArrived = db.channelOrders.filter(o => o.status === "未到貨").length;
  const archived = db.buyerOrders.filter(o => isBuyerOrderArchived(o)).length;
  const unshipped = db.buyerOrders.filter(o => !isDeliveryComplete(o) && !isBuyerOrderArchived(o)).length;

  alerts.innerHTML = `
    <p><span class="badge red clickable-badge" onclick="goToUnpaidOrders()">未付款 ${unpaid}</span></p>
    <p><span class="badge orange">未下單通路 ${notOrdered}</span></p>
    <p><span class="badge blue">未到貨通路 ${notArrived}</span></p>
    <p><span class="badge orange">未出貨 ${unshipped}</span></p>
    <p><span class="badge green">已封存 ${archived}</span></p>
  `;

  renderUpcomingFansigns();
  renderChannelTimeline();
}

function renderUpcomingFansigns() {
  const box = document.getElementById("upcomingFansigns");
  if (!box) return;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = db.channelOrders
    .filter(o => o.fansignDate && o.fansignDate >= today)
    .sort((a, b) => `${a.fansignDate} ${a.fansignTime}`.localeCompare(`${b.fansignDate} ${b.fansignTime}`))
    .slice(0, 5);

  if (upcoming.length === 0) {
    box.innerHTML = `<p class="muted">尚無即將到來的簽售</p>`;
    return;
  }

  box.innerHTML = upcoming.map(o => `
    <div class="list-item" style="grid-template-columns: 1fr;">
      <strong>${escapeHtml(channelOrderLabel(o))}</strong>
    </div>
  `).join("");
}

function renderSearch() {
  const box = document.getElementById("searchResults");
  const input = document.getElementById("globalSearch");
  if (!box || !input) return;

  const q = input.value.trim();
  box.innerHTML = "";

  if (!q) {
    box.innerHTML = `<div class="card"><p class="muted">輸入關鍵字開始搜尋</p></div>`;
    return;
  }

  const results = [];

  db.buyers.forEach(b => {
    if (includesText(b.name, q)) results.push(`👤 ${b.name}`);
  });

  db.channelOrders.forEach(o => {
    const label = channelOrderLabel(o);
    if (includesText(label, q)) results.push(`📦 ${label}`);
  });

  db.buyerOrders.forEach(o => {
    const co = byId("channelOrders", o.channelOrderId);
    const text = `${nameOf("buyers", o.buyerId)} ${co ? channelOrderLabel(co) : ""}`;
    if (includesText(text, q)) results.push(`🛒 ${text}`);
  });

  box.innerHTML = `
    <div class="card">
      ${results.length ? results.map(r => `<p>${escapeHtml(r)}</p>`).join("") : "<p class='muted'>找不到結果</p>"}
    </div>
  `;
}

function renderAutoBackups() {
  const box = document.getElementById("autoBackupList");
  if (!box) return;

  const backups = getAutoBackups();

  if (backups.length === 0) {
    box.innerHTML = `<p class="muted">目前還沒有自動備份</p>`;
    return;
  }

  box.innerHTML = backups.map(item => `
    <div class="backup-item">
      <div class="backup-time">${escapeHtml(item.time)}</div>
      <div class="backup-actions">
        <button class="secondary-btn" onclick="restoreAutoBackup('${item.id}')">還原</button>
        <button class="danger-btn" onclick="deleteAutoBackup('${item.id}')">刪除</button>
      </div>
    </div>
  `).join("");
}

function renderChannelTimeline() {
  const box = document.getElementById("channelTimeline");
  if (!box) return;

  const orders = [...db.channelOrders]
    .filter(o => o.fansignDate)
    .sort((a, b) => `${a.fansignDate} ${a.fansignTime}`.localeCompare(`${b.fansignDate} ${b.fansignTime}`));

  if (orders.length === 0) {
    box.innerHTML = `<p class="muted">尚無簽售時間資料</p>`;
    return;
  }

  box.innerHTML = orders.map(order => `
    <div class="timeline-item">
      <div class="timeline-date">${escapeHtml(order.fansignDate)} ${escapeHtml(order.fansignTime || "")}</div>
      <div>${escapeHtml(channelOrderLabel(order))}</div>
      <div class="muted">狀態：${escapeHtml(order.status)}｜總下單 ${order.totalQty}｜已登記 ${registeredQty(order.id)}</div>
    </div>
  `).join("");
}

function exportBackup() {
  const item = createBackup("JSON 匯出備份", "manual");
  const box = document.getElementById("backupBox");
  if (box) box.value = item.data;
  renderBackupCenter();
  alert(`JSON 備份已產生，並已存入備份中心：${item.name}`);
}

function importBackup() {
  try {
    const raw = document.getElementById("backupBox").value.trim();
    if (!raw) return alert("請貼上備份資料");
    createBackup("匯入前自動備份", "manual");
    isRestoringBackup = true;
    db = normalizeLoadedData({ ...structuredClone(defaultData), ...JSON.parse(raw) });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    isRestoringBackup = false;
    renderAll();
    alert("還原成功");
  } catch (error) {
    alert("還原失敗，請確認格式");
  }
}

function clearAll() {
  if (!confirm("確定清空全部資料嗎？這不能復原。")) return;
  createBackup("清空前自動備份", "manual");
  isRestoringBackup = true;
  db = structuredClone(defaultData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  isRestoringBackup = false;
  renderAll();
}

function renderAll() {
  try {
    renderHome();
  } catch (error) {
    console.warn("renderHome error", error);
  }

  try {
    renderMasterList("artists", "artistList");
    renderMasterList("channels", "channelList");
    renderMasterList("albumTypes", "albumTypeList");
    renderMasterList("buyers", "buyerList");
  } catch (error) {
    console.warn("renderMasterList error", error);
  }

  try {
    renderChannelOrders();
    renderBuyerOrders();
    renderSearch();
    renderChannelTimeline();
    renderBackupCenter();
  } catch (error) {
    console.warn("render page error", error);
  }

  saveData();
}

function forceRenderSettingsLists() {
  renderMasterList("artists", "artistList");
  renderMasterList("channels", "channelList");
  renderMasterList("albumTypes", "albumTypeList");
  renderMasterList("buyers", "buyerList");
}

document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  forceRenderSettingsLists();
});

renderAll();
