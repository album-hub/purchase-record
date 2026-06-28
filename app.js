// Fansign Manager v3.0 Base

const STORAGE_KEY = "fansign_manager_v3";

function now() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const defaultData = {
  artists: [
    { id: "artist_1", name: "Yuju", note: "", createdAt: now(), updatedAt: now() },
    { id: "artist_2", name: "Yerin", note: "", createdAt: now(), updatedAt: now() }
  ],

  channels: [
    { id: "channel_1", name: "Soundwave", note: "", createdAt: now(), updatedAt: now() },
    { id: "channel_2", name: "Makestar", note: "", createdAt: now(), updatedAt: now() }
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

  if (!raw) {
    return structuredClone(defaultData);
  }

  try {
    return {
      ...structuredClone(defaultData),
      ...JSON.parse(raw)
    };
  } catch (error) {
    alert("資料讀取失敗，系統會使用空白資料。");
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
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

// 頁面切換

function switchPage(page, btn) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(`page-${page}`).classList.add("active");

  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");

  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 共用資料管理：藝人、通路、專輯類型、購買人

function addMaster(collection, inputId) {
  const input = document.getElementById(inputId);
  const name = input.value.trim();

  if (!name) {
    alert("請輸入名稱");
    return;
  }

  if (db[collection].some(item => item.name === name)) {
    alert("這個名稱已存在");
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

  const clean = newName.trim();

  if (db[collection].some(i => i.id !== id && i.name === clean)) {
    alert("這個名稱已存在");
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
  if (collection === "artists") {
    return db.channelOrders.some(o => o.artistId === id);
  }

  if (collection === "channels") {
    return db.channelOrders.some(o => o.channelId === id);
  }

  if (collection === "albumTypes") {
    return db.channelOrders.some(o => o.albumTypeId === id);
  }

  if (collection === "buyers") {
    return db.buyerOrders.some(o => o.buyerId === id);
  }

  return false;
}

function renderMasterList(collection, elementId) {
  const box = document.getElementById(elementId);
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

// 表單選項

function optionList(collection, selectedId = "") {
  return db[collection].map(item => `
    <option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>
      ${escapeHtml(item.name)}
    </option>
  `).join("");
}

// Modal

function openModal(title, html) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = html;
  document.getElementById("modal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modal").classList.add("hidden");
}

// 通路訂單

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

  if (duplicate) {
    alert("這筆通路訂單已存在");
    return;
  }

  if (editId) {
    db.channelOrders = db.channelOrders.map(o => o.id === editId ? data : o);
  } else {
    db.channelOrders.push(data);
  }

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

function channelOrderLabel(order) {
  return `${nameOf("artists", order.artistId)}｜${nameOf("channels", order.channelId)}｜${nameOf("albumTypes", order.albumTypeId)}｜${order.batch}${order.fansignDate ? "｜" + order.fansignDate : ""}${order.fansignTime ? " " + order.fansignTime : ""}`;
}

function registeredQty(channelOrderId) {
  return db.buyerOrders
    .filter(o => o.channelOrderId === channelOrderId)
    .reduce((sum, o) => sum + Number(o.qty), 0);
}

function renderChannelOrders() {
  const box = document.getElementById("channelOrderList");
  box.innerHTML = "";

  if (db.channelOrders.length === 0) {
    box.innerHTML = `<div class="card"><p class="muted">尚無通路訂單</p></div>`;
    return;
  }

  db.channelOrders.forEach(order => {
    const used = registeredQty(order.id);
    const remain = order.totalQty - used;

    box.innerHTML += `
      <div class="order-card">
        <div class="order-title">${escapeHtml(channelOrderLabel(order))}</div>

        <span class="badge orange">${escapeHtml(order.status)}</span>
        <span class="badge blue">總下單 ${order.totalQty}</span>
        <span class="badge green">已登記 ${used}</span>
        <span class="badge ${remain < 0 ? "red" : "blue"}">剩餘 ${remain}</span>

        ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}

        <div class="row" style="margin-top:10px;">
          <button class="secondary-btn" onclick="openChannelOrderForm('${order.id}')">編輯</button>
          <button class="danger-btn" onclick="deleteChannelOrder('${order.id}')">刪除</button>
        </div>
      </div>
    `;
  });
}

// 購買人訂單

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
      <input id="boBuyerSearch" list="buyerOptions" placeholder="輸入或選擇購買人" value="${escapeAttr(buyerName)}">
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
  const channelOrderId = document.getElementById("boChannelOrder").value;
  const qty = Number(document.getElementById("boQty").value || 0);
  const paid = document.getElementById("boPaid").value === "true";
  const note = document.getElementById("boNote").value.trim();

  if (!buyerName || !channelOrderId || !qty) {
    alert("購買人、通路訂單、數量都要填");
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

  if (editId) {
    db.buyerOrders = db.buyerOrders.map(o => o.id === editId ? data : o);
  } else {
    db.buyerOrders.push(data);
  }

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

        <p class="muted">${co ? escapeHtml(channelOrderLabel(co)) : "通路訂單不存在"}</p>

        <span class="badge blue">${order.qty} 張</span>

        <button class="pay-toggle ${order.paid ? "primary-btn" : "danger-btn"}" onclick="togglePaid('${order.id}')">
          ${order.paid ? "✅" : "❌"}
        </button>

        ${order.note ? `<p class="muted">備註：${escapeHtml(order.note)}</p>` : ""}

        <div class="row" style="margin-top:10px;">
          <button class="secondary-btn" onclick="openBuyerOrderForm('${order.id}')">編輯</button>
          <button class="danger-btn" onclick="deleteBuyerOrder('${order.id}')">刪除</button>
        </div>
      </div>
    `;
  });
}

// 首頁與搜尋

function renderHome() {
  document.getElementById("statBuyers").textContent = db.buyers.length;
  document.getElementById("statOrders").textContent = db.buyerOrders.length;
  document.getElementById("statUnpaid").textContent = db.buyerOrders.filter(o => !o.paid).length;
  document.getElementById("statChannelOrders").textContent = db.channelOrders.length;

  const alerts = document.getElementById("homeAlerts");
  const unpaid = db.buyerOrders.filter(o => !o.paid).length;
  const notOrdered = db.channelOrders.filter(o => o.status === "未下單").length;
  const notArrived = db.channelOrders.filter(o => o.status === "未到貨").length;

  alerts.innerHTML = `
    <p><span class="badge red">未付款 ${unpaid}</span></p>
    <p><span class="badge orange">未下單通路 ${notOrdered}</span></p>
    <p><span class="badge blue">未到貨通路 ${notArrived}</span></p>
  `;
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
    if (b.name.includes(q)) {
      results.push(`👤 ${b.name}`);
    }
  });

  db.channelOrders.forEach(o => {
    const label = channelOrderLabel(o);
    if (label.includes(q)) {
      results.push(`📦 ${label}`);
    }
  });

  db.buyerOrders.forEach(o => {
    const co = byId("channelOrders", o.channelOrderId);
    const text = `${nameOf("buyers", o.buyerId)} ${co ? channelOrderLabel(co) : ""}`;
    if (text.includes(q)) {
      results.push(`🛒 ${text}`);
    }
  });

  box.innerHTML = `
    <div class="card">
      ${results.length ? results.map(r => `<p>${escapeHtml(r)}</p>`).join("") : "<p class='muted'>找不到結果</p>"}
    </div>
  `;
}

// 備份還原

function exportBackup() {
  document.getElementById("backupBox").value = JSON.stringify(db, null, 2);
  alert("備份已產生，請複製保存。");
}

function importBackup() {
  try {
    const raw = document.getElementById("backupBox").value.trim();

    if (!raw) {
      alert("請貼上備份資料");
      return;
    }

    db = {
      ...structuredClone(defaultData),
      ...JSON.parse(raw)
    };

    saveData();
    renderAll();
    alert("還原成功");
  } catch (error) {
    alert("還原失敗，請確認格式");
  }
}

function clearAll() {
  if (!confirm("確定清空全部資料嗎？這不能復原。")) return;

  db = structuredClone(defaultData);
  saveData();
  renderAll();
}

// 總渲染

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
