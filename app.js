// Fansign Manager v4.1

const STORAGE_KEY = "fansign_manager_v3";
const BACKUP_KEY = "fansign_manager_v3_backups";
const GROUP_COLLAPSE_KEY = "fansign_manager_v3_group_collapse";
const BUYER_GROUP_COLLAPSE_KEY = "fansign_manager_v3_buyer_group_collapse";
let isRestoringBackup = false;

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

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

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    return { ...structuredClone(defaultData), ...JSON.parse(raw) };
  } catch (error) {
    alert("資料讀取失敗，系統會使用空白資料。");
    return structuredClone(defaultData);
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

function createAutoBackup() {
  const backups = getAutoBackups();

  const latest = backups[0];
  const currentData = JSON.stringify(db);

  if (latest && latest.data === currentData) {
    return;
  }

  backups.unshift({
    id: uid("backup"),
    time: new Date().toLocaleString(),
    data: currentData
  });

  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, 10)));
}

function restoreAutoBackup(id) {
  const backups = getAutoBackups();
  const backup = backups.find(item => item.id === id);

  if (!backup) {
    alert("找不到這份備份");
    return;
  }

  if (!confirm(`確定還原這份備份嗎？
${backup.time}`)) {
    return;
  }

  try {
    isRestoringBackup = true;
    db = {
      ...structuredClone(defaultData),
      ...JSON.parse(backup.data)
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    isRestoringBackup = false;
    renderAll();
    alert("已還原備份");
  } catch {
    isRestoringBackup = false;
    alert("還原失敗");
  }
}

function deleteAutoBackup(id) {
  if (!confirm("確定刪除這份自動備份嗎？")) return;

  const backups = getAutoBackups().filter(item => item.id !== id);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
  renderAutoBackups();
}

function byId(collection, id) {
  return db[collection].find(item => item.id === id);
}

function nameOf(collection, id) {
  const item = byId(collection, id);
  return item ? item.name : "未設定";
}

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
    box.innerHTML += `
      <div class="list-item">
        <strong>${escapeHtml(item.name || "未命名")}</strong>
        <button class="small-btn edit-btn" onclick="renameMaster('${collection}','${item.id}')">編輯</button>
        <button class="small-btn delete-btn" onclick="deleteMaster('${collection}','${item.id}')">刪除</button>
      </div>
    `;
  });
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
  return `${nameOf("artists", order.artistId)}｜${nameOf("channels", order.channelId)}｜${nameOf("albumTypes", order.albumTypeId)}｜${order.batch}${order.orderStartDate || order.orderEndDate ? "｜下單 " + orderPeriodText(order) : ""}${order.fansignDate ? "｜簽售 " + order.fansignDate : ""}${order.fansignTime ? " " + order.fansignTime : ""}`;
}

function channelOrderShort(order) {
  return {
    artist: nameOf("artists", order.artistId),
    channel: nameOf("channels", order.channelId),
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
          <button class="pay-toggle ${order.shipped ? "primary-btn" : "secondary-btn"}" onclick="toggleShipped('${order.id}')">
            ${order.shipped ? "🚚" : "📦"}
          </button>
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

function openBuyerOrderForm(editId = "") {
  if (db.channelOrders.length === 0) {
    alert("請先新增通路訂單");
    return;
  }

  const order = db.buyerOrders.find(o => o.id === editId) || {};
  const buyerName = order.buyerId ? nameOf("buyers", order.buyerId) : "";
  const selectedChannelOrder = order.channelOrderId ? byId("channelOrders", order.channelOrderId) : db.channelOrders[0];

  openModal(editId ? "編輯購買人訂單" : "新增購買人訂單", `
    <div class="form-field">
      <label>購買人</label>
      <input id="boBuyerSearch" placeholder="輸入購買人姓名，例如 李" value="${escapeAttr(buyerName)}" oninput="renderBuyerSuggestions()" onfocus="renderBuyerSuggestions()">
      <div id="buyerSuggestionBox" class="suggestion-box"></div>
      <p class="muted">輸入關鍵字會即時篩選；找不到會自動新增。</p>
    </div>

    <div class="form-field">
      <label>對應通路訂單</label>
      <input id="boChannelSearch" placeholder="搜尋藝人 / 通路 / 批次" value="${escapeAttr(selectedChannelOrder ? channelOrderLabel(selectedChannelOrder) : "")}" oninput="renderChannelOrderSuggestions()" onfocus="renderChannelOrderSuggestions()">
      <input type="hidden" id="boChannelOrderId" value="${selectedChannelOrder ? selectedChannelOrder.id : ""}">
      <div id="channelOrderSuggestionBox" class="suggestion-box"></div>
      <div id="selectedChannelHint" class="selected-hint">${selectedChannelOrder ? escapeHtml(channelOrderLabel(selectedChannelOrder)) : "尚未選擇通路訂單"}</div>
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
  const matched = db.channelOrders
    .filter(order => includesText(channelOrderLabel(order), q))
    .slice(0, 12);

  if (matched.length === 0) {
    box.innerHTML = `<div class="suggestion-item"><div class="suggestion-secondary">找不到通路訂單</div></div>`;
    return;
  }

  box.innerHTML = matched.map(order => {
    const used = registeredQty(order.id);
    const remain = Number(order.totalQty) - used;

    return `
      <div class="suggestion-item" onclick="selectChannelOrder('${order.id}')">
        <div class="suggestion-primary">${escapeHtml(channelOrderLabel(order))}</div>
        <div class="suggestion-secondary">總 ${order.totalQty}｜已登記 ${used}｜剩餘 ${remain}｜${escapeHtml(order.status)}</div>
      </div>
    `;
  }).join("");
}

function selectChannelOrder(id) {
  const order = byId("channelOrders", id);
  if (!order) return;

  document.getElementById("boChannelOrderId").value = id;
  document.getElementById("boChannelSearch").value = channelOrderLabel(order);
  document.getElementById("selectedChannelHint").innerHTML = escapeHtml(channelOrderLabel(order));
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
    note,
    createdAt: editId ? byId("buyerOrders", editId).createdAt : now(),
    updatedAt: now()
  };

  if (editId) db.buyerOrders = db.buyerOrders.map(o => o.id === editId ? data : o);
  else db.buyerOrders.push(data);

  saveData();
  closeModal();
  renderAll();
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
  return Boolean(order.paid && order.shipped);
}

function toggleShipped(id) {
  const order = byId("buyerOrders", id);
  if (!order) return;
  order.shipped = !order.shipped;
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
      <span class="badge blue">${order.qty} 張</span>\n      <span class="badge amount-badge">${money(order.amount)}</span>
      <button class="pay-toggle ${order.paid ? "primary-btn" : "danger-btn"}" onclick="togglePaid('${order.id}')">
        ${order.paid ? "✅ 已付款" : "❌ 未付款"}
      </button>
      <button class="ship-toggle ${order.shipped ? "primary-btn" : "secondary-btn"}" onclick="toggleShipped('${order.id}')">
        ${order.shipped ? "🚚 已出貨" : "📦 未出貨"}
      </button>
      ${isBuyerOrderArchived(order) ? `<p class="archived-note">已付款且已出貨，已進入封存</p>` : ""}
      ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}
      <div class="button-row">
        <button class="secondary-btn" onclick="openBuyerOrderForm('${order.id}')">編輯</button>
        <button class="danger-btn" onclick="deleteBuyerOrder('${order.id}')">刪除</button>
      </div>
    </div>
  `;
}

function renderBuyerOrders() {
  const box = document.getElementById("buyerOrderList");
  const q = document.getElementById("buyerOrderSearch")?.value.trim() || "";
  if (!box) return;

  box.innerHTML = "";

  const filtered = db.buyerOrders.filter(order => {
    const archived = isBuyerOrderArchived(order);

    if (buyerOrderFilter === "active" && archived) return false;
    if (buyerOrderFilter === "unpaid" && (order.paid || archived)) return false;
    if (buyerOrderFilter === "paid" && (!order.paid || archived)) return false;
    if (buyerOrderFilter === "archived" && !archived) return false;

    const co = byId("channelOrders", order.channelOrderId);
    const buyer = nameOf("buyers", order.buyerId);
    const text = `${buyer} ${co ? channelOrderLabel(co) : ""}`;
    return includesText(text, q);
  });

  if (filtered.length === 0) {
    box.innerHTML = `<div class="card"><p class="muted">尚無購買人訂單</p></div>`;
    return;
  }

  if (q) {
    box.innerHTML = filtered.map(order => renderBuyerOrderCard(order)).join("");
    return;
  }

  const groups = {};
  filtered.forEach(order => {
    if (!groups[order.buyerId]) {
      groups[order.buyerId] = [];
    }
    groups[order.buyerId].push(order);
  });

  const collapsed = getCollapsedBuyerGroups();

  Object.keys(groups).forEach(buyerId => {
    const orders = groups[buyerId];
    const totalQty = orders.reduce((sum, order) => sum + Number(order.qty), 0);
    const unpaidCount = orders.filter(order => !order.paid).length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
    const isCollapsed = collapsed[buyerId];

    box.innerHTML += `
      <div class="buyer-group-card">
        <div class="buyer-group-header">
          <div class="buyer-group-title">👤 ${escapeHtml(nameOf("buyers", buyerId))}</div>
          <div class="buyer-group-summary">
            ${orders.length} 筆｜${totalQty} 張｜${money(totalAmount)}｜未付款 ${unpaidCount} 筆
          </div>
          <button class="buyer-group-toggle" onclick="toggleBuyerGroup('${buyerId}')">
            ${isCollapsed ? "▶ 展開訂單" : "▼ 收合訂單"}
          </button>
        </div>
        <div class="buyer-group-body" style="${isCollapsed ? "display:none;" : ""}">
          ${orders.map(order => renderBuyerOrderCard(order, true)).join("")}
        </div>
      </div>
    `;
  });
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
  const unshipped = db.buyerOrders.filter(o => !o.shipped && !isBuyerOrderArchived(o)).length;

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
  document.getElementById("backupBox").value = JSON.stringify(db, null, 2);
  alert("備份已產生，請複製保存。");
}

function importBackup() {
  try {
    const raw = document.getElementById("backupBox").value.trim();
    if (!raw) return alert("請貼上備份資料");
    isRestoringBackup = true;
    db = { ...structuredClone(defaultData), ...JSON.parse(raw) };
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
    renderAutoBackups();
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
