/* Application : navigation, période, clôture, verrouillage */
const App = (() => {
  const { $, $$, esc, ico, toast, confirm, perLabel } = UI;
  const ORDER = ["dashboard", "cloture", "intelligence", "saisie", "bulletins", "livre", "inverse", "etats", "declarations", "annuel", "compta", "employes", "conges", "gratifications", "prets", "rupture", "documents", "entreprise", "parametres", "sauvegarde", "utilisateurs", "licences", "aide"];
  const GROUP_ORDER = ["Pilotage", "Paie du mois", "États & déclarations", "Gestion RH", "Configuration"];
  const GROUP_OF = { cloture: "Pilotage", intelligence: "Pilotage", sauvegarde: "Configuration", utilisateurs: "Configuration", licences: "Configuration", aide: "Configuration", employes: "Gestion RH" };
  // Niveaux de rôle : plus le nombre est élevé, plus l'accès est large
  const ROLE_LEVEL = { superadmin: 4, admin: 3, saisie: 2, lecture: 1 };
  // Niveau minimum requis par page (défaut : 1 = lecture)
  const PAGE_MIN_LEVEL = { saisie: 2, inverse: 2, conges: 2, gratifications: 2, prets: 2, rupture: 2, employes: 3, entreprise: 3, parametres: 3, cloture: 3, sauvegarde: 3, utilisateurs: 4, licences: 4 };
  const SESSION = { userId: null, role: null, nom: null, username: null };
  const ROLE_LABELS = { superadmin: "Super Admin", admin: "Administrateur", saisie: "Saisie", lecture: "Lecture" };
  const app = { current: "dashboard", view: null };
  const currentLevel = () => SESSION.role ? (ROLE_LEVEL[SESSION.role] || 0) : (Store.get().utilisateurs.length === 0 ? 4 : 0);
  let _isProprietaire = false;

  function nav() {
    const groups = {}; const lvl = currentLevel();
    ORDER.forEach((id) => { const p = Pages[id]; if (!p) return; if ((PAGE_MIN_LEVEL[id] || 1) > lvl) return; if (id === "licences" && !_isProprietaire) return; const g = GROUP_OF[id] || p.group; (groups[g] = groups[g] || []).push(id); });
    $("#nav").innerHTML = GROUP_ORDER.filter((g) => groups[g]).map((g) => `<div class="nav-group">${g}</div>` + groups[g].map((id) => `<div class="nav-item ${id === app.current ? "active" : ""}" data-p="${id}">${ico(Pages[id].icon)}<span>${Pages[id].title}</span></div>`).join("")).join("");
    $$("#nav [data-p]").forEach((n) => (n.onclick = () => go(n.dataset.p)));
  }
  function refreshChrome() {
    const S = Store.get(); const e = S.entreprise;
    $("#brandLogo").innerHTML = e.logo ? `<img src="${e.logo}">` : "P";
    const prevInd = document.getElementById("saveInd")?.textContent || "";
    const userBlock = SESSION.nom ? `<div class="lock-user-sidebar" title="Cliquez pour verrouiller"><div class="lus-av">${SESSION.nom[0]?.toUpperCase() || "U"}</div><div><div style="font-size:12px;font-weight:700;color:#e2e8f0">${esc(SESSION.nom)}</div><div style="font-size:10px;color:#94a3b8">${ROLE_LABELS[SESSION.role] || SESSION.role} · ${ico("lock")} Verrouiller</div></div></div>` : "";
    $("#sideFoot").innerHTML = `<div style="color:#c9d3ea;font-weight:600;margin-bottom:2px">${esc(e.nom || "Mon entreprise")}</div>${S.employes.filter((x) => x.actif !== false).length} salarié(s) · v1.0<span id="saveInd" style="color:#4ade80;margin-left:6px;font-size:11px">${prevInd}</span>${userBlock}`;
    const lockBtn = document.querySelector(".lock-user-sidebar");
    if (lockBtn) lockBtn.onclick = () => lockNow();
    const ps = Store.periods(); if (!ps.includes(app.view)) app.view = S.periode;
    const closed = Store.isClosed(app.view);
    $("#periodPill").innerHTML = `${ico("calendar")}<select id="perSel">${ps.map((p) => `<option value="${p}" ${p === app.view ? "selected" : ""}>${perLabel(p)}</option>`).join("")}</select><span class="badge ${closed ? "grey" : "green"}">${closed ? "Clôturé" : "En cours"}</span>`;
    $("#perSel").onchange = (ev) => { app.view = ev.target.value; render(); };
    $("#btnCloture").style.display = closed ? "none" : "";
    $("#btnCloture").textContent = `Clôturer ${perLabel(S.periode)}`;
    const alertCount = Store.alerts().filter((a) => a.lvl === "red").length;
    const ab = document.getElementById("alertsBadge");
    if (ab) { ab.textContent = alertCount; ab.classList.toggle("hidden", alertCount === 0); }
  }
  function render() {
    UI.destroyCharts(); refreshChrome(); nav();
    const p = Pages[app.current];
    $("#pageTitle").textContent = p.title; $("#pageSub").textContent = p.sub ? p.sub() : "";
    const el = $("#page"); el.scrollTop = 0;
    try { p.render(el); } catch (err) { console.error(err); el.innerHTML = `<div class="note">Une erreur est survenue : ${esc(err.message)}</div>`; }
  }
  function go(id) {
    if ((PAGE_MIN_LEVEL[id] || 1) > currentLevel()) { toast("Accès non autorisé pour votre rôle", "err"); return; }
    if (id === "licences" && !_isProprietaire) { toast("Accès non autorisé", "err"); return; }
    app.current = id; render();
  }
  async function cloturer() {
    const S = Store.get(); const p = S.periode;
    const L = Store.compute(p); const T = Store.totals(L);
    if (!L.length) return toast("Aucun salarié payé ce mois-ci", "err");
    const red = Store.alerts().filter((a) => a.lvl === "red").length;
    if (!(await confirm(`Clôturer ${perLabel(p)}`, `${L.length} bulletin(s) seront archivés. Net total : ${UI.fmt0(T.net)} FCFA.${red ? `<br><br><b style="color:var(--red)">⚠ ${red} anomalie(s) détectée(s) : vérifiez le tableau de bord.</b>` : ""}<br><br>Les congés pris et les prêts seront mis à jour, puis ${perLabel(Store.addMonth(p, 1))} sera ouvert.`, "Clôturer le mois", "btn-accent"))) return;
    Store.cloturer(); app.view = S.periode; toast(`${perLabel(p)} clôturé. Bienvenue en ${perLabel(S.periode)}.`, "ok"); render();
  }
  // SHA-256 simple (format hérité — uniquement pour vérifier les anciens mots de passe)
  async function hashLegacy(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("paie-ci::" + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  // PBKDF2-SHA256 + sel aléatoire (nouveau format)
  async function hashNew(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = [...salt].map((x) => x.toString(16).padStart(2, "0")).join("");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
    const h = [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2, "0")).join("");
    return { hash: h, salt: saltHex };
  }
  async function verifyPassword(password, sec) {
    if (sec.salt) {
      const saltBytes = new Uint8Array(sec.salt.match(/../g).map((x) => parseInt(x, 16)));
      const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
      const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 100000 }, key, 256);
      const h = [...new Uint8Array(bits)].map((x) => x.toString(16).padStart(2, "0")).join("");
      return h === sec.hash;
    }
    return (await hashLegacy(password)) === sec.hash;
  }
  /* ── Sécurité : anti-brute-force + verrou automatique ── */
  const AUTH = { attempts: 0, lockUntil: 0, MAX: 5, PENALITE_MS: 30000 };
  let _inactTimer = null;

  function resetInactivityTimer() {
    clearTimeout(_inactTimer);
    _inactTimer = setTimeout(() => {
      if (Store.get().utilisateurs.length > 0) {
        SESSION.userId = null; SESSION.role = null; SESSION.nom = null; SESSION.username = null;
        lock().then(() => render());
      }
    }, 15 * 60 * 1000);
  }
  function lockNow() {
    SESSION.userId = null; SESSION.role = null; SESSION.nom = null; SESSION.username = null;
    lock().then(() => render());
  }
  function startInactivityWatch() {
    ["mousemove", "keydown", "mousedown", "touchstart", "scroll"].forEach(
      (ev) => document.addEventListener(ev, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();
  }

  function lock() {
    return new Promise((resolve) => {
      AUTH.attempts = 0; AUTH.lockUntil = 0;
      const L = $("#lock"); L.classList.remove("hidden");
      const appEl = document.getElementById("app"); if (appEl) appEl.style.visibility = "hidden";
      const ent = Store.get().entreprise;
      const users = Store.get().utilisateurs;
      const logoHtml = ent.logo ? `<img src="${esc(ent.logo)}" style="height:62px;width:62px;object-fit:contain;border-radius:14px;margin-bottom:22px;display:block">` : `<div class="brand-logo" style="margin:0 0 22px;width:62px;height:62px;font-size:26px">P</div>`;
      const singleUser = users.length === 1 ? users[0] : null;
      const userField = singleUser
        ? `<div class="lock-user-chip">${ico("users")}<span>${esc(singleUser.nom)}</span><span class="badge blue" style="font-size:10px">${ROLE_LABELS[singleUser.role] || singleUser.role}</span></div><input type="hidden" id="luser" value="${esc(singleUser.username)}">`
        : `<div class="lock-field"><label class="lock-field-lbl">Identifiant</label><input type="text" id="luser" placeholder="nom.utilisateur" autocomplete="username" class="in" style="margin-top:4px"></div>`;
      L.innerHTML = `<div class="lock-wrap">
        <div class="lock-panel-brand">
          <div class="lock-brand-inner">
            ${logoHtml}
            <div class="lock-brand-name">Paie Premium CI</div>
            <div class="lock-brand-tag">Solution de gestion de paie<br>professionnelle en Côte d'Ivoire</div>
            <ul class="lock-feat-list">
              <li>Bulletins de paie CNPS / DGI conformes</li>
              <li>Déclarations ITS, FDFP, État 301 et DISA</li>
              <li>Documents RH et contrats professionnels</li>
              <li>Intelligence RH et alertes automatiques</li>
            </ul>
          </div>
          <p class="lock-ent-name">${esc(ent.nom || "")}</p>
        </div>
        <div class="lock-panel-form">
          <div class="lock-form-box">
            <div class="lock-form-eyebrow">Connexion sécurisée</div>
            <h2 class="lock-form-title">Bienvenue</h2>
            ${userField}
            <div class="lock-field" style="margin-top:${singleUser ? "14px" : "0"}">
              <label class="lock-field-lbl">Mot de passe</label>
              <input type="text" id="lpw" placeholder="••••••••" autocomplete="off" spellcheck="false" class="in" style="margin-top:4px;-webkit-text-security:disc">
            </div>
            <button class="btn btn-primary btn-full" id="lgo" style="height:48px;font-size:15px;font-weight:700;margin-top:14px">${ico("lock")} Se connecter</button>
            <p class="lock-attempts" id="lerr"></p>
            <button id="lalt" style="margin-top:10px;background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer;text-decoration:underline;width:100%">Coller depuis le presse-papiers</button>
          </div>
        </div>
      </div>`;

      // Capture IPC : reçoit les frappes depuis le processus principal (contourne le bug de focus Windows)
      let _pw = "";
      let _user = singleUser ? singleUser.username : "";
      let _activeF = singleUser ? "lpw" : "luser";
      const _sync = () => {
        const lp = document.getElementById("lpw"); if (lp) lp.value = _pw;
        const lu = document.getElementById("luser"); if (lu && lu.type !== "hidden") lu.value = _user;
      };
      const _done = () => { window.api.lockCapture(false); window.api.offLockKey(); };

      window.api.offLockKey();
      window.api.lockCapture(true);
      window.api.onLockKey(({ key, ctrl }) => {
        if (ctrl && key.toLowerCase() === "v") {
          window.api.readClipboard().then(pw => {
            if (pw && pw.trim()) { _pw = pw.trim(); _sync(); tryIt(); }
            else { $("#lerr").textContent = "Presse-papiers vide. Copiez d'abord votre mot de passe."; }
          }).catch(() => {});
          return;
        }
        if (key === "Tab") {
          _activeF = _activeF === "luser" ? "lpw" : "luser";
          document.getElementById(_activeF)?.focus(); return;
        }
        if (key === "Enter") {
          if (_activeF === "luser" && !singleUser) { _activeF = "lpw"; document.getElementById("lpw")?.focus(); }
          else { tryIt(); }
          return;
        }
        if (key === "Backspace") { if (_activeF === "lpw") _pw = _pw.slice(0, -1); else _user = _user.slice(0, -1); }
        else if (key.length === 1 && !ctrl) { if (_activeF === "lpw") _pw += key; else _user += key; }
        _sync();
      });

      const tryIt = async () => {
        const now = Date.now();
        if (now < AUTH.lockUntil) { const s = Math.ceil((AUTH.lockUntil - now) / 1000); $("#lerr").textContent = `Trop de tentatives. Réessayez dans ${s} secondes.`; return; }
        const username = singleUser ? singleUser.username : _user.trim();
        if (!username) { $("#lerr").textContent = "Entrez votre identifiant"; return; }
        const user = Store.findUser(username);
        if (!user) { AUTH.attempts++; $("#lerr").textContent = "Identifiant inconnu ou compte inactif"; if (AUTH.attempts >= AUTH.MAX) { AUTH.lockUntil = Date.now() + AUTH.PENALITE_MS; AUTH.attempts = 0; } return; }
        $("#lgo").disabled = true; $("#lgo").textContent = "Vérification…";
        const ok = await verifyPassword(_pw, user);
        $("#lgo").disabled = false; $("#lgo").innerHTML = `${ico("lock")} Se connecter`;
        if (ok) {
          AUTH.attempts = 0;
          if (!user.salt) { const n = await hashNew(_pw); user.hash = n.hash; user.salt = n.salt; Store.save(true); }
          SESSION.userId = user.id; SESSION.role = user.role; SESSION.nom = user.nom; SESSION.username = user.username;
          L.classList.add("hidden");
          const appEl2 = document.getElementById("app"); if (appEl2) appEl2.style.visibility = "";
          _done(); resetInactivityTimer(); resolve();
        } else {
          AUTH.attempts++;
          if (AUTH.attempts >= AUTH.MAX) { AUTH.lockUntil = Date.now() + AUTH.PENALITE_MS; AUTH.attempts = 0; $("#lerr").textContent = `${AUTH.MAX} tentatives incorrectes. Accès bloqué 30 secondes.`; }
          else { $("#lerr").textContent = `Mot de passe incorrect (${AUTH.attempts}/${AUTH.MAX})`; }
          _pw = ""; _sync(); document.getElementById("lpw")?.focus();
        }
      };

      $("#lgo").onclick = tryIt;
      const lalt = document.getElementById("lalt");
      if (lalt) lalt.onclick = async () => {
        try {
          const pw = await window.api.readClipboard();
          if (pw && pw.trim()) { _pw = pw.trim(); _sync(); tryIt(); }
          else { $("#lerr").textContent = "Presse-papiers vide. Copiez d'abord votre mot de passe."; }
        } catch(e) { $("#lerr").textContent = "Erreur lecture presse-papiers"; }
      };
      // Focus visuel pour le curseur clignotant
      const luserEl = document.getElementById("luser");
      if (luserEl && luserEl.type !== "hidden") {
        luserEl.addEventListener("focus", () => { _activeF = "luser"; });
        luserEl.addEventListener("click", () => { _activeF = "luser"; });
        setTimeout(() => luserEl.focus(), 150);
      } else {
        setTimeout(() => { const pw = document.getElementById("lpw"); if (pw) { pw.focus(); pw.click(); } }, 150);
      }
      document.getElementById("lpw")?.addEventListener("focus", () => { _activeF = "lpw"; });
      document.getElementById("lpw")?.addEventListener("click", () => { _activeF = "lpw"; });
      L.addEventListener("pointerdown", (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return; setTimeout(() => { const pw = document.getElementById("lpw"); const lu = document.getElementById("luser"); if (pw && document.activeElement !== pw && document.activeElement !== lu) { pw.focus(); _activeF = "lpw"; } }, 20); });
    });
  }

  // ─── Palette de commandes (Ctrl+K) ────────────────────────────────────────
  const CMD_ACTIONS = [
    { label: "Nouveau salarié", sub: "Ajouter un employé à la liste", icon: "plus", fn: () => go("employes") },
    { label: "Intelligence RH", sub: "Analyse, prévisions et recommandations", icon: "brain", fn: () => go("intelligence") },
    { label: "Clôturer le mois", sub: "Archiver la paie du mois en cours", icon: "archive", fn: () => cloturer() },
    { label: "Sauvegarder les données", sub: "Créer un fichier de sauvegarde", icon: "save", fn: () => go("sauvegarde") },
    { label: "Paramètres légaux", sub: "Taux, convention collective, sécurité", icon: "settings", fn: () => go("parametres") },
  ];

  function openCmd() {
    const overlay = document.getElementById("cmdPalette");
    if (!overlay) return;
    const input = document.getElementById("cmdInput");
    const box = document.getElementById("cmdResults");
    let items = []; let sel = 0;

    const close = () => { overlay.classList.add("hidden"); document.removeEventListener("keydown", kh); };
    const run = (item) => { if (!item || item.type === "sect") return; close(); if (item.type === "page") go(item.id); else if (item.type === "act") item.fn(); };

    const renderItems = (q) => {
      const lq = q.toLowerCase().trim();
      const flat = [];
      const pgList = ORDER.filter((id) => Pages[id] && (PAGE_MIN_LEVEL[id] || 1) <= currentLevel() && (!lq || Pages[id].title.toLowerCase().includes(lq)));
      if (pgList.length) {
        flat.push({ type: "sect", label: "Navigation" });
        pgList.slice(0, 7).forEach((id) => flat.push({ type: "page", id, label: Pages[id].title, sub: GROUP_OF[id] || Pages[id].group || "", icon: Pages[id].icon }));
      }
      const emps = lq ? Store.get().employes.filter((e) => (e.nom + " " + (e.prenoms || "") + " " + e.matricule).toLowerCase().includes(lq)) : [];
      if (emps.length) {
        flat.push({ type: "sect", label: "Salariés" });
        emps.slice(0, 5).forEach((e) => flat.push({ type: "page", id: "employes", label: `${e.nom} ${e.prenoms || ""}`.trim(), sub: `${e.matricule} · ${e.fonction || ""}`, icon: "users" }));
      }
      const actList = CMD_ACTIONS.filter((a) => !lq || a.label.toLowerCase().includes(lq));
      if (actList.length) {
        flat.push({ type: "sect", label: "Actions rapides" });
        actList.slice(0, 4).forEach((a) => flat.push({ type: "act", ...a }));
      }
      items = flat.filter((x) => x.type !== "sect");
      sel = 0;
      if (!flat.length) { box.innerHTML = `<div style="text-align:center;padding:36px 20px;color:var(--muted)">Aucun résultat pour « ${esc(q)} »</div>`; return; }
      let ii = 0;
      box.innerHTML = flat.map((f) => {
        if (f.type === "sect") return `<div class="cmd-section">${f.label}</div>`;
        const idx = ii++;
        return `<div class="cmd-item" data-ci="${idx}"><div class="cmd-icon">${ico(f.icon || "dash")}</div><div class="cmd-meta"><div class="cmd-label">${esc(f.label)}</div>${f.sub ? `<div class="cmd-sub">${esc(f.sub)}</div>` : ""}</div></div>`;
      }).join("");
      box.querySelectorAll("[data-ci]").forEach((el) => {
        el.addEventListener("mouseenter", () => { sel = +el.dataset.ci; updSel(); });
        el.addEventListener("click", () => run(items[+el.dataset.ci]));
      });
      updSel();
    };

    const updSel = () => {
      box.querySelectorAll("[data-ci]").forEach((el) => el.classList.toggle("selected", +el.dataset.ci === sel));
      box.querySelector("[data-ci].selected")?.scrollIntoView({ block: "nearest" });
    };

    const kh = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); if (sel < items.length - 1) { sel++; updSel(); } }
      else if (e.key === "ArrowUp") { e.preventDefault(); if (sel > 0) { sel--; updSel(); } }
      else if (e.key === "Enter") { e.preventDefault(); run(items[sel]); }
    };

    overlay.classList.remove("hidden");
    input.value = "";
    renderItems("");
    setTimeout(() => input.focus(), 30);
    input.addEventListener("input", (e) => renderItems(e.target.value));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); }, { once: true });
    document.addEventListener("keydown", kh);
  }

  function firstSetup() {
    return new Promise((resolve) => {
      const L = $("#lock"); L.classList.remove("hidden");
      L.innerHTML = `
      <div class="setup-split">
        <div class="setup-brand">
          <div class="setup-brand-inner">
            <div class="setup-logo">P</div>
            <div class="setup-brand-name">Paie Premium CI</div>
            <div class="setup-brand-tag">Solution de paie professionnelle<br>pour la Côte d'Ivoire</div>
            <ul class="setup-features">
              <li><span class="setup-feat-icon">✓</span><span>Calcul automatique ITS, CNPS, FDFP, CMU</span></li>
              <li><span class="setup-feat-icon">✓</span><span>Bulletins de paie conformes au droit ivoirien</span></li>
              <li><span class="setup-feat-icon">✓</span><span>Intelligence RH &amp; prévisions de masse salariale</span></li>
              <li><span class="setup-feat-icon">✓</span><span>Multi-utilisateurs avec gestion des rôles</span></li>
              <li><span class="setup-feat-icon">✓</span><span>Export DISA, État 301, virements bancaires</span></li>
            </ul>
            <div class="setup-version">Version 2.0 | © 2026 Paie Premium CI</div>
          </div>
        </div>
        <div class="setup-form-panel">
          <div class="setup-form-inner">
            <div class="setup-step-badge">Étape 1 / 1</div>
            <h2 class="setup-title">Créer votre compte<br>administrateur</h2>
            <p class="setup-subtitle">Ce compte aura tous les droits sur le logiciel. Gardez vos identifiants en lieu sûr.</p>
            <div class="setup-fields">
              <div class="setup-field">
                <label class="setup-label">Nom complet</label>
                <input class="setup-input" id="sn" placeholder="Ex. KOCOA Richard" autocomplete="name">
              </div>
              <div class="setup-field">
                <label class="setup-label">Identifiant de connexion</label>
                <input class="setup-input" id="su" placeholder="Ex. richard.admin" autocomplete="off" spellcheck="false">
                <span class="setup-hint">Lettres minuscules, chiffres, tirets uniquement</span>
              </div>
              <div class="setup-row2">
                <div class="setup-field">
                  <label class="setup-label">Mot de passe</label>
                  <input class="setup-input" type="text" id="sp1" placeholder="Minimum 6 caractères" autocomplete="off" spellcheck="false" style="-webkit-text-security:disc">
                </div>
                <div class="setup-field">
                  <label class="setup-label">Confirmer</label>
                  <input class="setup-input" type="text" id="sp2" placeholder="Répéter le mot de passe" autocomplete="off" spellcheck="false" style="-webkit-text-security:disc">
                </div>
              </div>
            </div>
            <p class="setup-err hidden" id="serr"></p>
            <button class="setup-btn" id="sgo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Créer mon compte et accéder au logiciel
            </button>
            <p class="setup-secure-note">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Mot de passe chiffré avec PBKDF2-SHA256, stocké localement
            </p>
          </div>
        </div>
      </div>`;
      const go = async () => {
        const nom = $("#sn").value.trim(), username = $("#su").value.trim().toLowerCase();
        const p1 = $("#sp1").value, p2 = $("#sp2").value;
        const errEl = $("#serr");
        const showErr = (msg) => { errEl.textContent = msg; errEl.classList.remove("hidden"); };
        if (!nom) { showErr("Veuillez entrer votre nom complet"); return; }
        if (!username || !/^[a-z0-9._-]+$/.test(username)) { showErr("Identifiant invalide. Utilisez lettres minuscules, chiffres, . _ - uniquement."); return; }
        if (p1.length < 6) { showErr("Mot de passe trop court. Minimum 6 caractères."); return; }
        if (p1 !== p2) { showErr("Les mots de passe ne correspondent pas"); return; }
        errEl.classList.add("hidden");
        const btn = $("#sgo"); btn.disabled = true; btn.textContent = "Création du compte…";
        const n = await hashNew(p1);
        const u = { id: "u" + Math.random().toString(36).slice(2, 10), nom, username, hash: n.hash, salt: n.salt, role: "superadmin", actif: true, creeLe: new Date().toISOString().slice(0, 10) };
        Store.get().utilisateurs.push(u); Store.save(true);
        SESSION.userId = u.id; SESSION.role = "superadmin"; SESSION.nom = nom; SESSION.username = username;
        L.classList.add("hidden"); resolve();
      };
      $("#sgo").onclick = go;
      ["sp1", "sp2"].forEach((id) => { const el = document.getElementById(id); if (el) el.onkeydown = (e) => { if (e.key === "Enter") go(); }; });
      setTimeout(() => document.getElementById("sn")?.focus(), 80);
    });
  }

  // ─── Vérification de licence ──────────────────────────────────────────────────
  function showLicenceActivation() {
    return new Promise((resolve) => {
      const L = $("#lock"); L.classList.remove("hidden");
      const appEl = document.getElementById("app"); if (appEl) appEl.style.visibility = "hidden";
      L.innerHTML = `<div class="lic-card">
        <div style="display:grid;place-items:center;margin-bottom:20px">
          <div class="brand-logo" style="width:62px;height:62px;font-size:26px;margin:0">P</div>
        </div>
        <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px">Paie Premium CI</div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:28px">Activation du logiciel</div>
        <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;display:block;text-align:left;margin-bottom:6px">Clé de licence</label>
        <input id="lic-key" class="in" placeholder="PPCI-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false"
          style="text-transform:uppercase;letter-spacing:2px;font-family:monospace;font-size:15px;text-align:center">
        <button class="btn btn-primary btn-full" id="lic-go" style="margin-top:14px;height:48px;font-size:15px;font-weight:700">
          ${ico("lock")} Activer ma licence
        </button>
        <p id="lic-err" style="margin-top:10px;font-size:12px;color:var(--red);min-height:18px;font-weight:600;text-align:center"></p>
        <p style="margin-top:18px;font-size:11px;color:#94a3b8;line-height:1.6">
          Contactez votre revendeur pour obtenir votre clé.<br>
          <b style="color:#64748b">DigiMaketing Agency</b> — Côte d'Ivoire
        </p>
      </div>`;
      const keyEl = document.getElementById("lic-key");
      const errEl = document.getElementById("lic-err");
      const goBtn = document.getElementById("lic-go");
      keyEl.addEventListener("input", () => {
        let v = keyEl.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
        const parts = [];
        if (v.length > 0)  parts.push(v.slice(0, 4));
        if (v.length > 4)  parts.push(v.slice(4, 8));
        if (v.length > 8)  parts.push(v.slice(8, 12));
        if (v.length > 12) parts.push(v.slice(12, 16));
        keyEl.value = parts.join("-");
      });
      goBtn.onclick = async () => {
        const cle = keyEl.value.trim().toUpperCase();
        if (!/^PPCI-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cle)) { errEl.textContent = "Format invalide. Attendu : PPCI-XXXX-XXXX-XXXX"; return; }
        goBtn.disabled = true; goBtn.textContent = "Vérification…"; errEl.textContent = "";
        try {
          const result = await window.api.licence.verifier(cle);
          if (result?._networkError) { errEl.textContent = "Connexion impossible. Vérifiez votre connexion internet."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          if (!result) { errEl.textContent = "Clé introuvable ou invalide."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          if (result.statut === "suspendu") { errEl.textContent = "Cette licence est suspendue. Contactez DigiMaketing Agency."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          if (result.statut === "expire" || (result.date_expiration && result.date_expiration < new Date().toISOString().slice(0, 10))) { errEl.textContent = "Cette licence a expiré. Contactez DigiMaketing Agency."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          if (!result.statut || (result.statut !== "inactive" && result.statut !== "actif")) { errEl.textContent = "Clé introuvable ou invalide."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          let final = result;
          if (result.statut === "inactive") {
            const machineId = await window.api.getMachineId();
            final = await window.api.licence.activer({ cle, machineId });
            if (!final || final.error) { errEl.textContent = "Erreur lors de l'activation. Réessayez."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          } else if (result.statut === "actif") {
            const machineId = await window.api.getMachineId();
            if (result.machine_id && result.machine_id !== machineId) { errEl.textContent = "Cette licence est déjà activée sur un autre poste. Contactez DigiMaketing Agency."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; return; }
          }
          await window.api.licence.setLocal({ cle, statut: "actif", client_nom: final.client_nom || "", date_expiration: final.date_expiration || null, is_proprietaire: !!final.is_proprietaire, derniere_verification: new Date().toISOString() });
          L.classList.add("hidden"); if (appEl) appEl.style.visibility = ""; resolve();
        } catch (e) { errEl.textContent = "Erreur inattendue. Réessayez."; goBtn.disabled = false; goBtn.innerHTML = `${ico("lock")} Activer ma licence`; }
      };
      keyEl.addEventListener("keydown", (e) => { if (e.key === "Enter") goBtn.click(); });
      setTimeout(() => keyEl.focus(), 100);
    });
  }

  function showLicenceBlocked(statut) {
    return new Promise((resolve) => {
      const L = $("#lock"); L.classList.remove("hidden");
      const appEl = document.getElementById("app"); if (appEl) appEl.style.visibility = "hidden";
      const msgs = {
        suspendu: "Votre accès a été suspendu. Contactez DigiMaketing Agency pour régulariser.",
        expire:   "Votre licence a expiré. Contactez DigiMaketing Agency pour renouveler votre abonnement."
      };
      const msg = msgs[statut] || "Votre licence n'est pas valide. Contactez DigiMaketing Agency.";
      const titre = statut === "suspendu" ? "Accès suspendu" : statut === "expire" ? "Licence expirée" : "Accès bloqué";
      L.innerHTML = `<div class="lic-card lic-blocked">
        <div style="color:#dc2626;margin-bottom:16px">${ico("shield")}</div>
        <div style="font-size:20px;font-weight:800;color:#dc2626;margin-bottom:10px">${titre}</div>
        <p style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:24px">${msg}</p>
        <button class="btn btn-primary btn-full" id="lic-retry" style="height:46px">Réessayer</button>
        <p style="margin-top:14px;font-size:11px;color:#94a3b8"><b style="color:#64748b">DigiMaketing Agency</b> — Côte d'Ivoire</p>
      </div>`;
      document.getElementById("lic-retry").onclick = () => { window.location.reload(); };
    });
  }

  async function checkLicence() {
    if (!window.api?.licence) return;
    const probe = await window.api.licence.verifier("__check__");
    if (probe?._devMode) return; // Supabase non configuré → mode dev, on passe
    const today = new Date().toISOString().slice(0, 10);
    const local = await window.api.licence.getLocal();
    if (local) {
      const expired = local.date_expiration && local.date_expiration < today;
      if (local.statut === "suspendu") { await showLicenceBlocked("suspendu"); return; }
      if (local.statut === "expire" || expired) { await showLicenceBlocked("expire"); return; }
      if (local.statut === "actif") {
        const lastCheck = (local.derniere_verification || "").slice(0, 10);
        if (lastCheck === today) return; // Déjà vérifié aujourd'hui
        try {
          const r = await window.api.licence.verifier(local.cle);
          if (r && !r._networkError && !r._devMode) {
            if (r.statut === "actif") { await window.api.licence.setLocal({ ...local, date_expiration: r.date_expiration, is_proprietaire: !!r.is_proprietaire, derniere_verification: new Date().toISOString() }); return; }
            await window.api.licence.setLocal({ ...local, statut: r.statut }); await showLicenceBlocked(r.statut); return;
          }
        } catch (_) {}
        return; // Erreur réseau → on continue avec la licence locale
      }
    }
    await showLicenceActivation();
  }

  async function start() {
    await checkLicence();
    const _localLic = await window.api.licence.getLocal();
    _isProprietaire = !!(_localLic?.is_proprietaire);
    await Store.init(); app.view = Store.get().periode;
    if (Store.get().utilisateurs.length > 0) await lock();
    else await firstSetup();
    $("#btnCloture").onclick = cloturer;
    document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); } });
    const cmdBtn = document.getElementById("cmdBtn"); if (cmdBtn) cmdBtn.addEventListener("click", openCmd);
    startInactivityWatch();
    render();
  }
  window.addEventListener("DOMContentLoaded", start);
  return { go, render, refreshChrome, cloturer, lockNow, hash: hashLegacy, hashNew, verifyPassword, get view() { return app.view; }, set view(v) { app.view = v; }, get session() { return SESSION; } };
})();
