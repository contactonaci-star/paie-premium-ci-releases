/* Utilitaires d'interface */
const UI = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, dec = 0) => { const v = Number(n) || 0; if (v === 0) return "-"; return v.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ | /g, " "); };
  const fmt0 = (n) => (Number(n) || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 }).replace(/ | /g, " ");
  const money = (n) => fmt0(n) + " FCFA";
  const pct = (x, d = 2) => (Number(x) ? (x * 100).toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }) + " %" : "-");
  const fmtD = (s) => { if (!s) return ""; const [y, m, d] = String(s).slice(0, 10).split("-"); return d && m && y ? `${d}/${m}/${y}` : s; };
  const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const perLabel = (p) => { const [y, m] = p.split("-").map(Number); return `${MOIS[m - 1]} ${y}`; };
  const perShort = (p) => { const [y, m] = p.split("-").map(Number); return `${MOIS[m - 1].slice(0, 4)}. ${String(y).slice(2)}`; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

  const I = {
    dash: '<path d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z"/>',
    company: '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    swap: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    calc: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    gift: '<path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
    coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1.1 1.7 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2A2.5 2 0 0 1 9.5 15M12 6v1.5M12 16.5V18"/>',
    exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    archive: '<path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15h6M12 12v6"/>',
    xls: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
    trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
    up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    wallet: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v8M18 9h2a2 2 0 0 1 2 2v11M10 6h4M10 10h4M10 14h4M10 18h4"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    brain: '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-2.16M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-2.16"/>',
    trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    bank: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 2 7 22 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    chartbar: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    trendingup: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>'
  };
  const ico = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n] || ""}</svg>`;

  function toast(msg, type = "") {
    const t = document.createElement("div"); t.className = "toast " + type; t.textContent = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), 3500);
  }

  function modal({ title, body, size = "", buttons = [{ label: "Fermer", value: null }], onOpen }) {
    return new Promise((resolve) => {
      const root = $("#modalRoot");
      const bg = document.createElement("div"); bg.className = "modal-bg";
      bg.innerHTML = `<div class="modal ${size}"><div class="modal-h"><span>${title}</span><button class="x">×</button></div><div class="modal-b">${body}</div><div class="modal-f"></div></div>`;
      const close = (v) => { document.removeEventListener("keydown", onEsc); bg.remove(); resolve(v); };
      const onEsc = (e) => { if (e.key === "Escape") close(null); };
      document.addEventListener("keydown", onEsc);
      $(".x", bg).onclick = () => close(null);
      const f = $(".modal-f", bg);
      buttons.forEach((b) => {
        const el = document.createElement("button"); el.className = "btn " + (b.cls || ""); el.innerHTML = b.label;
        el.onclick = () => { if (b.validate && !b.validate(bg)) return; close(typeof b.value === "function" ? b.value(bg) : b.value); };
        f.appendChild(el);
      });
      root.appendChild(bg);
      if (onOpen) onOpen(bg);
      const first = $("input,select", bg); if (first) first.focus();
    });
  }
  const confirm = (title, msg, okLabel = "Confirmer", cls = "btn-primary") => modal({ title, body: `<p>${msg}</p>`, size: "sm", buttons: [{ label: "Annuler", value: false }, { label: okLabel, value: true, cls }] });

  /* Graphiques */
  const charts = [];
  const PAL = ["#22396a", "#f28c28", "#12925b", "#d13b3b", "#7c3aed", "#0ea5e9", "#c9a100", "#ec4899", "#64748b", "#14b8a6", "#a16207", "#4f46e5"];
  function chart(canvas, cfg) {
    if (!window.Chart) return null;
    Chart.defaults.font.family = '"Segoe UI", system-ui, Arial';
    Chart.defaults.color = "#5b6478";
    const c = new Chart(canvas, cfg); charts.push(c); return c;
  }
  function destroyCharts() { while (charts.length) charts.pop().destroy(); }
  const moneyTick = (v) => { const a = Math.abs(v); return a >= 1e6 ? (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M" : a >= 1e3 ? (v / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " k" : v; };
  const tipMoney = { callbacks: { label: (c) => ` ${c.dataset.label ? c.dataset.label + " : " : (c.label ? c.label + " : " : "")}${fmt0(c.parsed.y ?? c.parsed.x ?? c.parsed)} ${c.chart.config._unit || "FCFA"}` } };

  /* Tableau générique avec recherche, tri, total, export */
  function table(el, { columns, rows, total = false, search = true, exportName, toolbarExtra = "", rowClick, empty = "Aucune donnée", maxH }) {
    let sortKey = null, sortDir = 1, q = "";
    el.innerHTML = `<div class="toolbar">${search ? `<input class="search" placeholder="Rechercher…">` : ""}${toolbarExtra}<div class="spacer"></div>${exportName ? `<button class="btn btn-sm" data-x>${ico("xls")} Exporter Excel</button>` : ""}<span class="hint" data-count></span></div><div class="tbl-wrap" ${maxH ? `style="max-height:${maxH}"` : ""}></div>`;
    const wrap = $(".tbl-wrap", el);
    const cell = (c, r) => { const v = typeof c.get === "function" ? c.get(r) : r[c.key]; return v; };
    const show = (c, r) => { const v = cell(c, r); if (c.render) return c.render(r, v); if (c.money) return fmt(v); if (c.pct) return pct(v); if (c.date) return fmtD(v); return esc(v); };
    function draw() {
      let data = rows.filter((r) => !q || columns.some((c) => String(cell(c, r) ?? "").toLowerCase().includes(q)));
      if (sortKey) { const c = columns.find((x) => x.key === sortKey); data = [...data].sort((a, b) => { const x = cell(c, a), y = cell(c, b); return (typeof x === "number" && typeof y === "number" ? x - y : String(x ?? "").localeCompare(String(y ?? ""), "fr")) * sortDir; }); }
      const th = columns.map((c) => `<th class="${c.money || c.num || c.pct ? "num" : ""} ${c.sortable !== false ? "sortable" : ""} ${c.sticky ? "sticky-col" : ""}" data-k="${c.key}">${c.label}${sortKey === c.key ? (sortDir > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
      const body = data.map((r, i) => `<tr data-i="${rows.indexOf(r)}" ${rowClick ? 'style="cursor:pointer"' : ""}>${columns.map((c) => `<td class="${c.money || c.num || c.pct ? "num" : ""} ${c.strong ? "strong" : ""} ${c.sticky ? "sticky-col" : ""}">${show(c, r) ?? ""}</td>`).join("")}</tr>`).join("");
      let foot = "";
      if (total && data.length) foot = `<tfoot><tr>${columns.map((c, i) => `<td class="${c.money || c.num ? "num" : ""}">${i === 0 ? "TOTAL" : (c.money || c.sum) ? fmt(data.reduce((s, r) => s + (Number(cell(c, r)) || 0), 0)) : ""}</td>`).join("")}</tr></tfoot>`;
      wrap.innerHTML = data.length ? `<table class="tbl"><thead><tr>${th}</tr></thead><tbody>${body}</tbody>${foot}</table>` : `<div style="padding:40px;text-align:center;color:var(--muted)">${empty}</div>`;
      const cnt = $("[data-count]", el); if (cnt) cnt.textContent = `${data.length} ligne(s)`;
      $$("th.sortable", wrap).forEach((h) => h.onclick = () => { const k = h.dataset.k; if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; } draw(); });
      if (rowClick) $$("tbody tr", wrap).forEach((tr) => tr.onclick = (e) => { if (e.target.closest("button,input,select,a")) return; rowClick(rows[tr.dataset.i]); });
      el._data = data;
    }
    if (search) $(".search", el).oninput = (e) => { q = e.target.value.toLowerCase(); draw(); };
    if (exportName) $("[data-x]", el).onclick = () => {
      const data = el._data || rows;
      const aoa = [columns.map((c) => c.label.replace(/<[^>]+>/g, ""))].concat(data.map((r) => columns.map((c) => { const v = cell(c, r); return c.date ? fmtD(v) : v ?? ""; })));
      if (total) aoa.push(columns.map((c, i) => i === 0 ? "TOTAL" : (c.money || c.sum) ? data.reduce((s, r) => s + (Number(cell(c, r)) || 0), 0) : ""));
      exportXLSX(exportName, [{ name: exportName.slice(0, 30), aoa }]);
    };
    draw();
    return { redraw: draw };
  }

  async function exportXLSX(name, sheets) {
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => { const ws = XLSX.utils.aoa_to_sheet(s.aoa); ws["!cols"] = (s.aoa[0] || []).map((_, i) => ({ wch: Math.min(40, Math.max(10, ...s.aoa.slice(0, 50).map((r) => String(r[i] ?? "").length + 2))) })); XLSX.utils.book_append_sheet(wb, ws, s.name.replace(/[\\/?*[\]:]/g, "").slice(0, 31)); });
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const file = name.replace(/[\\/:*?"<>|]/g, "_") + ".xlsx";
    if (window.api) { const p = await window.api.saveFile({ name: file, data: out, filters: [{ name: "Excel", extensions: ["xlsx"] }] }); if (p) toast("Fichier Excel enregistré", "ok"); }
    else { const b = new Blob([out]); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = file; a.click(); }
  }

  /* Impression / PDF de documents */
  async function printDocs(html, { pdfName, landscape } = {}) {
    const pa = $("#printArea");
    pa.innerHTML = `<style>@page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 10mm; }</style>` + html;
    await new Promise((r) => setTimeout(r, 120));
    try {
      if (pdfName && window.api) { const p = await window.api.savePDF({ name: pdfName + ".pdf", landscape }); if (p) toast("PDF enregistré et ouvert", "ok"); }
      else if (window.api) await window.api.print();
      else window.print();
    } finally { setTimeout(() => (pa.innerHTML = ""), 500); }
  }

  const avatarColor = (s) => PAL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PAL.length];
  const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase();

  // Carte KPI réutilisable dans toutes les pages
  // opts : { color, icon, delta, unit }
  const kpiCard = (label, value, opts = {}) => {
    const { color = "", icon = "", delta = "", unit = "" } = opts;
    return `<div class="card kpi">
      ${icon ? `<div class="ico" style="background:${color}18;color:${color}">${ico(icon)}</div>` : ""}
      <div class="lbl">${label}</div>
      <div class="val"${color ? ` style="color:${color}"` : ""}>${esc(String(value))} <small>${unit}</small></div>
      ${delta}
    </div>`;
  };
  // Ligne de récapitulatif (libellé + montant) utilisée dans les fiches de rupture, bulletins, etc.
  const statRow = (label, value, opts = {}) => {
    const { bold = false, color = "", note = "" } = opts;
    return `<div class="stat-row"><span${bold ? ' style="font-weight:700"' : ""}>${label}${note ? `<br><small class="hint">${note}</small>` : ""}</span><span${color ? ` style="color:${color}"` : ""}>${bold ? `<b>${esc(String(value))}</b>` : esc(String(value))}</span></div>`;
  };

  return { $, $$, esc, fmt, fmt0, money, pct, fmtD, MOIS, perLabel, perShort, uid, todayISO, ico, toast, modal, confirm, chart, destroyCharts, PAL, moneyTick, tipMoney, table, exportXLSX, printDocs, avatarColor, initials, kpiCard, statRow };
})();
