# Confesse-moi

Une machine à écrire intime, mobile-first, qui fonctionne entièrement hors ligne et s’installe sur l’écran d’accueil de l’iPhone.

## Lancer le projet

```bash
npm install
npm run dev
```

Pour tester la version installable (service worker inclus) :

```bash
npm run build
npm run preview
```

## Fonctionnement

- **Accueil** : toutes les notes avec titre, début du texte et date. Un appui ouvre la note ; le menu « ••• » permet de la renommer ou de la supprimer.
- **+** : crée une nouvelle note et ouvre l’écran d’écriture.
- **Réglages** : papier, police, interligne, capsule, breloques, veilleuse, export/import JSON et aide d’installation iOS.

À l’écriture, la **capsule elle-même sert de chariot** : pilule sombre à surface unie, coiffée d’une pointe en T, qui glisse sur le rail anthracite et revient avec un « ding » en fin de ligne. La feuille grainée se courbe vers le haut ; glissez-la vers le bas pour relire les lignes passées. En haut : retour, compteur de caractères (sans limite) et partage du texte ou de l’image. Sous la machine, une barre d’outils arrondie et repliable donne accès aux notes, breloques, papier, capsules, veilleuse et réglages. Le clavier natif s’ouvre dès que la page d’écriture apparaît. Tout est sauvegardé dans IndexedDB à chaque frappe.

## Hors ligne

Le service worker précache l’app shell, la police Special Elite, les sons et les icônes. Les notes et réglages vivent dans IndexedDB (`idb`) avec demande de stockage persistant. Aucune donnée ne quitte l’appareil ; l’export JSON sert de sauvegarde de secours.

Sur iPhone : **Safari > Partager > Sur l’écran d’accueil**.

## Fichiers générés

Les icônes PNG (180/192/512) et les sons WAV sont générés sans dépendance par :

```bash
npm run assets
```
# confesse-moi
