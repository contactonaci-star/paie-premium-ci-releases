# Paie Premium CI — code source

Logiciel de paie pour la Côte d'Ivoire (Electron + HTML/CSS/JavaScript, sans framework).
Version 1.0.0 — © 2026 Attin Richard.

---

## Prérequis

- Node.js 18 ou plus récent (https://nodejs.org)
- Windows pour développer et générer l'installateur `.exe`
- GitHub CLI (`gh`) pour publier les releases

---

## Démarrer en mode développement

```bash
npm install
npm start
```

Après une modification d'un fichier de `renderer/`, appuyez sur **Ctrl + R** dans la fenêtre du logiciel pour recharger sans le relancer.

---

## Générer l'installateur Windows

```bash
npm run dist
```

L'installateur est créé dans `dist/Paie-Premium-CI-Setup-{version}.exe`.

---

## Publier une nouvelle version (mise à jour automatique)

Quand tu as fait des modifications et que tu veux les envoyer chez tous les clients :

**1. Changer le numéro de version dans `package.json`**
```json
"version": "1.0.1"
```

**2. Rebuilder l'installateur**
```bash
npm run dist
```

**3. Créer la release sur GitHub**
```bash
gh auth switch --user contactonaci-star

gh release create v1.0.1 "dist/Paie-Premium-CI-Setup-1.0.1.exe" "dist/Paie-Premium-CI-Setup-1.0.1.exe.blockmap" \
  --repo contactonaci-star/paie-premium-ci-releases \
  --title "Paie Premium CI v1.0.1" \
  --notes "Description des modifications..."
```

Les logiciels installés chez les clients se mettent à jour automatiquement au prochain démarrage.

---

## Système de licences (Supabase)

Les licences sont gérées via Supabase : `kgjczbwzjlkmnacuexge.supabase.co`

**Quand tu vends le logiciel à un client :**
1. Ouvre le logiciel → page **Admin**
2. Crée une nouvelle licence (nom client, email, date d'expiration)
3. Une clé `PPCI-XXXX-XXXX-XXXX` est générée automatiquement
4. Donne cette clé au client
5. Le client entre la clé au premier démarrage → la licence est activée et liée à sa machine

**Statuts d'une licence :**
- `inactive` — créée, pas encore activée
- `actif` — activée sur une machine client
- Possibilité de suspendre ou supprimer depuis le panel admin

---

## Système de mise à jour automatique (electron-updater)

- Au démarrage, l'app vérifie automatiquement les nouvelles versions sur GitHub
- Si une mise à jour est disponible → téléchargement en arrière-plan
- Une boîte de dialogue propose au client de redémarrer pour installer
- Le client ne fait rien manuellement : tout est automatique

Dépôt GitHub des releases : `https://github.com/contactonaci-star/paie-premium-ci-releases`

---

## Structure du projet

```
main.js               Processus principal Electron : fenêtre, sauvegarde, licences, auto-update
preload.js            Pont sécurisé entre l'interface et le système (window.api)
package.json          Dépendances et configuration de l'installateur (electron-builder / NSIS)
build/                Icônes de l'installateur (icon.ico, icon.png)
renderer/
  index.html          Page de l'application
  css/styles.css      Design (thème, cartes, tableaux, documents A4, impression)
  vendor/             Bibliothèques locales : Chart.js (graphiques), SheetJS (Excel)
  assets/icon.png     Icône de la fenêtre
  js/engine.js        MOTEUR DE CALCUL : ITS 2024, RICF, CNPS, CMU, FDFP, ancienneté,
                      heures sup., congés, gratification, paie inverse, rupture, montant en lettres
  js/store.js         Données : salariés, mois, clôture/réouverture, historique, cumuls annuels, alertes
  js/ui.js            Composants d'interface : tableaux, fenêtres, graphiques, export Excel, impression
  js/docs.js          Documents imprimables : bulletin de paie, formulaires de déclaration, lettres
  js/pages-core.js    Pages : tableau de bord, entreprise, paramètres, salariés, saisie du mois
  js/pages-paie.js    Pages : bulletins, livre de paie, paie inverse, états, déclarations, État 301/DISA, comptabilité
  js/pages-rh.js      Pages : congés, gratifications, prêts, rupture, documents RH, clôture, sauvegarde, aide
  js/app.js           Navigation, sélection du mois, clôture, mot de passe
```

---

## Où modifier les règles de calcul

- Taux et plafonds par défaut : `DEFAULT_PARAMS` dans `renderer/js/engine.js`
  (ils restent aussi modifiables dans le logiciel, page Paramètres).
- Calcul d'un bulletin : fonction `computeEmployee` dans `renderer/js/engine.js`.

---

## Données de l'utilisateur

Enregistrées hors du dossier du programme :
`%APPDATA%\Paie Premium CI\donnees\paie-data.json` (Windows),
avec des copies automatiques dans le sous-dossier `sauvegardes-auto` (30 dernières, toutes les 10 min).
