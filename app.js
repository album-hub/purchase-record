// Fansign Manager v3.2

const STORAGE_KEY = "fansign_manager_v3";
const BACKUP_KEY = "fansign_manager_v3_backups";
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

function escapeAttr(text) {
  return escapeHtml(text).replace(/`/g, "&#96;");
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
  const name = input.value.trim();
  if (!name) return alert("請輸入名稱");
  if (db[collection].some(item => item.name === name)) return alert("這個名稱已存在");

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
  const clean = newName.trim();
  if (db[collection].some(i => i.id !== id && i.name === clean)) return alert("這個名稱已存在");
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

  if (db[collection].length === 0) {
    box.innerHTML = `<p class="muted">尚無資料</p>`;
    return;
  }

  db[collection].forEach(item => {
    box.innerHTML += `
      <div class="list-item">
        <strong>${escapeHtml(item.name)}</strong>
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
    o.batch === data.batch &&
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

function channelOrderLabel(order) {
  return `${nameOf("artists", order.artistId)}｜${nameOf("channels", order.channelId)}｜${nameOf("albumTypes", order.albumTypeId)}｜${order.batch}${order.fansignDate ? "｜" + order.fansignDate : ""}${order.fansignTime ? " " + order.fansignTime : ""}`;
}

function channelOrderShort(order) {
  return {
    artist: nameOf("artists", order.artistId),
    channel: nameOf("channels", order.channelId),
    type: nameOf("albumTypes", order.albumTypeId),
    batch: order.batch,
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

function renderChannelOrders() {
  const box = document.getElementById("channelOrderList");
  const q = document.getElementById("channelOrderSearch")?.value.trim() || "";
  if (!box) return;
  box.innerHTML = "";

  const filtered = db.channelOrders.filter(order => {
    const text = channelOrderLabel(order);
    return !q || text.includes(q);
  });

  if (filtered.length === 0) {
    box.innerHTML = `<div class="card"><p class="muted">尚無通路訂單</p></div>`;
    return;
  }

  filtered.forEach(order => {
    const info = channelOrderShort(order);
    const used = registeredQty(order.id);
    const remain = order.totalQty - used;

    box.innerHTML += `
      <div class="order-card">
        <div class="order-title">🎤 ${escapeHtml(info.artist)}</div>
        <div class="order-subtitle">
          🏪 ${escapeHtml(info.channel)}<br>
          💿 ${escapeHtml(info.type)}｜📦 ${escapeHtml(info.batch)}<br>
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

        <div class="button-row">
          <button class="secondary-btn" onclick="openChannelOrderForm('${order.id}')">編輯</button>
          <button class="danger-btn" onclick="deleteChannelOrder('${order.id}')">刪除</button>
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

  openModal(editId ? "編輯購買人訂單" : "新增購買人訂單", `
    <div class="form-field">
      <label>購買人</label>
      <input id="boBuyerSearch" list="buyerOptions" placeholder="輸入或選擇購買人" value="${escapeAttr(buyerName)}"><p class="muted">輸入姓名時可用關鍵字搜尋，找不到會自動新增。</p>
      <datalist id="buyerOptions">
        ${db.buyers.map(b => `<option value="${escapeAttr(b.name)}"></option>`).join("")}
      </datalist>
    </div>

    <div class="form-field">
      <label>對應通路訂單</label>
      <select id="boChannelOrder">
        ${db.channelOrders.map(co => `
          <option value="${co.id}" ${co.id === order.channelOrderId ? "selected" : ""}>
            ${escapeHtml(channelOrderLabel(co))}
          </option>
        `).join("")}
      </select>
    </div>

    <div class="form-field">
      <label>數量</label>
      <input id="boQty" type="number" min="1" value="${order.qty ?? ""}" placeholder="例如 2">
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
}

function findOrCreateBuyer(name) {
  const clean = name.trim();
  let buyer = db.buyers.find(b => b.name === clean);
  if (!buyer) {
    buyer = { id: uid("buyer"), name: clean, note: "", createdAt: now(), updatedAt: now() };
    db.buyers.push(buyer);
  }
  return buyer;
}

function saveBuyerOrder(editId = "") {
  const buyerName = document.getElementById("boBuyerSearch").value.trim();
  const channelOrderId = document.getElementById("boChannelOrder").value;
  const qty = Number(document.getElementById("boQty").value || 0);
  const paid = document.getElementById("boPaid").value === "true";
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
    paid,
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

function deleteBuyerOrder(id) {
  if (!confirm("確定刪除這筆購買人訂單嗎？")) return;
  db.buyerOrders = db.buyerOrders.filter(o => o.id !== id);
  saveData();
  renderAll();
}

function renderBuyerOrders() {
  const box = document.getElementById("buyerOrderList");
  const q = document.getElementById("buyerOrderSearch")?.value.trim() || "";
  if (!box) return;
  box.innerHTML = "";

  const filtered = db.buyerOrders.filter(order => {
    const co = byId("channelOrders", order.channelOrderId);
    const buyer = nameOf("buyers", order.buyerId);
    const text = `${buyer} ${co ? channelOrderLabel(co) : ""}`;
    return !q || text.includes(q);
  });

  if (filtered.length === 0) {
    box.innerHTML = `<div class="card"><p class="muted">尚無購買人訂單</p></div>`;
    return;
  }

  filtered.forEach(order => {
    const co = byId("channelOrders", order.channelOrderId);
    box.innerHTML += `
      <div class="order-card">
        <div class="order-title">👤 ${escapeHtml(nameOf("buyers", order.buyerId))}</div>
        <p class="order-subtitle">${co ? escapeHtml(channelOrderLabel(co)) : "通路訂單不存在"}</p>
        <span class="badge blue">${order.qty} 張</span>
        <button class="pay-toggle ${order.paid ? "primary-btn" : "danger-btn"}" onclick="togglePaid('${order.id}')">
          ${order.paid ? "✅ 已付款" : "❌ 未付款"}
        </button>
        ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}
        <div class="button-row">
          <button class="secondary-btn" onclick="openBuyerOrderForm('${order.id}')">編輯</button>
          <button class="danger-btn" onclick="deleteBuyerOrder('${order.id}')">刪除</button>
        </div>
      </div>
    `;
  });
}

function renderHome() {
  document.getElementById("statOrders").textContent = db.buyerOrders.length;
  document.getElementById("statUnpaid").textContent = db.buyerOrders.filter(o => !o.paid).length;
  document.getElementById("statChannelOrders").textContent = db.channelOrders.length;
  document.getElementById("statNotArrived").textContent = db.channelOrders.filter(o => o.status === "未到貨").length;

  const alerts = document.getElementById("homeAlerts");
  const unpaid = db.buyerOrders.filter(o => !o.paid).length;
  const notOrdered = db.channelOrders.filter(o => o.status === "未下單").length;
  const notArrived = db.channelOrders.filter(o => o.status === "未到貨").length;

  alerts.innerHTML = `
    <p><span class="badge red">未付款 ${unpaid}</span></p>
    <p><span class="badge orange">未下單通路 ${notOrdered}</span></p>
    <p><span class="badge blue">未到貨通路 ${notArrived}</span></p>
  `;

  renderUpcomingFansigns();
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
    if (b.name.includes(q)) results.push(`👤 ${b.name}`);
  });

  db.channelOrders.forEach(o => {
    const label = channelOrderLabel(o);
    if (label.includes(q)) results.push(`📦 ${label}`);
  });

  db.buyerOrders.forEach(o => {
    const co = byId("channelOrders", o.channelOrderId);
    const text = `${nameOf("buyers", o.buyerId)} ${co ? channelOrderLabel(co) : ""}`;
    if (text.includes(q)) results.push(`🛒 ${text}`);
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
  renderHome();
  renderMasterList("artists", "artistList");
  renderMasterList("channels", "channelList");
  renderMasterList("albumTypes", "albumTypeList");
  renderMasterList("buyers", "buyerList");
  renderChannelOrders();
  renderBuyerOrders();
  renderSearch();
  saveData();
}

renderAll();
