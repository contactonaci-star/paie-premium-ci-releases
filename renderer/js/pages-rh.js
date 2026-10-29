/* Pages : congés, gratifications, prêts, rupture, documents RH, clôture, sauvegarde, aide */
(() => {
        const { $, $$, esc, fmt, fmt0, pct, fmtD, ico, toast, modal, confirm, chart, table, perLabel, perShort, printDocs, exportXLSX, todayISO } = UI;
        const S = () => Store.get();
        const P = () => S().params;
        const empOpts = (sel, all = false) => S().employes.filter((e) => all || e.actif !== false).map((e) => `<option value="${e.id}" ${e.id === sel ? "selected" : ""}>${esc(e.matricule)} - ${esc(e.nom)} ${esc(e.prenoms || "")}</option>`).join("");
        const num = (v) => Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")) || 0;
        const civ = (e) => (e.sexe === "F" ? "Madame" : "Monsieur");

        /* ============ CONGÉS ============ */
        Pages.conges = {
                title: "Congés payés",
                group: "Gestion RH",
                icon: "sun",
                sub: () => `Droits acquis, départs et allocations | ${perLabel(S().periode)}`,
                render(el) {
                    const p = S().periode;
                    const list = Store.compute(p, true).filter((r) => r.jpres > 0 || r.emp.actif !== false);
                    const tot = list.reduce((a, r) => ({ solde: a.solde + Math.max(0, r.conge.apres), prov: a.prov + r.conge.provision, alloc: a.alloc + r.conge.alloc, enConge: a.enConge + (r.conge.ceMois > 0 ? 1 : 0) }), { solde: 0, prov: 0, alloc: 0, enConge: 0 });
                    el.innerHTML = `<div class="grid g4" style="margin-bottom:16px">${[["Salariés en congé ce mois", tot.enConge, ""], ["Allocations payées ce mois", fmt0(tot.alloc), "FCFA"], ["Jours de congé à prendre", tot.solde.toFixed(1), "jours"], ["Provision pour congés", fmt0(tot.prov), "FCFA"]].map(([l, v, u]) => `<div class="card kpi"><div class="lbl">${l}</div><div class="val">${v} <small>${u}</small></div></div>`).join("")}</div>
        <div class="note info" style="margin-bottom:12px">Acquisition : ${P().congeJours} jours ouvrables par mois + jours d'ancienneté. Pour un départ, cliquez sur « Départ en congé » : l'allocation (salaire moyen × jours × ${P().congeCoef} / 30) est ajoutée automatiquement à la paie et le solde est mis à jour à la clôture du mois.</div><div id="ct"></div>`;
      table($("#ct", el), {
        rows: list, exportName: `Conges_${p}`,
        columns: [{ key: "mat", label: "Matricule" }, { key: "nom", label: "Salarié", strong: true }, { key: "ent", label: "Entrée", get: (r) => r.emp.dateEntree, date: true }, { key: "ref", label: "Réf. (dernier retour)", get: (r) => r.emp.conge?.dateRef || r.emp.dateEntree, date: true },
          { key: "mois", label: "Mois", get: (r) => r.conge.mois, num: true }, { key: "acq", label: "Acquis", get: (r) => r.conge.total, render: (r) => r.conge.total.toFixed(1), num: true }, { key: "pris", label: "Pris", get: (r) => r.conge.pris, num: true },
          { key: "solde", label: "Solde", get: (r) => r.conge.solde, render: (r) => `<b style="color:${r.conge.solde < 0 ? "var(--red)" : "var(--green)"}">${r.conge.solde.toFixed(1)}</b>`, num: true },
          { key: "ce", label: "Ce mois", get: (r) => r.conge.ceMois, render: (r) => (r.conge.ceMois ? `<span class="badge orange">${r.conge.ceMois} j · retour ${fmtD(r.conge.retour)}</span>` : "") },
          { key: "sal", label: "Salaire moyen réf.", get: (r) => r.conge.salRef, money: true }, { key: "alloc", label: "Allocation du mois", get: (r) => r.conge.alloc, money: true }, { key: "prov", label: "Provision", get: (r) => r.conge.provision, money: true },
          { key: "a", label: "", sortable: false, get: () => "", render: (r) => `<button class="btn btn-sm btn-primary" data-dep="${r.id}">Départ en congé</button> <button class="btn btn-sm" data-cfg="${r.id}">Ajuster</button>` }]
      });
      $$("[data-dep]", el).forEach((b) => (b.onclick = async () => {
        const e = Store.empById(b.dataset.dep); e.conge = e.conge || {}; const ci = Engine.congeInfo(e, P(), p, Store.histAvg(e.id, p));
        const r = await modal({ title: `Départ en congé : ${esc(e.nom)} ${esc(e.prenoms || "")}`, size: "sm", body: `<p>Solde disponible : <b>${ci.solde.toFixed(1)} jours ouvrables</b>.</p><div class="form-grid g2f"><div class="field"><label>Jours ouvrables pris</label><input class="in" id="cj" value="${e.conge.joursCeMois || Math.max(0, Math.floor(ci.solde))}"></div><div class="field"><label>Date de départ</label><input class="in" type="date" id="cd" value="${e.conge.dateDepart || Engine.fmtISO(Engine.periodBounds(p).debut)}"></div><div class="field"><label>Salaire de référence (vide = auto)</label><input class="in" id="cs" value="${e.conge.salaireRef || ""}" placeholder="${fmt0(ci.salRef)}"></div></div><p class="hint">Pensez à saisir dans « Saisie du mois » les jours calendaires d'absence pour congé afin d'arrêter le salaire sur ces jours.</p>`,
          buttons: [{ label: "Annuler le départ", value: "clear", cls: "btn-danger" }, { label: "Valider", cls: "btn-primary", value: (bg) => ({ j: num($("#cj", bg).value), d: $("#cd", bg).value, s: num($("#cs", bg).value) }) }] });
        if (r === "clear") { e.conge.joursCeMois = 0; e.conge.dateDepart = ""; } else if (r) { e.conge.joursCeMois = r.j; e.conge.dateDepart = r.d; e.conge.salaireRef = r.s || ""; } else return;
        Store.save(); this.render(el); toast("Congé mis à jour", "ok");
      }));
      $$("[data-cfg]", el).forEach((b) => (b.onclick = async () => {
        const e = Store.empById(b.dataset.cfg); e.conge = e.conge || {};
        const r = await modal({ title: `Ajuster les congés : ${esc(e.nom)}`, size: "sm", body: `<div class="form-grid g2f"><div class="field"><label>Date de référence (dernier retour)</label><input class="in" type="date" id="r1" value="${e.conge.dateRef || ""}"></div><div class="field"><label>Jours déjà pris depuis</label><input class="in" id="r2" value="${e.conge.joursPris || 0}"></div><div class="field"><label>Jours supplémentaires (mère, etc.)</label><input class="in" id="r3" value="${e.conge.joursAutres || 0}"></div></div>`, buttons: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: (bg) => ({ a: $("#r1", bg).value, b: num($("#r2", bg).value), c: num($("#r3", bg).value) }) }] });
        if (!r) return; e.conge.dateRef = r.a; e.conge.joursPris = r.b; e.conge.joursAutres = r.c; Store.save(); this.render(el);
      }));
    }
  };

  /* ============ GRATIFICATIONS ============ */
  Pages.gratifications = {
    title: "Gratifications", group: "Gestion RH", icon: "gift", sub: () => `Gratification ${S().periode.slice(0, 4)} · ${Math.round(P().gratTaux * 100)} % du salaire catégoriel au prorata, versée en ${UI.MOIS[P().gratMois - 1]}`,
    render(el) {
      const p = S().periode; const list = Store.compute(p, true).filter((r) => r.emp.actif !== false);
      const tot = list.reduce((a, r) => ({ t: a.t + r.gratInfo.retenu, v: a.v + r.grat }), { t: 0, v: 0 });
      el.innerHTML = `<div class="grid g3" style="margin-bottom:16px"><div class="card kpi"><div class="lbl">Enveloppe annuelle estimée</div><div class="val">${fmt0(tot.t)} <small>FCFA</small></div></div><div class="card kpi"><div class="lbl">Versé ce mois</div><div class="val" style="color:var(--green)">${fmt0(tot.v)} <small>FCFA</small></div></div><div class="card kpi"><div class="lbl">Mois de versement</div><div class="val">${UI.MOIS[P().gratMois - 1]}</div></div></div><div id="gt"></div>`;
      table($("#gt", el), { rows: list, total: true, exportName: `Gratifications_${p}`, columns: [{ key: "mat", label: "Matricule" }, { key: "nom", label: "Salarié", strong: true }, { key: "cat", label: "Catégorie", get: (r) => r.emp.categorie }, { key: "base", label: "Salaire catégoriel / base", get: (r) => r.gratInfo.base, money: true }, { key: "j", label: "Jours de présence", get: (r) => r.gratInfo.jours, num: true }, { key: "pro", label: "Prorata", get: (r) => r.gratInfo.prorata, pct: true }, { key: "th", label: "Montant calculé", get: (r) => r.gratInfo.theorique, money: true }, { key: "ret", label: "Montant retenu", get: (r) => r.gratInfo.retenu, money: true, strong: true },
        { key: "v", label: "Versé ce mois", get: (r) => r.grat, money: true }, { key: "a", label: "", sortable: false, get: () => "", render: (r) => { const v = Store.vars(r.id, p); return `<button class="btn btn-sm ${v.gratForce ? "btn-green" : ""}" data-f="${r.id}">${v.gratForce ? "✔ Versée ce mois" : "Verser ce mois"}</button> <button class="btn btn-sm" data-m="${r.id}">Montant manuel</button>`; } }] });
      $$("[data-f]", el).forEach((b) => (b.onclick = () => { if (Store.isClosed(p)) return; const v = Store.vars(b.dataset.f, p); v.gratForce = !v.gratForce; Store.save(); this.render(el); }));
      $$("[data-m]", el).forEach((b) => (b.onclick = async () => { const v = Store.vars(b.dataset.m, p); const r = await modal({ title: "Montant manuel de gratification", size: "sm", body: `<div class="field"><label>Montant (vide = calcul automatique)</label><input class="in" id="gm" value="${v.gratManuel ?? ""}"></div>`, buttons: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: (bg) => $("#gm", bg).value }] }); if (r === null) return; if (r === "") delete v.gratManuel; else v.gratManuel = num(r); Store.save(); this.render(el); }));
    }
  };

  /* ============ PRÊTS & AVANCES ============ */
  Pages.prets = {
    title: "Prêts & avances", group: "Gestion RH", icon: "wallet", sub: () => "Échéancier automatique des remboursements",
    render(el) {
      const L = S().employes.filter((e) => e.pret && (num(e.pret.montant) || num(e.pret.restant)));
      const tot = L.reduce((a, e) => ({ m: a.m + num(e.pret.montant), r: a.r + num(e.pret.restant), e: a.e + Math.min(num(e.pret.mensualite), num(e.pret.restant)) }), { m: 0, r: 0, e: 0 });
      el.innerHTML = `<div class="grid g3" style="margin-bottom:16px"><div class="card kpi"><div class="lbl">Total des prêts accordés</div><div class="val">${fmt0(tot.m)}</div></div><div class="card kpi"><div class="lbl">Reste à rembourser</div><div class="val" style="color:var(--red)">${fmt0(tot.r)}</div></div><div class="card kpi"><div class="lbl">Retenues de ce mois</div><div class="val" style="color:var(--green)">${fmt0(tot.e)}</div></div></div>
        <div class="toolbar"><button class="btn btn-primary" id="np">${ico("plus")} Accorder un prêt</button><span class="hint">La mensualité est retenue automatiquement sur chaque bulletin ; le reste dû diminue à chaque clôture de mois.</span></div><div id="pt"></div>`;
      table($("#pt", el), { rows: L, search: false, exportName: "Prets", empty: "Aucun prêt en cours.", columns: [{ key: "matricule", label: "Matricule" }, { key: "nom", label: "Salarié", get: (e) => `${e.nom} ${e.prenoms || ""}`, strong: true }, { key: "d", label: "Date", get: (e) => e.pret.dateDebut, date: true }, { key: "m", label: "Montant", get: (e) => num(e.pret.montant), money: true }, { key: "mens", label: "Mensualité", get: (e) => num(e.pret.mensualite), money: true }, { key: "r", label: "Reste dû", get: (e) => num(e.pret.restant), money: true, strong: true },
        { key: "av", label: "Avancement", get: (e) => (num(e.pret.montant) ? 1 - num(e.pret.restant) / num(e.pret.montant) : 0), render: (e) => { const x = num(e.pret.montant) ? 1 - num(e.pret.restant) / num(e.pret.montant) : 0; return `<div style="width:140px;height:8px;background:#eef0f4;border-radius:4px;display:inline-block;vertical-align:middle"><div style="width:${Math.round(x * 100)}%;height:100%;background:var(--green);border-radius:4px"></div></div> ${Math.round(x * 100)} %`; } },
        { key: "fin", label: "Échéances restantes", get: (e) => (num(e.pret.mensualite) ? Math.ceil(num(e.pret.restant) / num(e.pret.mensualite)) : 0), num: true }] });
      $("#np").onclick = async () => {
        const r = await modal({ title: "Accorder un prêt / une avance", size: "sm", body: `<div class="form-grid g2f"><div class="field" style="grid-column:1/-1"><label>Salarié</label><select class="in" id="pe">${empOpts()}</select></div><div class="field"><label>Montant</label><input class="in" id="pm"></div><div class="field"><label>Mensualité</label><input class="in" id="pq"></div><div class="field"><label>Date</label><input class="in" type="date" id="pd" value="${todayISO()}"></div></div>`, buttons: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary", value: (bg) => ({ id: $("#pe", bg).value, m: num($("#pm", bg).value), q: num($("#pq", bg).value), d: $("#pd", bg).value }) }] });
        if (!r || !r.m) return; const e = Store.empById(r.id); e.pret = { montant: r.m, mensualite: r.q || r.m, restant: r.m, dateDebut: r.d }; Store.save(); this.render(el); toast("Prêt enregistré", "ok");
      };
    }
  };

  /* ============ RUPTURE & SOLDE DE TOUT COMPTE ============ */
  Pages.rupture = {
    title: "Rupture & solde de tout compte", group: "Gestion RH", icon: "exit", sub: () => "Calcul des droits de sortie, reçu et certificat de travail",
    inp: { id: null, dateSortie: "", motif: "Licenciement", preavisEffectue: "NON", jours: 0, joursCP: "", sgmm: "", totalCdd: "", sansGrat: false },
    render(el) {
      const I = this.inp; if (!S().employes.length) { el.innerHTML = `<div class="note">Aucun salarié.</div>`; return; }
      if (!I.id || !Store.empById(I.id)) I.id = S().employes[0].id; if (!I.dateSortie) I.dateSortie = Engine.fmtISO(Engine.periodBounds(S().periode).fin);
      el.innerHTML = `<div class="grid" style="grid-template-columns:380px 1fr;align-items:start"><div class="card"><h3>Paramètres de la sortie</h3><div class="form-grid g2f">
        <div class="field" style="grid-column:1/-1"><label>Salarié</label><select class="in" data-i="id">${empOpts(I.id, true)}</select></div>
        <div class="field"><label>Date de sortie</label><input class="in" type="date" data-i="dateSortie" value="${I.dateSortie}"></div>
        <div class="field"><label>Motif</label><select class="in" data-i="motif">${P().motifs.map((m) => `<option ${m.nom === I.motif ? "selected" : ""}>${esc(m.nom)}</option>`).join("")}</select></div>
        <div class="field"><label>Préavis effectué ?</label><select class="in" data-i="preavisEffectue"><option ${I.preavisEffectue === "NON" ? "selected" : ""}>NON</option><option ${I.preavisEffectue === "OUI" ? "selected" : ""}>OUI</option></select></div>
        <div class="field"><label>Jours travaillés non payés</label><input class="in" data-i="jours" value="${I.jours}"></div>
        <div class="field"><label>Jours de congés non pris</label><input class="in" data-i="joursCP" value="${I.joursCP}" placeholder="auto"></div>
        <div class="field"><label>Salaire moyen manuel</label><input class="in" data-i="sgmm" value="${I.sgmm}" placeholder="auto"></div>
        <div class="field"><label>Total brut du CDD</label><input class="in" data-i="totalCdd" value="${I.totalCdd}" placeholder="auto"></div>
        <div class="field"><label>Gratification déjà versée ?</label><select class="in" data-i="sansGrat"><option value="" ${!I.sansGrat ? "selected" : ""}>Non</option><option value="1" ${I.sansGrat ? "selected" : ""}>Oui</option></select></div></div>
        <div class="toolbar" style="margin-top:16px;flex-direction:column;align-items:stretch"><button class="btn btn-primary" id="stc">${ico("pdf")} Reçu pour solde de tout compte</button><button class="btn" id="cert">${ico("doc")} Certificat de travail</button><button class="btn btn-danger" id="apply">${ico("exit")} Enregistrer la sortie dans la fiche</button></div></div>
        <div><div class="grid g3" id="rk"></div><div class="grid g2" style="margin-top:16px"><div class="card"><h3>Détail des droits</h3><div id="rd"></div></div><div class="card"><h3>Composition du solde</h3><div class="chart-box tall"><canvas id="rc"></canvas></div></div></div></div></div>`;
      let ch = null; let R = null;
      const calc = () => {
        const e = Store.empById(I.id); const cat = Store.catOf(e);
        const ci = Engine.congeInfo(e, P(), S().periode, Store.histAvg(e.id, S().periode));
        const sortieP = I.dateSortie ? I.dateSortie.slice(0, 7) : S().periode;
        R = Engine.rupture(e, I, P(), { groupe: Store.groupeOf(e), catSal: cat ? Number(cat.salaire) : 0, histAvg: Store.histAvg(e.id, Store.addMonth(sortieP, 1)), histBrut: Store.histBrut(e.id), soldeConge: ci.solde });
        if (!R) { $("#rd").innerHTML = `<div class="note">Date d'entrée ou de sortie manquante.</div>`; return; }
        $("#rk").innerHTML = [["Ancienneté", `${R.ancD.toFixed(2)} ans`, "#22396a"], ["Salaire moyen (SGMM)", fmt0(R.sgmm), "#7c3aed"], ["Net à payer", fmt0(R.net) + " FCFA", "#12925b"]].map(([l, v, c]) => `<div class="card kpi" style="--kpi-color:${c}"><div class="lbl">${l}</div><div class="val" style="color:${c};font-size:20px">${v}</div></div>`).join("");
        $("#rd").innerHTML = R.items.map((x) => `<div class="stat-row"><span>${x.lib}<br><small class="hint">${x.note} · ${x.imp ? "imposable" : "non imposable"}</small></span><span>${fmt0(x.mt)}</span></div>`).join("") + [["<b>Total brut</b>", R.total], ["CNPS 6,3 %", -R.cnps], ["ITS", -R.its], ["CMU", -R.cmu], ["<b style='color:var(--green)'>NET À PAYER</b>", R.net]].map(([l, v]) => `<div class="stat-row"><span>${l}</span><span>${fmt0(v)}</span></div>`).join("") + `<p class="hint">Groupe : ${esc(R.groupe)} · préavis ${R.dureePreavis} mois · congés ${R.joursCP} j.</p>`;
        const it = R.items.filter((x) => x.mt > 0);
        if (ch) ch.destroy(); ch = chart($("#rc"), { type: "doughnut", data: { labels: it.map((x) => x.lib), datasets: [{ data: it.map((x) => x.mt), backgroundColor: UI.PAL }] }, options: { maintainAspectRatio: false, cutout: "55%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }, tooltip: { callbacks: { label: (c) => ` ${fmt0(c.parsed)}` } } } } });
      };
      $$("[data-i]", el).forEach((i) => (i.oninput = i.onchange = () => { const k = i.dataset.i; I[k] = k === "sansGrat" ? !!i.value : i.value; calc(); }));
      calc();
      const docSTC = () => { const e = Store.empById(I.id); return Docs.letter("REÇU POUR SOLDE DE TOUT COMPTE", `<p>Je soussigné(e), <b>${civ(e)} ${esc(e.nom)} ${esc(e.prenoms || "")}</b>, matricule ${esc(e.matricule)}, ayant occupé l'emploi de <b>${esc(e.fonction || "")}</b> au sein de la société <b>${esc(S().entreprise.nom)}</b> du ${fmtD(e.dateEntree)} au ${fmtD(I.dateSortie)} (motif : ${esc(I.motif)}), reconnais avoir reçu de mon employeur la somme nette de <b>${fmt0(R.net)} FCFA</b> (${Engine.enLettres(R.net)} francs CFA) pour solde de tout compte, en paiement des sommes suivantes :</p>
        <table><thead><tr><th>Désignation</th><th>Montant (FCFA)</th></tr></thead><tbody>${R.items.filter((x) => x.mt).map((x) => `<tr><td>${x.lib}</td><td class="num">${fmt(x.mt)}</td></tr>`).join("")}<tr class="sub"><td>Total brut</td><td class="num">${fmt(R.total)}</td></tr><tr><td>Retenue CNPS</td><td class="num">${fmt(R.cnps)}</td></tr><tr><td>Retenue ITS</td><td class="num">${fmt(R.its)}</td></tr><tr><td>Retenue CMU</td><td class="num">${fmt(R.cmu)}</td></tr></tbody><tfoot><tr class="tot"><td>NET PERÇU</td><td class="num">${fmt(R.net)}</td></tr></tfoot></table>
        <p>Ce reçu, établi en double exemplaire dont un m'a été remis, peut être dénoncé dans les délais prévus par la loi. Je reconnais avoir également reçu mon certificat de travail.</p>
        <div class="sign"><span>L'employeur</span><span>Le salarié<br><small style="font-weight:400">« Pour solde de tout compte »</small></span></div>`, { date: I.dateSortie }); };
      $("#stc").onclick = () => printDocs(docSTC(), { pdfName: `Solde_tout_compte_${Store.empById(I.id).matricule}` });
      $("#cert").onclick = () => { const e = Store.empById(I.id); printDocs(Docs.letter("CERTIFICAT DE TRAVAIL", certText(e, I.dateSortie), { date: I.dateSortie }), { pdfName: `Certificat_travail_${e.matricule}` }); };
      $("#apply").onclick = async () => { const e = Store.empById(I.id); if (await confirm("Enregistrer la sortie", `Fixer la date de sortie de ${esc(e.nom)} au ${fmtD(I.dateSortie)} ? Son salaire sera proratisé jusqu'à cette date et il n'apparaîtra plus dans les paies suivantes.`)) { e.dateSortie = I.dateSortie; e.motifSortie = I.motif; Store.save(); toast("Sortie enregistrée", "ok"); } };
    }
  };
  const certText = (e, dateSortie) => `<p>Je soussigné(e), <b>${esc(S().entreprise.dirigeant)}</b>, ${esc(S().entreprise.qualite)} de la société <b>${esc(S().entreprise.nom)}</b>,</p><p>Certifie par la présente que <b>${civ(e)} ${esc(e.nom)} ${esc(e.prenoms || "")}</b>, né(e) le ${fmtD(e.dateNaissance)}${e.lieuNaissance ? " à " + esc(e.lieuNaissance) : ""}, immatriculé(e) à la Caisse Nationale de Prévoyance Sociale (CNPS) sous le numéro ${esc(e.cnps) || "non renseigné"}, a occupé les fonctions de <b>${esc(e.fonction || "")}</b>${e.categorie ? ", catégorie " + esc(e.categorie) : ""}, au sein de notre entreprise du <b>${fmtD(e.dateEntree)}</b> au <b>${fmtD(dateSortie)}</b>.</p><p>À la date du présent certificat, ${civ(e)} <b>${esc(e.nom)}</b> nous quitte libre de tout engagement vis-à-vis de notre établissement.</p><p>Le présent certificat de travail est délivré conformément aux dispositions du Code du travail de la République de Côte d'Ivoire, pour servir et valoir ce que de droit.</p>`;

  /* ============ DOCUMENTS RH ============ */
  Pages.documents = {
    title: "Documents RH", group: "Gestion RH", icon: "doc", sub: () => "Contrats, attestations et certificats",
    render(el) {
      const emps = S().employes.filter(e => e.actif !== false);
      if (!emps.length) { el.innerHTML = `<div class="note">Aucun salarié actif.</div>`; return; }
      let empId = emps[0].id; let docType = "attestation"; let currentDoc = "";
      const A = (n, t, b) => `<h4 style="margin:14px 0 4px;color:#1f3864">ARTICLE ${n} - ${t}</h4><p>${b}</p>`;
      const preview = () => {
        const e = Store.empById(empId); if (!e) return;
        const ent = S().entreprise; const cdd = e.contrat && e.contrat.toUpperCase() === "CDD";
        const hist = S().historique.filter(h => h.id === e.id).sort((a, b) => b.periode.localeCompare(a.periode));
        const lastR = hist[0] || {};
        if (docType === "attestation") {
          currentDoc = Docs.letter("ATTESTATION DE TRAVAIL", `<p>Je soussigné(e), <b>${esc(ent.dirigeant)}</b>, ${esc(ent.qualite)} de la société <b>${esc(ent.nom)}</b>, immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) sous le numéro ${esc(ent.rccm || "non renseigné")} et à la Caisse Nationale de Prévoyance Sociale (CNPS) sous le numéro ${esc(ent.cnps || "non renseigné")},</p><p>Atteste par la présente que <b>${civ(e)} ${esc(e.nom)} ${esc(e.prenoms || "")}</b>, de nationalité ${esc(e.nationalite || "ivoirienne")}, est employé(e) en qualité de <b>${esc(e.fonction || "")}</b>${e.categorie ? ", catégorie " + esc(e.categorie) : ""}, dans le cadre d'un contrat à ${cdd ? "durée déterminée" : "durée indéterminée"}, depuis le <b>${fmtD(e.dateEntree)}</b>.</p><p>La présente attestation est délivrée à l'intéressé(e) à sa demande, pour servir et valoir ce que de droit.</p>`);
        } else if (docType === "certificat") {
          currentDoc = Docs.letter("CERTIFICAT DE TRAVAIL", certText(e, e.dateSortie || todayISO()));
        } else if (docType === "salaire") {
          currentDoc = Docs.letter("ATTESTATION DE SALAIRE", `<p>Je soussigné(e), <b>${esc(ent.dirigeant)}</b>, ${esc(ent.qualite)} de la société <b>${esc(ent.nom)}</b>,</p><p>Certifie par la présente que <b>${civ(e)} ${esc(e.nom)} ${esc(e.prenoms || "")}</b>, exerçant les fonctions de ${esc(e.fonction || "")}, perçoit les rémunérations nettes figurant au tableau ci-après :</p><table><thead><tr><th>Élément de rémunération</th><th>Montant mensuel (FCFA)</th></tr></thead><tbody><tr><td>Salaire de base</td><td class="num">${fmt0(e.base || 0)}</td></tr>${e.sursalaire ? `<tr><td>Sursalaire</td><td class="num">${fmt0(e.sursalaire)}</td></tr>` : ""}${e.transport ? `<tr><td>Indemnité de transport</td><td class="num">${fmt0(e.transport)}</td></tr>` : ""}${lastR.net ? `<tr class="sub"><td>Net à payer (dernier bulletin)</td><td class="num">${fmt0(lastR.net)}</td></tr>` : ""}</tbody></table><p>La présente attestation est délivrée à l'intéressé(e) à sa demande, pour servir et valoir ce que de droit.</p>`);
        } else if (docType === "contrat") {
          const titre = cdd ? "CONTRAT À DURÉE DÉTERMINÉE" : "CONTRAT À DURÉE INDÉTERMINÉE";
          currentDoc = Docs.letter(titre, "<p style=\"text-align:center;font-weight:700\">ENTRE LES SOUSSIGNÉS :</p>"
            + "<p><b>D'UNE PART :</b><br>La société <b>" + esc(ent.nom) + "</b>, sise à " + esc(ent.adresse) + (ent.ville ? ", " + esc(ent.ville) : "") + ", immatriculée au RCCM sous le numéro " + esc(ent.rccm || "non renseigné") + ", représentée par <b>" + esc(ent.dirigeant) + "</b>, " + esc(ent.qualite) + ", ci-après dénommée « l'Employeur »,</p>"
            + "<p><b>D'AUTRE PART :</b><br><b>" + civ(e) + " " + esc(e.nom) + " " + esc(e.prenoms || "") + "</b>, de nationalité " + esc(e.nationalite || "ivoirienne") + ", né(e) le " + fmtD(e.dateNaissance) + (e.lieuNaissance ? " à " + esc(e.lieuNaissance) : "") + ", immatriculé(e) à la CNPS sous le numéro " + esc(e.cnps || "non renseigné") + ", ci-après dénommé(e) « le Salarié »,</p>"
            + "<p>Il a été convenu et arrêté ce qui suit :</p>"
            + A(1, "OBJET ET DURÉE DU CONTRAT", cdd ? "Le présent contrat est conclu pour une durée déterminée. Il prend effet le " + fmtD(e.dateEntree) + (e.dateFinContrat ? " et prendra fin le " + fmtD(e.dateFinContrat) : "") + ". Il peut être renouvelé dans les conditions prévues par le Code du travail de la République de Côte d'Ivoire." : "Le présent contrat est conclu pour une durée indéterminée. Il prend effet le " + fmtD(e.dateEntree) + ".")
            + A(2, "FONCTIONS ET CLASSIFICATION", "Le Salarié est engagé(e) en qualité de <b>" + esc(e.fonction || "") + "</b>" + (e.categorie ? ", catégorie " + esc(e.categorie) : "") + ". Il (Elle) exercera ses fonctions sous l'autorité de l'Employeur, conformément aux instructions reçues et à la réglementation en vigueur.")
            + A(3, "LIEU DE TRAVAIL", "Le Salarié exercera ses fonctions à " + esc(ent.ville || "Abidjan") + ". Tout déplacement hors du lieu de travail habituel fera l'objet d'un ordre de mission préalable.")
            + A(4, "DURÉE DU TRAVAIL", "La durée du travail est fixée à 40 heures par semaine, conformément à la législation en vigueur en République de Côte d'Ivoire. Les heures supplémentaires éventuelles seront rémunérées selon les dispositions légales applicables.")
            + A(5, "RÉMUNÉRATION", "En contrepartie de ses fonctions, le Salarié percevra une rémunération mensuelle brute composée comme suit :<br>- Salaire de base : <b>" + fmt0(e.base || 0) + " FCFA</b>" + (e.sursalaire ? "<br>- Sursalaire : " + fmt0(e.sursalaire) + " FCFA" : "") + (e.transport ? "<br>- Indemnité de transport : " + fmt0(e.transport) + " FCFA" : "") + "<br>Cette rémunération est versée mensuellement, après déduction des cotisations sociales et fiscales obligatoires.")
            + A(6, "PÉRIODE D'ESSAI", cdd ? "Le présent contrat est soumis à une période d'essai conformément aux dispositions du Code du travail et de la convention collective applicable." : "Le présent contrat est soumis à une période d'essai de " + esc(e.periodeEssai || "un (1) mois") + ", renouvelable une fois dans les conditions prévues par la loi. En cas de rupture pendant cette période, aucune indemnité n'est due.")
            + A(7, "CONGÉS PAYÉS", "Le Salarié bénéficiera d'un congé annuel payé conformément au Code du travail de la République de Côte d'Ivoire, soit " + String(P().congeJours || 2.2) + " jours ouvrables par mois de travail effectif, calculé sur la base du salaire moyen de référence.")
            + A(8, "OBLIGATIONS DU SALARIÉ", "Le Salarié s'engage à consacrer toute son activité professionnelle au service de l'Employeur, à respecter le règlement intérieur de l'entreprise et à observer une stricte confidentialité sur les informations dont il (elle) aura connaissance dans l'exercice de ses fonctions.")
            + A(9, "RUPTURE DU CONTRAT", cdd ? "Le présent contrat à durée déterminée ne peut être rompu avant son terme que d'un commun accord des parties, en cas de faute grave ou lourde, ou en cas de force majeure, conformément aux dispositions du Code du travail." : "Le présent contrat à durée indéterminée peut être résilié par l'une des parties dans le respect du préavis légal prévu par le Code du travail et la convention collective applicable, sauf en cas de faute grave ou lourde.")
            + A(10, "LOI APPLICABLE", "Le présent contrat est régi exclusivement par le Code du travail de la République de Côte d'Ivoire et par la convention collective applicable à l'activité de l'entreprise. Les parties s'engagent à rechercher une solution amiable à tout différend avant tout recours judiciaire.")
            + "<div class=\"sign\" style=\"margin-top:30px\"><span><b>" + esc(ent.dirigeant) + "</b><br>" + esc(ent.qualite) + "<br><small style=\"font-weight:400\">Pour l'Employeur</small></span><span><b>" + civ(e) + " " + esc(e.nom) + " " + esc(e.prenoms || "") + "</b><br><small style=\"font-weight:400\">Lu et approuvé</small></span></div>");
        }
        $("#dv", el).innerHTML = currentDoc || "";
      };
      el.innerHTML = `<div class="toolbar" style="margin-bottom:16px;gap:12px"><div class="field" style="margin:0;min-width:260px"><label>Salarié</label><select class="in" id="ds">${empOpts(empId)}</select></div><div class="field" style="margin:0;min-width:220px"><label>Type de document</label><select class="in" id="dt"><option value="attestation">Attestation de travail</option><option value="certificat">Certificat de travail</option><option value="salaire">Attestation de salaire</option><option value="contrat">Contrat de travail</option></select></div><button class="btn btn-primary" id="dp">${ico("pdf")} Imprimer</button></div><div id="dv"></div>`;
      preview();
      $("#ds", el).onchange = () => { empId = $("#ds", el).value; preview(); };
      $("#dt", el).onchange = () => { docType = $("#dt", el).value; preview(); };
      $("#dp", el).onclick = () => { if (currentDoc) { const e = Store.empById(empId); printDocs(currentDoc, { pdfName: `${docType}_${e.matricule}` }); } };
    }
  };

  /* ============ INTELLIGENCE RH ============ */
  Pages.intelligence = {
    title: "Intelligence RH", group: "Pilotage", icon: "brain", sub: () => `Analyse | Recommandations | ${perLabel(S().periode)}`,
    render(el) {
      const p = S().periode;
      const al = Store.alerts();
      const list = Store.compute(p, true).filter(r => r.emp.actif !== false);
      const tot = list.reduce((a, r) => ({ brut: a.brut + (r.btot || 0), net: a.net + (r.net || 0), cout: a.cout + (r.cout || 0) }), { brut: 0, net: 0, cout: 0 });
      const reds = al.filter(a => a.lvl === "red"); const oranges = al.filter(a => a.lvl === "orange"); const blues = al.filter(a => a.lvl === "blue");
      el.innerHTML = `
        <div class="grid g3" style="margin-bottom:16px">
          <div class="card kpi"><div class="lbl">Masse salariale brute</div><div class="val">${fmt0(tot.brut)} <small>FCFA</small></div></div>
          <div class="card kpi"><div class="lbl">Total net à payer</div><div class="val" style="color:var(--green)">${fmt0(tot.net)} <small>FCFA</small></div></div>
          <div class="card kpi"><div class="lbl">Coût employeur total</div><div class="val" style="color:var(--red)">${fmt0(tot.cout)} <small>FCFA</small></div></div>
        </div>
        <div class="card">
          <h3>Alertes et recommandations . ${perLabel(p)}</h3>
          ${al.length === 0 ? `<p class="hint" style="margin:0">Aucune anomalie détectée pour cette période.</p>` : [...reds, ...oranges, ...blues].map(a => `<div class="note ${a.lvl === "red" ? "err" : a.lvl === "orange" ? "warn" : "info"}" style="margin-bottom:8px">${a.t}</div>`).join("")}
        </div>`;
    }
  };

  /* ============ CLÔTURE & HISTORIQUE ============ */
  Pages.cloture = {
    title: "Clôture & historique", group: "Pilotage", icon: "archive", sub: () => `Période en cours : ${perLabel(S().periode)}`,
    render(el) {
      const p = S().periode;
      const hist = S().historique;
      const closed = Store.isClosed(p);
      const list = Store.compute(p, true);
      const tot = list.reduce((a, r) => ({ n: a.n + (r.net || 0), b: a.b + (r.btot || 0), c: a.c + (r.cout || 0) }), { n: 0, b: 0, c: 0 });
      const nb = list.filter(r => r.net > 0).length;
      el.innerHTML = `
        <div class="grid g3" style="margin-bottom:16px">
          <div class="card kpi"><div class="lbl">Bulletins du mois</div><div class="val">${nb}</div></div>
          <div class="card kpi"><div class="lbl">Total net à payer</div><div class="val" style="color:var(--green)">${fmt0(tot.n)} <small>FCFA</small></div></div>
          <div class="card kpi"><div class="lbl">Coût employeur total</div><div class="val" style="color:var(--red)">${fmt0(tot.c)} <small>FCFA</small></div></div>
        </div>
        ${closed
          ? `<div class="note ok" style="margin-bottom:16px">La période ${perLabel(p)} est clôturée et archivée.</div>`
          : `<div class="card" style="margin-bottom:16px"><h3>Clôturer ${perLabel(p)}</h3>
              <p>${nb} bulletin(s) seront archivés. Net total : <b>${fmt0(tot.n)} FCFA</b>. Les congés pris et les prêts seront mis à jour, puis ${perLabel(Store.addMonth(p, 1))} sera ouvert. Cette opération est irréversible.</p>
              <button class="btn btn-primary" id="clt">${ico("archive")} Clôturer ${perLabel(p)}</button></div>`}
        <div class="card">
          <h3>Historique des périodes</h3>
          ${hist.length === 0 ? `<p class="hint">Aucune période clôturée.</p>` : ""}
          <div id="ht"></div>
        </div>`;
      if (!closed) { $("#clt").onclick = () => App.cloturer(); }
      if (hist.length) {
        const periodes = [...new Set(hist.map(h => h.periode))].sort().reverse();
        table($("#ht", el), {
          rows: periodes.map(per => { const rows = hist.filter(h => h.periode === per); return { periode: per, nb: rows.length, net: rows.reduce((s, h) => s + (h.net || 0), 0), brut: rows.reduce((s, h) => s + (h.btot || 0), 0) }; }),
          search: false,
          columns: [
            { key: "periode", label: "Période", render: r => `<b>${perLabel(r.periode)}</b>` },
            { key: "nb", label: "Bulletins", num: true },
            { key: "brut", label: "Brut total", money: true },
            { key: "net", label: "Net total", money: true, strong: true },
            { key: "a", label: "", sortable: false, get: () => "", render: r => `<button class="btn btn-sm" data-per="${r.periode}">${ico("pdf")} Bulletins</button>` }
          ]
        });
        $$("[data-per]", el).forEach(b => b.onclick = () => { App.view = b.dataset.per; App.go("bulletins"); });
      }
    }
  };

  /* ============ SAUVEGARDE & EXPORT ============ */
  Pages.sauvegarde = {
    title: "Sauvegarde & export", group: "Configuration", icon: "save", sub: () => "Sauvegardez régulièrement vos données",
    render(el) {
      el.innerHTML = `
        <div class="grid g2">
          <div class="card">
            <h3>Sauvegarde et restauration</h3>
            <p class="hint">Enregistrez une copie de toutes vos données dans un fichier sécurisé. Conservez ce fichier en lieu sûr.</p>
            <div class="toolbar" style="flex-direction:column;align-items:flex-start;gap:8px">
              <button class="btn btn-primary" id="bk">${ico("save")} Créer une sauvegarde</button>
              <button class="btn" id="rs">${ico("upload")} Restaurer depuis une sauvegarde</button>
            </div>
          </div>
          <div class="card">
            <h3>Export pour virement</h3>
            <p class="hint">Générez un fichier Excel prêt à l'envoi pour les virements bancaires ou mobile money.</p>
            <div class="field" style="margin-bottom:8px"><label>Format d'export</label>
              <select class="in" id="bankFmt">
                <option value="banque">Virement bancaire (IBAN)</option>
                <option value="mtn">MTN Mobile Money</option>
                <option value="orange">Orange Money</option>
              </select>
            </div>
            <button class="btn btn-primary" id="xv">${ico("xls")} Exporter les virements</button>
          </div>
          <div class="card">
            <h3>Export complet Excel</h3>
            <p class="hint">Exportez l'ensemble des données (salariés, livre de paie, historique) dans un classeur Excel multi-feuilles.</p>
            <div class="toolbar" style="flex-direction:column;align-items:flex-start;gap:8px">
              <button class="btn btn-primary" id="xa">${ico("xls")} Exporter toutes les données</button>
              <button class="btn" id="of">${ico("file")} Ouvrir le dossier de données</button>
            </div>
          </div>
          <div class="card"><h3 style="color:var(--red)">Zone sensible</h3><p class="hint">Efface toutes les données pour repartir d'un logiciel vierge (faites une sauvegarde avant).</p><button class="btn btn-danger" id="rz">${ico("trash")} Tout effacer</button></div></div>`;
      $("#bk").onclick = async () => { const name = `Sauvegarde_paie_${todayISO()}.json`; if (window.api) { const r = await window.api.saveFile({ name, data: Store.exportData(), encoding: "utf8", filters: [{ name: "Sauvegarde", extensions: ["json"] }] }); if (r) toast("Sauvegarde créée", "ok"); } };
      $("#rs").onclick = async () => { if (!window.api) return; const r = await window.api.openFile({ filters: [{ name: "Sauvegarde", extensions: ["json"] }], encoding: "utf8" }); if (!r) return; if (!(await confirm("Restaurer", "Remplacer toutes les données actuelles par cette sauvegarde ?", "Restaurer", "btn-danger"))) return; try { Store.importData(r.data); App.view = S().periode; toast("Données restaurées", "ok"); App.render(); App.refreshChrome(); } catch (e) { toast("Fichier invalide", "err"); } };
      $("#xv").onclick = () => {
        const vP = App.view; const L = Store.compute(vP).filter((r) => r.actif && r.net > 0);
        const fmt2 = $("#bankFmt").value;
        const isMobile = fmt2 !== "banque";
        const headers = isMobile ? ["Matricule", "Nom", "Prénoms", "Numéro mobile", "Opérateur", "Montant (FCFA)", "Devise", "Libellé"] : ["Matricule", "Nom", "Prénoms", "IBAN / N° compte", "Banque", "Montant (FCFA)", "Devise", "Libellé"];
        const rows = L.map((r) => { const e = r.emp; return isMobile ? [r.mat, r.nom, e.prenoms || "", e.telephoneMoMo || e.telephone || "", fmt2 === "mtn" ? "MTN MoMo" : "Orange Money", r.net, "XOF", `Salaire ${perLabel(vP)}`] : [r.mat, r.nom, e.prenoms || "", e.iban || "", e.banque || "", r.net, "XOF", `Salaire ${perLabel(vP)}`]; });
        if (!rows.length) return toast("Aucun bulletin pour ce mois", "err");
        exportXLSX(`Virements_${fmt2}_${vP}`, [{ name: `${fmt2 === "banque" ? "Virements" : fmt2 === "mtn" ? "MTN MoMo" : "Orange Money"}`, aoa: [headers, ...rows, [], ["", "", "", "", "TOTAL", rows.reduce((s, r) => s + (r[5] || 0), 0), "XOF", ""]] }]);
      };
      $("#of").onclick = () => window.api && window.api.openFolder();
      $("#xa").onclick = () => { const L = Store.compute(S().periode); const K = Store.NUM_KEYS; exportXLSX(`Paie_complete_${todayISO()}`, [
        { name: "Salariés", aoa: [["Matricule", "Nom", "Prénoms", "Sexe", "Naissance", "Fonction", "Catégorie", "Département", "Entrée", "Contrat", "Sortie", "N° CNPS", "Situation", "Enfants", "Base", "Sursalaire", "Transport"], ...S().employes.map((e) => [e.matricule, e.nom, e.prenoms, e.sexe, e.dateNaissance, e.fonction, e.categorie, e.departement, e.dateEntree, e.contrat, e.dateSortie, e.cnps, e.situation, e.enfants, e.base, e.sursalaire, e.transport])] },
        { name: "Livre " + S().periode, aoa: [["Matricule", "Nom", ...K], ...L.map((r) => [r.mat, r.nom, ...K.map((k) => r[k])])] },
        { name: "Historique", aoa: [["Période", "Matricule", "Nom", ...K], ...S().historique.map((r) => [r.periode, r.mat, r.nom, ...K.map((k) => r[k])])] }]); };
      $("#rz").onclick = async () => { if (!(await confirm("Tout effacer", "Effacer DÉFINITIVEMENT toutes les données ?", "Tout effacer", "btn-danger"))) return; Store.reset(); App.view = S().periode; App.render(); App.refreshChrome(); toast("Logiciel réinitialisé", "ok"); };
    }
  };

  /* ============ UTILISATEURS ============ */
  Pages.utilisateurs = {
    title: "Utilisateurs", group: "Configuration", icon: "users",
    sub: () => `${Store.get().utilisateurs.length} compte(s) · super administrateur uniquement`,
    render(el) {
      if (App.session.role !== "superadmin") { el.innerHTML = `<div class="note" style="border-color:var(--red);background:#fff0f0"><b>${ico("shield")} Accès refusé.</b> Cette page est réservée au super administrateur.</div>`; return; }
      const S0 = Store.get();
      const users = S0.utilisateurs;
      const RLBL = { superadmin: "Super Admin", admin: "Administrateur", saisie: "Saisie", lecture: "Lecture seule" };
      const RCOL = { superadmin: "purple", admin: "blue", saisie: "orange", lecture: "grey" };
      const RDESC = { superadmin: "Accès total. Gère les utilisateurs.", admin: "Accès complet sauf la gestion des utilisateurs", saisie: "Peut saisir les données et traiter la paie du mois", lecture: "Consultation et impression uniquement" };

      el.innerHTML = `
        <div class="note info" style="margin-bottom:16px">
          ${ico("shield")} <b>Gestion des accès Paie Premium CI</b>. Créez des comptes pour chaque personne qui utilisera le logiciel. Chaque utilisateur se connecte avec son propre identifiant et mot de passe. Seul le Super Administrateur peut gérer les comptes.
        </div>
        <div class="grid g4" style="margin-bottom:20px">
          ${[["superadmin", "Super Admin"], ["admin", "Administrateur"], ["saisie", "Saisie"], ["lecture", "Lecture seule"]].map(([r, l]) => `<div class="card" style="border-top:3px solid var(--${RCOL[r] === "purple" ? "purple" : RCOL[r] === "blue" ? "blue" : RCOL[r] === "orange" ? "gold" : "muted"})"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="badge ${RCOL[r]}">${l}</span><b style="font-size:18px;color:var(--ink)">${users.filter(u => u.role === r).length}</b></div><p class="hint" style="font-size:11px;margin:0">${RDESC[r]}</p></div>`).join("")}
        </div>
        <div class="toolbar"><button class="btn btn-primary" id="addU">${ico("plus")} Ajouter un utilisateur</button></div>
        <div id="ut"></div>`;

      table($("#ut", el), {
        rows: users, search: false, empty: "Aucun utilisateur enregistré.",
        columns: [
          { key: "nom", label: "Nom complet", strong: true },
          { key: "username", label: "Identifiant (login)" },
          { key: "role", label: "Rôle", render: (u) => `<span class="badge ${RCOL[u.role] || "grey"}">${RLBL[u.role] || u.role}</span>` },
          { key: "actif", label: "Statut", render: (u) => u.actif !== false ? `<span class="badge green">Actif</span>` : `<span class="badge grey">Inactif</span>` },
          { key: "creeLe", label: "Créé le", date: true },
          { key: "a", label: "", sortable: false, get: () => "", render: (u) => {
            const isSelf = u.id === App.session.userId;
            const nSuperAdmins = S0.utilisateurs.filter(x => x.role === "superadmin").length;
            const canDel = !(u.role === "superadmin" && nSuperAdmins <= 1);
            return `${isSelf ? `<span class="badge blue" style="margin-right:6px">Vous</span>` : ""}
              <button class="btn btn-sm" data-edit="${u.id}">Modifier</button>
              <button class="btn btn-sm" data-pwd="${u.id}">Mot de passe</button>
              ${canDel ? `<button class="btn btn-sm btn-danger" data-del="${u.id}">Supprimer</button>` : `<button class="btn btn-sm" disabled title="Dernier super administrateur : suppression interdite" style="opacity:.4">Supprimer</button>`}`;
          }}
        ]
      });

      // Ajouter un utilisateur
      $("#addU").onclick = async () => {
        const r = await modal({ title: "Ajouter un utilisateur", size: "sm", body: `
          <div class="form-grid g2f">
            <div class="field span2"><label>Nom complet</label><input class="in" id="un" placeholder="Ex. KOUAME Jean"></div>
            <div class="field"><label>Identifiant (login)</label><input class="in" id="uu" placeholder="kouame.jean" autocomplete="off" spellcheck="false"></div>
            <div class="field"><label>Rôle</label><select class="in" id="ur">
              <option value="lecture">Lecture seule</option>
              <option value="saisie">Saisie</option>
              <option value="admin">Administrateur</option>
              <option value="superadmin">Super Administrateur</option>
            </select></div>
            <div class="field"><label>Mot de passe</label><input class="in" type="text" id="up1" autocomplete="new-password" placeholder="Min. 6 caractères" style="-webkit-text-security:disc"></div>
            <div class="field"><label>Confirmer le mot de passe</label><input class="in" type="text" id="up2" placeholder="Répétez le mot de passe" style="-webkit-text-security:disc"></div>
          </div>`,
          buttons: [{ label: "Annuler", value: null }, { label: "Créer le compte", cls: "btn-primary",
            validate: (bg) => {
              if (!$("#un", bg).value.trim()) { toast("Entrez le nom complet", "err"); return false; }
              const u = $("#uu", bg).value.trim().toLowerCase();
              if (!u || !/^[a-z0-9._-]+$/.test(u)) { toast("Identifiant invalide (lettres, chiffres, . _ - uniquement)", "err"); return false; }
              if (S0.utilisateurs.find(x => x.username.toLowerCase() === u)) { toast("Cet identifiant est déjà utilisé", "err"); return false; }
              if ($("#up1", bg).value.length < 6) { toast("Mot de passe trop court (minimum 6 caractères)", "err"); return false; }
              if ($("#up1", bg).value !== $("#up2", bg).value) { toast("Les mots de passe ne correspondent pas", "err"); return false; }
              return true;
            },
            value: (bg) => ({ nom: $("#un", bg).value.trim(), username: $("#uu", bg).value.trim().toLowerCase(), role: $("#ur", bg).value, pwd: $("#up1", bg).value }) }]
        });
        if (!r) return;
        const { hash, salt } = await App.hashNew(r.pwd);
        S0.utilisateurs.push({ id: "u" + Math.random().toString(36).slice(2, 10), nom: r.nom, username: r.username, hash, salt, role: r.role, actif: true, creeLe: todayISO() });
        Store.save(); this.render(el); toast(`Compte « ${r.username} » créé`, "ok");
      };

      // Modifier un utilisateur
      $$("[data-edit]", el).forEach(b => b.onclick = async () => {
        const u = S0.utilisateurs.find(x => x.id === b.dataset.edit); if (!u) return;
        const isSelf = u.id === App.session.userId;
        const r = await modal({ title: `Modifier : ${esc(u.nom)}`, size: "sm", body: `
          <div class="form-grid g2f">
            <div class="field span2"><label>Nom complet</label><input class="in" id="en" value="${esc(u.nom)}"></div>
            <div class="field"><label>Identifiant</label><input class="in" id="eu" value="${esc(u.username)}" autocomplete="off"></div>
            <div class="field"><label>Rôle</label><select class="in" id="er" ${isSelf ? "disabled" : ""}>
              <option value="lecture" ${u.role === "lecture" ? "selected" : ""}>Lecture seule</option>
              <option value="saisie" ${u.role === "saisie" ? "selected" : ""}>Saisie</option>
              <option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrateur</option>
              <option value="superadmin" ${u.role === "superadmin" ? "selected" : ""}>Super Administrateur</option>
            </select></div>
            <div class="field"><label>Statut</label><select class="in" id="ea" ${isSelf ? "disabled" : ""}>
              <option value="1" ${u.actif !== false ? "selected" : ""}>Actif</option>
              <option value="0" ${u.actif === false ? "selected" : ""}>Inactif</option>
            </select></div>
          </div>${isSelf ? `<p class="hint" style="margin-top:10px">Vous ne pouvez pas changer votre propre rôle ni vous désactiver.</p>` : ""}`,
          buttons: [{ label: "Annuler", value: null }, { label: "Enregistrer", cls: "btn-primary",
            validate: (bg) => {
              if (!$("#en", bg).value.trim()) { toast("Entrez un nom", "err"); return false; }
              const nu = $("#eu", bg).value.trim().toLowerCase();
              if (S0.utilisateurs.find(x => x.username.toLowerCase() === nu && x.id !== u.id)) { toast("Identifiant déjà utilisé", "err"); return false; }
              return true;
            },
            value: (bg) => ({ nom: $("#en", bg).value.trim(), username: $("#eu", bg).value.trim().toLowerCase(), role: isSelf ? u.role : $("#er", bg).value, actif: isSelf ? true : ($("#ea", bg).value === "1") }) }]
        });
        if (!r) return;
        Object.assign(u, r); Store.save(); this.render(el); toast("Compte mis à jour", "ok");
      });

      // Réinitialiser le mot de passe
      $$("[data-pwd]", el).forEach(b => b.onclick = async () => {
        const u = S0.utilisateurs.find(x => x.id === b.dataset.pwd); if (!u) return;
        const r = await modal({ title: `Nouveau mot de passe : ${esc(u.nom)}`, size: "sm", body: `
          <div class="form-grid">
            <div class="field"><label>Nouveau mot de passe</label><input class="in" type="text" id="pp1" autocomplete="new-password" placeholder="Min. 6 caractères" style="-webkit-text-security:disc"></div>
            <div class="field"><label>Confirmer</label><input class="in" type="text" id="pp2" placeholder="Répétez le mot de passe" style="-webkit-text-security:disc"></div>
          </div>`,
          buttons: [{ label: "Annuler", value: null }, { label: "Changer le mot de passe", cls: "btn-primary",
            validate: (bg) => {
              if ($("#pp1", bg).value.length < 6) { toast("Minimum 6 caractères", "err"); return false; }
              if ($("#pp1", bg).value !== $("#pp2", bg).value) { toast("Les mots de passe ne correspondent pas", "err"); return false; }
              return true;
            }, value: (bg) => $("#pp1", bg).value }]
        });
        if (!r) return;
        const { hash, salt } = await App.hashNew(r);
        u.hash = hash; u.salt = salt; Store.save(); toast(`Mot de passe de « ${u.username} » mis à jour`, "ok");
      });

      // Supprimer un utilisateur
      $$("[data-del]", el).forEach(b => b.onclick = async () => {
        if (App.session.role !== "superadmin") { toast("Seul le super administrateur peut supprimer un compte", "err"); return; }
        const u = S0.utilisateurs.find(x => x.id === b.dataset.del); if (!u) return;
        const isLastSuperAdmin = u.role === "superadmin" && S0.utilisateurs.filter(x => x.role === "superadmin" && x.id !== u.id).length === 0;
        if (isLastSuperAdmin) { toast("Impossible : il doit toujours rester au moins un super administrateur", "err"); return; }
        const isSelf = u.id === App.session.userId;
        const isLast = S0.utilisateurs.length <= 1;
        let warn = `Supprimer définitivement <b>${esc(u.nom)}</b> (${esc(u.username)}) ?`;
        if (isSelf) warn += `<br><br><span style="color:#dc2626;font-weight:600">Vous supprimez votre propre compte. Vous serez déconnecté immédiatement.</span>`;
        if (isLast) warn += `<br><br><span style="color:#dc2626;font-weight:600">Dernier compte : le logiciel sera réinitialisé et demandera la création d'un nouvel administrateur au prochain démarrage.</span>`;
        if (!(await confirm("Supprimer l'utilisateur", warn, "Supprimer définitivement", "btn-danger"))) return;
        const idx = S0.utilisateurs.findIndex(x => x.id === u.id);
        if (idx !== -1) S0.utilisateurs.splice(idx, 1);
        Store.save();
        if (isSelf || S0.utilisateurs.length === 0) { window.location.reload(); }
        else { this.render(el); toast("Utilisateur supprimé", "ok"); }
      });
    }
  };

  /* ============ LICENCES ============ */
  Pages.licences = {
    title: "Licences", group: "Configuration", icon: "shield",
    sub: () => "Gestion des licences clients · DigiMaketing Agency",
    render(el) {
      if (App.session.role !== "superadmin") { el.innerHTML = `<div class="note" style="border-color:var(--red)"><b>${ico("shield")} Accès refusé.</b></div>`; return; }
      el.innerHTML = `<div class="note info">${ico("zap")} Chargement des licences…</div>`;
      (async () => {
        const hasAdm = await window.api.admin.hasConfig();
        if (!hasAdm) {
          el.innerHTML = `<div class="card" style="max-width:520px">
            <h3>${ico("shield")} Configuration Supabase requise</h3>
            <p class="hint" style="margin-bottom:16px">Entrez votre clé <b>service_role</b> depuis Supabase → Settings → API. Elle est stockée uniquement sur ce poste et n'est jamais transmise à vos clients.</p>
            <div class="field"><label>Clé service_role (confidentielle)</label>
              <input class="in" id="adm-srk" placeholder="eyJhbGciOi..." autocomplete="off" style="-webkit-text-security:disc">
            </div>
            <div class="toolbar" style="margin-top:12px">
              <button class="btn btn-primary" id="adm-save">${ico("check")} Enregistrer</button>
            </div>
          </div>`;
          $("#adm-save", el).onclick = async () => {
            const key = document.getElementById("adm-srk").value.trim();
            if (!key || key.length < 20) { toast("Clé invalide", "err"); return; }
            await window.api.admin.setConfig({ serviceRoleKey: key });
            toast("Configuration enregistrée", "ok"); Pages.licences.render(el);
          };
          return;
        }
        const result = await window.api.admin.listerLicences();
        if (result.error) {
          el.innerHTML = `<div class="note" style="border-color:var(--red)">${ico("alert")} Erreur Supabase : ${esc(result.error)}</div>
            <button class="btn" style="margin-top:10px" id="lic-cfg-r">${ico("settings")} Modifier la clé API</button>`;
          document.getElementById("lic-cfg-r").onclick = async () => { await window.api.admin.setConfig({ serviceRoleKey: "" }); Pages.licences.render(el); };
          return;
        }
        const licences = result.data || [];
        const SCOL = { inactive: "grey", actif: "green", suspendu: "red", expire: "orange" };
        const SLBL = { inactive: "Non activée", actif: "Active", suspendu: "Suspendue", expire: "Expirée" };
        const today = new Date(); today.setHours(0,0,0,0);
        const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
        const expiringSoon = licences.filter(l => l.date_expiration && l.statut === "actif" && new Date(l.date_expiration) >= today && new Date(l.date_expiration) <= in30);
        const alertBanner = expiringSoon.length ? `<div class="note" style="border-color:#f59e0b;background:#fffbeb;margin-bottom:16px">${ico("alert")} <b>${expiringSoon.length} licence(s) expire(nt) dans moins de 30 jours :</b> ${expiringSoon.map(l => `<b>${esc(l.client_nom)}</b> (${new Date(l.date_expiration + "T00:00:00").toLocaleDateString("fr-FR")})`).join(", ")}. Pensez à les renouveler.</div>` : "";
        el.innerHTML = `
          <div class="toolbar" style="margin-bottom:20px">
            <button class="btn btn-primary" id="lic-new">${ico("plus")} Créer une licence</button>
            <button class="btn" id="lic-refresh">${ico("swap")} Actualiser</button>
            <span class="hint" style="margin-left:8px">${licences.length} licence(s)</span>
          </div>
          ${alertBanner}
          <div id="lic-tbl"></div>`;
        table($("#lic-tbl", el), {
          rows: licences, search: true, empty: "Aucune licence créée.",
          columns: [
            { key: "client_nom", label: "Client", strong: true },
            { key: "cle", label: "Clé", render: (r) => `<code style="font-size:11px;background:#f1f5f9;padding:2px 8px;border-radius:4px;letter-spacing:1px">${esc(r.cle)}</code>` },
            { key: "statut", label: "Statut", render: (r) => `<span class="badge ${SCOL[r.statut] || "grey"}">${SLBL[r.statut] || r.statut}</span>` },
            { key: "date_expiration", label: "Expiration", render: (r) => r.date_expiration ? new Date(r.date_expiration + "T00:00:00").toLocaleDateString("fr-FR") : `<span style="color:#64748b;font-style:italic">Indéterminée</span>` },
            { key: "client_email", label: "Contact" },
            { key: "machine_id", label: "Poste activé", render: (r) => r.machine_id ? `<span class="badge grey" style="font-size:10px">${esc(r.machine_id.slice(0, 8))}…</span>` : `<span style="color:#94a3b8">—</span>` },
            { key: "_a", label: "", sortable: false, get: () => "", render: (r) => `
              ${r.statut === "actif"    ? `<button class="btn btn-sm btn-danger" data-sus="${r.id}">Suspendre</button>` : ""}
              ${r.statut === "suspendu" ? `<button class="btn btn-sm" data-react="${r.id}">Réactiver</button>` : ""}
              ${r.statut === "expire"   ? `<button class="btn btn-sm" data-renew="${r.id}">Renouveler</button>` : ""}
              ${(r.statut === "actif" || r.statut === "inactive") ? `<button class="btn btn-sm" data-edit="${r.id}" data-exp="${r.date_expiration || ""}">Modifier</button>` : ""}
              <button class="btn btn-sm" data-cpk="${esc(r.cle)}">Copier clé</button>
              <button class="btn btn-sm btn-danger" data-del="${r.id}">Supprimer</button>` }
          ]
        });
        $$("[data-cpk]", el).forEach(b => b.onclick = async () => {
          try { await navigator.clipboard.writeText(b.dataset.cpk); toast("Clé copiée", "ok"); } catch (_) { toast("Impossible de copier", "err"); }
        });
        $$("[data-sus]", el).forEach(b => b.onclick = async () => {
          if (!(await confirm("Suspendre la licence", "Le client ne pourra plus accéder au logiciel. Confirmer ?", "Suspendre", "btn-danger"))) return;
          const r = await window.api.admin.modifierLicence({ id: b.dataset.sus, statut: "suspendu" });
          if (r.error) { toast(`Erreur : ${esc(r.error)}`, "err"); return; }
          toast("Licence suspendue", "ok"); Pages.licences.render(el);
        });
        $$("[data-react]", el).forEach(b => b.onclick = async () => {
          const r = await window.api.admin.modifierLicence({ id: b.dataset.react, statut: "actif" });
          if (r.error) { toast(`Erreur : ${esc(r.error)}`, "err"); return; }
          toast("Licence réactivée", "ok"); Pages.licences.render(el);
        });
        $$("[data-edit]", el).forEach(b => b.onclick = async () => {
          const r2 = await modal({ title: "Modifier l'expiration", size: "sm", body: `
            <div class="field"><label>Nouvelle durée</label>
              <select class="in" id="edit-duree">
                <option value="1a">1 an</option>
                <option value="2a">2 ans</option>
                <option value="3a">3 ans</option>
                <option value="6m">6 mois</option>
                <option value="3m">3 mois</option>
                <option value="0">Indéterminée (sans expiration)</option>
                <option value="custom">Date personnalisée</option>
              </select>
            </div>
            <div class="field" id="edit-exp-wrap" style="display:none"><label>Date d'expiration</label>
              <input class="in" id="edit-exp" type="date">
            </div>`,
            onOpen: (bg) => {
              const sel = bg.querySelector("#edit-duree");
              sel.onchange = function() {
                bg.querySelector("#edit-exp-wrap").style.display = this.value === "custom" ? "" : "none";
              };
              if (b.dataset.exp) {
                sel.value = "custom";
                bg.querySelector("#edit-exp-wrap").style.display = "";
                bg.querySelector("#edit-exp").value = b.dataset.exp;
              } else { sel.value = "0"; }
            },
            buttons: [
              { label: "Annuler", value: null },
              { label: "Enregistrer", cls: "btn-primary",
                validate: (bg) => {
                  if (bg.querySelector("#edit-duree").value === "custom" && !bg.querySelector("#edit-exp").value) { toast("Entrez une date", "err"); return false; }
                  return true;
                },
                value: (bg) => {
                  const duree = bg.querySelector("#edit-duree").value;
                  if (duree === "0") return { dateExpiration: null };
                  if (duree === "custom") return { dateExpiration: bg.querySelector("#edit-exp").value };
                  const d = new Date();
                  if (duree === "3m") d.setMonth(d.getMonth() + 3);
                  else if (duree === "6m") d.setMonth(d.getMonth() + 6);
                  else if (duree === "1a") d.setFullYear(d.getFullYear() + 1);
                  else if (duree === "2a") d.setFullYear(d.getFullYear() + 2);
                  else if (duree === "3a") d.setFullYear(d.getFullYear() + 3);
                  return { dateExpiration: d.toISOString().slice(0, 10) };
                }
              }
            ]
          });
          if (!r2) return;
          const r = await window.api.admin.modifierLicence({ id: b.dataset.edit, dateExpiration: r2.dateExpiration });
          if (r.error) { toast(`Erreur : ${esc(r.error)}`, "err"); return; }
          toast("Expiration mise à jour", "ok"); Pages.licences.render(el);
        });
        $$("[data-renew]", el).forEach(b => b.onclick = async () => {
          const r2 = await modal({ title: "Renouveler la licence", size: "sm", body: `
            <div class="field"><label>Durée du renouvellement</label>
              <select class="in" id="ren-duree">
                <option value="1a" selected>1 an</option>
                <option value="2a">2 ans</option>
                <option value="3a">3 ans</option>
                <option value="6m">6 mois</option>
                <option value="3m">3 mois</option>
                <option value="0">Indéterminée (sans expiration)</option>
                <option value="custom">Date personnalisée</option>
              </select>
            </div>
            <div class="field" id="ren-exp-wrap" style="display:none"><label>Date d'expiration</label>
              <input class="in" id="ren-exp" type="date">
            </div>`,
            onOpen: (bg) => {
              bg.querySelector("#ren-duree").onchange = function() {
                bg.querySelector("#ren-exp-wrap").style.display = this.value === "custom" ? "" : "none";
              };
            },
            buttons: [
              { label: "Annuler", value: null },
              { label: "Renouveler", cls: "btn-primary",
                validate: (bg) => {
                  if (bg.querySelector("#ren-duree").value === "custom" && !bg.querySelector("#ren-exp").value) { toast("Entrez une date d'expiration", "err"); return false; }
                  return true;
                },
                value: (bg) => {
                  const duree = bg.querySelector("#ren-duree").value;
                  if (duree === "0") return { dateExpiration: null };
                  if (duree === "custom") return { dateExpiration: bg.querySelector("#ren-exp").value };
                  const d = new Date();
                  if (duree === "3m") d.setMonth(d.getMonth() + 3);
                  else if (duree === "6m") d.setMonth(d.getMonth() + 6);
                  else if (duree === "1a") d.setFullYear(d.getFullYear() + 1);
                  else if (duree === "2a") d.setFullYear(d.getFullYear() + 2);
                  else if (duree === "3a") d.setFullYear(d.getFullYear() + 3);
                  return { dateExpiration: d.toISOString().slice(0, 10) };
                }
              }
            ]
          });
          if (!r2) return;
          const r = await window.api.admin.modifierLicence({ id: b.dataset.renew, statut: "actif", dateExpiration: r2.dateExpiration });
          if (r.error) { toast(`Erreur : ${esc(r.error)}`, "err"); return; }
          toast("Licence renouvelée", "ok"); Pages.licences.render(el);
        });
        $$("[data-del]", el).forEach(b => b.onclick = async () => {
          if (!(await confirm("Supprimer la licence", "Action irréversible. Le client perdra définitivement l'accès. Confirmer ?", "Supprimer définitivement", "btn-danger"))) return;
          const r = await window.api.admin.supprimerLicence(b.dataset.del);
          if (r.error) { toast(`Erreur : ${esc(r.error)}`, "err"); return; }
          toast("Licence supprimée", "ok"); Pages.licences.render(el);
        });
        $("#lic-refresh", el).onclick = () => Pages.licences.render(el);
        $("#lic-new", el).onclick = async () => {
          const r = await modal({ title: "Créer une nouvelle licence", size: "sm", body: `
            <div class="form-grid g2f">
              <div class="field span2"><label>Nom du client / entreprise</label><input class="in" id="lc-nom" placeholder="Ex. ENTREPRISE KOFFI SARL"></div>
              <div class="field"><label>Email de contact</label><input class="in" id="lc-email" type="email" placeholder="contact@entreprise.ci"></div>
              <div class="field"><label>Durée de la licence</label>
                <select class="in" id="lc-duree">
                  <option value="1a" selected>1 an</option>
                  <option value="2a">2 ans</option>
                  <option value="3a">3 ans</option>
                  <option value="6m">6 mois</option>
                  <option value="3m">3 mois</option>
                  <option value="0">Indéterminée (sans expiration)</option>
                  <option value="custom">Date personnalisée</option>
                </select>
              </div>
              <div class="field span2" id="lc-exp-wrap" style="display:none"><label>Date d'expiration</label>
                <input class="in" id="lc-exp" type="date">
              </div>
              <div class="field span2"><label>Notes (optionnel)</label><input class="in" id="lc-notes" placeholder="Ex. Licence annuelle, client KOFFI SARL"></div>
            </div>`,
            onOpen: (bg) => {
              bg.querySelector("#lc-duree").onchange = function() {
                const wrap = bg.querySelector("#lc-exp-wrap");
                wrap.style.display = this.value === "custom" ? "" : "none";
                if (this.value === "custom") {
                  const d = new Date(); d.setFullYear(d.getFullYear() + 1);
                  bg.querySelector("#lc-exp").value = d.toISOString().slice(0, 10);
                }
              };
            },
            buttons: [
              { label: "Annuler", value: null },
              { label: `${ico("zap")} Générer la licence`, cls: "btn-primary",
                validate: (bg) => {
                  if (!bg.querySelector("#lc-nom").value.trim()) { toast("Entrez le nom du client", "err"); return false; }
                  if (bg.querySelector("#lc-duree").value === "custom" && !bg.querySelector("#lc-exp").value) { toast("Entrez une date d'expiration", "err"); return false; }
                  return true;
                },
                value: (bg) => {
                  const duree = bg.querySelector("#lc-duree").value;
                  let dateExpiration = null;
                  if (duree !== "0") {
                    if (duree === "custom") { dateExpiration = bg.querySelector("#lc-exp").value || null; }
                    else { const d = new Date(); if (duree === "3m") d.setMonth(d.getMonth() + 3); else if (duree === "6m") d.setMonth(d.getMonth() + 6); else if (duree === "1a") d.setFullYear(d.getFullYear() + 1); else if (duree === "2a") d.setFullYear(d.getFullYear() + 2); else if (duree === "3a") d.setFullYear(d.getFullYear() + 3); dateExpiration = d.toISOString().slice(0, 10); }
                  }
                  return { clientNom: bg.querySelector("#lc-nom").value.trim(), clientEmail: bg.querySelector("#lc-email").value.trim(), dateExpiration, notes: bg.querySelector("#lc-notes").value.trim() };
                }
              }
            ]
          });
          if (!r) return;
          const newBtn = document.getElementById("lic-new"); if (newBtn) { newBtn.disabled = true; newBtn.textContent = "Génération…"; }
          const created = await window.api.admin.creerLicence(r);
          if (newBtn) { newBtn.disabled = false; newBtn.innerHTML = `${ico("plus")} Créer une licence`; }
          if (created.error) { toast(`Erreur : ${esc(created.error)}`, "err"); return; }
          const cle = created.data?.cle || "";
          const expInfo = r.dateExpiration ? `Expire le : <b>${new Date(r.dateExpiration + "T00:00:00").toLocaleDateString("fr-FR")}</b>` : `<b>Indéterminée</b> (sans date d'expiration)`;
          await modal({ title: "Licence créée avec succès", size: "sm", body: `
            <p style="margin-bottom:14px;color:#64748b">Transmettez cette clé à votre client. Elle sera activée au premier démarrage :</p>
            <div style="background:#f0fdf4;border:2px solid #86efac;border-radius:12px;padding:20px;text-align:center;margin-bottom:14px">
              <div style="font-size:10px;font-weight:800;color:#16a34a;letter-spacing:1.5px;margin-bottom:10px">CLÉ DE LICENCE</div>
              <div style="font-size:22px;font-weight:800;font-family:monospace;letter-spacing:3px;color:#0f172a">${esc(cle)}</div>
            </div>
            <p style="font-size:12px;color:#64748b;text-align:center;margin-bottom:4px">Durée : ${expInfo}</p>
            <p style="font-size:11px;color:#94a3b8;text-align:center">Elle reste aussi disponible dans la liste des licences.</p>`,
            buttons: [{ label: "Fermer", value: true }]
          });
          Pages.licences.render(el);
        };
      })();
    }
  };

  /* ============ AIDE ============ */
  Pages.aide = {
    title: "Guide d'utilisation", group: "Pilotage", icon: "help", sub: () => "Prise en main en 8 étapes",
    render(el) {
      const steps = [["Entreprise", "Renseignez la raison sociale, le NCC, le n° CNPS, le dirigeant et ajoutez votre logo.", "entreprise"], ["Paramètres", "Vérifiez le taux d'accident du travail (2 à 5 %) et saisissez la grille des salaires catégoriels de votre convention.", "parametres"], ["Salariés", "Ajoutez vos salariés (ou importez-les depuis Excel avec le modèle fourni). Le net est simulé en direct dans la fiche.", "employes"], ["Mois de départ", "Dans « Clôture & historique », choisissez le premier mois à traiter.", "cloture"], ["Saisie du mois", "Saisissez absences, heures sup., primes et acomptes. Tout le reste est automatique.", "saisie"], ["Bulletins", "Vérifiez, imprimez ou enregistrez en PDF un bulletin ou tous les bulletins en un clic.", "bulletins"], ["Déclarations", "Imprimez les déclarations ITS, FDFP et CNPS, l'écriture comptable et les états.", "declarations"], ["Clôture", "Clôturez le mois : il est archivé, les congés et prêts sont mis à jour et le mois suivant s'ouvre. L'État 301 et la DISA se remplissent tout seuls.", "cloture"]];
      el.innerHTML = `<div class="grid g4">${steps.map(([t, d, go], i) => `<div class="card" style="cursor:pointer" data-go="${go}"><div style="width:34px;height:34px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-weight:800;margin-bottom:10px">${i + 1}</div><h3>${t}</h3><p class="hint" style="font-size:13px">${d}</p></div>`).join("")}</div>
        <div class="card" style="margin-top:16px"><h3>Règles de calcul appliquées (Côte d'Ivoire)</h3>
        <div class="stat-row"><span>Brut imposable</span><span style="font-weight:400">base + sursalaire + ancienneté + heures sup. + primes + avantages + congés + gratification + transport au-delà de ${fmt0(P().plafTransport)}</span></div>
        <div class="stat-row"><span>ITS (réforme 2024)</span><span style="font-weight:400">barème 0 / 16 / 21 / 24 / 28 / 32 % sur le brut imposable − RICF ${fmt0(P().ricf)} par demi-part</span></div>
        <div class="stat-row"><span>CNPS</span><span style="font-weight:400">retraite 6,3 % + 7,7 % (plafond ${fmt0(P().plafRet)}) ; PF 5 %, maternité 0,75 %, AT ${pct(P().txAT, 0)} (plafond ${fmt0(P().plafPF)})</span></div>
        <div class="stat-row"><span>CMU</span><span style="font-weight:400">500 salarié + 500 employeur ; 1 000 par bénéficiaire</span></div>
        <div class="stat-row"><span>FDFP & ITS patronal</span><span style="font-weight:400">TA 0,4 % + FPC 0,6 % + 0,6 % ; ITS patronal 1,2 % (local) / 10,4 % (expatrié)</span></div>
        <div class="stat-row"><span>Prime d'ancienneté</span><span style="font-weight:400">2 % à 2 ans, +1 % par an, max 25 % du salaire de base</span></div>
        <div class="stat-row"><span>Entrée / sortie en cours de mois</span><span style="font-weight:400">salaire proratisé automatiquement sur 30 jours</span></div></div>
        <div class="note info" style="margin-top:16px">Raccourci : Ctrl + Maj + F12 ouvre les outils de diagnostic. Vos données sont enregistrées automatiquement sur ce PC.</div>`;
      $$("[data-go]", el).forEach((c) => (c.onclick = () => App.go(c.dataset.go)));
    }
  };
})();