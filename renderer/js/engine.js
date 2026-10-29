/* Moteur de paie Côte d'Ivoire — identique au fichier Excel validé */
(function (root) {
  const DEFAULT_PARAMS = {
    smig: 75000, heuresMois: 173.33,
    txRetSal: 0.063, txRetPat: 0.077, plafRet: 1647315,
    txPF: 0.05, txMat: 0.0075, txAT: 0.03, plafPF: 75000,
    cmuSal: 500, cmuPat: 500, cmuAutre: 1000,
    ricf: 5500, partsMax: 5, itspLoc: 0.012, itspExp: 0.104, plafTransport: 30000,
    txTA: 0.004, txFPC: 0.006, txFPCC: 0.006,
    ancMin: 2, ancTaux: 0.01, ancMax: 0.25,
    hs1: 0.15, hs2: 0.5, hs3: 0.75, hs4: 1,
    congeJours: 2.2, congeCoef: 1.25,
    gratTaux: 0.75, gratMois: 12,
    licT1: 0.30, licT2: 0.35, licT3: 0.40, licMin: 1, finCdd: 0.03,
    bareme: [[0, 0], [75000, 0.16], [240000, 0.21], [800000, 0.24], [2400000, 0.28], [8000000, 0.32]],
    congeSup: [[0, 0], [5, 1], [10, 2], [15, 3], [20, 5], [25, 7]],
    preavis: { "Ouvrier / Employé": [1, 2, 3, 4], "Agent de maîtrise / Technicien": [2, 2, 3, 4], "Cadre": [3, 3, 3, 4] },
    essai: { "Ouvrier / Employé": "1 mois", "Agent de maîtrise / Technicien": "2 mois", "Cadre": "3 mois" },
    motifs: [
      { nom: "Licenciement", lic: true, preavis: true, cdd: false },
      { nom: "Licenciement économique", lic: true, preavis: true, cdd: false },
      { nom: "Licenciement faute lourde", lic: false, preavis: false, cdd: false },
      { nom: "Démission", lic: false, preavis: false, cdd: false },
      { nom: "Fin de CDD", lic: false, preavis: false, cdd: true },
      { nom: "Départ à la retraite", lic: true, preavis: false, cdd: false },
      { nom: "Décès", lic: true, preavis: false, cdd: false },
      { nom: "Rupture d'un commun accord", lic: true, preavis: false, cdd: false }
    ],
    comptes: {
      sal: "6611", prime: "6612", cp: "6613", an: "6617", ind: "6618", cnpsp: "6641", cmup: "6648", itsp: "6413", fdfp: "6414",
      net: "4221", acpt: "4211", pret: "4212", cnps: "4311", cmu: "4381", its: "4471", itspc: "4472", fdfpc: "4473",
      assur: "4386", autr: "4288", anc: "781"
    }
  };

  const r0 = (x) => { x = Number(x) || 0; return Math.sign(x) * Math.round(Math.abs(x) + 1e-9); };
  const N = (x) => { const v = Number(x); return isFinite(v) ? v : 0; };
  const parseD = (s) => { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); if (!y) return null; return new Date(Date.UTC(y, m - 1, d)); };
  const fmtISO = (d) => d.toISOString().slice(0, 10);
  const DAY = 86400000;
  const daysBetween = (a, b) => Math.round((b - a) / DAY);
  function periodBounds(p) { const [y, m] = p.split("-").map(Number); const debut = new Date(Date.UTC(y, m - 1, 1)); const fin = new Date(Date.UTC(y, m, 0)); return { y, m, debut, fin, jcal: fin.getUTCDate() }; }
  function fullYears(a, b) { if (!a || !b || b < a) return 0; let y = b.getUTCFullYear() - a.getUTCFullYear(); if (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate())) y--; return Math.max(0, y); }
  function fullMonths(a, b) { if (!a || !b || b < a) return 0; let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth(); if (b.getUTCDate() < a.getUTCDate()) m--; return Math.max(0, m); }
  function yearFrac(a, b) { // approx. base réelle (YEARFRAC base 1)
    if (!a || !b || b <= a) return 0; let y = fullYears(a, b); const ann = new Date(Date.UTC(a.getUTCFullYear() + y, a.getUTCMonth(), a.getUTCDate())); const next = new Date(Date.UTC(a.getUTCFullYear() + y + 1, a.getUTCMonth(), a.getUTCDate())); return y + daysBetween(ann, b) / daysBetween(ann, next);
  }

  function partsCalc(situation, enfants, P) {
    const q = N(enfants); let p;
    if (situation === "Marié(e)") p = 2 + 0.5 * q;
    else if (q > 0) p = (situation === "Veuf(ve)" ? 2 : 1.5) + 0.5 * q;
    else p = 1;
    return Math.min(P.partsMax, p);
  }
  function empParts(e, P) { return e.partsForce ? Math.min(P.partsMax, N(e.partsForce)) : partsCalc(e.situation, e.enfants, P); }
  function itsBrut(base, P) { let t = 0; for (let i = 0; i < P.bareme.length; i++) { const lo = P.bareme[i][0]; const diff = P.bareme[i][1] - (i ? P.bareme[i - 1][1] : 0); if (base > lo) t += (base - lo) * diff; } return r0(t); }
  function ricf(parts, P) { return Math.max(0, (Math.min(parts, P.partsMax) - 1) * 2) * P.ricf; }
  function its(base, parts, P) { return Math.max(0, itsBrut(base, P) - ricf(parts, P)); }
  function tauxAnc(years, P) { return years < P.ancMin ? 0 : Math.min(years * P.ancTaux, P.ancMax); }

  function computeEmployee(e, v, P, period, extra) {
    v = v || {}; extra = extra || {};
    const { debut, fin, jcal } = periodBounds(period);
    const entree = parseD(e.dateEntree), sortie = parseD(e.dateSortie);
    let pres = 0;
    if (e.actif !== false && entree) { const end = sortie ? (sortie < fin ? sortie : fin) : fin; const start = entree > debut ? entree : debut; pres = Math.max(0, daysBetween(start, end) + 1); }
    const jpres = pres >= jcal ? 30 : Math.min(30, pres);
    const jabs = Math.min(jpres, N(v.abs) + N(v.conge));
    const jpay = jpres - jabs;
    const actif = jpres > 0 ? 1 : 0;
    const pro = jpay / 30;
    const anc = entree ? fullYears(entree, fin) : 0;
    const txanc = tauxAnc(anc, P);
    const basem = N(e.base), sursm = N(e.sursalaire);
    const R = { id: e.id, mat: e.matricule, nom: (e.nom + " " + (e.prenoms || "")).trim(), fonction: e.fonction || "", categorie: e.categorie || "", dept: e.departement || "", service: e.service || "", statut: e.statut || "Local", sexe: e.sexe || "",
      pres, jpres, jabs, jpay, actif, pro, anc, txanc, basem, sursm };
    R.sb = r0(basem * pro); R.ss = r0(sursm * pro); R.pa = r0(basem * txanc * pro);
    R.th = Math.round((basem + sursm) / P.heuresMois * 100) / 100;
    R.hs1 = r0(N(v.hs1) * R.th * (1 + P.hs1)); R.hs2 = r0(N(v.hs2) * R.th * (1 + P.hs2)); R.hs3 = r0(N(v.hs3) * R.th * (1 + P.hs3)); R.hs4 = r0(N(v.hs4) * R.th * (1 + P.hs4));
    R.presp = r0(N(e.primeResp) * pro); R.pfonc = r0(N(e.primeFonction) * pro);
    R.prend = N(v.prend); R.paut = N(v.paut); R.an = r0(N(e.avantageNature) * pro);
    R.cp = N(extra.cp); R.grat = N(extra.grat);
    R.transp = r0(N(e.transport) * pro); R.trexo = Math.min(R.transp, P.plafTransport); R.trimp = R.transp - R.trexo;
    R.ni = r0(N(e.indemNI) * pro) + N(v.ni);
    R.bimp = R.sb + R.ss + R.pa + R.hs1 + R.hs2 + R.hs3 + R.hs4 + R.presp + R.pfonc + R.prend + R.paut + R.an + R.cp + R.grat + R.trimp;
    R.btot = R.bimp + R.trexo + R.ni;
    R.bret = Math.min(R.bimp, P.plafRet); R.cnps = r0(R.bret * P.txRetSal);
    R.parts = empParts(e, P); R.itsb = itsBrut(R.bimp, P); R.ricf = actif ? ricf(R.parts, P) : 0; R.its = Math.max(0, R.itsb - R.ricf);
    R.cmus = actif * P.cmuSal; R.cmua = actif * N(e.cmuBenef) * P.cmuAutre; R.nbBenef = actif ? N(e.cmuBenef) : 0;
    R.tcot = R.cnps + R.its + R.cmus + R.cmua;
    R.acpt = N(v.acpt); R.pret = N(extra.pret); R.assur = N(v.assur) + (v.assur === undefined || v.assur === "" ? N(e.assuranceFixe) : 0); R.autr = N(v.autr);
    R.anded = R.an;
    R.tret = R.tcot + R.acpt + R.pret + R.assur + R.autr + R.anded;
    R.net = R.btot - R.tret;
    R.retp = r0(R.bret * P.txRetPat); R.bpf = Math.min(R.bimp, P.plafPF);
    R.pf = r0(R.bpf * P.txPF); R.mater = r0(R.bpf * P.txMat); R.at = r0(R.bpf * P.txAT);
    R.tcnpsp = R.retp + R.pf + R.mater + R.at; R.cmup = actif * P.cmuPat;
    R.txitsp = R.statut === "Expatrié" ? P.itspExp : P.itspLoc; R.itsp = r0(R.bimp * R.txitsp);
    R.ta = r0(R.bimp * P.txTA); R.fpc = r0(R.bimp * P.txFPC); R.fpcc = r0(R.bimp * P.txFPCC);
    R.tfiscp = R.itsp + R.ta + R.fpc + R.fpcc; R.tpat = R.tcnpsp + R.cmup + R.tfiscp; R.cout = R.btot + R.tpat;
    return R;
  }

  /* Congés */
  function congeInfo(e, P, period, histAvg) {
    const c = e.conge || {}; const { fin } = periodBounds(period);
    const entree = parseD(e.dateEntree); if (!entree) return { mois: 0, acquis: 0, sup: 0, total: 0, pris: 0, solde: 0, ref: 0, alloc: 0, provision: 0, apres: 0 };
    // sans date de référence : acquisition depuis le 1er janvier de l'année (ou l'entrée si plus récente)
    const jan = new Date(Date.UTC(fin.getUTCFullYear(), 0, 1));
    const ref = parseD(c.dateRef) || (entree > jan ? entree : jan);
    const mois = fullMonths(ref, new Date(fin.getTime() + DAY));
    const acquis = Math.round(mois * P.congeJours * 10) / 10;
    const anc = fullYears(entree, fin); let sup = 0; for (const [a, j] of P.congeSup) if (anc >= a) sup = j;
    const total = acquis + sup + N(c.joursAutres);
    const solde = total - N(c.joursPris);
    const fixe = N(e.base) + N(e.sursalaire) + r0(N(e.base) * tauxAnc(anc, P)) + N(e.primeResp) + N(e.primeFonction) + N(e.avantageNature);
    const salRef = N(c.salaireRef) || (histAvg > 0 ? r0(histAvg) : fixe);
    const ceMois = N(c.joursCeMois);
    const alloc = ceMois > 0 ? r0(salRef * ceMois * P.congeCoef / 30) : 0;
    const apres = solde - ceMois;
    const provision = r0(salRef * Math.max(0, apres) * P.congeCoef / 30);
    let retour = ""; if (c.dateDepart && ceMois > 0) { retour = fmtISO(new Date(parseD(c.dateDepart).getTime() + Math.round(ceMois * P.congeCoef) * DAY)); }
    return { mois, acquis, sup, total, pris: N(c.joursPris), solde, salRef, ceMois, alloc, apres, provision, retour, anc };
  }

  /* Gratification */
  function gratInfo(e, P, period, catSal, v) {
    const { y, m } = periodBounds(period); v = v || {};
    const entree = parseD(e.dateEntree); if (!entree) return { jours: 0, prorata: 0, theorique: 0, retenu: 0, verse: 0, base: 0 };
    const d0 = new Date(Date.UTC(y, 0, 1)), d1 = new Date(Date.UTC(y, 11, 31));
    const start = entree > d0 ? entree : d0; const s = parseD(e.dateSortie); const end = s && s < d1 ? s : d1;
    const jours = Math.max(0, daysBetween(start, end) + 1); const prorata = jours / (daysBetween(d0, d1) + 1);
    const base = catSal > 0 ? catSal : N(e.base);
    const theorique = r0(base * P.gratTaux * prorata);
    const retenu = v.gratManuel !== undefined && v.gratManuel !== "" && v.gratManuel !== null ? N(v.gratManuel) : theorique;
    const verse = (v.gratForce || m === N(P.gratMois)) ? retenu : 0;
    return { jours, prorata, base, theorique, retenu, verse };
  }

  /* Prêt : échéance automatique */
  function pretEcheance(e, v) {
    if (v && v.pret !== undefined && v.pret !== "" && v.pret !== null) return N(v.pret);
    const p = e.pret || {}; return Math.max(0, Math.min(N(p.mensualite), N(p.restant)));
  }

  /* Paie inverse */
  function inverse(inp, P, period) {
    const { fin } = periodBounds(period);
    const ent = parseD(inp.dateEntree); const anc = ent ? fullYears(ent, fin) : 0; const tx = tauxAnc(anc, P);
    const base = N(inp.base), pa = r0(base * tx), transp = N(inp.transport);
    const parts = partsCalc(inp.situation, inp.enfants, P); const rc = ricf(parts, P);
    const cmu = P.cmuSal + N(inp.cmuBenef) * P.cmuAutre;
    const fixImp = base + pa + N(inp.primeResp) + N(inp.autrePrime) + Math.max(0, transp - P.plafTransport);
    const nonImp = Math.min(transp, P.plafTransport) + N(inp.indemNI);
    const net = (G) => G + nonImp - r0(Math.min(G, P.plafRet) * P.txRetSal) - Math.max(0, itsBrut(G, P) - rc) - cmu;
    const target = N(inp.net);
    let surs = 0;
    if (target > 0 && net(fixImp) < target) { let lo = 0, hi = Math.max(1000000, target * 5); for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (net(fixImp + mid) < target) lo = mid; else hi = mid; } surs = Math.ceil(hi - 1e-9); }
    const bimp = fixImp + surs, btot = bimp + nonImp;
    const cnps = r0(Math.min(bimp, P.plafRet) * P.txRetSal), itsv = Math.max(0, itsBrut(bimp, P) - rc);
    const tret = cnps + itsv + cmu, netv = btot - tret;
    const retp = r0(Math.min(bimp, P.plafRet) * P.txRetPat), bpf = Math.min(bimp, P.plafPF);
    const pfmat = r0(bpf * P.txPF) + r0(bpf * P.txMat) + r0(bpf * P.txAT);
    const fisc = r0(bimp * (inp.statut === "Expatrié" ? P.itspExp : P.itspLoc)) + r0(bimp * P.txTA) + r0(bimp * P.txFPC) + r0(bimp * P.txFPCC);
    const tpat = retp + pfmat + P.cmuPat + fisc;
    return { anc, tx, pa, surs, parts, ricf: rc, bimp, btot, cnps, itsb: itsBrut(bimp, P), its: itsv, cmu, tret, net: netv, ecart: netv - target, retp, pfmat, cmup: P.cmuPat, fisc, tpat, cout: btot + tpat, trimp: Math.max(0, transp - P.plafTransport), trexo: Math.min(transp, P.plafTransport) };
  }

  /* Rupture */
  function rupture(e, inp, P, ctx) {
    const sortie = parseD(inp.dateSortie), entree = parseD(e.dateEntree); if (!sortie || !entree) return null;
    const ancD = yearFrac(entree, sortie); const ancI = Math.floor(ancD);
    const groupe = ctx.groupe || "Ouvrier / Employé";
    const fixe = N(e.base) + N(e.sursalaire) + r0(N(e.base) * tauxAnc(ancI, P)) + N(e.primeResp) + N(e.primeFonction) + N(e.avantageNature);
    const sgmm = N(inp.sgmm) || (ctx.histAvg > 0 ? r0(ctx.histAvg) : fixe);
    const motif = P.motifs.find((x) => x.nom === inp.motif) || { lic: false, preavis: false, cdd: false };
    const pv = P.preavis[groupe] || [1, 2, 3, 4];
    const dureePreavis = ancD < 6 ? pv[0] : ancD < 11 ? pv[1] : ancD < 16 ? pv[2] : pv[3];
    const jours = N(inp.jours);
    const transp = r0(N(e.transport) * jours / 30);
    const joursCP = inp.joursCP !== "" && inp.joursCP !== undefined && inp.joursCP !== null ? N(inp.joursCP) : Math.max(0, ctx.soldeConge || 0);
    const y = sortie.getUTCFullYear(); const d0 = new Date(Date.UTC(y, 0, 1)); const d1 = new Date(Date.UTC(y, 11, 31));
    const catBase = ctx.catSal > 0 ? ctx.catSal : N(e.base);
    const items = [
      { lib: "Salaire du mois de sortie (prorata)", mt: r0(fixe * jours / 30), imp: true, note: "Salaire fixe × jours / 30" },
      { lib: "Indemnité de transport (non imposable)", mt: Math.min(transp, P.plafTransport), imp: false, note: "Dans la limite exonérée" },
      { lib: "Indemnité de transport (excédent imposable)", mt: Math.max(0, transp - P.plafTransport), imp: true, note: "" },
      { lib: "Indemnité compensatrice de congés payés", mt: r0(sgmm * joursCP * P.congeCoef / 30), imp: true, note: `${joursCP} j × SGMM × ${P.congeCoef} / 30` },
      { lib: "Indemnité compensatrice de préavis", mt: motif.preavis && inp.preavisEffectue !== "OUI" ? r0(sgmm * dureePreavis) : 0, imp: true, note: `${dureePreavis} mois de préavis` },
      { lib: "Gratification au prorata", mt: inp.sansGrat ? 0 : r0(catBase * P.gratTaux * Math.max(0, daysBetween(entree > d0 ? entree : d0, sortie) + 1) / (daysBetween(d0, d1) + 1)), imp: true, note: `${Math.round(P.gratTaux * 100)} % du salaire catégoriel au prorata` },
      { lib: "Indemnité de licenciement / départ", mt: motif.lic && ancD >= P.licMin ? r0(sgmm * (P.licT1 * Math.min(ancD, 5) + P.licT2 * Math.max(0, Math.min(ancD, 10) - 5) + P.licT3 * Math.max(0, ancD - 10))) : 0, imp: false, note: "30 % / 35 % / 40 % du SGMM par année" },
      { lib: "Indemnité de fin de CDD", mt: motif.cdd ? r0(P.finCdd * (N(inp.totalCdd) || (ctx.histBrut + r0(fixe * jours / 30)))) : 0, imp: true, note: `${P.finCdd * 100} % des salaires bruts du contrat` }
    ];
    const total = items.reduce((s, x) => s + x.mt, 0), imposable = items.filter((x) => x.imp).reduce((s, x) => s + x.mt, 0);
    const parts = empParts(e, P);
    const cnps = r0(Math.min(imposable, P.plafRet) * P.txRetSal), itsv = Math.max(0, itsBrut(imposable, P) - ricf(parts, P)), cmu = jours > 0 ? P.cmuSal : 0;
    return { ancD, ancI, groupe, fixe, sgmm, motif, dureePreavis, joursCP, items, total, imposable, nonImposable: total - imposable, cnps, its: itsv, cmu, tret: cnps + itsv + cmu, net: total - cnps - itsv - cmu };
  }

  /* Montant en lettres (français) */
  function enLettres(n) {
    n = Math.round(Math.abs(Number(n) || 0)); if (n === 0) return "zéro";
    const U = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
    const D = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];
    function sub100(x) { if (x < 20) return U[x]; const d = Math.floor(x / 10), u = x % 10; if (d === 7 || d === 9) { return D[d] + (d === 7 && u === 1 ? "-et-" : "-") + U[10 + u]; } if (u === 0) return D[d] + (d === 8 ? "s" : ""); return D[d] + (u === 1 && d !== 8 ? "-et-" : "-") + U[u]; }
    function sub1000(x) { const c = Math.floor(x / 100), r = x % 100; let s = ""; if (c) s = (c > 1 ? U[c] + " cent" + (r === 0 ? "s" : "") : "cent"); if (r) s += (s ? " " : "") + sub100(r); return s; }
    const parts = []; const mds = Math.floor(n / 1e9), mns = Math.floor((n % 1e9) / 1e6), mls = Math.floor((n % 1e6) / 1000), rest = n % 1000;
    if (mds) parts.push(sub1000(mds) + " milliard" + (mds > 1 ? "s" : ""));
    if (mns) parts.push(sub1000(mns) + " million" + (mns > 1 ? "s" : ""));
    if (mls) parts.push(mls === 1 ? "mille" : sub1000(mls).replace(/cents$/, "cent") + " mille");
    if (rest) parts.push(sub1000(rest));
    return parts.join(" ");
  }

  const api = { DEFAULT_PARAMS, r0, N, parseD, fmtISO, periodBounds, fullYears, fullMonths, yearFrac, partsCalc, empParts, itsBrut, ricf, its, tauxAnc, computeEmployee, congeInfo, gratInfo, pretEcheance, inverse, rupture, enLettres };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Engine = api;
})(this);
