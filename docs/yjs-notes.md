# Yjs — mémo Draft.board

Référence compacte pour l’implémentation de `src/lib/room.ts` (SPEC §10).  
Versions du projet : `yjs@^13.6`, `y-webrtc@^10.3`.

**Principe clé :** `WebrtcProvider` propage les mises à jour du `Y.Doc` entre pairs. Ne pas réimplémenter la synchronisation avec `encodeStateAsUpdate` / `applyUpdate` — le provider s’en charge.

---

## 1. Y.Map — lecture, écriture, imbrication, observers

### Accès au document partagé

```typescript
import * as Y from 'yjs'
import type { Pick } from '@/lib/types'

const ydoc = new Y.Doc()
const draft = ydoc.getMap('draft') // Y.Map<string, unknown>

// Lecture (undefined si absent)
const profileKey = draft.get('profileKey') as string | undefined
const picks = draft.get('picks') as Pick[] | undefined

// Écriture — valeurs JSON ou Y.AbstractType imbrié
draft.set('profileKey', 'teamfight')
draft.set('picks', [{ side: 'blue', slot: 0, championId: 'Ahri' }])
draft.set('bans', [])

// Suppression / test
draft.delete('bans')
draft.has('picks') // boolean
draft.size // nombre de clés
```

### Imbrication

Deux patterns possibles pour picks/bans :

```typescript
// A) Valeurs JSON (simple, une clé = un remplacement atomique de la valeur)
draft.set('picks', updatedPicks)

// B) Y.Map imbriqué (mises à jour par slot, observeDeep utile)
const picksMap = draft.get('picks') as Y.Map<Pick> | undefined
const slot = picksMap ?? new Y.Map<Pick>()
if (!draft.has('picks')) draft.set('picks', slot)
slot.set('blue-0', { side: 'blue', slot: 0, championId: 'Ahri' })
```

Les valeurs acceptées par `set` : primitives JSON, `Uint8Array`, ou un autre type partagé Yjs (`Y.Map`, `Y.Array`, …).

### `observe` — changements sur cette map uniquement

Signature : `(event: Y.YMapEvent<T>, transaction: Y.Transaction) => void`

```typescript
const onDraftChange = (event: Y.YMapEvent<unknown>, tr: Y.Transaction) => {
  // event.target === draft
  // event.currentTarget === draft (identique ici)
  // event.transaction === tr
  // event.path === [] (map top-level)

  // Raccourci : clés touchées dans cette transaction
  for (const key of event.keysChanged) {
    console.log(key, draft.get(key))
  }

  // Forme détaillée (héritée de Y.Event)
  event.changes.keys.forEach((change, key) => {
    switch (change.action) {
      case 'add':
        // change.oldValue === undefined
        break
      case 'update':
        // change.oldValue = valeur avant la transaction
        break
      case 'delete':
        // draft.get(key) === undefined
        break
    }
  })

  // Origine : utile pour ignorer les échos locaux si besoin
  // tr.origin — voir transact() et le provider
}

draft.observe(onDraftChange)
// … au démontage :
draft.unobserve(onDraftChange)
```

**Forme exacte de l’événement (`YMapEvent`) :**

| Champ | Type | Rôle |
|---|---|---|
| `target` | `Y.AbstractType` | Type modifié (`draft`) |
| `currentTarget` | `Y.AbstractType` | Type sur lequel l’observer est attaché |
| `transaction` | `Y.Transaction` | Transaction qui a produit le changement |
| `path` | `(string \| number)[]` | Chemin depuis la racine du doc (`[]` si top-level) |
| `keysChanged` | `Set<string>` | Clés modifiées |
| `changes.keys` | `Map<string, { action: 'add'\|'update'\|'delete', oldValue: any }>` | Détail par clé |

### `observeDeep` — cette map **et** ses enfants Yjs

Signature : `(events: Y.YEvent<unknown>[], transaction: Y.Transaction) => void`

```typescript
const onDeep = (events: Y.YEvent<unknown>[], tr: Y.Transaction) => {
  for (const ev of events) {
    // ev.target = type réellement modifié (peut être un Y.Map enfant)
    // ev.path = ['draft', 'picks', 'blue-0'] par ex.
    if (ev instanceof Y.YMapEvent) {
      for (const key of ev.keysChanged) { /* … */ }
    }
  }
}

draft.observeDeep(onDeep)
draft.unobserveDeep(onDeep)
```

Pour Draft.board, `observe` sur `draft` suffit si picks/bans sont stockés en JSON plat. Préférer `observeDeep` seulement avec des `Y.Map` imbriqués.

### Copie vers l’état React local

`draft.toJSON()` produit un objet plain (types Yjs convertis récursivement). Pratique pour resynchroniser le state React après un changement distant :

```typescript
draft.observe(() => {
  setDraftSnapshot(draft.toJSON() as DraftSnapshot)
})
```

---

## 2. `transact` — regrouper les écritures

Signature : `ydoc.transact(fn, origin?)`

```typescript
ydoc.transact(() => {
  draft.set('profileKey', 'poke')
  draft.set('picks', newPicks)
  draft.set('bans', newBans)
}, 'local') // origin optionnelle → transaction.origin
```

**Comportement :** toutes les mutations dans `fn` forment **une seule transaction**. Les observers (`observe` / `observeDeep`) et `ydoc.on('update')` ne se déclenchent qu’**une fois** à la fin.

**Pourquoi c’est nécessaire ici :**

1. **UI cohérente** — une action utilisateur (ex. appliquer un profil + réinitialiser bans) ne doit produire qu’un seul rafraîchissement React, pas trois callbacks séparés.
2. **Moins de trafic** — le provider émet un update binaire par transaction ; sans `transact`, N `set()` = N paquets réseau.
3. **Origine** — passer `'local'` (ou un symbole) permet de distinguer ses propres écritures des mises à jour reçues des pairs (`tr.origin` absent ou différent) et d’éviter les boucles si on répercute Yjs → React → Yjs.

Ordre des événements Yjs par transaction : `beforeTransaction` → mutations → `beforeObserverCalls` → observers → `afterTransaction` → `update`.

---

## 3. y-webrtc — `WebrtcProvider`

### Constructeur

```typescript
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

const ydoc = new Y.Doc()
const roomName = 'abc123' // hash court du token — jamais le token entier (SPEC §10)

const provider = new WebrtcProvider(roomName, ydoc, {
  signaling: ['wss://y-webrtc-eu.fly.dev'], // défaut dans le code source v10
  password: null,       // string → chiffre le signaling (pas les données WebRTC elles-mêmes)
  awareness: undefined, // défaut : Awareness(doc) — identité des pairs, hors scope draft
  maxConns: 20,         // max connexions WebRTC (README suggère un facteur aléatoire)
  filterBcConns: true,  // true = pas de WebRTC entre onglets du même navigateur (BroadcastChannel à la place)
  peerOpts: {},         // options simple-peer
})
```

**Signature :** `new WebrtcProvider(roomName: string, doc: Y.Doc, opts?: ProviderOptions)`

| Option | Défaut (source v10) | Description |
|---|---|---|
| `signaling` | `['wss://y-webrtc-eu.fly.dev']` | Serveurs de signaling (connexion concurrente) |
| `password` | `null` | Mot de passe de room (chiffrement signaling) |
| `awareness` | `new Awareness(doc)` | Instance Awareness partagée |
| `maxConns` | `20 + floor(random * 15)` | Plafond connexions WebRTC |
| `filterBcConns` | `true` | Filtrer les connexions WebRTC intra-navigateur |
| `peerOpts` | `{}` | Config ICE/TURN pour simple-peer |

> **Note README vs code :** le README GitHub liste d’anciens serveurs Heroku/Now et écrit `maxConn` (typo) — l’option correcte est **`maxConns`**. Les défauts du **code source v10** priment.

Le constructeur appelle `connect()` automatiquement. Propriétés utiles : `provider.doc`, `provider.roomName`, `provider.connected` (getter).

### Événements

`WebrtcProvider` étend `ObservableV2` — API : `provider.on(name, fn)` / `provider.off(name, fn)`.

```typescript
// Connexion au réseau (signaling + room ouverte) — PAS « au moins un pair physique »
provider.on('status', (event: [{ connected: boolean }]) => {
  const { connected } = event[0]
  // connected === true quand shouldConnect && room !== null
})

// Tous les pairs WebRTC ont terminé la handshake sync
provider.on('synced', (event: [{ synced: boolean }]) => {
  const { synced } = event[0]
})

// Liste des pairs — événement principal pour l’UI « N pairs »
provider.on('peers', (event: [{
  added: string[]
  removed: string[]
  webrtcPeers: string[]
  bcPeers: string[]
}]) => {
  const { webrtcPeers, bcPeers } = event[0]
  const peerCount = webrtcPeers.length + bcPeers.length
})
```

**Piège `status.connected` :** indique que le provider **cherche** des pairs (signaling actif), pas qu’un pair est connecté. L’app reste utilisable à 0 pair (SPEC §10). Afficher `peerCount` séparément.

### Accès à la liste des pairs

Pas de getter dédié : conserver le dernier état reçu via `'peers'` :

```typescript
let peers = { webrtc: [] as string[], bc: [] as string[] }

provider.on('peers', ([{ webrtcPeers, bcPeers }]) => {
  peers = { webrtc: webrtcPeers, bc: bcPeers }
})
```

Les identifiants sont des UUID éphémères (signaling), pas des comptes utilisateur.

### `disconnect` vs `destroy`

```typescript
provider.disconnect() // arrête signaling + room, objet réutilisable
provider.connect()    // reprend

provider.destroy()    // nettoyage définitif : room, signaling, listeners Observable
                      // enregistré aussi sur ydoc.on('destroy')
```

**Destruction propre (ordre recommandé) :**

```typescript
draft.unobserve(onDraftChange)
provider.destroy() // détruit la room et se désabonne du doc
ydoc.destroy()
```

y-webrtc n’autorise **qu’un seul `Y.Doc` par nom de room** dans l’onglet (`openRoom` lève une erreur sinon). Ne jamais créer deux providers sur le même `roomName` sans `destroy()` intermédiaire.

---

## 4. Intégration React

### Piège StrictMode (double montage en dev)

React 18+ en `<StrictMode>` monte → démonte → remonte les effets. Sans cleanup, on obtient :

- deux `WebrtcProvider` sur la même room → **exception** ;
- observers Yjs dupliqués → mises à jour React en double ;
- fuites WebRTC / signaling.

**Pattern correct :**

```typescript
'use client'

import { useEffect, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export function useRoom(roomName: string | null) {
  const [peerCount, setPeerCount] = useState(0)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!roomName) return

    const ydoc = new Y.Doc()
    const draft = ydoc.getMap('draft')
    const provider = new WebrtcProvider(roomName, ydoc)

    const onDraft = () => { /* resync React */ }
    draft.observe(onDraft)

    const onStatus = ([{ connected: c }]: [{ connected: boolean }]) => setConnected(c)
    const onPeers = ([{ webrtcPeers, bcPeers }]: [{
      webrtcPeers: string[]
      bcPeers: string[]
    }]) => setPeerCount(webrtcPeers.length + bcPeers.length)

    provider.on('status', onStatus)
    provider.on('peers', onPeers)

    return () => {
      draft.unobserve(onDraft)
      provider.off('status', onStatus)
      provider.off('peers', onPeers)
      provider.destroy()
      ydoc.destroy()
    }
  }, [roomName])

  return { peerCount, connected }
}
```

Règles :

1. **Tout** ce qui est créé dans l’effet (`Y.Doc`, provider, handlers) est détruit dans le `return`.
2. Passer la **même référence** de fonction à `observe` / `on` et à `unobserve` / `off`.
3. Ne pas stocker le provider dans un ref global sans garde-fou — un effet par room suffit.
4. `players` (tier lists, op.gg) reste **hors** du `Y.Doc` — state React local uniquement (SPEC §10).

### Éviter les boucles Yjs ↔ React

```typescript
let applyingRemote = false

draft.observe((_ev, tr) => {
  if (tr.origin === 'local') return // notre propre transact
  applyingRemote = true
  try {
    setDraftSnapshot(draft.toJSON() as DraftSnapshot)
  } finally {
    applyingRemote = false
  }
})

function pushToYjs(snapshot: DraftSnapshot) {
  if (applyingRemote) return
  ydoc.transact(() => {
    draft.set('profileKey', snapshot.profileKey)
    draft.set('picks', snapshot.picks)
    draft.set('bans', snapshot.bans)
  }, 'local')
}
```

---

## APIs expérimentales / pièges documentés

| API | Statut | Action |
|---|---|---|
| `ydoc.on('updateV2', …)` | **EXPERIMENTAL** (doc Yjs) | Ne pas utiliser — format alternatif, instable |
| `Y.logUpdate()` | **experimental** | Debug uniquement, peut disparaître |
| `encodeStateAsUpdate` / `applyUpdate` | API stable | **Ignorer** pour Draft.board — géré par le provider |
| README `maxConn` | Typo | Utiliser **`maxConns`** |
| Signaling par défaut README | Obsolète | Préférer les défauts du **code source** ou serveur self-hosted |

---

## Checklist implémentation `room.ts`

- [ ] `roomName` = hash court dérivé du `rid`, pas le token entier
- [ ] `ydoc.getMap('draft')` — clés `picks`, `bans`, `profileKey`
- [ ] Écritures multi-clés dans `ydoc.transact(..., 'local')`
- [ ] `WebrtcProvider` + listeners `status` / `peers` pour l’UI
- [ ] Cleanup : `unobserve`, `provider.off`, `provider.destroy()`, `ydoc.destroy()`
- [ ] Pas de sync manuelle par updates binaires
