# Draft.board

Outil d'aide à la draft League of Legends, utilisé par une équipe de cinq pendant la sélection des champions.

Il n'automatise rien : il montre en temps réel ce qui manque à la composition en cours (engage, frontline, dégâts magiques…) et propose des champions qui comblent ce manque **parmi ceux que les joueurs maîtrisent vraiment**. Pensé pour être lu en quelques secondes, puisqu'on a moins de 30 secondes pour choisir.

## Ce que fait l'application

- **Analyse de la composition** à partir d'un vocabulaire fermé de 15 tags (frontline, engage, poke, waveclear…).
- **Suggestions** tirées du pool réel de chaque joueur, avec ses profils et sa tier list.
- **Salle partagée en temps réel** entre les cinq joueurs, en pair-à-pair.
- **Séries de plusieurs parties** : suivi des champions déjà joués.
- **Éditeur de tier list**.

## Choix techniques

Contrainte de départ : **aucune base de données, aucun stockage serveur**.

- L'état partagé est synchronisé en pair-à-pair avec **Yjs + WebRTC** ; le serveur de signalisation ne stocke rien.
- Il peut aussi tenir dans un **lien compressé** (lz-string) que les joueurs se transmettent.
- Les données des champions viennent de **Data Dragon**, le CDN public de Riot, chargé côté client.
- Les choix de conception sont décrits dans `docs/SPEC.md`.

## Stack

Next.js (App Router) · React · TypeScript · Yjs · WebRTC · Vitest · Vercel

## Lancer le projet

```bash
npm install
npm run dev     # http://localhost:3000
npm test
```

---

Projet de fan, non approuvé par Riot Games. League of Legends est une marque de Riot Games, Inc.
