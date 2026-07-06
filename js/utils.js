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