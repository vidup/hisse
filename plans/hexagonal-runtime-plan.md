# Hisse — Plan d’architecture hexagonale et verticale produit

## 1. Intention

Faire évoluer Hisse d’un **moteur + extension Pi** vers un **runtime métier central**, indépendant de Pi, capable d’être utilisé depuis plusieurs surfaces :

- Pi / agent tools
- UI web (Vite)
- app desktop plus tard (Electron ou autre)
- Telegram
- MCP pour Claude Code / Codex / autres clients

L’objectif n’est pas de faire de l’UI le coeur du système.
L’objectif est de faire de **Hisse le coeur**, puis de brancher des interfaces et des infrastructures autour.

---

## 2. Décision d’architecture

### Choix

Adopter une architecture **hexagonale / ports & adapters**.

### Conséquence

Le système est structuré en :

1. **Domaine**
2. **Application / runtime**
3. **Adaptateurs entrants**
4. **Adaptateurs sortants**
5. **Clients / UI** au-dessus de certains adaptateurs entrants

### Principe central

Aucun adaptateur entrant ne doit parler directement au stockage ou aux reducers.

Tous les adaptateurs entrants doivent parler au **runtime applicatif**.

Le runtime est le seul endroit qui :

- exécute les cas d’usage
- valide les règles métier
- écrit les événements
- reconstruit l’état
- publie les événements applicatifs

---

## 3. Modèle mental

### Centre de l’hexagone

#### Domaine
Contient la vérité métier pure et déterministe :

- états
- règles de transition
- événements métier
- reducer / state machine
- invariants

#### Application / runtime
Contient les cas d’usage et l’orchestration applicative :

- réception des commandes
- lecture de l’état
- validation métier
- production d’événements
- persistance via ports
- publication d’événements applicatifs
- queries

---

## 4. Les deux grandes familles d’adaptateurs

### A. Adaptateurs entrants (primary / inbound)

Ils servent à **utiliser Hisse**.

Exemples :

- extension Pi
- API HTTP
- serveur MCP
- bot Telegram
- CLI dédiée
- process RPC

Ils traduisent une interaction externe en :

- commande
- query
- abonnement à un flux

### B. Adaptateurs sortants (secondary / outbound)

Ils servent à permettre au runtime de **parler au monde extérieur**.

Exemples :

- stockage JSONL
- stockage SQLite
- stockage Postgres
- bus d’événements mémoire
- publication SSE
- publication WebSocket
- notifications Telegram
- file de jobs

---

## 5. Position de Pi dans cette architecture

Pi n’est pas le coeur du produit.

Pi est un **adaptateur entrant** parmi d’autres.

### Aujourd’hui

Pi est le point d’entrée principal parce que le projet a commencé comme un harness.

### Cible

Le runtime Hisse devient le coeur.
Pi devient une surface d’accès spécialisée, utile pour :

- pilotage conversationnel
- agents avec tools
- workflow assisté par LLM

### Conséquence importante

La logique métier ne doit plus être portée par l’extension Pi.
L’extension Pi doit devenir un adaptateur mince qui :

- traduit des tool calls en commandes runtime
- appelle des queries
- affiche des résultats
- relaie éventuellement certains événements à l’UI Pi

---

## 6. Position des UI

Une UI n’est pas le coeur du système.
Elle consomme un ou plusieurs adaptateurs.

### Exemple web

- la web UI parle à l’adaptateur HTTP
- elle s’abonne au flux SSE / WebSocket
- elle affiche l’état et les événements

### Exemple desktop

- l’app desktop peut parler au runtime embarqué via SDK interne
- ou à un serveur local/embarqué

### Exemple Telegram

- Telegram n’est pas le coeur
- c’est une surface qui envoie des commandes et reçoit des notifications

---

## 7. Niveaux d’événements à distinguer

Pour éviter de mélanger les responsabilités, il faut distinguer trois niveaux.

### Niveau 1 — Domain events

Ce sont les événements métier, source de vérité.

Exemples :

- `project.created`
- `task.added`
- `task.status_changed`
- `stage.changed`

### Niveau 2 — Application events

Ce sont des événements consumables par les adaptateurs et clients.

Exemple :

```ts
{
  type: "project.updated",
  projectId,
  timestamp,
  domainEvent,
  state,
}
```

Ils servent à informer :

- la web UI
- Pi
- SSE
- WebSocket
- Telegram

### Niveau 3 — Channel messages

Ce sont les messages rendus pour un canal donné.

Exemples :

- Telegram : `✅ La tâche t3 est passée en done`
- UI web : JSON de timeline + état projet
- Pi : widget de progression mis à jour

---

## 8. Ports à créer

### Ports entrants

Le runtime doit exposer au minimum :

```ts
interface HisseRuntime {
  dispatch(command: HisseCommand): Promise<HisseDispatchResult>;
  query<TQuery, TResult>(query: TQuery): Promise<TResult>;
  subscribe(listener: (event: HisseAppEvent) => void): () => void;
}
```

Ou une variante plus explicite :

```ts
interface HisseRuntime {
  dispatch(command: HisseCommand): Promise<HisseDispatchResult>;
  getProject(projectId: string): Promise<ProjectState | undefined>;
  listProjects(): Promise<ProjectSummary[]>;
  getProjectTimeline(projectId: string): Promise<ProjectTimelineItem[]>;
  subscribe(listener: (event: HisseAppEvent) => void): () => void;
}
```

### Ports sortants

#### Event store

```ts
interface EventStore {
  append(projectId: string, events: HisseEvent[]): Promise<void>;
  load(projectId: string): Promise<HisseEvent[]>;
  listProjectIds(): Promise<string[]>;
}
```

#### Event publisher / bus

```ts
interface AppEventBus {
  publish(event: HisseAppEvent): void;
  subscribe(listener: (event: HisseAppEvent) => void): () => void;
}
```

#### Read model store (optionnel au début)

```ts
interface ProjectReadStore {
  save(state: ProjectState): Promise<void>;
  get(projectId: string): Promise<ProjectState | undefined>;
  list(): Promise<ProjectSummary[]>;
}
```

On peut commencer sans read store séparé, puis l’ajouter plus tard.

---

## 9. Types de commandes à introduire

Exemples de commandes applicatives :

```ts
type HisseCommand =
  | {
      type: "project.create";
      projectId: string;
      name: string;
      initialStage?: Stage;
    }
  | {
      type: "project.open";
      projectId: string;
    }
  | {
      type: "task.add";
      projectId: string;
      taskId?: string;
      title: string;
    }
  | {
      type: "task.set_status";
      projectId: string;
      taskId: string;
      status: TaskStatus;
    }
  | {
      type: "stage.advance";
      projectId: string;
      toStage: Stage;
      reason?: string;
    };
```

Le runtime traduit ces commandes en événements métier validés.

---

## 10. Adaptateurs entrants cibles

### A. Pi adapter

Responsabilité :

- exposer des tools Pi
- convertir les appels de tools en commandes runtime
- appeler les queries runtime
- mettre à jour l’UI Pi avec les données applicatives

Ne doit pas :

- embarquer le coeur des règles métier
- parler directement au JSONL store

### B. HTTP adapter

Responsabilité :

- exposer des endpoints REST/JSON simples
- accepter les commandes
- exposer les queries
- fournir l’accès au flux temps réel

### C. MCP adapter

Responsabilité :

- exposer Hisse comme surface de tools à un autre agent/harness
- mapper chaque tool MCP vers une commande/query runtime

### D. Telegram adapter

Responsabilité :

- transformer des commandes Telegram en commandes runtime
- envoyer des notifications ou synthèses à partir des événements applicatifs

---

## 11. Adaptateurs sortants cibles

### A. JSONL adapter

Premier adaptateur de stockage.

Responsabilité :

- append des domain events
- load des events d’un projet
- lister les projets

Important :

- le JSONL n’est pas le domaine
- le JSONL n’est pas le runtime
- le JSONL est un adaptateur interchangeable

### B. SQLite adapter

Deuxième adaptateur cible probable.

Utile si on veut :

- requêtes plus riches
- meilleur support multi-lecture
- projections locales plus rapides
- base plus adaptée à une app desktop/web locale

### C. SSE / WebSocket broadcaster

Responsabilité :

- relayer les `HisseAppEvent` vers les clients live
- permettre à la web UI d’être réactive

### D. Notifications / integrations

Exemples :

- Telegram sender
- email / webhook
- queue / job runner

---

## 12. Stockage : décision de principe

Le stockage doit être abstrait derrière un port.

### Ce qu’on sait déjà

Le JSONL est parfait pour démarrer :

- simple
- lisible
- append-only
- cohérent avec l’event sourcing actuel

### Ce qu’on veut préserver

Ne pas lier le runtime à JSONL.

### Décision

- **JSONL maintenant** comme premier adaptateur
- **SQLite ensuite** comme alternative potentielle
- possibilité future de stockage distant si nécessaire

---

## 13. Première verticale produit à viser

La prochaine verticale ne doit pas être Electron directement.

### Verticale recommandée

1. runtime hexagonal
2. adaptateur JSONL
3. adaptateur HTTP + SSE
4. mini UI web Vite
5. adaptateur Pi branché sur le runtime

### Pourquoi ce choix

Cette verticale permet immédiatement :

- un vrai backend métier central
- une vraie UI observable
- un flux d’événements live
- une compatibilité future avec Electron, Telegram, MCP

---

## 14. Structure cible du projet

Deux options sont possibles.

### Option transitoire — mono-package organisé

```txt
src/
  domain/
  application/
  infrastructure/
    event-store/
    event-bus/
  adapters/
    pi/
    http/
```

### Option cible recommandée — workspace / monorepo léger

```txt
apps/
  server/
  web/
packages/
  domain/
  application/
  adapter-pi/
  adapter-http/
  infrastructure-jsonl/
  shared/
```

### Recommandation

Si l’objectif est vraiment multi-surfaces, viser la structure workspace assez tôt.

---

## 15. Répartition des responsabilités

### `domain`

Contient :

- `Stage`, `TaskStatus`, `ProjectState`
- événements métier
- reducer
- guards / règles de transition

### `application`

Contient :

- runtime
- handlers de commandes
- queries
- DTO de sortie
- événements applicatifs
- ports

### `infrastructure-jsonl`

Contient :

- implémentation `EventStore` en JSONL

### `adapter-pi`

Contient :

- extension Pi
- mapping tools ↔ runtime
- UI Pi

### `adapter-http`

Contient :

- routes REST
- endpoint SSE
- éventuellement WebSocket plus tard

### `apps/web`

Contient :

- UI métier
- vues projets / tâches / timeline
- client HTTP + SSE

---

## 16. Règles de conception à respecter

1. **Le domaine ne dépend de rien d’extérieur.**
2. **L’application ne dépend que d’interfaces.**
3. **Les adaptateurs entrants ne contiennent pas de logique métier critique.**
4. **Les adaptateurs sortants sont interchangeables.**
5. **La UI n’écrit jamais directement dans le store.**
6. **Pi ne lit/écrit jamais directement le JSONL store une fois le runtime introduit.**
7. **Les invariants métier vivent au centre, pas dans les prompts, ni dans les handlers d’UI.**

---

## 17. Découpage de mise en oeuvre

### Phase 1 — Réorganisation interne

Objectif : sortir le métier de l’extension Pi.

Travaux :

- créer `domain/`
- créer `application/`
- définir les ports
- déplacer `JsonlEventStore` côté infrastructure
- créer un premier `HisseRuntime`

### Phase 2 — Rebrancher Pi

Objectif : faire de Pi un adaptateur entrant mince.

Travaux :

- adapter `hisse-extension.ts`
- remplacer les appels directs au store par le runtime
- conserver l’UI Pi existante

### Phase 3 — Exposer la verticale web

Objectif : avoir une première UI indépendante de Pi.

Travaux :

- créer un petit serveur HTTP
- exposer les queries et commandes
- exposer un flux SSE
- créer une mini app Vite

### Phase 4 — Ouvrir les autres canaux

Objectif : préparer l’extensibilité produit.

Travaux :

- introduire éventuellement SQLite
- introduire un adaptateur MCP
- introduire Telegram si utile

---

## 18. Première API minimale à viser

### HTTP

- `GET /projects`
- `POST /projects`
- `GET /projects/:projectId`
- `GET /projects/:projectId/tasks`
- `GET /projects/:projectId/timeline`
- `POST /projects/:projectId/commands`

### SSE

- `GET /events`
- ou `GET /projects/:projectId/events`

Le payload SSE doit transporter des `HisseAppEvent` et non des messages spécifiques à une UI.

---

## 19. Exemple de flux cible

### Cas : ajout de tâche depuis Pi

1. L’agent Pi appelle `hisse_task`
2. L’adaptateur Pi convertit cela en `task.add`
3. Le runtime charge les events du projet via `EventStore`
4. Le runtime reconstruit l’état
5. Le runtime valide la commande
6. Le runtime produit `task.added`
7. L’adaptateur JSONL append l’événement
8. Le runtime reconstruit le nouvel état
9. Le runtime publie un `HisseAppEvent`
10. L’adaptateur Pi affiche le résultat
11. L’adaptateur SSE diffuse l’événement à la web UI
12. La web UI se met à jour en live

---

## 20. Critères de succès

Le plan sera considéré comme réussi lorsque :

1. le coeur Hisse peut être utilisé sans Pi
2. Pi n’est plus qu’un adaptateur entrant
3. le stockage JSONL est remplaçable sans toucher au domaine
4. une UI web peut suivre l’état en live
5. le même runtime peut ensuite être exposé via MCP ou Telegram sans duplication métier

---

## 21. Prochaine étape concrète

Prochaine implémentation recommandée :

1. **extraire la couche `application`**
2. **définir les ports `EventStore` et `AppEventBus`**
3. **créer `HisseRuntime`**
4. **déplacer `JsonlEventStore` en adaptateur d’infrastructure**
5. **adapter l’extension Pi pour consommer le runtime**
6. **ensuite seulement exposer HTTP + SSE + mini app web**

Ce plan donne une trajectoire où :

- on garde l’avancement actuel
- on nettoie l’architecture
- on prépare immédiatement la verticalisation produit
- on ne s’enferme ni dans Pi, ni dans JSONL, ni dans une UI particulière
