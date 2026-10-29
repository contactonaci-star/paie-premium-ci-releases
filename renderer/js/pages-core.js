/* Pages : tableau de bord, entreprise, paramètres, employés, saisie du mois */
window.Pages = {};
(() => {
  const { $, $$, esc, fmt, fmt0, pct, fmtD, ico, toast, modal, confirm, chart, PAL, moneyTick, table, perLabel, perShort } = UI;
  const S = () => Store.get();

  /* ============ TABLEAU DE BORD ============ */
  Pages.dashboard = {
    title: "Tableau de bord", group: "Pilotage", icon: "dash",
    sub: () => `Vue d'ensemble de la paie | ${perLabel(App.view)}`,
    render(el) {
      const list = Store.compute(App.view); const T = Store.totals(list);
      const ser = Store.series(12); const iCur = ser.findIndex((x) => x.p === App.view);
      const prev = Store.totals(Store.compute(Store.addMonth(App.view, -1)));
      const dues = T.its + T.itsp + T.cnps + T.tcnpsp + T.ta + T.fpc + T.fpcc + T.cmus + T.cmua + T.cmup;
      const prevDues = prev.its + prev.itsp + prev.cnps + prev.tcnpsp + prev.ta + prev.fpc + prev.fpcc + prev.cmus + prev.cmua + prev.cmup;
      const kp = [
        ["Effectif payé", list.filter((r) => r.actif).length, Store.compute(Store.addMonth(App.view, -1)).filter((r) => r.actif).length, "users", "#22396a", "salariés"],
        ["Masse salariale brute", T.btot, prev.btot, "wallet", "#12925b", "FCFA"],
        ["Net à payer", T.net, prev.net, "coin", "#f28c28", "FCFA"],
        ["Charges patronales", T.tpat, prev.tpat, "building", "#7c3aed", "FCFA"],
        ["Coût total employeur", T.cout, prev.cout, "chart", "#d13b3b", "FCFA"],
        ["Impôts & cotisations à verser", dues, prevDues, "send", "#0ea5e9", "FCFA"]
      ];
      const delta = (a, b) => { if (!b) return `<div class="delta" style="color:var(--muted)">—</div>`; const d = (a - b) / b; return `<div class="delta ${d >= 0 ? "up" : "down"}">${d >= 0 ? "▲" : "▼"} ${Math.abs(d * 100).toFixed(1)} % vs mois précédent</div>`; };
      const alerts = Store.alerts();
      const noEmp = !S().employes.length;
      el.innerHTML = `
        ${noEmp ? `<div class="note info" style="margin-bottom:16px">Bienvenue ! Commencez par renseigner <a href="#" data-go="entreprise">les informations de l'entreprise</a>, puis <a href="#" data-go="employes">ajoutez vos salariés</a>. Les graphiques se rempliront automatiquement. <button class="btn btn-sm btn-accent" id="demoBtn" style="margin-left:8px">Découvrir avec des données d'exemple</button></div>` : ""}
        <div class="grid g6">${kp.map(([l, v, p, ic, c, u]) => `<div class="card kpi" style="--kpi-color:${c}"><div class="ico" style="background:${c}18;color:${c}">${ico(ic)}</div><div class="lbl">${l}</div><div class="val" style="color:${c}">${fmt0(v)} <small>${u}</small></div>${delta(v, p)}</div>`).join("")}</div>
        <div class="grid g3" style="margin-top:16px">
          <div class="card span2"><h3>Évolution de la masse salariale <small>12 derniers mois</small></h3><div class="chart-box"><canvas id="cEvo"></canvas></div></div>
          <div class="card"><h3>Répartition du coût employeur</h3><div class="chart-box"><canvas id="cRep"></canvas></div></div>
        </div>
        <div class="grid g3" style="margin-top:16px">
          <div class="card"><h3>Charges patronales détaillées</h3><div class="chart-box"><canvas id="cPat"></canvas></div></div>
          <div class="card"><h3>Coût par département</h3><div class="chart-box"><canvas id="cDep"></canvas></div></div>
          <div class="card"><h3>Échéancier des versements <small>avant le 15 ${perLabel(Store.addMonth(App.view, 1))}</small></h3>
            ${[["DGI - ITS retenu à la source", T.its], ["DGI - ITS part patronale", T.itsp], ["CNPS - Retraite (sal. + pat.)", T.cnps + T.retp], ["CNPS - PF + Maternité + AT", T.pf + T.mater + T.at], ["FDFP - TA + FPC", T.ta + T.fpc + T.fpcc], ["CMU (sal. + pat. + bénéficiaires)", T.cmus + T.cmua + T.cmup], ["Salariés - net à payer", T.net]].map(([l, v]) => `<div class="due-row"><span>${l}</span><b>${fmt0(v)}</b></div>`).join("")}
            <div class="due-row" style="border:none;font-size:15px"><span><b>TOTAL DÉCAISSEMENT</b></span><b style="color:var(--red)">${fmt0(T.cout)}</b></div></div>
        </div>
        <div class="grid g4" style="margin-top:16px">
          <div class="card"><h3>Effectif par sexe</h3><div class="chart-box small"><canvas id="cSexe"></canvas></div></div>
          <div class="card"><h3>Tranches de salaire net</h3><div class="chart-box small"><canvas id="cTr"></canvas></div></div>
          <div class="card"><h3>Ancienneté du personnel</h3><div class="chart-box small"><canvas id="cAnc"></canvas></div></div>
          <div class="card"><h3>Charges salariales</h3><div class="chart-box small"><canvas id="cSal"></canvas></div></div>
        </div>
        <div class="grid g2" style="margin-top:16px">
          <div class="card"><h3>Alertes & contrôles RH <span class="badge ${alerts.length ? "orange" : "green"}">${alerts.length}</span></h3>
            <div class="alerts">${alerts.length ? alerts.map((a) => `<div class="alert"><span class="dot" style="background:var(--${a.lvl === "orange" ? "accent" : a.lvl})"></span>${esc(a.t)}</div>`).join("") : `<div class="note ok">Aucune anomalie détectée.</div>`}</div></div>
          <div class="card"><h3>Top 5 des rémunérations nettes</h3><div id="top5"></div></div>
        </div>`;
      $$("[data-go]", el).forEach((a) => (a.onclick = (e) => { e.preventDefault(); App.go(a.dataset.go); }));
      const db = $("#demoBtn"); if (db) db.onclick = () => { Store.loadDemo(); App.view = Store.get().periode; toast("Données d'exemple chargées. Effacez-les depuis « Sauvegarde & export » quand vous voulez.", "ok"); App.render(); };
      let first = ser.findIndex((x) => x.t.btot > 0); if (first < 0) first = ser.length - 1; first = Math.max(0, Math.min(first, ser.length - 2));
      ser.splice(0, first);
      const labels = ser.map((x) => perShort(x.p));
      chart($("#cEvo"), { type: "line", data: { labels, datasets: [
        { label: "Brut total", data: ser.map((x) => x.t.btot), borderColor: "#22396a", backgroundColor: "rgba(34,57,106,.08)", fill: true, tension: .35 },
        { label: "Net à payer", data: ser.map((x) => x.t.net), borderColor: "#12925b", tension: .35 },
        { label: "Coût employeur", data: ser.map((x) => x.t.cout), borderColor: "#f28c28", borderDash: [6, 4], tension: .35 }] },
        options: { maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { tooltip: { callbacks: { label: (c) => ` ${c.dataset.label} : ${fmt0(c.parsed.y)}` } } }, scales: { y: { ticks: { callback: moneyTick } } } } });
      chart($("#cRep"), { type: "doughnut", data: { labels: ["Net versé aux salariés", "Charges salariales", "Charges patronales", "Autres retenues"], datasets: [{ data: [T.net, T.tcot, T.tpat, T.acpt + T.pret + T.assur + T.autr + T.anded], backgroundColor: ["#12925b", "#f28c28", "#22396a", "#94a3b8"], borderWidth: 2 }] }, options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label} : ${fmt0(c.parsed)}` } } } } });
      const patL = ["Retraite", "Prest. fam.", "Maternité", "Acc. travail", "CMU", "ITS pat.", "TA", "FPC", "FPC compl."];
      chart($("#cPat"), { type: "bar", data: { labels: patL, datasets: [{ data: [T.retp, T.pf, T.mater, T.at, T.cmup, T.itsp, T.ta, T.fpc, T.fpcc], backgroundColor: PAL, borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt0(c.parsed.y)} FCFA` } } }, scales: { y: { ticks: { callback: moneyTick } } } } });
      const deps = {}; list.forEach((r) => { const d = r.dept || r.emp?.departement || "Non affecté"; deps[d] = (deps[d] || 0) + r.cout; });
      const dk = Object.keys(deps).sort((a, b) => deps[b] - deps[a]);
      chart($("#cDep"), { type: "bar", data: { labels: dk, datasets: [{ data: dk.map((k) => deps[k]), backgroundColor: "#7c3aed", borderRadius: 6 }] }, options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${fmt0(c.parsed.x)} FCFA` } } }, scales: { x: { ticks: { callback: moneyTick } } } } });
      const act = list.filter((r) => r.actif);
      const h = act.filter((r) => (r.sexe || r.emp?.sexe) === "M").length, f = act.filter((r) => (r.sexe || r.emp?.sexe) === "F").length;
      chart($("#cSexe"), { type: "pie", data: { labels: ["Hommes", "Femmes"], datasets: [{ data: [h, f], backgroundColor: ["#22396a", "#ec4899"] }] }, options: { maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } } });
      const tr = [["< 100 k", 0, 1e5], ["100–250 k", 1e5, 2.5e5], ["250–500 k", 2.5e5, 5e5], ["500 k–1 M", 5e5, 1e6], ["> 1 M", 1e6, 1e15]];
      chart($("#cTr"), { type: "bar", data: { labels: tr.map((x) => x[0]), datasets: [{ data: tr.map(([, a, b]) => act.filter((r) => r.net >= a && r.net < b).length), backgroundColor: "#0ea5e9", borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } } });
      const an = [["< 2 ans", 0, 2], ["2–5", 2, 5], ["5–10", 5, 10], ["10–20", 10, 20], ["≥ 20", 20, 99]];
      chart($("#cAnc"), { type: "bar", data: { labels: an.map((x) => x[0]), datasets: [{ data: an.map(([, a, b]) => act.filter((r) => r.anc >= a && r.anc < b).length), backgroundColor: "#c9a100", borderRadius: 6 }] }, options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { precision: 0 } } } } });
      chart($("#cSal"), { type: "doughnut", data: { labels: ["CNPS", "ITS", "CMU", "CMU bénéf."], datasets: [{ data: [T.cnps, T.its, T.cmus, T.cmua], backgroundColor: ["#22396a", "#d13b3b", "#12925b", "#14b8a6"] }] }, options: { maintainAspectRatio: false, cutout: "55%", plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => ` ${c.label} : ${fmt0(c.parsed)}` } } } } });
      const top = [...act].sort((a, b) => b.net - a.net).slice(0, 5);
      $("#top5").innerHTML = top.length ? `<table class="tbl"><thead><tr><th>Salarié</th><th>Fonction</th><th class="num">Brut</th><th class="num">Net</th></tr></thead><tbody>${top.map((r) => `<tr><td><div class="emp-cell"><span class="avatar" style="background:${UI.avatarColor(r.nom)}">${UI.initials(r.nom)}</span>${esc(r.nom)}</div></td><td>${esc(r.fonction)}</td><td class="num">${fmt(r.btot)}</td><td class="num strong">${fmt(r.net)}</td></tr>`).join("")}</tbody></table>` : `<div class="hint">Aucun salarié payé.</div>`;
    }
  };

  /* ============ ENTREPRISE ============ */
  const ENT_FIELDS = [["nom", "Raison sociale"], ["forme", "Forme juridique"], ["activite", "Activité principale"], ["adresse", "Adresse / Boîte postale"], ["ville", "Ville / Commune"], ["tel", "Téléphone"], ["email", "E-mail"], ["ncc", "N° Compte Contribuable (NCC)"], ["rccm", "RCCM"], ["cnps", "N° employeur CNPS"], ["cdi", "Centre des impôts"], ["regime", "Régime d'imposition"], ["dirigeant", "Nom du dirigeant / signataire"], ["qualite", "Qualité du signataire"], ["banque", "Banque principale"], ["convention", "Convention collective applicable"]];
  Pages.entreprise = {
    title: "Entreprise", group: "Configuration", icon: "company", sub: () => "Ces informations apparaissent sur tous les documents",
    render(el) {
      const e = S().entreprise;
      el.innerHTML = `<div class="grid g3"><div class="card span2"><h3>Identification de l'entreprise</h3>
        <div class="form-grid">${ENT_FIELDS.map(([k, l]) => `<div class="field ${k === "convention" || k === "adresse" ? "span2" : ""}"><label>${l}</label><input class="in" data-k="${k}" value="${esc(e[k])}"></div>`).join("")}
        <div class="field" style="grid-column:1/-1"><label>Mention en bas du bulletin</label><input class="in" data-k="slogan" value="${esc(e.slogan)}"></div></div></div>
        <div class="card"><h3>Logo</h3><div style="border:2px dashed var(--line);border-radius:12px;height:180px;display:grid;place-items:center;background:#fafbfd">${e.logo ? `<img src="${e.logo}" style="max-height:160px;max-width:90%">` : `<span class="hint">Aucun logo</span>`}</div>
        <div class="toolbar" style="margin-top:12px"><label class="btn">${ico("upload")} Choisir une image<input type="file" accept="image/*" id="logoIn" hidden></label>${e.logo ? `<button class="btn btn-danger" id="logoDel">${ico("trash")} Retirer</button>` : ""}</div>
        <p class="hint">Le logo s'affiche sur les bulletins, déclarations, contrats et attestations (PNG ou JPG, idéalement fond transparent).</p></div></div>`;
      $$("[data-k]", el).forEach((i) => (i.oninput = () => { e[i.dataset.k] = i.value; Store.save(); App.refreshChrome(); }));
      $("#logoIn").onchange = (ev) => { const f = ev.target.files[0]; if (!f) return; if (f.size > 1.5e6) return toast("Image trop lourde (max 1,5 Mo)", "err"); const r = new FileReader(); r.onload = () => { e.logo = r.result; Store.save(); App.refreshChrome(); this.render(el); toast("Logo enregistré", "ok"); }; r.readAsDataURL(f); };
      const d = $("#logoDel"); if (d) d.onclick = () => { e.logo = ""; Store.save(); App.refreshChrome(); this.render(el); };
    }
  };

  /* ============ PARAMÈTRES ============ */
  const PARAM_GROUPS = [
    ["CNPS", [["txRetSal", "Retraite - part salariale", "pct"], ["txRetPat", "Retraite - part patronale", "pct"], ["plafRet", "Plafond mensuel retraite", "m"], ["txPF", "Prestations familiales", "pct"], ["txMat", "Assurance maternité", "pct"], ["txAT", "Accident du travail (2 à 5 %)", "pct"], ["plafPF", "Plafond PF / Maternité / AT", "m"]]],
    ["CMU", [["cmuSal", "CMU part salariale / salarié", "m"], ["cmuPat", "CMU part patronale / salarié", "m"], ["cmuAutre", "CMU par bénéficiaire", "m"]]],
    ["ITS & taxes", [["ricf", "RICF par demi-part", "m"], ["partsMax", "Nombre maximum de parts", "n"], ["itspLoc", "ITS patronal - local", "pct"], ["itspExp", "ITS patronal - expatrié", "pct"], ["plafTransport", "Transport exonéré (plafond)", "m"], ["txTA", "Taxe d'apprentissage", "pct"], ["txFPC", "FPC", "pct"], ["txFPCC", "FPC complémentaire", "pct"]]],
    ["Salaire & temps", [["smig", "SMIG mensuel", "m"], ["heuresMois", "Heures mensuelles", "n"], ["ancMin", "Prime d'ancienneté : à partir de (ans)", "n"], ["ancTaux", "Taux par année d'ancienneté", "pct"], ["ancMax", "Taux maximum d'ancienneté", "pct"], ["hs1", "Heures sup. 41e–46e heure", "pct"], ["hs2", "Heures sup. au-delà de 46 h", "pct"], ["hs3", "Heures sup. nuit / dimanche / férié", "pct"], ["hs4", "Heures sup. nuit dimanche / férié", "pct"]]],
    ["Congés, gratification, rupture", [["congeJours", "Jours de congé acquis / mois", "n"], ["congeCoef", "Coefficient ouvrables → calendaires", "n"], ["gratTaux", "Gratification (% salaire catégoriel)", "pct"], ["gratMois", "Mois de versement gratification (1-12)", "n"], ["licT1", "Indemnité licenciement 1-5 ans", "pct"], ["licT2", "Indemnité licenciement 6-10 ans", "pct"], ["licT3", "Indemnité licenciement > 10 ans", "pct"], ["licMin", "Ancienneté minimale indemnité (ans)", "n"], ["finCdd", "Indemnité de fin de CDD", "pct"]]]
  ];
  const COMPTES = [["sal", "Appointements, salaires"], ["prime", "Primes et gratifications"], ["cp", "Congés payés"], ["an", "Avantages en nature"], ["ind", "Indemnités transport & autres"], ["cnpsp", "Charges CNPS patronales"], ["cmup", "CMU patronale"], ["itsp", "ITS patronal (charge)"], ["fdfp", "Taxes FDFP (charge)"], ["net", "Personnel, rémunérations dues"], ["acpt", "Personnel, avances et acomptes"], ["pret", "Personnel, prêts"], ["cnps", "CNPS"], ["cmu", "CMU (organisme)"], ["its", "État, ITS retenu"], ["itspc", "État, ITS patronal"], ["fdfpc", "État, FDFP"], ["assur", "Mutuelle / assurance"], ["autr", "Autres retenues"], ["anc", "Transfert de charges (AN)"]];
  const GROUPES = ["Ouvrier / Employé", "Agent de maîtrise / Technicien", "Cadre"];
  Pages.parametres = {
    title: "Paramètres", group: "Configuration", icon: "settings", sub: () => "Taux légaux, barème ITS, catégories, comptes et sécurité", tab: "taux",
    render(el) {
      const P = S().params; const tabs = [["taux", "Taux & plafonds"], ["its", "Barème ITS"], ["cat", "Salaires catégoriels"], ["dep", "Départements"], ["rupt", "Préavis & ruptures"], ["cpt", "Comptes comptables"], ["sec", "Sécurité"]];
      el.innerHTML = `<div class="tabs">${tabs.map(([k, l]) => `<div class="tab ${this.tab === k ? "active" : ""}" data-t="${k}">${l}</div>`).join("")}</div><div id="ptab"></div>`;
      $$(".tab", el).forEach((t) => (t.onclick = () => { this.tab = t.dataset.t; this.render(el); }));
      const box = $("#ptab", el);
      const bindNum = () => $$("[data-p]", box).forEach((i) => (i.onchange = () => { const v = parseFloat(String(i.value).replace(",", ".")) || 0; P[i.dataset.p] = i.dataset.f === "pct" ? v / 100 : v; Store.save(); toast("Paramètre enregistré", "ok"); }));
      if (this.tab === "taux") {
        box.innerHTML = `<div class="note info" style="margin-bottom:14px">Les taux par défaut sont ceux de la législation ivoirienne en vigueur (réforme ITS 2024). Modifiez-les uniquement si la réglementation change. Le taux d'accident du travail dépend de votre activité (2 à 5 %).</div>
          <div class="grid g3">${PARAM_GROUPS.map(([g, items]) => `<div class="card"><h3>${g}</h3><div class="form-grid g2f">${items.map(([k, l, f]) => `<div class="field"><label>${l}</label><input class="in" data-p="${k}" data-f="${f}" value="${f === "pct" ? +(P[k] * 100).toFixed(4) : P[k]}">${f === "pct" ? '<span class="hint">en %</span>' : ""}</div>`).join("")}</div></div>`).join("")}</div>
          <div class="toolbar" style="margin-top:14px"><button class="btn" id="resetP">Rétablir les taux légaux par défaut</button></div>`;
        bindNum();
        $("#resetP").onclick = async () => { if (await confirm("Rétablir", "Rétablir tous les taux par défaut ?")) { Object.assign(P, JSON.parse(JSON.stringify(Engine.DEFAULT_PARAMS))); Store.save(); this.render(el); } };
      } else if (this.tab === "its") {
        box.innerHTML = `<div class="grid g2"><div class="card"><h3>Barème mensuel progressif ITS</h3><table class="tbl"><thead><tr><th>Tranche à partir de (FCFA)</th><th>Taux</th></tr></thead><tbody>${P.bareme.map(([a, t], i) => `<tr><td><input class="in" data-b="${i}" data-c="0" value="${a}"></td><td><input class="in" data-b="${i}" data-c="1" value="${+(t * 100).toFixed(2)}"></td></tr>`).join("")}</tbody></table>
          <p class="hint">ITS = barème appliqué au brut imposable − RICF (${fmt0(P.ricf)} FCFA par demi-part au-delà de 1 part). Aucun abattement.</p></div>
          <div class="card"><h3>Simulateur ITS</h3><div class="form-grid g2f"><div class="field"><label>Brut imposable</label><input class="in" id="simB" value="500000"></div><div class="field"><label>Nombre de parts</label><select class="in" id="simP">${[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((x) => `<option>${x}</option>`).join("")}</select></div></div><div id="simR" style="margin-top:14px"></div></div></div>`;
        $$("[data-b]", box).forEach((i) => (i.onchange = () => { const v = parseFloat(i.value.replace(",", ".")) || 0; P.bareme[i.dataset.b][i.dataset.c] = i.dataset.c === "1" ? v / 100 : v; Store.save(); sim(); }));
        const sim = () => { const b = Number($("#simB").value) || 0, p = Number($("#simP").value); const ib = Engine.itsBrut(b, P), rc = Engine.ricf(p, P); $("#simR").innerHTML = `<div class="stat-row"><span>ITS brut (barème)</span><span>${fmt0(ib)}</span></div><div class="stat-row"><span>RICF</span><span>- ${fmt0(rc)}</span></div><div class="stat-row"><span><b>ITS à retenir</b></span><span style="color:var(--red)">${fmt0(Math.max(0, ib - rc))}</span></div><div class="stat-row"><span>Taux effectif</span><span>${pct(b ? Math.max(0, ib - rc) / b : 0)}</span></div>`; };
        $("#simB").oninput = sim; $("#simP").onchange = sim; sim();
      } else if (this.tab === "cat") {
        const cats = S().categories;
        box.innerHTML = `<div class="card"><h3>Grille des salaires catégoriels <small>selon votre convention collective</small></h3>
          <table class="tbl"><thead><tr><th>Code</th><th>Groupe professionnel</th><th>Salaire catégoriel</th><th>Libellé</th><th></th></tr></thead><tbody>
          ${cats.map((c, i) => `<tr><td><input class="in" data-c="${i}" data-f="code" value="${esc(c.code)}"></td><td><select class="in" data-c="${i}" data-f="groupe">${GROUPES.map((g) => `<option ${g === c.groupe ? "selected" : ""}>${g}</option>`).join("")}</select></td><td><input class="in" data-c="${i}" data-f="salaire" value="${c.salaire ?? ""}"></td><td><input class="in" data-c="${i}" data-f="libelle" value="${esc(c.libelle)}"></td><td><button class="btn btn-sm btn-danger" data-del="${i}">${ico("trash")}</button></td></tr>`).join("")}
          </tbody></table><div class="toolbar" style="margin-top:12px"><button class="btn btn-primary" id="addCat">${ico("plus")} Ajouter une catégorie</button><span class="hint">Le SMIG est de ${fmt0(P.smig)} FCFA.</span></div></div>`;
        $$("[data-c]", box).forEach((i) => (i.onchange = () => { const c = cats[i.dataset.c]; c[i.dataset.f] = i.dataset.f === "salaire" ? Number(i.value) || 0 : i.value; Store.save(); }));
        $$("[data-del]", box).forEach((b) => (b.onclick = () => { cats.splice(b.dataset.del, 1); Store.save(); this.render(el); }));
        $("#addCat").onclick = () => { cats.push({ code: "", groupe: GROUPES[0], salaire: P.smig, libelle: "" }); Store.save(); this.render(el); };
      } else if (this.tab === "dep") {
        const d = S().departements;
        box.innerHTML = `<div class="card" style="max-width:640px"><h3>Départements</h3>${d.map((x, i) => `<div style="display:flex;gap:8px;margin-bottom:8px"><input class="in" data-d="${i}" value="${esc(x)}"><button class="btn btn-danger" data-del="${i}">${ico("trash")}</button></div>`).join("")}<button class="btn btn-primary" id="addD">${ico("plus")} Ajouter</button></div>`;
        $$("[data-d]", box).forEach((i) => (i.onchange = () => { d[i.dataset.d] = i.value; Store.save(); }));
        $$("[data-del]", box).forEach((b) => (b.onclick = () => { d.splice(b.dataset.del, 1); Store.save(); this.render(el); }));
        $("#addD").onclick = () => { d.push("Nouveau département"); Store.save(); this.render(el); };
      } else if (this.tab === "rupt") {
        box.innerHTML = `<div class="grid g2"><div class="card"><h3>Durée du préavis (mois) <small>à vérifier selon votre convention</small></h3><table class="tbl"><thead><tr><th>Groupe</th><th>&lt; 6 ans</th><th>6–11 ans</th><th>11–16 ans</th><th>≥ 16 ans</th></tr></thead><tbody>${GROUPES.map((g) => `<tr><td>${g}</td>${[0, 1, 2, 3].map((j) => `<td><input class="in" data-g="${g}" data-j="${j}" value="${(P.preavis[g] || [])[j] ?? ""}"></td>`).join("")}</tr>`).join("")}</tbody></table>
          <h3 style="margin-top:18px">Période d'essai</h3><table class="tbl"><tbody>${GROUPES.map((g) => `<tr><td>${g}</td><td><input class="in" data-es="${g}" value="${esc(P.essai[g])}"></td></tr>`).join("")}</tbody></table></div>
          <div class="card"><h3>Règles par motif de rupture</h3><table class="tbl"><thead><tr><th>Motif</th><th>Indemnité licenciement</th><th>Préavis payé</th><th>Fin CDD</th></tr></thead><tbody>${P.motifs.map((m, i) => `<tr><td>${esc(m.nom)}</td>${["lic", "preavis", "cdd"].map((k) => `<td style="text-align:center"><input type="checkbox" style="width:auto" data-m="${i}" data-k="${k}" ${m[k] ? "checked" : ""}></td>`).join("")}</tr>`).join("")}</tbody></table>
          <h3 style="margin-top:18px">Congés supplémentaires d'ancienneté</h3><table class="tbl"><thead><tr><th>À partir de (ans)</th><th>Jours en plus</th></tr></thead><tbody>${P.congeSup.map(([a, j], i) => `<tr><td><input class="in" data-cs="${i}" data-c="0" value="${a}"></td><td><input class="in" data-cs="${i}" data-c="1" value="${j}"></td></tr>`).join("")}</tbody></table></div></div>`;
        $$("[data-g]", box).forEach((i) => (i.onchange = () => { P.preavis[i.dataset.g] = P.preavis[i.dataset.g] || [1, 2, 3, 4]; P.preavis[i.dataset.g][i.dataset.j] = Number(i.value) || 0; Store.save(); }));
        $$("[data-es]", box).forEach((i) => (i.onchange = () => { P.essai[i.dataset.es] = i.value; Store.save(); }));
        $$("[data-m]", box).forEach((i) => (i.onchange = () => { P.motifs[i.dataset.m][i.dataset.k] = i.checked; Store.save(); }));
        $$("[data-cs]", box).forEach((i) => (i.onchange = () => { P.congeSup[i.dataset.cs][i.dataset.c] = Number(i.value) || 0; Store.save(); }));
      } else if (this.tab === "cpt") {
        box.innerHTML = `<div class="card" style="max-width:720px"><h3>Plan de comptes SYSCOHADA utilisé pour l'écriture de paie</h3><table class="tbl"><tbody>${COMPTES.map(([k, l]) => `<tr><td>${l}</td><td style="width:140px"><input class="in" data-cp="${k}" value="${esc(P.comptes[k])}"></td></tr>`).join("")}</tbody></table></div>`;
        $$("[data-cp]", box).forEach((i) => (i.onchange = () => { P.comptes[i.dataset.cp] = i.value; Store.save(); }));
      } else if (this.tab === "sec") {
        const has = !!S().securite.hash;
        box.innerHTML = `<div class="card" style="max-width:560px"><h3>Mot de passe au démarrage</h3><p class="hint">Protège l'accès au logiciel sur ce PC. ${has ? '<span class="badge green">Activé</span>' : '<span class="badge grey">Désactivé</span>'}</p>
          <div class="form-grid g2f"><div class="field"><label>Nouveau mot de passe</label><input type="password" id="pw1"></div><div class="field"><label>Confirmer</label><input type="password" id="pw2"></div></div>
          <div class="toolbar" style="margin-top:12px"><button class="btn btn-primary" id="pwSet">${ico("lock")} Enregistrer le mot de passe</button>${has ? `<button class="btn btn-danger" id="pwDel">Supprimer le mot de passe</button>` : ""}</div>
          <div class="note" style="margin-top:12px">Notez bien votre mot de passe : il ne peut pas être récupéré.</div></div>`;
        $("#pwSet").onclick = async () => { const a = $("#pw1").value, b = $("#pw2").value; if (a.length < 4) return toast("4 caractères minimum", "err"); if (a !== b) return toast("Les mots de passe ne correspondent pas", "err"); const ns = await App.hashNew(a); S().securite.hash = ns.hash; S().securite.salt = ns.salt; Store.save(true); toast("Mot de passe activé", "ok"); this.render(el); };
        const d = $("#pwDel"); if (d) d.onclick = () => { S().securite.hash = ""; Store.save(true); toast("Mot de passe supprimé", "ok"); this.render(el); };
      }
    }
  };

  /* ============ EMPLOYÉS ============ */
  const F = (k, l, t = "text", o = {}) => ({ k, l, t, ...o });
  const EMP_FORM = [
    ["Identité", [F("matricule", "Matricule *"), F("nom", "Nom *"), F("prenoms", "Prénoms"), F("sexe", "Sexe", "select", { opts: ["M", "F"] }), F("dateNaissance", "Date de naissance", "date"), F("lieuNaissance", "Lieu de naissance"), F("nationalite", "Nationalité"), F("statut", "Statut fiscal", "select", { opts: ["Local", "Expatrié"] }), F("pieceIdentite", "N° pièce d'identité")]],
    ["Poste & contrat", [F("fonction", "Emploi / fonction"), F("categorie", "Catégorie", "cat"), F("departement", "Département", "dep"), F("service", "Service"), F("dateEntree", "Date d'entrée *", "date"), F("contrat", "Type de contrat", "select", { opts: ["CDI", "CDD", "Stage", "Temporaire / Journalier"] }), F("dateFinContrat", "Fin de contrat (CDD)", "date"), F("dateSortie", "Date de sortie", "date"), F("actif", "Salarié actif", "bool")]],
    ["Rémunération mensuelle", [F("base", "Salaire de base *", "num"), F("sursalaire", "Sursalaire", "num"), F("primeResp", "Prime de responsabilité", "num"), F("primeFonction", "Prime de fonction", "num"), F("transport", "Indemnité de transport", "num"), F("avantageNature", "Avantage en nature (logement…)", "num"), F("indemNI", "Indemnités non imposables fixes", "num"), F("assuranceFixe", "Retenue mutuelle mensuelle", "num")]],
    ["Famille & CNPS", [F("situation", "Situation familiale", "select", { opts: ["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)"] }), F("enfants", "Enfants à charge", "num"), F("partsForce", "Parts ITS (forcer)", "num", { hint: "laisser vide = automatique" }), F("cmuBenef", "Bénéficiaires CMU (conjoint + enfants)", "num"), F("cnps", "N° CNPS")]],
    ["Paiement & contact", [F("modePaiement", "Mode de paiement", "select", { opts: ["Virement", "Espèces", "Chèque", "Mobile Money"] }), F("banque", "Banque / opérateur"), F("rib", "N° de compte / RIB / téléphone"), F("telephone", "Téléphone"), F("email", "E-mail"), F("adresse", "Adresse")]],
    ["Congés & prêt", [F("conge.dateRef", "Dernier retour de congé", "date", { hint: "vide = date d'entrée" }), F("conge.joursPris", "Jours de congé déjà pris", "num"), F("conge.joursAutres", "Jours supp. (mère, etc.)", "num"), F("pret.montant", "Prêt accordé", "num"), F("pret.mensualite", "Mensualité de remboursement", "num"), F("pret.restant", "Reste à rembourser", "num")]]
  ];
  const getP = (o, k) => k.split(".").reduce((a, x) => (a ? a[x] : undefined), o);
  const setP = (o, k, v) => { const ks = k.split("."); let a = o; ks.slice(0, -1).forEach((x) => (a = a[x] = a[x] || {})); a[ks[ks.length - 1]] = v; };
  const ALL_FIELDS = EMP_FORM.flatMap(([, f]) => f);

  async function empForm(e0) {
    const isNew = !e0; const e = JSON.parse(JSON.stringify(e0 || { id: UI.uid(), matricule: Store.nextMatricule(), actif: true, statut: "Local", contrat: "CDI", situation: "Célibataire", sexe: "M", nationalite: "Ivoirienne", modePaiement: "Virement", transport: 30000, base: S().params.smig, dateEntree: Engine.fmtISO(Engine.periodBounds(Store.get().periode).debut), conge: {}, pret: {} }));
    const cats = S().categories, deps = S().departements;
    const input = (f) => { const v = getP(e, f.k) ?? ""; const name = `name="${f.k}"`;
      if (f.t === "select") return `<select class="in" ${name}>${f.opts.map((o) => `<option ${o === v ? "selected" : ""}>${o}</option>`).join("")}</select>`;
      if (f.t === "cat") return `<select class="in" ${name}><option value=""></option>${cats.map((c) => `<option value="${esc(c.code)}" ${c.code === v ? "selected" : ""}>${esc(c.code)} - ${esc(c.groupe)} (${fmt0(c.salaire)})</option>`).join("")}</select>`;
      if (f.t === "dep") return `<select class="in" ${name}><option value="">—</option>${deps.map((d) => `<option ${d === v ? "selected" : ""}>${esc(d)}</option>`).join("")}</select>`;
      if (f.t === "bool") return `<select class="in" ${name}><option value="1" ${v !== false ? "selected" : ""}>Oui</option><option value="0" ${v === false ? "selected" : ""}>Non</option></select>`;
      return `<input class="in" ${name} type="${f.t === "date" ? "date" : "text"}" value="${esc(v)}" ${f.t === "num" ? 'inputmode="decimal"' : ""}>`; };
    const body = `<div class="tabs">${EMP_FORM.map(([g], i) => `<div class="tab ${i ? "" : "active"}" data-ft="${i}">${g}</div>`).join("")}</div>
      ${EMP_FORM.map(([g, fs], i) => `<div class="form-grid" data-fp="${i}" ${i ? 'style="display:none"' : ""}>${fs.map((f) => `<div class="field"><label>${f.l}</label>${input(f)}${f.hint ? `<span class="hint">${f.hint}</span>` : ""}</div>`).join("")}</div>`).join("")}
      <div class="note info" style="margin-top:16px" id="preview"></div>`;
    const read = (bg) => { ALL_FIELDS.forEach((f) => { const i = $(`[name="${f.k}"]`, bg); if (!i) return; let v = i.value; if (f.t === "num") v = v === "" ? (f.k === "partsForce" ? "" : 0) : Number(String(v).replace(/\s/g, "").replace(",", ".")) || 0; if (f.t === "bool") v = v === "1"; setP(e, f.k, v); }); return e; };
    const res = await modal({ title: isNew ? "Nouveau salarié" : `Fiche salarié : ${esc(e.nom)} ${esc(e.prenoms || "")}`, body,
      buttons: [{ label: "Annuler", value: null }, { label: `${ico("check")} Enregistrer`, cls: "btn-primary", value: (bg) => read(bg), validate: (bg) => {
          read(bg);
          if (!e.matricule || !e.nom || !e.dateEntree) { toast("Matricule, nom et date d'entrée sont obligatoires", "err"); return false; }
          if (S().employes.some((x) => x.matricule === e.matricule && x.id !== e.id)) { toast("Ce matricule existe déjà", "err"); return false; }
          if (Number(e.base) < 0) { toast("Le salaire de base ne peut pas être négatif", "err"); return false; }
          if (e.dateSortie && e.dateEntree && e.dateSortie < e.dateEntree) { toast("La date de sortie doit être postérieure à la date d'entrée", "err"); return false; }
          if (e.contrat === "CDD" && e.dateFinContrat && e.dateEntree && e.dateFinContrat < e.dateEntree) { toast("La fin de contrat CDD doit être postérieure à la date d'entrée", "err"); return false; }
          if (e.dateNaissance && e.dateEntree && e.dateEntree < e.dateNaissance) { toast("La date d'entrée ne peut pas être antérieure à la date de naissance", "err"); return false; }
          if (Number(e.base) > 0 && Number(e.base) < S().params.smig) { toast(`Salaire de base inférieur au SMIG (${fmt0(S().params.smig)} FCFA). Enregistrement autorisé.`, ""); }
          return true;
        } }],
      onOpen: (bg) => {
        $$("[data-ft]", bg).forEach((t) => (t.onclick = () => { $$("[data-ft]", bg).forEach((x) => x.classList.toggle("active", x === t)); $$("[data-fp]", bg).forEach((p) => (p.style.display = p.dataset.fp === t.dataset.ft ? "" : "none")); }));
        const upd = () => { read(bg); const r = Engine.computeEmployee(Object.assign({}, e, { actif: true, dateSortie: "" }), {}, S().params, App.view, { pret: Engine.pretEcheance(e, {}) }); $("#preview", bg).innerHTML = `<b>Simulation mensuelle (mois complet)</b> | Brut : <b>${fmt0(r.btot)}</b> · Brut imposable : ${fmt0(r.bimp)} · ITS : ${fmt0(r.its)} · CNPS : ${fmt0(r.cnps)} · Parts : ${r.parts} · <span style="color:var(--green)">Net à payer : <b>${fmt0(r.net)} FCFA</b></span> · Coût employeur : ${fmt0(r.cout)}`; };
        $$("input,select", bg).forEach((i) => i.addEventListener("input", upd)); upd();
      } });
    if (!res) return false;
    const L = S().employes; const i = L.findIndex((x) => x.id === res.id);
    if (i >= 0) L[i] = res; else L.push(res);
    Store.save(); toast("Salarié enregistré", "ok"); return true;
  }

  const IMPORT_COLS = ALL_FIELDS.filter((f) => !f.k.includes(".")).concat(ALL_FIELDS.filter((f) => f.k.includes(".")));
  Pages.employes = {
    title: "Salariés", group: "Configuration", icon: "users", sub: () => `${S().employes.filter((e) => e.actif !== false).length} salarié(s) actif(s) sur ${S().employes.length}`,
    render(el) {
      const live = Object.fromEntries(Store.compute(Store.get().periode, true).map((r) => [r.id, r]));
      el.innerHTML = `<div id="empT"></div>`;
      table($("#empT", el), {
        rows: S().employes, exportName: "Liste du personnel", empty: "Aucun salarié. Cliquez sur « Nouveau salarié » ou importez un fichier Excel.",
        toolbarExtra: `<button class="btn btn-primary" id="addE">${ico("plus")} Nouveau salarié</button><button class="btn" id="impE">${ico("upload")} Importer Excel</button><button class="btn" id="modE">${ico("xls")} Modèle d'import</button>`,
        rowClick: async (e) => { if (await empForm(e)) App.render(); },
        columns: [
          { key: "matricule", label: "Matricule", strong: true },
          { key: "nom", label: "Salarié", get: (e) => `${e.nom} ${e.prenoms || ""}`, render: (e) => `<div class="emp-cell"><span class="avatar" style="background:${UI.avatarColor(e.nom)}">${UI.initials(e.nom + " " + (e.prenoms || ""))}</span><div>${esc(e.nom)} ${esc(e.prenoms || "")}<small>${esc(e.fonction || "")}</small></div></div>` },
          { key: "departement", label: "Département" }, { key: "categorie", label: "Cat." }, { key: "contrat", label: "Contrat" },
          { key: "dateEntree", label: "Entrée", date: true },
          { key: "anc", label: "Ancienneté", get: (e) => live[e.id]?.anc ?? 0, render: (e) => `${live[e.id]?.anc ?? 0} an(s)` },
          { key: "base", label: "Salaire de base", money: true },
          { key: "net", label: "Net du mois", money: true, get: (e) => live[e.id]?.net || 0 },
          { key: "actif", label: "Statut", get: (e) => (e.actif === false ? "Inactif" : "Actif"), render: (e) => e.actif === false ? `<span class="badge grey">Inactif</span>` : e.dateSortie ? `<span class="badge red">Sortie ${fmtD(e.dateSortie)}</span>` : `<span class="badge green">Actif</span>` },
          { key: "act", label: "", sortable: false, get: () => "", render: (e) => `<button class="btn btn-sm btn-icon" data-dup="${e.id}" title="Dupliquer">${ico("copy")}</button> <button class="btn btn-sm btn-icon btn-danger" data-del="${e.id}" title="Supprimer">${ico("trash")}</button>` }
        ]
      });
      $("#addE").onclick = async () => { if (await empForm(null)) App.render(); };
      $("#modE").onclick = () => UI.exportXLSX("Modele_import_salaries", [{ name: "Salariés", aoa: [IMPORT_COLS.map((f) => f.k), IMPORT_COLS.map((f) => f.l.replace(" *", "")), IMPORT_COLS.map((f) => ({ matricule: "MAT001", nom: "KOUASSI", prenoms: "Jean", sexe: "M", dateNaissance: "1990-05-14", statut: "Local", fonction: "Comptable", dateEntree: "2022-01-03", contrat: "CDI", actif: "1", base: 150000, sursalaire: 50000, transport: 30000, situation: "Marié(e)", enfants: 2, cmuBenef: 3, modePaiement: "Virement" }[f.k] ?? ""))] }]);
      $("#impE").onclick = async () => {
        let buf; if (window.api) { const r = await window.api.openFile({ filters: [{ name: "Excel", extensions: ["xlsx", "xls", "csv"] }] }); if (!r) return; buf = r.data; } else return;
        const wb = XLSX.read(buf, { type: "array", cellDates: true }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true });
        const head = rows[0].map(String); let n = 0;
        rows.slice(1).forEach((r) => { if (!r.length || r[0] === undefined || String(r[0]).startsWith("Matricule")) return; const e = { id: UI.uid(), actif: true, conge: {}, pret: {} };
          head.forEach((k, i) => { const f = ALL_FIELDS.find((x) => x.k === k); if (!f) return; let v = r[i]; if (v === undefined || v === null) return; if (v instanceof Date) v = new Date(v.getTime() - v.getTimezoneOffset() * 60000).toISOString().slice(0, 10); if (f.t === "num") v = Number(v) || 0; if (f.t === "bool") v = !(v === 0 || v === "0" || String(v).toLowerCase() === "non"); setP(e, k, f.t === "num" || f.t === "bool" ? v : String(v)); });
          if (!e.matricule || !e.nom) return; const ex = S().employes.findIndex((x) => x.matricule === e.matricule); if (ex >= 0) { e.id = S().employes[ex].id; S().employes[ex] = Object.assign(S().employes[ex], e); } else S().employes.push(e); n++; });
        Store.save(); toast(`${n} salarié(s) importé(s)`, "ok"); App.render();
      };
      $$("[data-del]", el).forEach((b) => (b.onclick = async (ev) => { ev.stopPropagation(); const e = Store.empById(b.dataset.del); if (await confirm("Supprimer", `Supprimer définitivement ${esc(e.nom)} ${esc(e.prenoms || "")} ? Pour un départ, préférez la date de sortie (l'historique est conservé).`, "Supprimer", "btn-danger")) { S().employes = S().employes.filter((x) => x.id !== e.id); Store.save(); App.render(); } }));
      $$("[data-dup]", el).forEach((b) => (b.onclick = async (ev) => { ev.stopPropagation(); const e = JSON.parse(JSON.stringify(Store.empById(b.dataset.dup))); e.id = UI.uid(); e.matricule = Store.nextMatricule(); e.nom = ""; e.prenoms = ""; e.cnps = ""; if (await empForm(Object.assign(e))) App.render(); }));
    }
  };

  /* ============ SAISIE DU MOIS ============ */
  const VCOLS = [["abs", "Absences non payées (j)"], ["conge", "Jours de congé (cal.)"], ["hs1", "HS 15 % (h)"], ["hs2", "HS 50 % (h)"], ["hs3", "HS 75 % (h)"], ["hs4", "HS 100 % (h)"], ["prend", "Prime de rendement"], ["paut", "Autre prime imposable"], ["ni", "Indemn. non imposables"], ["acpt", "Acompte / avance"], ["pret", "Remb. prêt"], ["assur", "Mutuelle"], ["autr", "Autres retenues"]];
  Pages.saisie = {
    title: "Saisie du mois", group: "Paie du mois", icon: "edit", sub: () => `Éléments variables | ${perLabel(App.view)}`,
    render(el) {
      const p = App.view, closed = Store.isClosed(p);
      if (closed) { el.innerHTML = `<div class="note">Le mois de ${perLabel(p)} est clôturé : la saisie est verrouillée. Rouvrez-le depuis « Clôture & historique » pour le modifier.</div>`; return; }
      const list = Store.compute(p, true).filter((r) => r.jpres > 0);
      el.innerHTML = `<div class="toolbar"><div class="note info" style="flex:1">Saisissez uniquement ce qui change ce mois-ci. Le salaire, les primes fixes, le transport, la gratification (mois ${S().params.gratMois}), l'allocation de congé et les échéances de prêt sont calculés <b>automatiquement</b>. Le net se met à jour en direct.</div>
        <button class="btn" id="raz">Remettre à zéro</button><button class="btn" id="cpy">${ico("copy")} Copier le mois précédent</button></div>
        <div class="field" style="flex-direction:row;align-items:center;gap:10px;margin-bottom:12px"><label style="white-space:nowrap">Date de paiement :</label><input type="date" class="in" id="dpay" style="max-width:180px" value="${Store.datePaiement(p)}"></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="sticky-col">Salarié</th>${VCOLS.map(([, l]) => `<th class="num" style="white-space:normal;min-width:86px">${l}</th>`).join("")}<th class="num">Gratif.</th><th class="num">Congé payé</th><th class="num">Brut</th><th class="num">Net à payer</th></tr></thead>
        <tbody>${list.map((r) => { const v = Store.vars(r.id, p); return `<tr data-id="${r.id}"><td class="sticky-col"><div class="emp-cell"><span class="avatar" style="background:${UI.avatarColor(r.nom)}">${UI.initials(r.nom)}</span><div>${esc(r.nom)}<small>${esc(r.mat)} · ${r.jpres} j</small></div></div></td>${VCOLS.map(([k]) => `<td><input class="in" data-v="${k}" value="${v[k] ?? ""}" placeholder="${k === "pret" && r.pret ? fmt0(r.pret) : k === "assur" && r.emp.assuranceFixe ? fmt0(r.emp.assuranceFixe) : ""}" style="width:92px;text-align:right"></td>`).join("")}<td class="num" data-o="grat">${fmt(r.grat)}</td><td class="num" data-o="cp">${fmt(r.cp)}</td><td class="num" data-o="btot">${fmt(r.btot)}</td><td class="num strong" data-o="net" style="color:var(--green)">${fmt(r.net)}</td></tr>`; }).join("")}</tbody>
        <tfoot><tr><td>TOTAL</td>${VCOLS.map(([k]) => `<td class="num" data-t="${k}"></td>`).join("")}<td class="num" data-t="grat"></td><td class="num" data-t="cp"></td><td class="num" data-t="btot"></td><td class="num" data-t="net"></td></tr></tfoot></table></div>`;
      const totals = () => { const L = Store.compute(p); VCOLS.forEach(([k]) => { $(`[data-t="${k}"]`, el).textContent = fmt(list.reduce((s, r) => s + (Number(Store.vars(r.id, p)[k]) || 0), 0), k.startsWith("hs") || k === "abs" || k === "conge" ? 1 : 0); }); const T = Store.totals(L); ["grat", "cp", "btot", "net"].forEach((k) => ($(`[data-t="${k}"]`, el).textContent = fmt(T[k]))); };
      $$("[data-v]", el).forEach((i) => (i.oninput = () => { const tr = i.closest("tr"); const id = tr.dataset.id; const v = Store.vars(id, p); const raw = i.value.replace(/\s/g, "").replace(",", "."); if (raw === "") delete v[i.dataset.v]; else v[i.dataset.v] = Number(raw) || 0; Store.save(); const r = Store.compute(p, true).find((x) => x.id === id); ["grat", "cp", "btot", "net"].forEach((k) => ($(`[data-o="${k}"]`, tr).textContent = fmt(r[k]))); totals(); }));
      totals();
      $("#dpay").onchange = (e) => { Store.per(p).datePaiement = e.target.value; Store.save(); };
      $("#raz").onclick = async () => { if (await confirm("Remettre à zéro", "Effacer tous les éléments variables saisis pour ce mois ?")) { Store.per(p).vars = {}; Store.save(); this.render(el); } };
      $("#cpy").onclick = () => { const prev = S().periodes[Store.addMonth(p, -1)]; if (!prev) return toast("Pas de mois précédent", "err"); Store.per(p).vars = JSON.parse(JSON.stringify(prev.vars || {})); Store.save(); this.render(el); toast("Éléments copiés", "ok"); };
    }
  };
})();
