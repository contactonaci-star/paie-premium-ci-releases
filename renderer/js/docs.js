/* Générateurs de documents imprimables (A4) */
const Docs = (() => {
  const { esc, fmt, fmt0, pct, fmtD, perLabel } = UI;
  const ent = () => Store.get().entreprise;
  const P = () => Store.get().params;
  const n = (v) => fmt(v);

  function header(title, sub = "") {
    const e = ent();
    return `<div class="head">
      <div style="display:flex;gap:12px;align-items:center">${e.logo ? `<img class="logo" src="${e.logo}">` : ""}
        <div><div style="font-size:14px;font-weight:800">${esc(e.nom || "NOM DE L'ENTREPRISE")}</div>
        <div class="muted">${esc(e.adresse)} ${e.ville ? ", " + esc(e.ville) : ""}</div>
        <div class="muted">${e.tel ? "Tél : " + esc(e.tel) : ""} ${e.email ? " | " + esc(e.email) : ""}</div>
        <div class="muted">NCC : ${esc(e.ncc)} | N° CNPS : ${esc(e.cnps)} ${e.rccm ? "| RCCM : " + esc(e.rccm) : ""}</div></div></div>
      <div style="text-align:right;min-width:240px"><div class="title-box">${title}</div>${sub ? `<div style="margin-top:6px;font-weight:600">${sub}</div>` : ""}</div></div>`;
  }

  function cumuls(R) {
    const S = Store.get(); const y = R.periode.slice(0, 4);
    const prev = S.historique.filter((h) => h.id === R.id && h.periode.startsWith(y) && h.periode < R.periode);
    const sum = (k) => prev.reduce((s, h) => s + (h[k] || 0), 0) + (R[k] || 0);
    return { bimp: sum("bimp"), its: sum("its"), cnps: sum("cnps"), net: sum("net"), btot: sum("btot") };
  }

  function bulletin(R) {
    const e = R.emp || {}; const Pp = P(); const S = Store.get();
    const cat = S.categories.find((c) => c.code === e.categorie);
    const v = (Store.isClosed(R.periode) ? {} : Store.vars(R.id, R.periode));
    const hsV = (k) => (v[k] || (R[k] && R.th ? Math.round(R[k] / (R.th * (1 + Pp[k])) * 100) / 100 : 0));
    const L = [];
    const line = (code, lib, nb, base, tx, gain, ret, txp, pat, cls = "") => L.push({ code, lib, nb, base, tx, gain, ret, txp, pat, cls });
    line(100, "Salaire de base", R.jpay, R.basem, "", R.sb);
    if (R.ss || R.sursm) line(110, "Sursalaire", R.jpay, R.sursm, "", R.ss);
    if (R.pa) line(120, "Prime d'ancienneté", R.anc + " an(s)", R.basem, pct(R.txanc), R.pa);
    [["hs1", 130, "15"], ["hs2", 131, "50"], ["hs3", 132, "75"], ["hs4", 133, "100"]].forEach(([k, c, t]) => { if (R[k]) line(c, `Heures supplémentaires ${t} %`, hsV(k), R.th, pct(1 + Pp[k], 0), R[k]); });
    if (R.presp) line(140, "Prime de responsabilité", "", "", "", R.presp);
    if (R.pfonc) line(150, "Prime de fonction", "", "", "", R.pfonc);
    if (R.prend) line(160, "Prime de rendement", "", "", "", R.prend);
    if (R.paut) line(170, "Autre prime imposable", "", "", "", R.paut);
    if (R.an) line(180, "Avantage en nature", "", "", "", R.an);
    if (R.cp) line(190, "Indemnité de congés payés", "", "", "", R.cp);
    if (R.grat) line(200, "Gratification", "", "", "", R.grat);
    if (R.trimp) line(210, "Indemnité de transport (part imposable)", "", "", "", R.trimp);
    line("", "SALAIRE BRUT IMPOSABLE", "", "", "", R.bimp, "", "", "", "sub");
    line(500, "ITS - Impôt sur traitements et salaires", R.parts + " part(s)", R.bimp, "Barème", "", R.its, pct(R.txitsp, 1), R.itsp);
    line(501, "Taxe d'apprentissage (FDFP)", "", R.bimp, "", "", "", pct(Pp.txTA, 1), R.ta);
    line(502, "Formation professionnelle continue (FDFP)", "", R.bimp, "", "", "", pct(Pp.txFPC, 1), R.fpc);
    line(503, "FPC complémentaire (FDFP)", "", R.bimp, "", "", "", pct(Pp.txFPCC, 1), R.fpcc);
    line(507, "Régime de retraite CNPS", "", R.bret, pct(Pp.txRetSal), "", R.cnps, pct(Pp.txRetPat), R.retp);
    line(504, "Prestations familiales CNPS", "", R.bpf, "", "", "", pct(Pp.txPF), R.pf);
    line(505, "Assurance maternité CNPS", "", R.bpf, "", "", "", pct(Pp.txMat), R.mater);
    line(506, "Accident du travail CNPS", "", R.bpf, "", "", "", pct(Pp.txAT), R.at);
    line(508, "CMU (salarié / employeur)", R.actif ? 1 : "", Pp.cmuSal + Pp.cmuPat, "", "", R.cmus, "", R.cmup);
    if (R.cmua) line(509, "CMU autres bénéficiaires", R.nbBenef, Pp.cmuAutre, "", "", R.cmua);
    line("", "TOTAL COTISATIONS ET IMPÔTS", "", "", "", "", R.tcot, "", R.tpat, "sub");
    if (R.trexo) line(700, "Indemnité de transport non imposable", "", "", "", R.trexo);
    if (R.ni) line(710, "Autres indemnités non imposables", "", "", "", R.ni);
    if (R.acpt) line(600, "Acompte / avance sur salaire", "", "", "", "", R.acpt);
    if (R.pret) line(610, "Remboursement de prêt", "", "", "", "", R.pret);
    if (R.assur) line(620, "Assurance maladie / mutuelle", "", "", "", "", R.assur);
    if (R.autr) line(630, "Autres retenues", "", "", "", "", R.autr);
    if (R.anded) line(181, "Avantage en nature (régularisation)", "", "", "", "", R.anded);
    const c = cumuls(R);
    const nb = (x) => (typeof x === "number" ? fmt(x, x % 1 ? 2 : 0) : esc(x));
    const conge = R.conge ? R.conge.apres : null;
    return `<div class="doc">
      ${header("BULLETIN DE PAIE", `Période : ${perLabel(R.periode)}`)}
      <table class="infos" style="margin-bottom:8px">
        <tr><td class="l">Matricule</td><td>${esc(e.matricule)}</td><td class="l">Nom & prénoms</td><td colspan="3"><b>${esc(R.nom)}</b></td></tr>
        <tr><td class="l">Emploi</td><td>${esc(e.fonction)}</td><td class="l">Catégorie</td><td>${esc(e.categorie)}${cat ? " - " + esc(cat.groupe) : ""}</td><td class="l">N° CNPS</td><td>${esc(e.cnps)}</td></tr>
        <tr><td class="l">Département</td><td>${esc(e.departement)}</td><td class="l">Date d'entrée</td><td>${fmtD(e.dateEntree)}</td><td class="l">Ancienneté</td><td>${R.anc} an(s)</td></tr>
        <tr><td class="l">Situation</td><td>${esc(e.situation)}, ${R.parts} part(s)</td><td class="l">Contrat</td><td>${esc(e.contrat)}</td><td class="l">Paiement</td><td>${esc(e.modePaiement || "")} ${e.modePaiement ? "| " : ""}${fmtD(R.datePaiement || Store.datePaiement(R.periode))}</td></tr>
      </table>
      <table>
        <thead><tr><th rowspan="2">N°</th><th rowspan="2">Désignation</th><th rowspan="2">Nombre</th><th rowspan="2">Base</th><th colspan="3">Part salariale</th><th colspan="2" style="background:#7f6000">Part patronale</th></tr>
        <tr><th>Taux</th><th>Gains</th><th>Retenues</th><th style="background:#7f6000">Taux</th><th style="background:#7f6000">Montant</th></tr></thead>
        <tbody>${L.map((l) => `<tr class="${l.cls}"><td class="center muted">${l.code}</td><td>${esc(l.lib)}</td><td class="num">${nb(l.nb)}</td><td class="num">${l.base !== "" ? fmt(l.base, l.code >= 130 && l.code <= 133 ? 2 : 0) : ""}</td><td class="num">${l.tx}</td><td class="num">${l.gain !== "" ? fmt(l.gain) : ""}</td><td class="num">${l.ret !== "" && l.ret !== undefined ? fmt(l.ret) : ""}</td><td class="num">${l.txp || ""}</td><td class="num">${l.pat !== "" && l.pat !== undefined ? fmt(l.pat) : ""}</td></tr>`).join("")}</tbody>
        <tfoot><tr class="tot"><td colspan="5" style="text-align:right">TOTAUX</td><td class="num">${fmt(R.btot)}</td><td class="num">${fmt(R.tret)}</td><td></td><td class="num">${fmt(R.tpat)}</td></tr></tfoot>
      </table>
      <table style="margin-top:10px"><tr>
        <th>Salaire brut</th><th>Brut imposable</th><th>Charges salariales</th><th>Charges patronales</th><th>Coût employeur</th><th style="background:#c00000">Net à payer</th></tr>
        <tr><td class="num">${fmt0(R.btot)}</td><td class="num">${fmt0(R.bimp)}</td><td class="num">${fmt0(R.tcot)}</td><td class="num">${fmt0(R.tpat)}</td><td class="num">${fmt0(R.cout)}</td><td class="net-box">${fmt0(R.net)} FCFA</td></tr></table>
      <div style="margin:8px 0;font-style:italic">Arrêté le présent bulletin à la somme nette de : <b>${Engine.enLettres(R.net)} francs CFA</b>.</div>
      <table><tr><th colspan="5" style="background:#e7e9ee;color:#111">Cumuls annuels ${R.periode.slice(0, 4)}</th></tr>
        <tr><td>Brut : <b>${fmt0(c.btot)}</b></td><td>Brut imposable : <b>${fmt0(c.bimp)}</b></td><td>ITS : <b>${fmt0(c.its)}</b></td><td>CNPS : <b>${fmt0(c.cnps)}</b></td><td>Net payé : <b>${fmt0(c.net)}</b></td></tr>
        ${conge !== null ? `<tr><td colspan="5">Congés : solde de <b>${(conge || 0).toFixed(1)}</b> jour(s) ouvrable(s)</td></tr>` : ""}</table>
      <div class="sign"><span>Signature de l'employeur</span><span>Signature du salarié</span></div>
      <div class="center muted" style="margin-top:34px;font-style:italic">${esc(ent().slogan)}</div>
    </div>`;
  }

  function tableDoc(title, sub, heads, rows, foot, { land = true } = {}) {
    return `<div class="doc ${land ? "land" : ""}">${header(title, sub)}
      <table><thead><tr>${heads.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td class="${typeof c === "number" ? "num" : ""}">${typeof c === "number" ? fmt(c) : esc(c)}</td>`).join("")}</tr>`).join("")}</tbody>
      ${foot ? `<tfoot><tr class="tot">${foot.map((c) => `<td class="num">${typeof c === "number" ? fmt(c) : esc(c)}</td>`).join("")}</tr></tfoot>` : ""}</table>
      <div class="sign"><span>Fait à ${esc(ent().ville)}, le ${fmtD(UI.todayISO())}</span><span>Cachet et signature</span></div></div>`;
  }

  function form(title, sub, blocks) {
    const e = ent();
    return `<div class="doc">
      <div class="center" style="font-weight:700">RÉPUBLIQUE DE CÔTE D'IVOIRE<br><span class="muted" style="font-weight:400">Union — Discipline — Travail</span></div>
      <div class="title-box" style="margin:12px 0">${title}</div><div class="center" style="font-weight:700;margin-bottom:10px">${sub}</div>
      <table class="infos" style="margin-bottom:12px">
        <tr><td class="l">Raison sociale</td><td>${esc(e.nom)}</td><td class="l">NCC</td><td>${esc(e.ncc)}</td></tr>
        <tr><td class="l">Adresse</td><td>${esc(e.adresse)} ${esc(e.ville)}</td><td class="l">N° CNPS</td><td>${esc(e.cnps)}</td></tr>
        <tr><td class="l">Activité</td><td>${esc(e.activite)}</td><td class="l">Centre des impôts</td><td>${esc(e.cdi)}</td></tr>
        <tr><td class="l">Téléphone</td><td>${esc(e.tel)}</td><td class="l">Régime</td><td>${esc(e.regime)}</td></tr>
      </table>${blocks}
      <div class="sign"><span>Fait à ${esc(e.ville)}, le ${fmtD(UI.todayISO())}</span><span>Cachet et signature</span></div></div>`;
  }

  function letter(title, bodyHtml, { date } = {}) {
    const e = ent();
    return `<div class="doc letter">${header(title)}
      <div style="margin-top:30px">${bodyHtml}</div>
      <p style="text-align:right;margin-top:30px">Fait à ${esc(e.ville)}, le ${fmtD(date || UI.todayISO())}</p>
      <p style="text-align:right;font-weight:700;margin-top:50px">${esc(e.dirigeant)}<br><span style="font-weight:400">${esc(e.qualite)}</span></p></div>`;
  }

  return { header, bulletin, tableDoc, form, letter };
})();
