/* Données & logique métier persistante */
const Store = (() => {
  const E = Engine;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const NUM_KEYS = ["pres", "jpay", "sb", "ss", "pa", "hs1", "hs2", "hs3", "hs4", "presp", "pfonc", "prend", "paut", "an", "cp", "grat", "transp", "trexo", "trimp", "ni", "bimp", "btot", "bret", "cnps", "itsb", "ricf", "its", "cmus", "cmua", "nbBenef", "tcot", "acpt", "pret", "assur", "autr", "anded", "tret", "net", "retp", "bpf", "pf", "mater", "at", "tcnpsp", "cmup", "itsp", "ta", "fpc", "fpcc", "tfiscp", "tpat", "cout", "actif"];
  const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };
  const addMonth = (p, n = 1) => { let [y, m] = p.split("-").map(Number); m += n; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return `${y}-${String(m).padStart(2, "0")}`; };

  const DEFAULT = () => ({
    version: 1,
    entreprise: { nom: "", forme: "", activite: "", adresse: "", ville: "Abidjan", tel: "", email: "", ncc: "", rccm: "", cnps: "", cdi: "", regime: "", dirigeant: "", qualite: "Gérant", banque: "", convention: "Convention Collective Interprofessionnelle du 19 juillet 1977", slogan: "Pour vous aider à faire valoir vos droits, conservez ce bulletin sans limitation de durée.", logo: "" },
    params: clone(E.DEFAULT_PARAMS),
    categories: [],
    departements: ["Direction Générale", "Administration & Finances", "Ressources Humaines", "Commercial", "Production", "Logistique", "Informatique"],
    employes: [],
    periode: thisMonth(),
    periodes: {},
    historique: [],
    securite: { hash: "" },
    utilisateurs: [],
    meta: { created: new Date().toISOString() }
  });

  let S = null, timer = null;
  async function init() {
    let d = null;
    if (window.api) d = await window.api.load();
    else { try { d = JSON.parse(localStorage.getItem("paie-data") || "null"); } catch (_) {} }
    const def = DEFAULT();
    S = d ? Object.assign(def, d) : def;
    S.params = Object.assign(clone(E.DEFAULT_PARAMS), S.params || {});
    S.entreprise = Object.assign(def.entreprise, S.entreprise || {});
    if (!Array.isArray(S.utilisateurs)) S.utilisateurs = [];
    // Migration : ancien mot de passe unique → compte superadmin
    if (S.utilisateurs.length === 0 && S.securite && S.securite.hash) {
      S.utilisateurs.push({ id: "u" + Math.random().toString(36).slice(2, 10), nom: "Administrateur", username: "admin", hash: S.securite.hash, salt: S.securite.salt || "", role: "superadmin", actif: true, creeLe: new Date().toISOString().slice(0, 10) });
    }
    per();
    return S;
  }
  let saveIndTimer = null;
  function setInd(txt) { const el = document.getElementById("saveInd"); if (el) el.textContent = txt; }
  function save(now) {
    clearTimeout(timer);
    setInd("…");
    const go = () => {
      if (window.api) {
        window.api.save(S).then(() => { clearTimeout(saveIndTimer); setInd("✓"); saveIndTimer = setTimeout(() => setInd(""), 2500); });
      } else {
        try { localStorage.setItem("paie-data", JSON.stringify(S)); setInd("✓"); saveIndTimer = setTimeout(() => setInd(""), 2500); } catch (_) { setInd("✗"); }
      }
    };
    if (now) go(); else timer = setTimeout(go, 350);
  }
  const get = () => S;
  function per(p = S.periode) { if (!S.periodes[p]) S.periodes[p] = { vars: {}, cloture: false, datePaiement: "" }; return S.periodes[p]; }
  function vars(empId, p = S.periode) { const P = per(p); if (!P.vars[empId]) P.vars[empId] = {}; return P.vars[empId]; }
  const empById = (id) => S.employes.find((e) => e.id === id);
  const findUser = (u) => (S.utilisateurs || []).find((x) => x.username.toLowerCase() === u.toLowerCase() && x.actif !== false);
  const catOf = (e) => S.categories.find((c) => c.code === e.categorie);
  const groupeOf = (e) => (catOf(e) || {}).groupe || "Ouvrier / Employé";
  const isClosed = (p) => !!(S.periodes[p] && S.periodes[p].cloture);
  const datePaiement = (p = S.periode) => per(p).datePaiement || E.fmtISO(E.periodBounds(p).fin);

  function histAvg(empId, p) {
    const lo = addMonth(p, -12);
    const r = S.historique.filter((h) => h.id === empId && h.periode >= lo && h.periode < p && h.jpay > 0);
    return r.length ? r.reduce((s, h) => s + h.bimp, 0) / r.length : 0;
  }
  const histBrut = (empId) => S.historique.filter((h) => h.id === empId).reduce((s, h) => s + h.btot, 0);

  function liveOne(e, p) {
    const P = S.params, v = vars(e.id, p);
    const cat = catOf(e);
    const conge = E.congeInfo(e, P, p, histAvg(e.id, p));
    const grat = E.gratInfo(e, P, p, cat ? Number(cat.salaire) : 0, v);
    const pretAuto = E.pretEcheance(e, v);
    const r0 = E.computeEmployee(e, v, P, p, {});
    const extra = { cp: conge.alloc, grat: r0.actif ? grat.verse : 0, pret: r0.actif ? pretAuto : 0 };
    const R = E.computeEmployee(e, v, P, p, extra);
    R.emp = e; R.conge = conge; R.gratInfo = grat; R.periode = p;
    return R;
  }
  /* Résultats d'une période : historique si clôturée, sinon calcul en direct */
  function compute(p = S.periode, all = false) {
    if (isClosed(p)) return S.historique.filter((h) => h.periode === p).map((h) => Object.assign({}, h, { emp: h.emp }));
    if (p !== S.periode) return [];
    const out = S.employes.map((e) => liveOne(e, p));
    return all ? out : out.filter((r) => r.actif || r.net);
  }
  function totals(list) { const t = {}; NUM_KEYS.forEach((k) => (t[k] = list.reduce((s, r) => s + (Number(r[k]) || 0), 0))); t.count = list.length; return t; }

  function cloturer() {
    const p = S.periode; if (isClosed(p)) return false;
    const list = compute(p);
    list.forEach((r) => {
      const e = r.emp; const rec = {};
      Object.keys(r).forEach((k) => { if (!["emp", "conge", "gratInfo"].includes(k)) rec[k] = r[k]; });
      rec.periode = p; rec.emp = clone(e); rec.congeJoursPris = r.conge.ceMois || 0; rec.congeRetour = r.conge.retour || "";
      rec.pretDeduit = r.pret || 0; rec.datePaiement = datePaiement(p);
      S.historique.push(rec);
      if (e.pret && r.pret) e.pret.restant = Math.max(0, (Number(e.pret.restant) || 0) - r.pret);
      if (e.conge && r.conge.ceMois) { e.conge.joursPris = (Number(e.conge.joursPris) || 0) + r.conge.ceMois; e.conge.joursCeMois = 0; e.conge.dateDepart = ""; }
    });
    per(p).cloture = true; per(p).clotureLe = new Date().toISOString();
    S.periode = addMonth(p); per();
    save(true);
    return true;
  }
  function rouvrir(p) {
    const later = Object.keys(S.periodes).filter((x) => x > p && isClosed(x));
    if (later.length) return "Rouvrez d'abord les mois clôturés plus récents.";
    S.historique.filter((h) => h.periode === p).forEach((h) => {
      const e = empById(h.id); if (!e) return;
      if (e.pret && h.pretDeduit) e.pret.restant = (Number(e.pret.restant) || 0) + h.pretDeduit;
      if (h.congeJoursPris) { e.conge = e.conge || {}; e.conge.joursPris = Math.max(0, (Number(e.conge.joursPris) || 0) - h.congeJoursPris); e.conge.joursCeMois = h.congeJoursPris; }
    });
    S.historique = S.historique.filter((h) => h.periode !== p);
    per(p).cloture = false; S.periode = p; save(true); return null;
  }
  function periods() { const set = new Set(Object.keys(S.periodes).filter((p) => isClosed(p))); set.add(S.periode); return [...set].sort().reverse(); }

  /* Agrégats annuels : historique de l'année + mois en cours non clôturé */
  function annual(year) {
    const map = new Map();
    const add = (r, p) => {
      const id = r.id; if (!map.has(id)) map.set(id, { id, emp: r.emp, mois: {}, nbMois: 0, ...Object.fromEntries(NUM_KEYS.map((k) => [k, 0])) });
      const a = map.get(id); NUM_KEYS.forEach((k) => (a[k] += Number(r[k]) || 0)); a.mois[Number(p.slice(5, 7))] = r; if (r.jpay > 0) a.nbMois++; a.emp = r.emp || a.emp;
    };
    S.historique.filter((h) => h.periode.startsWith(year + "-")).forEach((h) => add(h, h.periode));
    if (S.periode.startsWith(year + "-") && !isClosed(S.periode)) compute(S.periode).forEach((r) => add(r, S.periode));
    return [...map.values()].sort((a, b) => String(a.emp?.matricule).localeCompare(String(b.emp?.matricule)));
  }
  /* Série mensuelle (pour graphiques) */
  function series(n = 12) {
    const out = []; let p = S.periode;
    for (let i = n - 1; i >= 0; i--) { const q = addMonth(p, -i); const list = isClosed(q) || q === S.periode ? compute(q) : S.historique.filter((h) => h.periode === q); out.push({ p: q, t: totals(list) }); }
    return out;
  }
  function nextMatricule() { let n = S.employes.length + 1; const used = new Set(S.employes.map((e) => e.matricule)); while (used.has("MAT" + String(n).padStart(3, "0"))) n++; return "MAT" + String(n).padStart(3, "0"); }

  /* Contrôles & alertes RH */
  function alerts() {
    const out = []; const P = S.params; const { fin, debut } = E.periodBounds(S.periode);
    const mats = {};
    S.employes.forEach((e) => { mats[e.matricule] = (mats[e.matricule] || 0) + 1; });
    S.employes.filter((e) => e.actif !== false).forEach((e) => {
      const n = `${e.nom} ${e.prenoms || ""}`.trim();
      if (mats[e.matricule] > 1) out.push({ lvl: "red", t: `Matricule ${e.matricule} utilisé plusieurs fois` });
      if (!e.dateEntree) out.push({ lvl: "red", t: `${n} : date d'entrée manquante` });
      if (Number(e.base) < P.smig) out.push({ lvl: "red", t: `${n} : salaire de base inférieur au SMIG (${UI.fmt0(P.smig)})` });
      const c = catOf(e); if (c && Number(e.base) < Number(c.salaire)) out.push({ lvl: "orange", t: `${n} : base inférieure au salaire catégoriel ${c.code} (${UI.fmt0(c.salaire)})` });
      if (!e.cnps) out.push({ lvl: "orange", t: `${n} : n° CNPS non renseigné` });
      if (e.contrat === "CDD" && e.dateFinContrat) { const d = E.parseD(e.dateFinContrat); const days = Math.round((d - fin) / 86400000); if (days < 0) out.push({ lvl: "red", t: `${n} : CDD échu le ${UI.fmtD(e.dateFinContrat)}` }); else if (days <= 45) out.push({ lvl: "orange", t: `${n} : CDD se termine le ${UI.fmtD(e.dateFinContrat)} (${days} j)` }); }
      const ent = E.parseD(e.dateEntree);
      if (ent && ent.getUTCMonth() === debut.getUTCMonth() && ent.getUTCFullYear() < debut.getUTCFullYear()) { const y = debut.getUTCFullYear() - ent.getUTCFullYear(); out.push({ lvl: "blue", t: `${n} : ${y} an(s) d'ancienneté ce mois${y >= P.ancMin ? " | prime d'ancienneté " + UI.pct(E.tauxAnc(y, P), 0) : ""}` }); }
      const ci = E.congeInfo(e, P, S.periode, 0); if (ci.solde > 30) out.push({ lvl: "blue", t: `${n} : ${ci.solde.toFixed(1)} jours de congés accumulés` });
      if (e.dateNaissance) { const b = E.parseD(e.dateNaissance); const age = E.fullYears(b, fin); if (age >= 60) out.push({ lvl: "orange", t: `${n} : ${age} ans. Âge de départ à la retraite atteint.` }); }
    });
    return out;
  }

  function exportData() { return JSON.stringify(S, null, 1); }
  function importData(txt) { const d = JSON.parse(txt); if (!d || !Array.isArray(d.employes)) throw new Error("Fichier invalide"); S = Object.assign(DEFAULT(), d); S.params = Object.assign(clone(E.DEFAULT_PARAMS), S.params || {}); per(); save(true); }
  const DEMO = {"entreprise": {"nom": "SOCIÉTÉ DÉMO SARL", "ville": "Abidjan", "adresse": "23 BP 123 Abidjan 23", "ncc": "1234567A", "cnps": "123456", "dirigeant": "M. KOFFI Jean", "qualite": "Gérant", "tel": "+225 07 00 00 00 00"}, "categories": [{"code": "2", "groupe": "Ouvrier / Employé", "salaire": 80000}, {"code": "4", "groupe": "Ouvrier / Employé", "salaire": 105000}, {"code": "6", "groupe": "Ouvrier / Employé", "salaire": 150000}, {"code": "C2", "groupe": "Cadre", "salaire": 450000}, {"code": "C3", "groupe": "Cadre", "salaire": 600000}], "employes": [{"id": "1", "matricule": "MAT001", "nom": "KOUAME", "prenoms": "Yao Frédéric", "sexe": "M", "dateNaissance": "1985-04-12", "fonction": "Comptable", "categorie": "6", "departement": "Administration & Finances", "dateEntree": "2019-03-01", "contrat": "CDI", "situation": "Marié(e)", "enfants": 2, "cmuBenef": 3, "base": 250000, "sursalaire": 150000, "primeResp": 50000, "transport": 30000, "statut": "Local", "actif": true, "cnps": "1850412345", "conge": {"dateRef": "2026-01-20"}, "pret": {"montant": 300000, "mensualite": 50000, "restant": 200000}}, {"id": "2", "matricule": "MAT002", "nom": "KONAN", "prenoms": "Aya Marie", "sexe": "F", "dateNaissance": "1993-09-02", "fonction": "Commerciale", "categorie": "4", "departement": "Commercial", "dateEntree": "2022-07-15", "contrat": "CDI", "situation": "Célibataire", "enfants": 1, "cmuBenef": 1, "base": 150000, "sursalaire": 60000, "transport": 30000, "indemNI": 10000, "statut": "Local", "actif": true, "conge": {}, "pret": {}}, {"id": "3", "matricule": "MAT003", "nom": "TRAORE", "prenoms": "Ibrahim", "sexe": "M", "fonction": "Chauffeur", "categorie": "2", "departement": "Logistique", "dateEntree": "2015-01-05", "contrat": "CDI", "situation": "Marié(e)", "enfants": 4, "cmuBenef": 5, "base": 90000, "sursalaire": 20000, "transport": 30000, "statut": "Local", "actif": true, "conge": {}, "pret": {}}, {"id": "4", "matricule": "MAT004", "nom": "N'GUESSAN", "prenoms": "Akissi", "sexe": "F", "fonction": "DRH", "categorie": "C2", "departement": "Ressources Humaines", "dateEntree": "2010-02-01", "contrat": "CDI", "situation": "Divorcé(e)", "enfants": 0, "base": 600000, "sursalaire": 400000, "primeResp": 100000, "primeFonction": 50000, "transport": 50000, "avantageNature": 100000, "statut": "Local", "actif": true, "conge": {}, "pret": {}}, {"id": "5", "matricule": "MAT005", "nom": "DUPONT", "prenoms": "Michel", "sexe": "M", "fonction": "Directeur Technique", "categorie": "C3", "departement": "Production", "dateEntree": "2026-10-13", "contrat": "CDD", "dateFinContrat": "2026-11-30", "situation": "Marié(e)", "enfants": 2, "base": 1500000, "sursalaire": 1000000, "transport": 30000, "statut": "Expatrié", "actif": true, "conge": {}, "pret": {}}]};
  function loadDemo() { const d = DEFAULT(); Object.assign(d, JSON.parse(JSON.stringify(DEMO))); d.periode = S.periode; S = d; per(); const v = per().vars; v['1'] = { acpt: 50000 }; v['2'] = { hs1: 8, prend: 25000 }; v['3'] = { abs: 2, hs2: 4 }; save(true); }
  function reset() { S = DEFAULT(); per(); save(true); }

  return { init, save, get, per, vars, empById, findUser, catOf, groupeOf, isClosed, datePaiement, histAvg, histBrut, compute, totals, cloturer, rouvrir, periods, annual, series, nextMatricule, alerts, exportData, importData, reset, loadDemo, addMonth, NUM_KEYS, thisMonth };
})();
