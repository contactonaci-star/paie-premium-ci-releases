/**
 * Tests du moteur de paie Côte d'Ivoire
 * Exécution : node --test tests/engine.test.js
 * Requiert Node.js 18+ (test runner intégré)
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../renderer/js/engine.js");

const P = Engine.DEFAULT_PARAMS;

/* ── Utilitaires ─────────────────────────────────────────── */

test("r0 — arrondi bancaire", () => {
  assert.equal(Engine.r0(1234.5), 1235);
  assert.equal(Engine.r0(1234.4), 1234);
  assert.equal(Engine.r0(-500.6), -501);
  assert.equal(Engine.r0(0), 0);
});

test("N — conversion sécurisée", () => {
  assert.equal(Engine.N(""), 0);
  assert.equal(Engine.N(null), 0);
  assert.equal(Engine.N(undefined), 0);
  assert.equal(Engine.N("150000"), 150000);
  assert.equal(Engine.N(Infinity), 0);
});

/* ── Calcul des parts ITS ─────────────────────────────────── */

test("partsCalc — célibataire sans enfants", () => {
  assert.equal(Engine.partsCalc("Célibataire", 0, P), 1);
});

test("partsCalc — marié 2 enfants → 3 parts", () => {
  assert.equal(Engine.partsCalc("Marié(e)", 2, P), 3);
});

test("partsCalc — veuf 3 enfants → 3,5 parts (plafonné à partsMax=5)", () => {
  assert.equal(Engine.partsCalc("Veuf(ve)", 3, P), 3.5);
});

test("partsCalc — marié 10 enfants → plafonné à 5 parts", () => {
  assert.equal(Engine.partsCalc("Marié(e)", 10, P), P.partsMax);
});

test("partsCalc — divorcé 2 enfants → 2,5 parts", () => {
  assert.equal(Engine.partsCalc("Divorcé(e)", 2, P), 2.5);
});

/* ── Barème ITS ───────────────────────────────────────────── */

test("itsBrut — salaire en dessous du seuil 0 → 0", () => {
  assert.equal(Engine.itsBrut(0, P), 0);
  assert.equal(Engine.itsBrut(74999, P), 0);
});

test("itsBrut — 300 000 FCFA brut imposable", () => {
  // Tranche 1 : 75 000 × 0 = 0
  // Tranche 2 : (240 000-75 000)×0.16 + (300 000-240 000)×0.21
  const attendu = Engine.r0((240000 - 75000) * 0.16 + (300000 - 240000) * 0.21);
  assert.equal(Engine.itsBrut(300000, P), attendu);
});

test("its — avec RICF réduit l'ITS", () => {
  const bimp = 500000;
  const brut = Engine.itsBrut(bimp, P);
  const its1 = Engine.its(bimp, 1, P); // 1 part → pas de RICF
  const its2 = Engine.its(bimp, 3, P); // 3 parts → RICF déduit
  assert.equal(its1, brut);
  assert.ok(its2 < its1, "Plus de parts → moins d'ITS");
});

test("its — ne peut jamais être négatif", () => {
  // Avec beaucoup de parts sur un petit salaire, ITS doit rester >= 0
  assert.ok(Engine.its(80000, 5, P) >= 0);
});

/* ── Prime d'ancienneté ───────────────────────────────────── */

test("tauxAnc — avant la durée minimale → 0", () => {
  assert.equal(Engine.tauxAnc(0, P), 0);
  assert.equal(Engine.tauxAnc(P.ancMin - 1, P), 0);
});

test("tauxAnc — 5 ans → 5 %", () => {
  assert.equal(Engine.tauxAnc(5, P), 0.05);
});

test("tauxAnc — plafonnement à ancMax", () => {
  assert.equal(Engine.tauxAnc(100, P), P.ancMax);
});

/* ── Calcul complet d'un employé ─────────────────────────── */

const EMP_TEST = {
  id: "t1", matricule: "MAT001", nom: "TEST", prenoms: "Jean",
  dateEntree: "2020-01-01", actif: true, statut: "Local",
  situation: "Marié(e)", enfants: 2, cmuBenef: 3,
  base: 250000, sursalaire: 100000, transport: 30000,
  sexe: "M"
};

test("computeEmployee — calcul brut imposable cohérent", () => {
  const r = Engine.computeEmployee(EMP_TEST, {}, P, "2026-10-01", {});
  // bimp = sb + ss + pa (ancienneté) + trimp (part imposable du transport)
  const trimp = Math.max(0, 30000 - P.plafTransport);
  assert.equal(r.bimp, r.sb + r.ss + r.pa + trimp);
});

test("computeEmployee — net = brut total − retenues totales", () => {
  const r = Engine.computeEmployee(EMP_TEST, {}, P, "2026-10-01", {});
  assert.equal(r.net, r.btot - r.tret);
});

test("computeEmployee — prorata mois complet", () => {
  const r = Engine.computeEmployee(EMP_TEST, {}, P, "2026-10-01", {});
  assert.equal(r.jpay, 30); // mois complet, pas d'absences
  assert.equal(r.sb, Engine.r0(EMP_TEST.base));
});

test("computeEmployee — salarié inactif ce mois (entrée future)", () => {
  const e2 = Object.assign({}, EMP_TEST, { dateEntree: "2027-01-01" });
  const r = Engine.computeEmployee(e2, {}, P, "2026-10-01", {});
  assert.equal(r.actif, 0);
  assert.equal(r.net, 0);
});

test("computeEmployee — statut expatrié → taux ITS patronal différent", () => {
  const eLocal = Engine.computeEmployee(EMP_TEST, {}, P, "2026-10-01", {});
  const eExp = Engine.computeEmployee(Object.assign({}, EMP_TEST, { statut: "Expatrié" }), {}, P, "2026-10-01", {});
  assert.ok(eExp.itsp > eLocal.itsp, "ITS patronal expatrié > local");
});

test("computeEmployee — cout = btot + tpat", () => {
  const r = Engine.computeEmployee(EMP_TEST, {}, P, "2026-10-01", {});
  assert.equal(r.cout, r.btot + r.tpat);
});

/* ── Congés ───────────────────────────────────────────────── */

test("congeInfo — acquisition après 12 mois complets", () => {
  const e = { ...EMP_TEST, conge: {} };
  const ci = Engine.congeInfo(e, P, "2026-10-01", 0);
  assert.ok(ci.acquis > 0, "Des jours acquis doivent exister");
  assert.ok(ci.mois > 0);
});

test("congeInfo — solde = total - pris", () => {
  const e = { ...EMP_TEST, conge: { joursPris: 5 } };
  const ci = Engine.congeInfo(e, P, "2026-10-01", 0);
  assert.equal(ci.solde, ci.total - 5);
});

/* ── Paie inverse ─────────────────────────────────────────── */

test("inverse — net calculé ≈ net cible (écart < 2 FCFA)", () => {
  const inp = {
    dateEntree: "2020-01-01", situation: "Marié(e)", enfants: 2,
    base: 250000, primeResp: 0, autrePrime: 0, transport: 30000,
    indemNI: 0, cmuBenef: 2, statut: "Local", net: 350000
  };
  const r = Engine.inverse(inp, P, "2026-10-01");
  assert.ok(Math.abs(r.ecart) <= 2, `Écart trop grand : ${r.ecart}`);
});

/* ── Montant en lettres ───────────────────────────────────── */

test("enLettres — zéro", () => {
  assert.equal(Engine.enLettres(0), "zéro");
});

test("enLettres — 1", () => {
  assert.equal(Engine.enLettres(1), "un");
});

test("enLettres — 80 → quatre-vingts (orthographe française)", () => {
  assert.equal(Engine.enLettres(80), "quatre-vingts");
});

test("enLettres — 1000 → mille", () => {
  assert.equal(Engine.enLettres(1000), "mille");
});

test("enLettres — 1 000 000 → un million", () => {
  assert.equal(Engine.enLettres(1000000), "un million");
});

test("enLettres — 500 000 → cinq cent mille", () => {
  assert.equal(Engine.enLettres(500000), "cinq cent mille");
});

test("enLettres — 250 750 cohérent", () => {
  const s = Engine.enLettres(250750);
  assert.ok(typeof s === "string" && s.length > 0);
});

/* ── Rupture ──────────────────────────────────────────────── */

test("rupture — licenciement après 6 ans génère une indemnité", () => {
  const e = { ...EMP_TEST, dateEntree: "2018-01-01" };
  const inp = { dateSortie: "2026-01-31", motif: "Licenciement", preavisEffectue: "NON", jours: 30, joursCP: 10, sgmm: "", totalCdd: "", sansGrat: false };
  const ctx = { groupe: "Ouvrier / Employé", catSal: 0, histAvg: 0, histBrut: 0, soldeConge: 10 };
  const r = Engine.rupture(e, inp, P, ctx);
  assert.ok(r !== null);
  const indem = r.items.find((x) => x.lib.includes("licenciement") || x.lib.includes("départ"));
  assert.ok(indem && indem.mt > 0, "Indemnité de licenciement attendue");
});

test("rupture — faute lourde → pas d'indemnité de licenciement", () => {
  const e = { ...EMP_TEST, dateEntree: "2018-01-01" };
  const inp = { dateSortie: "2026-01-31", motif: "Licenciement faute lourde", preavisEffectue: "NON", jours: 30, joursCP: 0, sgmm: "", totalCdd: "", sansGrat: false };
  const ctx = { groupe: "Ouvrier / Employé", catSal: 0, histAvg: 0, histBrut: 0, soldeConge: 0 };
  const r = Engine.rupture(e, inp, P, ctx);
  const indem = r.items.find((x) => x.lib.includes("licenciement") || x.lib.includes("départ"));
  assert.equal(indem.mt, 0, "Faute lourde → indemnité 0");
});

test("rupture — net = total - cnps - its - cmu", () => {
  const e = { ...EMP_TEST, dateEntree: "2018-01-01" };
  const inp = { dateSortie: "2026-01-31", motif: "Licenciement", preavisEffectue: "OUI", jours: 31, joursCP: 5, sgmm: "", totalCdd: "", sansGrat: false };
  const ctx = { groupe: "Ouvrier / Employé", catSal: 0, histAvg: 0, histBrut: 0, soldeConge: 5 };
  const r = Engine.rupture(e, inp, P, ctx);
  assert.equal(r.net, r.total - r.cnps - r.its - r.cmu);
});
