/* Pages : bulletins, livre de paie, paie inverse, états, déclarations, annuel, comptabilité */
(() => {
  const { $, $$, esc, fmt, fmt0, pct, fmtD, ico, toast, modal, chart, PAL, moneyTick, table, perLabel, printDocs, exportXLSX } = UI;
  const S = () => Store.get();
  const P = () => S().params;
  const docBar = (extra = "") => `<div class="toolbar">${extra}<div class="spacer"></div><button class="btn" data-print>${ico("print")} Imprimer</button><button class="btn btn-primary" data-pdf>${ico("pdf")} Enregistrer en PDF</button></div>`;
  function bindDoc(el, html, name, land) { const pr = $("[data-print]", el), pd = $("[data-pdf]", el); if (pr) pr.onclick = () => printDocs(html(), { landscape: land }); if (pd) pd.onclick = () => printDocs(html(), { pdfName: name, landscape: land }); }
  const paid = (p) => Store.compute(p).filter((r) => r.actif || r.net);

  /* ============ BULLETINS ============ */
  Pages.bulletins = {
    title: "Bulletins de paie", group: "Paie du mois", icon: "doc", sub: () => `${perLabel(App.view)} · aperçu, impression et PDF`, sel: null,
    render(el) {
      const list = paid(App.view);
      if (!list.length) { el.innerHTML = `<div class="note">Aucun salarié payé pour ${perLabel(App.view)}.</div>`; return; }
      if (!list.find((r) => r.id === this.sel)) this.sel = list[0].id;
      el.innerHTML = `<div class="grid" style="grid-template-columns:300px 1fr;align-items:start">
        <div class="card" style="padding:12px"><input class="search" id="bs" placeholder="Rechercher…" style="max-width:none;margin-bottom:10px"><div id="bl" style="max-height:calc(100vh - 260px);overflow:auto"></div></div>
        <div><div class="toolbar"><button class="btn" id="pAll">${ico("print")} Imprimer tous (${list.length})</button><button class="btn" id="pdfAll">${ico("pdf")} PDF de tous les bulletins</button><div class="spacer"></div><button class="btn" data-print>${ico("print")} Imprimer</button><button class="btn btn-primary" data-pdf>${ico("pdf")} PDF</button></div><div class="doc-wrap" id="bv"></div></div></div>`;
      const drawList = (q = "") => { $("#bl").innerHTML = list.filter((r) => !q || (r.nom + r.mat).toLowerCase().includes(q)).map((r) => `<div class="nav-item" data-id="${r.id}" style="color:var(--ink);${r.id === this.sel ? "background:var(--blue-bg)" : ""}"><span class="avatar" style="background:${UI.avatarColor(r.nom)}">${UI.initials(r.nom)}</span><div style="flex:1;min-width:0"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis">${esc(r.nom)}</div><div class="hint">${esc(r.mat)} · net ${fmt0(r.net)}</div></div></div>`).join(""); $$("#bl [data-id]").forEach((d) => (d.onclick = () => { this.sel = d.dataset.id; drawList(q); show(); })); };
      const cur = () => list.find((r) => r.id === this.sel);
      const show = () => ($("#bv").innerHTML = Docs.bulletin(cur()));
      $("#bs").oninput = (e) => drawList(e.target.value.toLowerCase());
      drawList(); show();
      $("[data-print]", el).onclick = () => printDocs(Docs.bulletin(cur()));
      $("[data-pdf]", el).onclick = () => printDocs(Docs.bulletin(cur()), { pdfName: `Bulletin_${cur().mat}_${App.view}` });
      const all = () => list.map((r) => Docs.bulletin(r)).join('<div class="page-break"></div>');
      $("#pAll").onclick = () => printDocs(all());
      $("#pdfAll").onclick = () => printDocs(all(), { pdfName: `Bulletins_${App.view}` });
    }
  };

  /* ============ LIVRE DE PAIE ============ */
  const LCOLS = [["mat", "Matricule"], ["nom", "Nom & prénoms"], ["jpay", "Jours", 1], ["sb", "Salaire base", 1], ["ss", "Sursalaire", 1], ["pa", "Ancienneté", 1], ["hs", "Heures sup.", 1, (r) => r.hs1 + r.hs2 + r.hs3 + r.hs4], ["primes", "Primes", 1, (r) => r.presp + r.pfonc + r.prend + r.paut], ["an", "Av. nature", 1], ["cp", "Congés payés", 1], ["grat", "Gratification", 1], ["bimp", "Brut imposable", 1], ["trexo", "Transport NI", 1], ["ni", "Indemn. NI", 1], ["btot", "BRUT TOTAL", 1], ["cnps", "CNPS", 1], ["its", "ITS", 1], ["cmu", "CMU", 1, (r) => r.cmus + r.cmua], ["div", "Autres retenues", 1, (r) => r.acpt + r.pret + r.assur + r.autr + r.anded], ["tret", "Total retenues", 1], ["net", "NET À PAYER", 1], ["tpat", "Charges patronales", 1], ["cout", "Coût total", 1]];
  const RUBS = [["jpay", "Jours payés"], ["sb", "100 Salaire de base"], ["ss", "110 Sursalaire"], ["pa", "120 Prime d'ancienneté"], ["hs1", "130 HS 15 %"], ["hs2", "131 HS 50 %"], ["hs3", "132 HS 75 %"], ["hs4", "133 HS 100 %"], ["presp", "140 Prime de responsabilité"], ["pfonc", "150 Prime de fonction"], ["prend", "160 Prime de rendement"], ["paut", "170 Autre prime"], ["an", "180 Avantage en nature"], ["cp", "190 Congés payés"], ["grat", "200 Gratification"], ["trimp", "210 Transport imposable"], ["bimp", "BRUT IMPOSABLE"], ["trexo", "700 Transport non imposable"], ["ni", "710 Indemnités non imposables"], ["btot", "BRUT TOTAL"], ["cnps", "507 CNPS retraite"], ["its", "500 ITS"], ["cmus", "508 CMU"], ["cmua", "509 CMU bénéficiaires"], ["acpt", "600 Acompte"], ["pret", "610 Prêt"], ["assur", "620 Mutuelle"], ["autr", "630 Autres retenues"], ["anded", "181 Av. nature déduit"], ["tret", "TOTAL RETENUES"], ["net", "NET À PAYER"], ["retp", "Retraite patronale"], ["pf", "Prestations familiales"], ["mater", "Maternité"], ["at", "Accident du travail"], ["cmup", "CMU patronale"], ["itsp", "ITS patronal"], ["ta", "Taxe d'apprentissage"], ["fpc", "FPC"], ["fpcc", "FPC complémentaire"], ["tpat", "TOTAL PATRONAL"], ["cout", "COÛT TOTAL"]];
  Pages.livre = {
    title: "Livre de paie", group: "Paie du mois", icon: "book", sub: () => perLabel(App.view), tab: 1,
    render(el) {
      const list = paid(App.view);
      el.innerHTML = `<div class="tabs"><div class="tab ${this.tab === 1 ? "active" : ""}" data-t="1">Livre 1 : par salarié</div><div class="tab ${this.tab === 2 ? "active" : ""}" data-t="2">Livre 2 : par rubrique</div></div>${docBar()}<div id="lv"></div>`;
      $$(".tab", el).forEach((t) => (t.onclick = () => { this.tab = Number(t.dataset.t); this.render(el); }));
      const v = (c, r) => (c[3] ? c[3](r) : r[c[0]]);
      if (this.tab === 1) table($("#lv", el), { rows: list, total: true, exportName: `Livre_de_paie_${App.view}`, columns: LCOLS.map((c, i) => ({ key: c[0], label: c[1], money: !!c[2], get: (r) => v(c, r), strong: ["btot", "net", "cout"].includes(c[0]), sticky: i === 1 })) });
      else { const rows = RUBS.map(([k, l]) => ({ k, l, tot: list.reduce((s, r) => s + (r[k] || 0), 0), ...Object.fromEntries(list.map((r) => [r.id, r[k]])) })); table($("#lv", el), { rows, search: true, exportName: `Livre_de_paie_2_${App.view}`, columns: [{ key: "l", label: "Rubrique", sticky: true, render: (r) => ["BRUT IMPOSABLE", "BRUT TOTAL", "NET À PAYER", "TOTAL RETENUES", "TOTAL PATRONAL", "COÛT TOTAL"].includes(r.l) ? `<b>${r.l}</b>` : esc(r.l) }, { key: "tot", label: "TOTAL", money: true, strong: true }, ...list.map((r) => ({ key: r.id, label: `${esc(r.mat)}<br><span style="font-weight:500;text-transform:none">${esc(r.nom)}</span>`, money: true }))] }); }
      const html = () => Docs.tableDoc("LIVRE DE PAIE", perLabel(App.view), LCOLS.map((c) => c[1]), list.map((r) => LCOLS.map((c) => v(c, r))), ["TOTAL", "", ...LCOLS.slice(2).map((c) => list.reduce((s, r) => s + v(c, r), 0))]).replace('class="doc land"', 'class="doc land" style="font-size:8px"');
      bindDoc(el, html, `Livre_de_paie_${App.view}`, true);
    }
  };

  /* ============ PAIE INVERSE ============ */
  Pages.inverse = {
    title: "Paie inverse", group: "Paie du mois", icon: "swap", sub: () => "Du net souhaité au brut : calcul exact du sursalaire",
    inp: { net: 250000, base: 75000, transport: 30000, dateEntree: "", situation: "Célibataire", enfants: 0, cmuBenef: 0, statut: "Local", primeResp: 0, autrePrime: 0, indemNI: 0 },
    render(el) {
      const I = this.inp; if (!I.dateEntree) I.dateEntree = Engine.fmtISO(Engine.periodBounds(App.view).debut);
      const fld = (k, l, t = "num", opts) => `<div class="field"><label>${l}</label>${opts ? `<select class="in" data-i="${k}">${opts.map((o) => `<option ${o === I[k] ? "selected" : ""}>${o}</option>`).join("")}</select>` : `<input class="in" data-i="${k}" type="${t === "date" ? "date" : "text"}" value="${esc(I[k])}">`}</div>`;
      el.innerHTML = `<div class="grid" style="grid-template-columns:380px 1fr;align-items:start">
        <div class="card"><h3>Données</h3><div class="field" style="margin-bottom:14px"><label style="color:var(--red);font-size:13px">NET À PAYER SOUHAITÉ</label><input class="in" data-i="net" value="${I.net}" style="font-size:22px;font-weight:800;background:#fff8c5"></div>
          <div class="form-grid g2f">${fld("base", "Salaire de base")}${fld("transport", "Indemnité de transport")}${fld("primeResp", "Prime de responsabilité")}${fld("autrePrime", "Autre prime imposable")}${fld("indemNI", "Indemnités non imposables")}${fld("dateEntree", "Date d'entrée", "date")}${fld("situation", "Situation familiale", "", ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"])}${fld("enfants", "Enfants à charge")}${fld("cmuBenef", "Bénéficiaires CMU")}${fld("statut", "Statut fiscal", "", ["Local", "Expatrié"])}</div>
          <button class="btn btn-primary" id="mkEmp" style="margin-top:16px;width:100%;justify-content:center">${ico("plus")} Créer un salarié avec ces montants</button></div>
        <div><div class="grid g3" id="invK"></div><div class="grid g2" style="margin-top:16px"><div class="card"><h3>Décomposition du bulletin</h3><div id="invT"></div></div><div class="card"><h3>Où va le coût employeur ?</h3><div class="chart-box"><canvas id="invC"></canvas></div></div></div></div></div>`;
      let ch = null;
      const draw = () => {
        const r = Engine.inverse(I, P(), App.view); this.res = r;
        $("#invK").innerHTML = [["Sursalaire à verser", r.surs, "#f28c28"], ["Brut imposable", r.bimp, "#22396a"], ["Net obtenu", r.net, "#12925b"]].map(([l, v, c]) => `<div class="card kpi" style="--kpi-color:${c}"><div class="lbl">${l}</div><div class="val" style="color:${c}">${fmt0(v)} <small>FCFA</small></div></div>`).join("");
        const rows = [["Salaire de base", I.base], ["Sursalaire", r.surs], [`Prime d'ancienneté (${r.anc} an(s), ${pct(r.tx, 0)})`, r.pa], ["Prime de responsabilité", I.primeResp], ["Autre prime imposable", I.autrePrime], ["Transport imposable (excédent)", r.trimp], ["<b>Brut imposable</b>", r.bimp], ["Transport non imposable", r.trexo], ["Indemnités non imposables", I.indemNI], ["<b>Brut total</b>", r.btot], ["CNPS retraite (6,3 %)", -r.cnps], [`ITS (brut ${fmt0(r.itsb)} − RICF ${fmt0(r.ricf)}, ${r.parts} part(s))`, -r.its], ["CMU", -r.cmu], ["<b style='color:var(--green)'>NET À PAYER</b>", r.net], ["Écart avec l'objectif", r.ecart], ["Charges patronales", r.tpat], ["<b>Coût total employeur</b>", r.cout]];
        $("#invT").innerHTML = rows.map(([l, v]) => `<div class="stat-row"><span>${l}</span><span>${fmt0(v)}</span></div>`).join("");
        const data = [r.net, r.cnps + r.its + r.cmu, r.retp + r.pfmat + r.cmup, r.fisc];
        if (ch) { ch.data.datasets[0].data = data; ch.update(); } else ch = chart($("#invC"), { type: "doughnut", data: { labels: ["Net salarié", "Retenues salariales", "CNPS & CMU patronales", "ITS patronal & FDFP"], datasets: [{ data, backgroundColor: ["#12925b", "#f28c28", "#22396a", "#7c3aed"] }] }, options: { maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label} : ${fmt0(c.parsed)}` } } } } });
      };
      $$("[data-i]", el).forEach((i) => (i.oninput = i.onchange = () => { const k = i.dataset.i; I[k] = ["situation", "statut", "dateEntree"].includes(k) ? i.value : Number(String(i.value).replace(/\s/g, "").replace(",", ".")) || 0; draw(); }));
      draw();
      $("#mkEmp").onclick = () => { const e = { id: UI.uid(), matricule: Store.nextMatricule(), nom: "NOUVEAU", prenoms: "Salarié", actif: true, statut: I.statut, contrat: "CDI", situation: I.situation, enfants: I.enfants, cmuBenef: I.cmuBenef, dateEntree: I.dateEntree, base: I.base, sursalaire: this.res.surs, primeResp: I.primeResp, transport: I.transport, indemNI: I.indemNI, sexe: "M", conge: {}, pret: {} }; S().employes.push(e); Store.save(); toast(`Salarié ${e.matricule} créé. Complétez sa fiche.`, "ok"); App.go("employes"); };
    }
  };

  /* ============ ÉTATS ============ */
  const ST = {
    sal: ["État des cotisations salariales", [["bimp", "Brut imposable"], ["bret", "Base retraite"], ["cnps", "CNPS 6,3 %"], ["its", "ITS"], ["cmus", "CMU"], ["cmua", "CMU bénéf."], ["tcot", "Total"]]],
    pat: ["État des cotisations patronales", [["bimp", "Brut imposable"], ["retp", "Retraite"], ["pf", "PF"], ["mater", "Maternité"], ["at", "Acc. travail"], ["tcnpsp", "Total CNPS"], ["cmup", "CMU"], ["itsp", "ITS patronal"], ["ta", "TA"], ["fpc", "FPC"], ["fpcc", "FPC compl."], ["tpat", "Total"]]],
    imp: ["État des impôts sur salaires", [["statut", "Statut", 0], ["parts", "Parts", 0], ["bimp", "Brut imposable"], ["itsb", "ITS brut"], ["ricf", "RICF"], ["its", "ITS retenu"], ["itsp", "ITS patronal"], ["ta", "TA"], ["fpc", "FPC"], ["fpcc", "FPC compl."]]]
  };
  Pages.etats = {
    title: "États de paie", group: "États & déclarations", icon: "chart", sub: () => perLabel(App.view), tab: "res",
    render(el) {
      const list = paid(App.view); const T = Store.totals(list); const Pp = P();
      const tabs = [["res", "Résumé des cotisations"], ["sal", "Cotisations salariales"], ["pat", "Cotisations patronales"], ["imp", "Impôts"], ["rep", "Répartition des charges"]];
      el.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${this.tab === k ? "active" : ""}" data-t="${k}">${l}</div>`).join("")}</div>${docBar()}<div id="sv"></div>`;
      $$(".tab", el).forEach((t) => (t.onclick = () => { this.tab = t.dataset.t; this.render(el); }));
      const box = $("#sv", el);
      if (ST[this.tab]) {
        const [ttl, cols] = ST[this.tab];
        table(box, { rows: list, total: true, exportName: `${ttl}_${App.view}`, columns: [{ key: "mat", label: "Matricule" }, { key: "nom", label: "Nom & prénoms" }, ...cols.map(([k, l, m]) => ({ key: k, label: l, money: m !== 0, strong: l === "Total" }))] });
        bindDoc(el, () => Docs.tableDoc(ttl.toUpperCase(), perLabel(App.view), ["Matricule", "Nom & prénoms", ...cols.map((c) => c[1])], list.map((r) => [r.mat, r.nom, ...cols.map(([k]) => r[k])]), ["TOTAL", "", ...cols.map(([k, , m]) => (m === 0 ? "" : T[k]))]), `${ttl}_${App.view}`, true);
      } else if (this.tab === "res") {
        const R = [["CNPS", [[507, "Régime de retraite", Pp.txRetSal, Pp.txRetPat, T.bret, T.cnps, T.retp], [504, "Prestations familiales", 0, Pp.txPF, T.bpf, 0, T.pf], [505, "Assurance maternité", 0, Pp.txMat, T.bpf, 0, T.mater], [506, "Accident du travail", 0, Pp.txAT, T.bpf, 0, T.at]]],
          ["IMPÔTS", [[500, "ITS salarial (barème − RICF)", null, null, T.bimp, T.its, 0], [500, "ITS patronal (1,2 % / 10,4 %)", null, null, T.bimp, 0, T.itsp]]],
          ["FDFP", [[501, "Taxe d'apprentissage", 0, Pp.txTA, T.bimp, 0, T.ta], [502, "Formation professionnelle continue", 0, Pp.txFPC, T.bimp, 0, T.fpc], [503, "FPC complémentaire", 0, Pp.txFPCC, T.bimp, 0, T.fpcc]]],
          ["CMU", [[508, "CMU salariés", null, null, T.actif, T.cmus, T.cmup], [509, "CMU autres bénéficiaires", null, null, T.nbBenef, T.cmua, 0]]]];
        const html = () => { let g = [0, 0]; const body = R.map(([n, items]) => { const s = items.reduce((a, x) => [a[0] + x[5], a[1] + x[6]], [0, 0]); g = [g[0] + s[0], g[1] + s[1]]; return items.map((x) => `<tr><td class="center">${x[0]}</td><td>${x[1]}</td><td class="num">${x[2] === null ? "—" : pct(x[2])}</td><td class="num">${x[3] === null ? "—" : pct(x[3])}</td><td class="num">${fmt(x[4])}</td><td class="num">${fmt(x[5])}</td><td class="num">${fmt(x[6])}</td><td class="num"><b>${fmt(x[5] + x[6])}</b></td></tr>`).join("") + `<tr class="sub"><td colspan="5" style="text-align:right">TOTAL ${n}</td><td class="num">${fmt(s[0])}</td><td class="num">${fmt(s[1])}</td><td class="num">${fmt(s[0] + s[1])}</td></tr>`; }).join("");
          return `<div class="doc land">${Docs.header("ÉTAT RÉSUMÉ DES COTISATIONS", perLabel(App.view))}<table><thead><tr><th>Code</th><th>Rubrique</th><th>Taux sal.</th><th>Taux pat.</th><th>Assiette</th><th>Salarial</th><th>Patronal</th><th>Total</th></tr></thead><tbody>${body}</tbody><tfoot><tr class="tot"><td colspan="5" style="text-align:right">TOTAL GÉNÉRAL</td><td class="num">${fmt(g[0])}</td><td class="num">${fmt(g[1])}</td><td class="num">${fmt(g[0] + g[1])}</td></tr></tfoot></table></div>`; };
        box.innerHTML = `<div class="grid" style="grid-template-columns:1fr 340px;align-items:start"><div class="doc-wrap">${html()}</div><div class="card"><h3>Poids par organisme</h3><div class="chart-box"><canvas id="rc"></canvas></div></div></div>`;
        chart($("#rc"), { type: "doughnut", data: { labels: ["CNPS", "ITS (DGI)", "FDFP", "CMU"], datasets: [{ data: [T.cnps + T.tcnpsp, T.its + T.itsp, T.ta + T.fpc + T.fpcc, T.cmus + T.cmua + T.cmup], backgroundColor: ["#22396a", "#d13b3b", "#f28c28", "#12925b"] }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label} : ${fmt0(c.parsed)}` } } } } });
        bindDoc(el, html, `Resume_cotisations_${App.view}`, true);
      } else if (this.tab === "rep") {
        const by = (f) => { const m = {}; list.forEach((r) => { const k = f(r) || "Non affecté"; m[k] = m[k] || { k, n: 0, btot: 0, bimp: 0, tcot: 0, net: 0, tpat: 0, cout: 0 }; const a = m[k]; a.n += r.actif; ["btot", "bimp", "tcot", "net", "tpat", "cout"].forEach((x) => (a[x] += r[x])); }); return Object.values(m).sort((a, b) => b.cout - a.cout); };
        const dep = by((r) => r.dept || r.emp?.departement);
        box.innerHTML = `<div class="grid g3"><div class="card span2"><h3>Par département</h3><div id="rt"></div></div><div class="card"><h3>Coût total par département</h3><div class="chart-box tall"><canvas id="rpc"></canvas></div></div></div>
          <div class="grid g2" style="margin-top:16px"><div class="card"><h3>Par statut fiscal</h3><div id="rt2"></div></div><div class="card"><h3>Par sexe</h3><div id="rt3"></div></div></div>`;
        const cols = [{ key: "k", label: "Groupe" }, { key: "n", label: "Effectif", num: true, sum: true }, { key: "btot", label: "Brut total", money: true }, { key: "tcot", label: "Charges sal.", money: true }, { key: "net", label: "Net", money: true }, { key: "tpat", label: "Charges pat.", money: true }, { key: "cout", label: "Coût total", money: true, strong: true }, { key: "p", label: "% coût", get: (r) => (T.cout ? r.cout / T.cout : 0), pct: true }];
        table($("#rt"), { rows: dep, total: true, search: false, exportName: `Repartition_${App.view}`, columns: cols });
        table($("#rt2"), { rows: by((r) => r.statut), total: true, search: false, columns: cols });
        table($("#rt3"), { rows: by((r) => ({ M: "Hommes", F: "Femmes" }[r.sexe || r.emp?.sexe])), total: true, search: false, columns: cols });
        chart($("#rpc"), { type: "pie", data: { labels: dep.map((d) => d.k), datasets: [{ data: dep.map((d) => d.cout), backgroundColor: PAL }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } } });
        bindDoc(el, () => Docs.tableDoc("RÉPARTITION DES CHARGES PAR DÉPARTEMENT", perLabel(App.view), ["Département", "Effectif", "Brut total", "Charges sal.", "Net", "Charges pat.", "Coût total"], dep.map((d) => [d.k, d.n, d.btot, d.tcot, d.net, d.tpat, d.cout]), ["TOTAL", T.actif, T.btot, T.tcot, T.net, T.tpat, T.cout]), `Repartition_${App.view}`, true);
      }
    }
  };

  /* ============ DÉCLARATIONS MENSUELLES ============ */
  Pages.declarations = {
    title: "Déclarations mensuelles", group: "États & déclarations", icon: "send", sub: () => `ITS (DGI), FDFP, CNPS | ${perLabel(App.view)}`, tab: "its",
    render(el) {
      const list = paid(App.view); const T = Store.totals(list); const Pp = P();
      const tabs = [["its", "ITS - DGI"], ["fdfp", "FDFP"], ["cnps", "CNPS"]];
      el.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${this.tab === k ? "active" : ""}" data-t="${k}">${l}</div>`).join("")}</div>${docBar()}<div class="doc-wrap" id="dv"></div>`;
      $$(".tab", el).forEach((t) => (t.onclick = () => { this.tab = t.dataset.t; this.render(el); }));
      const loc = list.filter((r) => r.statut !== "Expatrié"), exp = list.filter((r) => r.statut === "Expatrié");
      const sum = (L, k) => L.reduce((s, r) => s + r[k], 0);
      const docs = {
        its: () => Docs.form("DÉCLARATION MENSUELLE DES IMPÔTS SUR TRAITEMENTS ET SALAIRES", `Direction Générale des Impôts | Période : ${perLabel(App.view)}`,
          `<table><thead><tr><th>Personnel</th><th>Effectif</th><th>Brut imposable</th><th>Nature</th><th>Taux</th><th>Montant</th></tr></thead><tbody>
          <tr><td>Local</td><td class="num">${loc.filter((r) => r.actif).length}</td><td class="num">${fmt(sum(loc, "bimp"))}</td><td>ITS retenu à la source</td><td class="num">Barème</td><td class="num">${fmt(sum(loc, "its"))}</td></tr>
          <tr><td>Expatrié</td><td class="num">${exp.filter((r) => r.actif).length}</td><td class="num">${fmt(sum(exp, "bimp"))}</td><td>ITS retenu à la source</td><td class="num">Barème</td><td class="num">${fmt(sum(exp, "its"))}</td></tr>
          <tr><td>Local</td><td></td><td class="num">${fmt(sum(loc, "bimp"))}</td><td>ITS part patronale</td><td class="num">${pct(Pp.itspLoc, 1)}</td><td class="num">${fmt(sum(loc, "itsp"))}</td></tr>
          <tr><td>Expatrié</td><td></td><td class="num">${fmt(sum(exp, "bimp"))}</td><td>ITS part patronale</td><td class="num">${pct(Pp.itspExp, 1)}</td><td class="num">${fmt(sum(exp, "itsp"))}</td></tr></tbody>
          <tfoot><tr class="tot"><td colspan="5" style="text-align:right">TOTAL À PAYER</td><td class="num">${fmt(T.its + T.itsp)}</td></tr></tfoot></table>
          <p>Montant en lettres : <b>${Engine.enLettres(T.its + T.itsp)} francs CFA</b>. Masse salariale brute totale : ${fmt0(T.btot)} FCFA.</p>`),
        fdfp: () => Docs.form("DÉCLARATION MENSUELLE FDFP", `Fonds de Développement de la Formation Professionnelle | ${perLabel(App.view)}`,
          `<table><thead><tr><th>Nature de la taxe</th><th>Effectif</th><th>Assiette</th><th>Taux</th><th>Montant</th></tr></thead><tbody>
          ${[["Taxe d'apprentissage", Pp.txTA, T.ta], ["Taxe additionnelle à la formation professionnelle continue", Pp.txFPC, T.fpc], ["FPC complémentaire", Pp.txFPCC, T.fpcc]].map(([l, t, m]) => `<tr><td>${l}</td><td class="num">${T.actif}</td><td class="num">${fmt(T.bimp)}</td><td class="num">${pct(t, 1)}</td><td class="num">${fmt(m)}</td></tr>`).join("")}</tbody>
          <tfoot><tr class="tot"><td colspan="4" style="text-align:right">TOTAL FDFP À PAYER</td><td class="num">${fmt(T.ta + T.fpc + T.fpcc)}</td></tr></tfoot></table>
          <p>Montant en lettres : <b>${Engine.enLettres(T.ta + T.fpc + T.fpcc)} francs CFA</b>.</p>`),
        cnps: () => Docs.form("DÉCLARATION CNPS DES SALAIRES ET COTISATIONS", `Caisse Nationale de Prévoyance Sociale | ${perLabel(App.view)}`,
          `<table><thead><tr><th>Branche</th><th>Assiette</th><th>Taux sal.</th><th>Taux pat.</th><th>Part salariale</th><th>Part patronale</th><th>Total</th></tr></thead><tbody>
          ${[["Retraite", T.bret, Pp.txRetSal, Pp.txRetPat, T.cnps, T.retp], ["Prestations familiales", T.bpf, 0, Pp.txPF, 0, T.pf], ["Assurance maternité", T.bpf, 0, Pp.txMat, 0, T.mater], ["Accident du travail", T.bpf, 0, Pp.txAT, 0, T.at]].map(([l, b, ts, tp, ms, mp]) => `<tr><td>${l}</td><td class="num">${fmt(b)}</td><td class="num">${pct(ts)}</td><td class="num">${pct(tp)}</td><td class="num">${fmt(ms)}</td><td class="num">${fmt(mp)}</td><td class="num"><b>${fmt(ms + mp)}</b></td></tr>`).join("")}</tbody>
          <tfoot><tr class="tot"><td colspan="4" style="text-align:right">TOTAL À VERSER À LA CNPS</td><td class="num">${fmt(T.cnps)}</td><td class="num">${fmt(T.tcnpsp)}</td><td class="num">${fmt(T.cnps + T.tcnpsp)}</td></tr></tfoot></table>
          <h3 style="margin:14px 0 6px">Liste nominative (${T.actif} salarié(s))</h3>
          <table style="font-size:9.5px"><thead><tr><th>Matricule</th><th>Nom & prénoms</th><th>N° CNPS</th><th>Naissance</th><th>Entrée</th><th>Jours</th><th>Brut imposable</th><th>Base retraite</th><th>Base PF/AT</th><th>Ret. sal.</th><th>Ret. pat.</th></tr></thead><tbody>
          ${list.map((r) => `<tr><td>${esc(r.mat)}</td><td>${esc(r.nom)}</td><td>${esc(r.emp?.cnps)}</td><td>${fmtD(r.emp?.dateNaissance)}</td><td>${fmtD(r.emp?.dateEntree)}</td><td class="num">${r.jpay}</td><td class="num">${fmt(r.bimp)}</td><td class="num">${fmt(r.bret)}</td><td class="num">${fmt(r.bpf)}</td><td class="num">${fmt(r.cnps)}</td><td class="num">${fmt(r.retp)}</td></tr>`).join("")}</tbody></table>`)
      };
      $("#dv").innerHTML = docs[this.tab]();
      bindDoc(el, docs[this.tab], `Declaration_${this.tab.toUpperCase()}_${App.view}`, false);
    }
  };

  /* ============ ANNUEL : ÉTAT 301 & DISA ============ */
  Pages.annuel = {
    title: "Déclarations annuelles", group: "États & déclarations", icon: "calendar", sub: () => "État 301 (DGI), DISA (CNPS) et récapitulatif annuel", tab: "301", year: null,
    render(el) {
      const yNow = Number(App.view.slice(0, 4)); this.year = this.year || yNow;
      const years = [...new Set([yNow, ...S().historique.map((h) => Number(h.periode.slice(0, 4)))])].sort((a, b) => b - a);
      const A = Store.annual(this.year);
      const tabs = [["301", "État 301 - DGI"], ["disa", "DISA - CNPS"], ["rec", "Récapitulatif mensuel"]];
      el.innerHTML = `<div class="toolbar"><label class="hint">Année :</label><select class="in" id="yr" style="width:110px">${years.map((y) => `<option ${y === this.year ? "selected" : ""}>${y}</option>`).join("")}</select><span class="hint">Les mois clôturés proviennent de l'historique ; le mois en cours est ajouté s'il n'est pas encore clôturé.</span></div>
        <div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${this.tab === k ? "active" : ""}" data-t="${k}">${l}</div>`).join("")}</div>${docBar()}<div id="av"></div>`;
      $("#yr").onchange = (e) => { this.year = Number(e.target.value); this.render(el); };
      $$(".tab", el).forEach((t) => (t.onclick = () => { this.tab = t.dataset.t; this.render(el); }));
      const box = $("#av");
      const E = (a, k) => a.emp?.[k] || "";
      if (this.tab === "301") {
        const cols = [["mat", "Matricule", (a) => E(a, "matricule")], ["nom", "Nom & prénoms", (a) => `${E(a, "nom")} ${E(a, "prenoms")}`], ["cnps", "N° CNPS", (a) => E(a, "cnps")], ["fonction", "Emploi", (a) => E(a, "fonction")], ["statut", "Statut", (a) => E(a, "statut")], ["nbMois", "Mois", (a) => a.nbMois], ["btot", "Salaires bruts", (a) => a.btot, 1], ["an", "Av. en nature", (a) => a.an, 1], ["ni", "Non imposable", (a) => a.trexo + a.ni, 1], ["bimp", "Brut imposable", (a) => a.bimp, 1], ["its", "ITS retenu", (a) => a.its, 1], ["itsp", "ITS patronal", (a) => a.itsp, 1], ["tot", "Total ITS", (a) => a.its + a.itsp, 1]];
        table(box, { rows: A, total: true, exportName: `Etat_301_${this.year}`, columns: cols.map(([k, l, g, m]) => ({ key: k, label: l, get: g, money: !!m, num: k === "nbMois" })) });
        bindDoc(el, () => Docs.tableDoc(`ÉTAT 301 - DÉCLARATION ANNUELLE DES SALAIRES ${this.year}`, "Direction Générale des Impôts", cols.map((c) => c[1]), A.map((a) => cols.map((c) => c[2](a))), ["TOTAL", "", "", "", "", "", ...cols.slice(6).map((c) => A.reduce((s, a) => s + c[2](a), 0))]), `Etat_301_${this.year}`, true);
      } else if (this.tab === "disa") {
        const M = UI.MOIS.map((m) => m.slice(0, 4));
        const cols = [["mat", "Matricule", (a) => E(a, "matricule")], ["nom", "Nom & prénoms", (a) => `${E(a, "nom")} ${E(a, "prenoms")}`], ["cnps", "N° CNPS", (a) => E(a, "cnps")], ["nai", "Naissance", (a) => UI.fmtD(E(a, "dateNaissance"))], ["ent", "Entrée", (a) => UI.fmtD(E(a, "dateEntree"))], ["sor", "Sortie", (a) => UI.fmtD(E(a, "dateSortie"))], ["jpay", "Jours", (a) => a.jpay], ["bimp", "Brut annuel", (a) => a.bimp, 1], ["bret", "Assiette retraite", (a) => a.bret, 1], ["bpf", "Assiette PF/AT", (a) => a.bpf, 1], ["cnps", "Retraite sal.", (a) => a.cnps, 1], ["retp", "Retraite pat.", (a) => a.retp, 1], ["pfa", "PF+Mat+AT", (a) => a.pf + a.mater + a.at, 1], ...M.map((m, i) => [`m${i}`, m, (a) => a.mois[i + 1]?.bimp || 0, 1])];
        table(box, { rows: A, total: true, exportName: `DISA_${this.year}`, columns: cols.map(([k, l, g, m]) => ({ key: k, label: l, get: g, money: !!m, num: k === "jpay" })) });
        bindDoc(el, () => Docs.tableDoc(`DISA - DÉCLARATION INDIVIDUELLE DES SALAIRES ANNUELS ${this.year}`, "Caisse Nationale de Prévoyance Sociale", cols.slice(0, 13).map((c) => c[1]), A.map((a) => cols.slice(0, 13).map((c) => c[2](a))), ["TOTAL", "", "", "", "", "", A.reduce((s, a) => s + a.jpay, 0), ...cols.slice(7, 13).map((c) => A.reduce((s, a) => s + c[2](a), 0))]).replace('class="doc land"', 'class="doc land" style="font-size:9px"'), `DISA_${this.year}`, true);
      } else {
        const rows = UI.MOIS.map((m, i) => { const p = `${this.year}-${String(i + 1).padStart(2, "0")}`; const L = Store.isClosed(p) || p === S().periode ? Store.compute(p) : []; const t = Store.totals(L); return { m, eff: L.filter((r) => r.actif).length, ...t, statut: Store.isClosed(p) ? "Clôturé" : p === S().periode ? "En cours" : "—" }; });
        box.innerHTML = `<div class="card" style="margin-bottom:16px"><h3>Masse salariale ${this.year}</h3><div class="chart-box"><canvas id="ac"></canvas></div></div><div id="at"></div>`;
        chart($("#ac"), { type: "bar", data: { labels: rows.map((r) => r.m.slice(0, 4)), datasets: [{ label: "Brut total", data: rows.map((r) => r.btot), backgroundColor: "#22396a", borderRadius: 5 }, { label: "Net", data: rows.map((r) => r.net), backgroundColor: "#12925b", borderRadius: 5 }, { label: "Charges patronales", data: rows.map((r) => r.tpat), backgroundColor: "#f28c28", borderRadius: 5 }] }, options: { maintainAspectRatio: false, scales: { y: { ticks: { callback: moneyTick } } }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label} : ${fmt0(c.parsed.y)}` } } } } });
        const cols = [{ key: "m", label: "Mois" }, { key: "statut", label: "Statut" }, { key: "eff", label: "Effectif", num: true }, { key: "btot", label: "Brut total", money: true }, { key: "bimp", label: "Brut imposable", money: true }, { key: "its", label: "ITS", money: true }, { key: "cnps", label: "CNPS sal.", money: true }, { key: "tcnpsp", label: "CNPS pat.", money: true }, { key: "net", label: "Net", money: true }, { key: "tpat", label: "Charges pat.", money: true }, { key: "cout", label: "Coût total", money: true, strong: true }];
        table($("#at"), { rows, total: true, search: false, exportName: `Recap_annuel_${this.year}`, columns: cols });
        bindDoc(el, () => Docs.tableDoc(`RÉCAPITULATIF ANNUEL ${this.year}`, "", cols.map((c) => c.label), rows.map((r) => cols.map((c) => r[c.key])), ["TOTAL", "", "", ...cols.slice(3).map((c) => rows.reduce((s, r) => s + (r[c.key] || 0), 0))]), `Recap_${this.year}`, true);
      }
    }
  };

  /* ============ ÉCRITURE COMPTABLE ============ */
  Pages.compta = {
    title: "Écriture comptable", group: "États & déclarations", icon: "calc", sub: () => `Journal de paie SYSCOHADA | ${perLabel(App.view)}`,
    render(el) {
      const T = Store.totals(paid(App.view)); const C = P().comptes;
      const L = [[C.sal, "", "Salaires (base, sursalaire, ancienneté, heures sup.)", T.sb + T.ss + T.pa + T.hs1 + T.hs2 + T.hs3 + T.hs4, 0], [C.prime, "", "Primes et gratifications", T.presp + T.pfonc + T.prend + T.paut + T.grat, 0], [C.cp, "", "Congés payés", T.cp, 0], [C.an, "", "Avantages en nature", T.an, 0], [C.ind, "", "Indemnités de transport et non imposables", T.transp + T.ni, 0], [C.cnpsp, "", "Charges sociales CNPS patronales", T.tcnpsp, 0], [C.cmup, "", "CMU part patronale", T.cmup, 0], [C.itsp, "", "ITS part patronale", T.itsp, 0], [C.fdfp, "", "Taxes FDFP (TA + FPC)", T.ta + T.fpc + T.fpcc, 0],
        ["", C.net, "Personnel - rémunérations dues", 0, T.net], ["", C.acpt, "Personnel - avances et acomptes", 0, T.acpt], ["", C.pret, "Personnel - prêts", 0, T.pret], ["", C.cnps, "CNPS (retraite sal. + charges patronales)", 0, T.cnps + T.tcnpsp], ["", C.cmu, "CMU (salariés, bénéficiaires, patronale)", 0, T.cmus + T.cmua + T.cmup], ["", C.its, "État - ITS retenu à la source", 0, T.its], ["", C.itspc, "État - ITS part patronale", 0, T.itsp], ["", C.fdfpc, "État - FDFP", 0, T.ta + T.fpc + T.fpcc], ["", C.assur, "Mutuelle / assurance maladie", 0, T.assur], ["", C.autr, "Autres retenues", 0, T.autr], ["", C.anc, "Transfert de charges - avantages en nature", 0, T.anded]].filter((x) => x[3] || x[4]);
      const D = L.reduce((s, x) => s + x[3], 0), Cr = L.reduce((s, x) => s + x[4], 0); const ok = Math.round(D - Cr) === 0;
      el.innerHTML = `<div class="grid g3" style="margin-bottom:16px"><div class="card kpi"><div class="lbl">Total débit</div><div class="val">${fmt0(D)}</div></div><div class="card kpi"><div class="lbl">Total crédit</div><div class="val">${fmt0(Cr)}</div></div><div class="card kpi"><div class="lbl">Contrôle</div><div class="val" style="color:${ok ? "var(--green)" : "var(--red)"}">${ok ? "✔ Équilibrée" : "✖ Écart " + fmt0(D - Cr)}</div></div></div>
        ${docBar(`<button class="btn" id="xj">${ico("xls")} Exporter le journal (Excel)</button>`)}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Compte débit</th><th>Compte crédit</th><th>Libellé</th><th class="num">Débit</th><th class="num">Crédit</th></tr></thead><tbody>${L.map((x) => `<tr><td><b style="color:var(--green)">${x[0]}</b></td><td><b style="color:var(--red)">${x[1]}</b></td><td>${x[2]}</td><td class="num">${fmt(x[3])}</td><td class="num">${fmt(x[4])}</td></tr>`).join("")}</tbody><tfoot><tr><td colspan="3">TOTAUX</td><td class="num">${fmt(D)}</td><td class="num">${fmt(Cr)}</td></tr></tfoot></table></div>`;
      const date = UI.fmtD(Engine.fmtISO(Engine.periodBounds(App.view).fin));
      $("#xj").onclick = () => exportXLSX(`Journal_paie_${App.view}`, [{ name: "Journal", aoa: [["Date", "Journal", "Compte", "Libellé", "Débit", "Crédit"], ...L.map((x) => [date, "PAIE", x[0] || x[1], `${x[2]} | ${perLabel(App.view)}`, x[3] || "", x[4] || ""]), ["", "", "", "TOTAUX", D, Cr]] }]);
      bindDoc(el, () => Docs.tableDoc("ÉCRITURE COMPTABLE DE PAIE", `Journal des salaires | ${perLabel(App.view)} | ${date}`, ["Débit", "Crédit", "Libellé", "Montant débit", "Montant crédit"], L, ["", "", "TOTAUX", D, Cr], { land: false }), `Ecriture_paie_${App.view}`, false);
    }
  };
})();
