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
