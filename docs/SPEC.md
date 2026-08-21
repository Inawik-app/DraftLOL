# Draft.board — spécification

Référence unique du projet. En cas de contradiction entre ce document et une implémentation existante, **ce document fait foi** — signale la divergence plutôt que de l'aligner en silence.

---

## 1. Ce que fait le produit

Un outil d'aide à la draft utilisé **pendant le champ select**, par une équipe de cinq. Il n'automatise rien : il affiche en temps réel ce qui manque à la composition en train de se construire, et propose des champions qui comblent ce manque **dans le pool réel des joueurs**.

Contrainte de lecture : l'utilisateur a 27 secondes pour décider. Toute information qui demande de lire une phrase complète pour être utile est mal placée.

### Non-objectifs

- Pas de compte utilisateur, pas de persistance serveur, pas d'historique de parties.
- Pas de prédiction de victoire. Le score est une aide à la lecture, pas un oracle.
- Pas de simulation de l'ordre officiel des picks/bans. Les cinq rôles sont remplis librement, dans n'importe quel ordre.

---

## 2. Contraintes d'architecture


| Contrainte           | Détail                                                  |
| -------------------- | ------------------------------------------------------- |
| Zéro base de données | Aucun stockage serveur, sous aucune forme               |
| Hébergement          | Vercel, build statique + routes serverless optionnelles |
| État partagé         | Encodé dans un token que les joueurs se transmettent    |
| Données champions    | Data Dragon, CDN public Riot, chargé côté client        |
| Temps réel           | P2P WebRTC, le serveur de signaling ne stocke rien      |


Toute proposition impliquant Supabase, Prisma, Redis, Vercel KV, Postgres ou un cache serveur est hors périmètre. Si une fonctionnalité semble l'exiger, la traiter comme un signal que la fonctionnalité doit être repensée.

---

## 3. Vocabulaire de tags

Quinze tags, union littérale TypeScript. **Cette liste est fermée** : n'en ajouter aucun sans décision explicite.

```ts
type Tag =
  | "frontline" | "engage" | "disengage" | "poke" | "burst"
  | "dps" | "ap" | "ad" | "waveclear" | "pick"
  | "dive" | "scaling" | "mobility" | "utility" | "splitpush";

```


| Tag         | Libellé FR     | Ce qu'il décrit                                               |
| ----------- | -------------- | ------------------------------------------------------------- |
| `frontline` | Frontline      | Absorbe les dégâts en première ligne sur la durée d'un combat |
| `engage`    | Engage         | Ouvre un combat de force, sans consentement adverse           |
| `disengage` | Peel/Disengage | Annule un engage adverse ou protège une carry                 |
| `poke`      | Poke           | Inflige des dégâts à distance sans s'exposer                  |
| `burst`     | Burst          | Tue une cible en une rotation                                 |
| `dps`       | DPS soutenu    | Dégâts continus, dépend de la durée du combat                 |
| `ap`        | AP             | Menace de dégâts magiques : pousse l'adversaire à monter de la résistance magique à cause de ce champion |
| `ad`        | AD             | Menace de dégâts physiques : pousse l'adversaire à monter de l'armure à cause de ce champion |
| `waveclear` | Waveclear      | Nettoie les vagues, tient une ligne, défend un siège          |
| `pick`      | Pick/Catch     | Isole et supprime une cible hors combat rangé                 |
| `dive`      | Dive           | Atteint la backline adverse malgré la frontline               |
| `scaling`   | Scaling        | Faible tôt, dominant après deux ou trois objets               |
| `mobility`  | Mobilité       | Repositionnement fréquent, dashes, portées d'entrée           |
| `utility`   | Utilitaire     | Soins, boucliers, buffs, vision, contrôle non létal           |
| `splitpush` | Splitpush      | Menace une ligne latérale en 1v1 et force une réponse         |


Un champion porte typiquement 3 à 5 tags.

`ad` et `ap` ne décrivent pas le type de dégâts d'un champion, mais le fait qu'il constitue une **menace de dégâts réelle** — celle qui pousse l'adversaire à monter une résistance *à cause de lui*. Un champion dont les dégâts sont négligeables dans une composition (supports enchanteurs, tanks non menaçants) ne porte ni `ad` ni `ap`. La plupart des champions portent zéro ou un de ces deux tags ; les deux ensemble sont réservés aux hybrides avérés.

### Origine des tags

Deux sources, dans cet ordre :

1. `src/data/tags.ts` — matrice maintenue à la main. **Fichier interdit à toute génération automatique.** Ne jamais y ajouter, retirer ou modifier une entrée, même si une valeur semble erronée : la signaler dans la réponse et laisser le fichier intact.
2. `src/lib/deriveTags.ts` — repli pour les champions absents de la matrice, dérivé de `info.attack`, `info.magic` et des tags Riot (`Tank`, `Mage`, `Assassin`…). Résultat grossier, assumé comme tel : le champion est marqué `curated: false`.

---

## 4. Profils de composition

Sept profils. Chacun définit un nombre cible d'occurrences par tag, pour une équipe complète de cinq. Un tag absent des `targets` d'un profil est neutre : il ne rapporte ni ne coûte rien.

```ts
const PROFILES = {
  teamfight: { name: "Teamfight",          targets: { frontline:2, dps:2, engage:1, utility:2, waveclear:2, ap:2, ad:2 } },
  poke:      { name: "Poke / Siège",       targets: { poke:3, waveclear:3, disengage:2, ap:2, ad:2, frontline:1 } },
  dive:      { name: "Dive / All-in",      targets: { engage:2, dive:3, mobility:3, burst:2, frontline:1, ad:2 } },
  pick:      { name: "Pick / Catch",       targets: { pick:3, burst:3, mobility:2, waveclear:1, ap:1, ad:1 } },
  protect:   { name: "Protect the carry",  targets: { utility:3, disengage:3, dps:2, scaling:2, frontline:1 } },
  split:     { name: "Splitpush 1-3-1",    targets: { splitpush:2, waveclear:3, disengage:2, mobility:2, scaling:1 } },
  scaling:   { name: "Scaling",            targets: { scaling:3, waveclear:3, frontline:2, disengage:2, utility:1 } },
};

```

Le profil est modifiable à tout moment. Le changer recalcule immédiatement jauges, notes, score et suggestions, sans toucher aux picks.

---

## 5. Formule de score

`scoreComp(picks, profile) → Evaluation`, dans `src/lib/score.ts`. Fonction pure.

```ts
type Pick = { champ: Champion; tier: "S" | "A" | "B" | null; roleIdx: number };

type Evaluation = {
  score: number;          // 0-100, non arrondi
  base: number;           // score avant bonus d'affinité
  affinityBonus: number;  // 0-12
  rows: GaugeRow[];       // une par tag du profil
  notes: Note[];
  counts: Record<Tag, number>;
};

type GaugeRow = { tag: Tag; have: number; target: number; need: number; status: "low" | "ok" | "high" };
type Note = { t: "bad" | "warn" | "good"; m: string };

```

### 5.1 Mise à l'échelle

`n` = nombre de picks posés. `scale = n / 5`. Pour chaque tag du profil, `need = target × scale`.

**C'est le point le plus important de la formule.** Sans cette mise à l'échelle, une composition à un seul pick afficherait un score misérable alors que rien n'est encore compromis. L'outil doit noter *ce qui est posé*, pas la distance à une équipe complète.

### 5.2 Base

```
got = Σ_tags  min(have / need, 1) × target
max = Σ_tags  target
base = (got / max) × 100

```

Le poids d'un tag dans le total est sa propre cible : dans le profil poke, `poke:3` pèse trois fois plus que `frontline:1`.

### 5.3 Statuts de jauge


| Condition            | Statut                |
| -------------------- | --------------------- |
| `have < need − 0.35` | `low` — manquant      |
| `have > need + 1.2`  | `high` — excédentaire |
| sinon                | `ok`                  |


### 5.4 Malus

Appliqués sur `base`, dans cet ordre :


| Situation                      | Malus | Note                                      |
| ------------------------------ | ----- | ----------------------------------------- |
| Chaque tag en statut `high`    | −4    | `warn` — redondance                       |
| `n ≥ 4` et zéro `ad`           | −14   | `bad` — aucune menace de dégâts physiques |
| `n ≥ 4` et zéro `ap`           | −14   | `bad` — aucune menace de dégâts magiques  |
| `n === 5` et `min(ad, ap) === 1` | −5  | `warn` — menace de dégâts déséquilibrée   |
| `n ≥ 4` et zéro `frontline`    | −10   | `bad` — bloquant                          |


Les deux premiers malus de menace (`ad` / `ap`) sont mutuellement exclusifs : si les deux manquent, un seul s'applique.

### 5.5 Bonus d'affinité

```
affinityWeight = { S: 1, A: 0.7, B: 0.4, null: 0 }
affinityBonus  = (Σ_picks affinityWeight[tier] / n) × 12
score          = clamp(base + affinityBonus, 0, 100)

```

Intention : un champion hors profil sur lequel le joueur est excellent coûte moins cher qu'un champion parfaitement dans le profil qu'il ne maîtrise pas. Le plafond de 12 est délibéré — **l'affinité compense un écart de profil, elle ne rachète jamais un malus bloquant.** Une composition sans frontline ne doit pas pouvoir passer devant une composition équilibrée par le seul jeu de l'affinité. Tout ajustement de cette pondération doit être vérifié contre ce test.

L'affinité ne s'applique qu'à l'équipe alliée. L'équipe adverse est évaluée avec la même formule, `tier` toujours à `null`.

### 5.6 Cas limites

- `n === 0` → `score: 0`, `notes: []`, jauges toutes à `have: 0`.
- Résultat toujours borné `[0, 100]`.
- Arrondi uniquement à l'affichage, jamais dans le calcul.
- Si `base` vaut déjà 100, le bonus d'affinité est avalé par le plafond : sans écart au profil, il n'y a rien à compenser. `affinityBonus` reste calculé et exposé, mais `score` ne dépasse pas 100.

---

## 6. Suggestions par rôle

`suggestForRole(roleIdx, picks, profile, players, available) → Champion[]` (cinq maximum), dans `src/lib/suggest.ts`.

Pour chaque champion disponible, valeur de classement :

```
delta   = scoreComp(picks + champion@roleIdx) − scoreComp(picks)
bonus   = tier ? affinityWeight[tier] × 10 : 0
malus   = tier ? 0 : −6        // hors du pool déclaré du joueur
value   = delta + bonus + malus

```

Le malus de −6 est ce qui fait la différence avec un outil générique : il vaut mieux suggérer un bon champion que le joueur sait jouer qu'un champion optimal qu'il n'a jamais posé en ranked.

Exclure les champions déjà pris ou bannis dans l'une ou l'autre équipe. Les suggestions n'apparaissent que pour les rôles alliés vides.

---

## 7. Recherche de champion

`subsequenceScore(query, name) → number | null`, dans `src/lib/search.ts`.

Les lettres de la requête doivent apparaître **dans l'ordre** dans le nom, pas nécessairement consécutivement. `null` si la contrainte d'ordre échoue.

Normalisation : minuscules, suppression de tout ce qui n'est pas `[a-z0-9]` des deux côtés.

Classement : pénaliser les trous entre lettres consécutives, pénaliser légèrement les noms longs, bonifier fortement un préfixe exact.

Cas de référence, à tester :


| Requête | Attendu                       |
| ------- | ----------------------------- |
| `kss`   | Kassadin trouvé               |
| `mrgn`  | Morgana trouvé                |
| `twf`   | Twisted Fate trouvé           |
| `lee`   | Lee Sin premier du classement |
| `zzz`   | aucun résultat                |


---

## 8. Données joueur

Cinq joueurs, un par rôle, index fixe `0..4` = `top, jgl, mid, adc, sup`.

```ts
type Player = {
  name: string;
  opgg: string;                              // lien affiché, jamais requêté côté client
  tiers: Record<string, "S" | "A" | "B">;    // championId → tier
  stats: Record<string, ChampStats>;
};

type ChampStats = {
  games?: number;
  wr?: number;                    // winrate global sur le champion, 0-100
  vs?: Record<string, number>;    // championId adverse → winrate personnel, 0-100
};

```

`stats` est saisi à la main en JSON pour l'instant. Le format est figé : une future route serverless interrogeant l'API Riot devra produire exactement cette forme.

**Affichage des winrates de matchup :** toujours accompagné du nombre de parties. Sous 15 parties, griser et mentionner « échantillon faible ». Un winrate sur six parties n'est pas un signal, et le présenter comme tel est pire que ne rien afficher.

---

## 9. Token de salle

Format : `DRAFT1.<payload>`.

- `payload` = JSON à clés abrégées, compressé via `lz-string.compressToEncodedURIComponent` — le résultat doit tenir dans une URL.
- Le préfixe porte la version. Un décodeur rencontrant `DRAFT2.` retourne une erreur explicite plutôt que de tenter une lecture.

Contenu : profil actif, picks et bans des deux équipes (identifiants Data Dragon), et les cinq objets joueur.

```ts
function decodeRoom(token: string): { ok: true; state: RoomState } | { ok: false; reason: string };

```

`decodeRoom` **ne jette jamais**. Token tronqué, préfixe absent, version inconnue, JSON invalide, champion inexistant dans le patch courant : chaque cas retourne une raison lisible en français.

Le token est synchronisé dans `window.location.hash`, en throttle 500 ms.

---

## 10. Temps réel

Yjs + `y-webrtc`. Nom de room = hash court dérivé du token, **jamais le token entier** : le nom de room transite par le serveur de signaling, et le token contient les tier lists.

Document partagé (`Y.Map` "draft") : picks, bans, profil actif. **Hors du document partagé, strictement local :** `players` — tier lists, liens op.gg, stats personnelles.

Le site reste pleinement fonctionnel sans aucun pair connecté. L'état de connexion et le nombre de pairs sont affichés, mais aucune fonctionnalité n'en dépend.

---

## 11. Structure de fichiers

```
src/
├── app/                    page unique, layout, globals.css
├── components/             DraftBoard, ChampionPicker, AnalysisPanel,
│                           ChampionDetail, ProfileSelector, PlayersPanel
├── lib/                    ddragon, score, suggest, search, token, room, deriveTags, types
├── data/                   tags.ts (manuel), profiles.ts
└── state/                  useDraft

```

`src/lib/` ne contient aucun import React. Chaque fichier y a son `.test.ts`.

---

## 12. Interface

Français pour tous les textes visibles. Anglais pour le code, les variables et les commentaires.

Fond très sombre, cadres de champion biseautés (`clip-path`), Barlow Condensed pour les libellés et les chiffres, Inter pour le texte courant. Bleu et rouge réservés à l'identification des équipes — jamais utilisés pour signifier une qualité.

Sémantique des couleurs de score : rouge sous 48, ambre sous 72, vert au-delà.

Plancher de qualité non négociable : chaque cadre est un `<button>` avec `aria-label` décrivant son contenu réel, focus visible partout, focus piégé dans la modale et rendu au déclencheur à la fermeture, `prefers-reduced-motion` respecté, board en colonne unique sous 900 px.

Le prototype de référence est `docs/prototype.jsx` — logique et rendu attendus. Il n'est pas du code de production : il ne doit être ni importé, ni compilé, ni modifié.