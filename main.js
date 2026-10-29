const { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const { autoUpdater } = require("electron-updater");

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');

let win;
let _lockCapture = false;
const dataDir = () => path.join(app.getPath("userData"), "donnees");
const dataFile = () => path.join(dataDir(), "paie-data.json");
const backupDir = () => path.join(dataDir(), "sauvegardes-auto");
const histFile = (year) => path.join(dataDir(), `historique-${year}.json`);

function ensureDirs() {
  fs.mkdirSync(dataDir(), { recursive: true });
  fs.mkdirSync(backupDir(), { recursive: true });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    title: "Paie Premium CI", backgroundColor: "#0f1b33", show: false,
    icon: path.join(__dirname, "renderer", "assets", "icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, sandbox: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.once("ready-to-show", () => {
    win.maximize();
    win.setAlwaysOnTop(true);
    win.show();
    win.focus();
    win.webContents.focus();
    setTimeout(() => {
      win.setAlwaysOnTop(false);
      win.focus();
      win.webContents.focus();
    }, 200);
    // Simule un clic en haut de la fenêtre pour obtenir le focus clavier Windows
    setTimeout(() => {
      if (!win || win.isDestroyed()) return;
      const b = win.getContentBounds();
      win.webContents.sendInputEvent({ type: 'mouseDown', x: Math.floor(b.width / 2), y: 8, button: 'left', clickCount: 1 });
      win.webContents.sendInputEvent({ type: 'mouseUp', x: Math.floor(b.width / 2), y: 8, button: 'left', clickCount: 1 });
      // Puis focus le champ de saisie
      win.webContents.executeJavaScript(
        '(function(){var e=document.getElementById("lpw")||document.getElementById("luser")||document.getElementById("sn");if(e)e.focus();})()'
      ).catch(function(){});
    }, 600);
  });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("before-input-event", (e, input) => {
    if (input.key === "F12" && input.control && input.shift) win.webContents.toggleDevTools();
    if (input.type === "keyDown" && input.control && !input.shift && input.key.toLowerCase() === "r") win.webContents.reload();
    // Capture clavier pour l'écran de verrouillage (contourne le bug de focus Windows)
    if (_lockCapture && input.type === "keyDown") {
      const isChar  = input.key.length === 1 && !input.control && !input.alt;
      const isBS    = input.key === "Backspace";
      const isEnter = input.key === "Enter";
      const isTab   = input.key === "Tab";
      const isPaste = input.control && input.key.toLowerCase() === "v";
      if (isChar || isBS || isEnter || isTab || isPaste) {
        e.preventDefault();
        win.webContents.send("lock:key", { key: input.key, ctrl: input.control, shift: input.shift });
      }
    }
  });
}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
app.on("window-all-closed", () => app.quit());

autoUpdater.on("update-available", () => {
  win?.webContents.send("update:available");
});
autoUpdater.on("update-downloaded", () => {
  dialog.showMessageBox(win, {
    type: "info",
    title: "Mise à jour disponible",
    message: "Une nouvelle version de Paie Premium CI a été téléchargée. L'application va redémarrer pour appliquer la mise à jour.",
    buttons: ["Redémarrer maintenant", "Plus tard"]
  }).then(({ response }) => {
    if (response === 0) autoUpdater.quitAndInstall();
  });
});
ipcMain.handle("clipboard:read", () => clipboard.readText());
ipcMain.handle("lock:capture", (_e, on) => { _lockCapture = !!on; });
ipcMain.handle("dialog:password", async () => {
  const r = await dialog.showInputBox ? dialog.showInputBox({ message: "Mot de passe" }) : { response: 0, checkboxChecked: false };
  return null;
});

ipcMain.handle("data:load", () => {
  ensureDirs();
  let main = null;
  try { main = fs.existsSync(dataFile()) ? JSON.parse(fs.readFileSync(dataFile(), "utf8")) : null; }
  catch (_) { main = null; }
  if (!main) {
    // fichier principal corrompu : tenter la dernière sauvegarde automatique
    const files = fs.readdirSync(backupDir()).filter((f) => f.endsWith(".json")).sort().reverse();
    for (const f of files) { try { return JSON.parse(fs.readFileSync(path.join(backupDir(), f), "utf8")); } catch (_) {} }
    return null;
  }
  // Charger les fichiers historique-YYYY.json et les fusionner
  const histFromMain = Array.isArray(main.historique) ? main.historique : [];
  const yearlyHist = [];
  try {
    fs.readdirSync(dataDir()).filter((f) => /^historique-\d{4}\.json$/.test(f)).forEach((hf) => {
      try { const d = JSON.parse(fs.readFileSync(path.join(dataDir(), hf), "utf8")); if (Array.isArray(d)) yearlyHist.push(...d); } catch (_) {}
    });
  } catch (_) {}
  if (yearlyHist.length > 0) {
    // Fichiers annuels disponibles : ils sont canoniques
    const seen = new Set(yearlyHist.map((h) => h.periode + "/" + h.id));
    // Ajouter les éventuels enregistrements anciens non encore migrés
    const extras = histFromMain.filter((h) => !seen.has(h.periode + "/" + h.id));
    main.historique = [...yearlyHist, ...extras].sort((a, b) => a.periode.localeCompare(b.periode));
  } else {
    main.historique = histFromMain; // format legacy : tout dans le fichier principal
  }
  return main;
});

let lastBackup = 0;
ipcMain.handle("data:save", (_e, data) => {
  ensureDirs();
  // Éclater l'historique par année dans des fichiers dédiés
  const histByYear = {};
  (data.historique || []).forEach((h) => {
    const y = (h.periode || "").slice(0, 4);
    if (!y || y.length !== 4) return;
    (histByYear[y] = histByYear[y] || []).push(h);
  });
  Object.entries(histByYear).forEach(([y, records]) => {
    const hf = histFile(y); const tmp = hf + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(records));
    fs.renameSync(tmp, hf);
  });
  // Fichier principal sans l'historique (évite le fichier JSON géant)
  const mainData = Object.assign({}, data, { historique: [] });
  const tmp = dataFile() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(mainData));
  fs.renameSync(tmp, dataFile());
  // Sauvegarde automatique complète toutes les 10 min
  const now = Date.now();
  if (now - lastBackup > 10 * 60 * 1000) {
    lastBackup = now;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    fs.writeFileSync(path.join(backupDir(), `auto-${stamp}.json`), JSON.stringify(data));
    const files = fs.readdirSync(backupDir()).filter((f) => f.endsWith(".json")).sort();
    while (files.length > 30) fs.unlinkSync(path.join(backupDir(), files.shift()));
  }
  return true;
});

ipcMain.handle("file:save", async (_e, { name, data, filters, encoding }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: filters || [] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, encoding === "utf8" ? data : Buffer.from(data));
  return r.filePath;
});

ipcMain.handle("file:open", async (_e, { filters, encoding }) => {
  const r = await dialog.showOpenDialog(win, { properties: ["openFile"], filters: filters || [] });
  if (r.canceled || !r.filePaths.length) return null;
  const buf = fs.readFileSync(r.filePaths[0]);
  return { path: r.filePaths[0], data: encoding === "utf8" ? buf.toString("utf8") : new Uint8Array(buf) };
});

ipcMain.handle("pdf:save", async (_e, { name, landscape }) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: [{ name: "PDF", extensions: ["pdf"] }] });
  if (r.canceled || !r.filePath) return null;
  const pdf = await win.webContents.printToPDF({ pageSize: "A4", landscape: !!landscape, printBackground: true, margins: { marginType: "custom", top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 } });
  fs.writeFileSync(r.filePath, pdf);
  shell.openPath(r.filePath);
  return r.filePath;
});

ipcMain.handle("print", () => new Promise((res) => win.webContents.print({ printBackground: true }, (ok) => res(ok))));
ipcMain.handle("folder:open", () => shell.openPath(dataDir()));
ipcMain.handle("app:info", () => ({ version: app.getVersion(), dataFile: dataFile() }));

// ─── Système de licences ───────────────────────────────────────────────────────
// Renseigner ces deux valeurs depuis Supabase → Settings → API, puis rebuild
const SB_URL  = "https://kgjczbwzjlkmnacuexge.supabase.co";
const SB_ANON = "sb_publishable_o33_xrksddqiWnC9lBf8Lg_mx9O6cZx";

const licenceFile   = () => path.join(dataDir(), "licence.json");
const adminCfgFile  = () => path.join(dataDir(), "admin-config.json");
const machineIdFile = () => path.join(dataDir(), "machine-id.txt");

function getMachineId() {
  try {
    const { execSync } = require("child_process");
    const guid = execSync('powershell -NoProfile -Command "(Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Cryptography).MachineGuid"', { timeout: 3000 }).toString().trim();
    if (guid && guid.length > 10) return guid;
  } catch (_) {}
  ensureDirs();
  if (fs.existsSync(machineIdFile())) return fs.readFileSync(machineIdFile(), "utf8").trim();
  const id = require("crypto").randomUUID();
  fs.writeFileSync(machineIdFile(), id, "utf8");
  return id;
}
function readAdminCfg() {
  try { return fs.existsSync(adminCfgFile()) ? JSON.parse(fs.readFileSync(adminCfgFile(), "utf8")) : null; } catch (_) { return null; }
}
async function sbFetch(endpoint, method, body, key) {
  const usedKey = key || SB_ANON;
  const res = await fetch(`${SB_URL}/rest/v1/${endpoint}`, {
    method: method || "GET",
    headers: { "apikey": usedKey, "Authorization": `Bearer ${usedKey}`, "Content-Type": "application/json", "Prefer": "return=representation" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`SB ${res.status}: ${t.slice(0, 200)}`); }
  return res.json().catch(() => null);
}

ipcMain.handle("machine:getId", () => getMachineId());
ipcMain.handle("licence:getLocal", () => { try { return fs.existsSync(licenceFile()) ? JSON.parse(fs.readFileSync(licenceFile(), "utf8")) : null; } catch (_) { return null; } });
ipcMain.handle("licence:setLocal", (_e, d) => { ensureDirs(); fs.writeFileSync(licenceFile(), JSON.stringify(d), "utf8"); return true; });
ipcMain.handle("licence:clearLocal", () => { try { if (fs.existsSync(licenceFile())) fs.unlinkSync(licenceFile()); } catch (_) {} });
ipcMain.handle("admin:hasConfig", () => !!(readAdminCfg()?.serviceRoleKey));
ipcMain.handle("admin:getConfig", () => readAdminCfg());
ipcMain.handle("admin:setConfig", (_e, cfg) => { ensureDirs(); fs.writeFileSync(adminCfgFile(), JSON.stringify(cfg), "utf8"); return true; });

ipcMain.handle("licence:verifier", async (_e, cle) => {
  try {
    if (!SB_URL || SB_URL.includes("VOTRE_PROJET")) return { _devMode: true };
    const rows = await sbFetch(`licences?cle=eq.${encodeURIComponent(cle)}&select=*`);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) { return { _networkError: true, msg: e.message }; }
});

ipcMain.handle("licence:activer", async (_e, { cle, machineId }) => {
  try {
    const rows = await sbFetch(`licences?cle=eq.${encodeURIComponent(cle)}`, "PATCH", { statut: "actif", machine_id: machineId, active_le: new Date().toISOString() });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle("admin:listerLicences", async () => {
  const cfg = readAdminCfg(); if (!cfg?.serviceRoleKey) return { error: "Clé admin manquante" };
  try { return { data: await sbFetch("licences?select=*&order=cree_le.desc", "GET", undefined, cfg.serviceRoleKey) }; }
  catch (e) { return { error: e.message }; }
});

ipcMain.handle("admin:creerLicence", async (_e, { clientNom, clientEmail, dateExpiration, notes }) => {
  const cfg = readAdminCfg(); if (!cfg?.serviceRoleKey) return { error: "Clé admin manquante" };
  try {
    const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const seg = () => Array.from({ length: 4 }, () => c[Math.floor(Math.random() * c.length)]).join("");
    const cle = `PPCI-${seg()}-${seg()}-${seg()}`;
    const rows = await sbFetch("licences", "POST", { cle, client_nom: clientNom, client_email: clientEmail || "", date_expiration: dateExpiration, notes: notes || "", statut: "inactive" }, cfg.serviceRoleKey);
    return { data: Array.isArray(rows) ? rows[0] : rows };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle("admin:modifierLicence", async (_e, { id, statut, notes, dateExpiration }) => {
  const cfg = readAdminCfg(); if (!cfg?.serviceRoleKey) return { error: "Clé admin manquante" };
  try {
    const body = {};
    if (statut !== undefined) body.statut = statut;
    if (notes !== undefined) body.notes = notes;
    if (dateExpiration !== undefined) body.date_expiration = dateExpiration;
    await sbFetch(`licences?id=eq.${id}`, "PATCH", body, cfg.serviceRoleKey);
    return { ok: true };
  } catch (e) { return { error: e.message }; }
});

ipcMain.handle("admin:supprimerLicence", async (_e, id) => {
  const cfg = readAdminCfg(); if (!cfg?.serviceRoleKey) return { error: "Clé admin manquante" };
  try { await sbFetch(`licences?id=eq.${id}`, "DELETE", undefined, cfg.serviceRoleKey); return { ok: true }; }
  catch (e) { return { error: e.message }; }
});
