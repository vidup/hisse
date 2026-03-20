# Hisse — First Draft (plan)

## 1) Objectif
Créer une extension/workflow engine pour Pi qui permet de gérer des projets avec :
- un état structuré par projet,
- des niveaux d’avancement explicites,
- une UI claire,
- un rôle du LLM limité à l’assistance (pas à l’orchestration métier).

---

## 2) Principe d’architecture

### Core déterministe (factory)
- Modèle de domaine : `Project`, `Stage`, `Task`, `Transition`.
- **Événements en classes** (pas juste des unions de types) :
  - `ProjectCreatedEvent`
  - `StageChangedEvent`
  - `TaskAddedEvent`
  - `TaskStatusChangedEvent`
- Règles de transition codées (guards), testables.
- Le LLM ne modifie jamais l’état directement.

### State par projet
- Dossier local : `.hisse/<project-id>/`
- Fichiers :
  - `events.jsonl` (source of truth, append-only)
  - `snapshot.json` (accélérer le chargement)
  - `meta.json` (nom, tags, progression)

### JSONL + classes (stratégie)
- Persisté : objets JSON sérialisés (`event.toJSON()`), une ligne par event.
- Chargé : rehydration via factory (`eventFromJSON`) vers des instances de classes.
- Le reducer ne traite que des événements validés/rehydratés.

### Adaptateur Pi (extension)
- Tools custom (exemples) :
  - `hisse_project` (create/open/status/list)
  - `hisse_task` (add/update/move/done/block)
  - `hisse_stage` (advance/rollback)
- Commandes : `/hisse`, `/hisse-board`, `/hisse-next`
- Widget/status line pour la visibilité continue.

### UI
- Widget persistant : projet actif, stage courant, progression (%), prochaine action.
- Vue board simple : backlog → in-progress → review → done.

---

## 3) MVP (v1)

### Scope minimal
1. Gestion d’un projet actif.
2. 4 stages (`backlog`, `spec`, `impl`, `ship`) avec transitions strictes.
3. CRUD simple de tasks + statut.
4. Persistance locale par projet (`events.jsonl` + rehydration classes).
5. Affichage d’un résumé dans l’UI Pi.

### Hors scope (v1)
- multi-user,
- sync distante,
- dépendances complexes entre tâches,
- permissions avancées.

---

## 4) Roadmap courte

### Milestone A — Core + Store
- Définir classes d’événements + payloads.
- Implémenter `eventFromJSON` (factory de rehydration).
- Implémenter `reduce(events) => state`.
- Écrire store JSONL + snapshot.
- Ajouter tests unitaires de transitions.

### Milestone B — Extension Pi
- Brancher tools custom sur le core.
- Ajouter commandes `/hisse` de base.
- Ajouter status + widget.

### Milestone C — UX workflow
- Board interactif minimal (`ctx.ui.custom`).
- Commande “next action”.
- Gestion d’erreurs métier lisible.

---

## 5) Critères de succès
- Recharger Pi ne perd jamais l’état du projet.
- Les transitions invalides sont bloquées par le moteur (pas par prompt).
- Le LLM peut proposer des actions, mais le state final est toujours validé côté core.
- Un utilisateur peut reprendre un projet en < 30 secondes via l’UI.

---

## 6) Décisions ouvertes
- Format IDs (`slug`, `uuid`, hybride).
- Niveau de granularité des events.
- SQLite dès v1.1 ou garder JSONL plus longtemps.
- Convention de stages par défaut (générique vs configurable par template).
