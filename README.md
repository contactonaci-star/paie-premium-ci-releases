# Paie Premium CI — code source

Logiciel de paie pour la Côte d'Ivoire (Electron + HTML/CSS/JavaScript, sans framework).
Version 1.0.0 — © 2026 Attin Richard.

## Prérequis

- Node.js 18 ou plus récent (https://nodejs.org)
- Windows, macOS ou Linux pour développer ; Windows pour générer l'installateur `.exe` le plus simplement

## Ouvrir dans VS Code

1. Décompressez le zip.
2. Dans VS Code : **Fichier > Ouvrir le dossier…** puis choisissez le dossier `Paie-Premium-CI`.
3. Menu **Terminal > Exécuter la tâche…** :
   - « 1. Installer les dépendances » (une seule fois),
   - « 2. Lancer le logiciel » pour tester vos modifications,
   - « 3. Fabriquer l'installateur Windows (.exe) » pour créer le nouvel installateur.
4. Ou appuyez sur **F5** pour lancer le logiciel en mode débogage.

Après une modification d'un fichier de `renderer/`, appuyez sur **Ctrl + R** dans la fenêtre du logiciel pour recharger sans le relancer.

## Démarrer en mode développement (ligne de commande)

```bash
npm install
npm start
```

## Générer l'installateur Windows

```bash
npm run dist
```

L'installateur est créé dans `dist/Paie-Premium-CI-Setup-1.0.0.exe`.
(Sous Linux, il faut installer Wine pour construire l'installateur Windows.)

## Structure du projet

```
main.js               Processus principal Electron : fenêtre, sauvegarde du fichier de données,
                      sauvegardes automatiques, impression, export PDF, ouverture/enregistrement de fichiers
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

## Où modifier les règles de calcul

- Taux et plafonds par défaut : `DEFAULT_PARAMS` dans `renderer/js/engine.js`
  (ils restent aussi modifiables dans le logiciel, page Paramètres).
- Calcul d'un bulletin : fonction `computeEmployee` dans `renderer/js/engine.js`.

## Données de l'utilisateur

Elles sont enregistrées hors du dossier du programme, dans :
`%APPDATA%\Paie Premium CI\donnees\paie-data.json` (Windows),
avec des copies automatiques dans le sous-dossier `sauvegardes-auto`.
