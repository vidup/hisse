# hisse

`hisse` est un début de **harness custom de software factory** pour Pi.

Objectif: sortir l’orchestration critique du LLM et la rendre **déterministe** via un moteur métier (events + reducer), avec persistance par projet.

## Ce que le projet contient aujourd’hui

- Un core domaine (stages, tasks, transitions)
- Des événements en classes (`ProjectCreatedEvent`, `TaskAddedEvent`, etc.)
- Un reducer pour reconstruire l’état à partir des événements
- Un store JSONL (`.hisse/<projectId>/events.jsonl`)
- Une extension Pi MVP:
  - `hisse_project` (create/open/status/list)
  - `hisse_task` (add/set_status/list)
  - `hisse_stage` (advance/status)
  - `/hisse` (statut rapide)

## Documentation locale

- `docs/pi-for-hisse.md` — synthèse des parties de Pi utiles à Hisse / CC-SHIP (extensions, SDK, TUI, sessions, RPC, packages, skills, etc.)

## Première verticale web

Deux nouvelles apps minimales ont été ajoutées :

- `apps/api` — petite API Fastify
- `apps/web` — petite app Vite

### Installer les dépendances

```bash
npm --prefix apps/api install
npm --prefix apps/web install
```

### Lancer l’API

```bash
npm run dev:api
```

API par défaut : `http://localhost:3000`

### Lancer le front web

```bash
npm run dev:web
```

App web par défaut : `http://localhost:5173`

Le front parle à l’API via le proxy Vite (`/api -> http://localhost:3000`).

## Lancer l’extension (2 commandes)

### 1) Directement depuis le source
```bash
npx pi -e ./src/pi/hisse-extension.ts
```

### 2) Depuis le build
```bash
npm run build
npx pi -e ./dist/pi/hisse-extension.js
```
