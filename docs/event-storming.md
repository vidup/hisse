# Event Storming — Hisse Platform

> Plateforme d'orchestration de workflows agentiques. Chaque projet suit un workflow
> séquentiel composé de steps (AgentStep ou HumanStep), exécutées par des agents IA
> ou des humains, avec livraison via adapters (filesystem, Slack, Miro...).

---

## Table des matières

1. [Vision & Scope](#vision--scope)
2. [Domain Events](#domain-events)
3. [Commands](#commands)
4. [Policies](#policies)
5. [Read Models](#read-models)
6. [Aggregates](#aggregates)
7. [Bounded Contexts](#bounded-contexts)
8. [Core Flow — Process Modeling](#core-flow--process-modeling)
9. [Design Decisions](#design-decisions)
10. [Hot Spots & Open Questions](#hot-spots--open-questions)

---

## Vision & Scope

Une plateforme permettant de :

- Créer des **workflows séquentiels** composés de steps configurables
- Deux types de steps : **AgentStep** (agent IA fait le travail) et **HumanStep** (humain fait le travail)
- Exécuter ces workflows dans des **projets** liés à des dossiers du filesystem
- Obtenir des **deliverables** de n'importe quel type (markdown, code, vidéo, flashcards...)

La validation humaine n'est pas un flag caché — c'est une **HumanStep explicite** dans le
workflow. L'humain peut bouger la task vers n'importe quelle step (avancer ou reculer).

Ce qui n'est **pas** dans le scope initial : swarms multi-agents, workflows non-linéaires
(branches conditionnelles), agent memory persistante.

---

## Domain Events

### Workspace & Projects

| Event | Description |
|---|---|
| `WorkspaceCreated` | Le workspace racine est créé — sandbox global pour les agents |
| `ProjectCreated` | Un nouveau projet est créé dans le workspace |
| `ProjectAssignedToFolder` | Le projet est lié à un dossier du filesystem (choisi par l'utilisateur) |
| `WorkflowAssignedToProject` | Un workflow est assigné au projet — déclenche la création des tasks |

### Step Catalog

| Event | Description |
|---|---|
| `StepCreated` | Une step est créée dans le catalogue (type: agent ou human, config complète) |
| `StepConfigured` | La config d'une step est modifiée (diff avant/après) — propage à tous les workflows |
| `StepForked` | Une nouvelle step est créée à partir d'une existante (variante) |

> **Step type = discriminated union extensible.** Chaque type définit : que se passe-t-il
> au start, pendant l'exécution, et qu'est-ce qui signale la complétion. L'Execution Engine
> dispatch vers la bonne stratégie selon le type (pattern Strategy).
>
> Types v1 :
> - **AgentStep** : config primaire = `agentId` (**qui** fait le travail). Auto-complete quand l'agent a fini.
> - **HumanStep** : config primaire = `connector` (**comment** parler à l'humain — Slack, email, app...).
>   L'humain travaille et bouge la task quand il est prêt.
>
> Types futurs envisagés : **SwarmStep** (multi-agents), **AutomationStep** (webhook/script), etc.

> **Modèle catalogue avec fork :** Les steps sont des entités first-class dans un catalogue,
> référencées par les workflows (lien vivant). Modifier propage partout. Pour une variante → fork.

> **Events simplifiés :** `StepCreated` porte la config initiale complète. `StepConfigured`
> porte la diff (avant/après). Pas d'events granulaires.

### Workflow Composition

| Event | Description |
|---|---|
| `WorkflowCreated` | Un nouveau workflow est créé (nom, description) |
| `WorkflowUpdated` | Métadonnées du workflow modifiées |
| `StepAssignedToWorkflow` | Une step du catalogue est assignée au workflow (avec position) |
| `StepReorderedInWorkflow` | L'ordre d'une step change dans la séquence du workflow |
| `StepUnassignedFromWorkflow` | Une step est retirée du workflow |

### Agent Registry & Catalogs

| Event | Description |
|---|---|
| `ToolRegistered` | Un tool est ajouté au catalogue global |
| `ToolUpdated` | Un tool du catalogue est modifié |
| `SkillCreated` | Un skill est ajouté au catalogue global |
| `SkillUpdated` | Un skill du catalogue est modifié |
| `AgentCreated` | Un agent est créé (nom, description, system prompt, modèle) |
| `AgentUpdated` | La configuration de l'agent est modifiée (diff avant/après) |

### Task Execution (Runtime)

| Event | Description |
|---|---|
| `TaskCreated` | Une task est créée (instance d'exécution d'une step dans un projet) |
| `TaskStarted` | La task démarre |
| `AgentSpawned` | L'agent est lancé pour exécuter la task (AgentStep uniquement) |
| `AgentProducedOutput` | L'agent a produit un output intermédiaire (AgentStep uniquement) |
| `HumanNotified` | L'humain est notifié via le connector de la step (HumanStep uniquement) |
| `ContentAddedToTask` | L'humain a ajouté du contenu — fichier, commentaire, deliverable (HumanStep) |
| `DeliverableGenerated` | Un deliverable est généré (par l'agent ou l'humain) |
| `TaskCompleted` | La task est terminée |
| `TaskMovedToStep` | La task est déplacée vers une autre step (suivante, précédente, ou autre) |

> **Pas de `StepReady`.** L'agent finit → `TaskCompleted` directement. Pas d'état intermédiaire.
> Si un jour on veut des checks de conformité automatiques, on ajoutera un event à ce moment-là.

> **`MoveTaskToStep` est générique.** Avancer et reculer sont le même command. L'humain peut
> bouger la task où il veut dans le workflow. Pour l'AgentStep, la policy fait automatiquement
> `MoveTaskToStep(next)`. Le métier peut restreindre ou non — v1 : l'humain décide.

### Project Lifecycle (derived — pas de commands dédiés)

| Event | Description |
|---|---|
| `ProjectStarted` | **Dérivé** : au moins une task du projet est started |
| `ProjectCompleted` | **Dérivé** : toutes les tasks du projet sont completed |

> **Delivery = pure infra.** Pas d'events domaine `DeliverablePublished` ou `NotificationDispatched`.
> Quand une task complete et que la step a des connectors, la couche infrastructure (ports & adapters)
> réagit à `TaskCompleted`. Le connector de la step définit ce qui se passe. C'est de l'infra, pas du domaine.

---

## Commands

### Workspace & Projects

| Command | Triggered by |
|---|---|
| `CreateWorkspace` | User |
| `CreateProject` | User |
| `AssignProjectToFolder` | User (choisit un path filesystem) |
| `AssignWorkflowToProject` | User |

### Step Catalog

| Command | Triggered by |
|---|---|
| `CreateStep` | User (choisit le type: agent ou human) |
| `ConfigureStep` | User (propage à tous les workflows — le système prévient) |
| `ForkStep` | User (depuis un workflow, choisit "créer une variante") |

### Workflow Composition

| Command | Triggered by |
|---|---|
| `CreateWorkflow` | User |
| `UpdateWorkflow` | User |
| `AssignStepToWorkflow` | User (choisit une step du catalogue + position) |
| `ReorderStepInWorkflow` | User |
| `UnassignStepFromWorkflow` | User |

### Agent Registry & Catalogs

| Command | Triggered by |
|---|---|
| `RegisterTool` | User / Admin |
| `UpdateTool` | User / Admin |
| `CreateSkill` | User / Admin |
| `UpdateSkill` | User / Admin |
| `CreateAgent` | User |
| `UpdateAgent` | User (diff avant/après — tools, skills, config) |

### Task Execution

| Command | Triggered by |
|---|---|
| `CreateTask` | Policy (auto, from workflow assignment) |
| `StartTask` | Policy (auto, from workflow start or MoveTaskToStep) |
| `SpawnAgent` | Policy (auto, from AgentStep task start) |
| `NotifyHuman` | Policy (auto, from HumanStep task start, via step connector) |
| `AddContentToTask` | User (ajoute fichier, commentaire, deliverable — HumanStep) |
| `MoveTaskToStep` | User (HumanStep — avance, recule, n'importe quelle step) ou Policy (AgentStep → auto next) |
| `CompleteTask` | Policy (auto, from agent finished ou from MoveTaskToStep) |

---

## Policies

> Format : **Whenever** [Event], **then** [Command] *(condition optionnelle)*

| Policy | Event trigger | Command | Condition |
|---|---|---|---|
| Create tasks on assignment | `WorkflowAssignedToProject` | `CreateTask` (×N, une par step) | — |
| Start first task | All `TaskCreated` for project | `StartTask` (first step) | Toutes les tasks créées |
| Spawn agent | `TaskStarted` | `SpawnAgent` | Step est un **AgentStep** |
| Notify human | `TaskStarted` | `NotifyHuman` (via step connector) | Step est un **HumanStep** |
| Auto-complete agent | Agent finished | `CompleteTask` + `MoveTaskToStep(next)` | Step est un **AgentStep** |
| Move on human action | `MoveTaskToStep` | `CompleteTask` (current) + `StartTask` (target) | Step est un **HumanStep** |
| Infra: delivery | `TaskCompleted` | *(infra)* adapters réagissent selon connectors | Connectors configurés |

---

## Read Models

> Informations nécessaires pour prendre des décisions (humaines ou agent).

### Pour une HumanStep (quand c'est le tour de l'humain)

- Deliverables des steps précédentes (contexte de travail)
- Description et objectifs de la step
- Contenu ajouté à la task (fichiers, commentaires)
- Brief / requirements du projet
- Liste des steps du workflow (pour savoir où bouger la task)

### Pour le démarrage d'un projet

- Liste des workflows disponibles
- Détail d'un workflow (steps, types, agents assignés, connectors)
- Dossiers disponibles dans le workspace

### Pour la composition d'un workflow

- Catalogue des steps disponibles (avec leur type, config, agent/connector)
- Catalogue des agents disponibles
- Catalogue des tools
- Catalogue des skills
- Types de connectors disponibles
- Nombre de workflows utilisant chaque step (pour informer avant modification/fork)

### Pour le suivi d'exécution

- État de chaque task (pending, started, completed)
- Type de la step courante (agent ou human — pour savoir qui travaille)
- Deliverables générés par step
- Contenu ajouté par les humains
- État global du projet (dérivé des tasks)

---

## Aggregates

```
Workspace
├── workspacePath: string

Project
├── name: string
├── folderPath: string (filesystem)
├── workflowId: reference
└── tasks: Task[]

Workflow
├── name: string
├── description: string
└── stepRefs: StepRef[] (ordered references to catalog steps)

StepRef (value object in Workflow)
├── stepId: reference (to Step catalog)
└── position: number

AgentStep (catalog)
├── type: 'agent'
├── name: string
├── description: string
├── deliverableType: string (plugin)
├── agentId: reference (required — qui fait le travail)
├── connectors: Connector[] (optionnel — notifications post-completion)
└── forkedFromId: reference?

HumanStep (catalog)
├── type: 'human'
├── name: string
├── description: string
├── deliverableType: string? (optional — l'humain peut ou non produire un deliverable)
├── connector: Connector (required — comment parler à l'humain : Slack, email, app...)
└── forkedFromId: reference?

Agent
├── name: string
├── description: string
├── systemPrompt: string
├── model: string
├── tools: ToolReference[]
└── skills: SkillReference[]

Tool (catalog)
├── name: string
├── description: string
└── configuration: object

Skill (catalog)
├── name: string
├── description: string
└── configuration: object

Task (runtime)
├── projectId: reference
├── stepId: reference
├── status: pending | started | completed
├── deliverables: Deliverable[]
└── content: ContentEntry[] (fichiers, commentaires ajoutés — surtout HumanStep)

Deliverable
├── type: string (from plugin)
├── content: any (opaque — géré par le plugin)
└── metadata: object

Connector
├── type: string (slack, miro, email, app...)
├── target: string (channel, board, address...)
└── configuration: object

ContentEntry
├── addedBy: string (userId)
├── type: string (file, comment, deliverable)
├── content: any
└── addedAt: timestamp
```

> **Symétrie step types :**
> - AgentStep : `agentId` (required) = **qui** fait le travail. Connectors optionnels.
> - HumanStep : `connector` (required) = **comment** parler à l'humain. Pas d'agent.
>
> C'est la même abstraction : la config primaire de chaque step type répond à la question
> critique pour ce type. Les connectors sur AgentStep sont secondaires (notifications).
> Le connector sur HumanStep est primaire (c'est le transport).

---

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HISSE PLATFORM                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  WORKSPACE    │  │  WORKFLOW DESIGN  │  │   AGENT REGISTRY     │  │
│  │              │  │                  │  │                      │  │
│  │  Workspace   │  │  Step Catalog    │  │  Agent               │  │
│  │  Project     │  │  (Agent/Human)   │  │  Tool (catalog)      │  │
│  │  Folder mgmt │  │  Step fork       │  │  Skill (catalog)     │  │
│  │              │  │  Workflow        │  │                      │  │
│  │              │  │  StepRef + order │  │                      │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                   │                        │              │
│         │    assigns        │    defines             │  provides    │
│         │    workflow       │    steps               │  agents      │
│         ▼                   ▼                        ▼              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    EXECUTION ENGINE                          │   │
│  │                                                              │   │
│  │  Task lifecycle ─── Agent spawning ─── Step progression      │   │
│  │                     Human notification   MoveTaskToStep      │   │
│  │                                                              │   │
│  │  Infra layer: Delivery (ports & adapters)                    │   │
│  │  → réagit à TaskCompleted selon les connectors de la step    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Responsabilités par contexte

| Bounded Context | Responsabilité | Aggregates |
|---|---|---|
| **Workspace** | Gestion du workspace, projets, assignation de dossiers filesystem | Workspace, Project |
| **Workflow Design** | Step Catalog (création, config, fork, deux types) + Workflow Composition | AgentStep, HumanStep, Connector, Workflow, StepRef |
| **Agent Registry** | Configuration des agents, catalogues de tools et skills | Agent, Tool, Skill |
| **Execution Engine** | Runtime : orchestration des tasks, spawning d'agents, notification humains, MoveTaskToStep | Task, Deliverable, ContentEntry |
| **Delivery** *(pure infra)* | Réagit à TaskCompleted — publie deliverables et dispatche notifications via adapters | — (pas de domain model, juste des adapters) |

---

## Core Flow — Process Modeling

> Flux principal : du `WorkflowAssignedToProject` au `ProjectCompleted`.

```
USER                          SYSTEM                              HUMAN/AGENT
 │                              │                                      │
 │  AssignWorkflowToProject     │                                      │
 │─────────────────────────────>│                                      │
 │                              │                                      │
 │                    WorkflowAssignedToProject                        │
 │                              │                                      │
 │                    ┌─────────┴──────────┐                           │
 │                    │ Policy:            │                           │
 │                    │ For each step →    │                           │
 │                    │ CreateTask         │                           │
 │                    └─────────┬──────────┘                           │
 │                              │                                      │
 │                    TaskCreated (×N)                                  │
 │                              │                                      │
 │                    ┌─────────┴──────────┐                           │
 │                    │ Policy:            │                           │
 │                    │ Start first task   │                           │
 │                    └─────────┬──────────┘                           │
 │                              │                                      │
 │                    TaskStarted                                      │
 │                              │                                      │
 │              ┌───────────────┴───────────────┐                      │
 │              │                               │                      │
 │        [AgentStep]                     [HumanStep]                  │
 │              │                               │                      │
 │        SpawnAgent                      NotifyHuman                  │
 │              │                         (via connector)              │
 │        AgentSpawned ──────>│                 │                      │
 │              │    [Agent works]        HumanNotified                │
 │              │             │                 │                      │
 │              │ AgentProducedOutput      [Human works]               │
 │              │ DeliverableGenerated     ContentAddedToTask (×N)     │
 │              │             │           DeliverableGenerated (opt.)  │
 │              │             │                 │                      │
 │              │    Agent finished        MoveTaskToStep(target)      │
 │              │             │            ┌────┴────┐                 │
 │              │             │            │ avancer  │                 │
 │              │             │            │ reculer  │                 │
 │              │             │            │ autre    │                 │
 │              │             │            └────┬────┘                 │
 │              │             │                 │                      │
 │        TaskCompleted                   TaskCompleted                │
 │              │                               │                      │
 │    MoveTaskToStep(next)                TaskMovedToStep              │
 │       [auto par policy]                      │                      │
 │              │                               │                      │
 └──────────────┴───────────────────────────────┘                      │
                │                                                      │
      ┌─────────┴──────────────────────────────┐                       │
      │ TaskCompleted                          │                       │
      │                                        │                       │
      │ Infra: connectors de la step réagissent│                       │
      │ → publish deliverables (fs, slack...)  │                       │
      │ → dispatch notifications               │                       │
      │                                        │                       │
      │ Policy: MoveTaskToStep(target)         │                       │
      │ → StartTask (target step)              │                       │
      │ → back to TaskStarted ↑               │                       │
      │                                        │                       │
      │ Si dernière step et pas de move :      │                       │
      │ → ProjectCompleted (derived)           │                       │
      └────────────────────────────────────────┘                       │
```

---

## Design Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Step = template, Task = runtime instance** | Un même workflow peut tourner dans N projets simultanément. La step est la définition, la task est l'exécution. |
| 2 | **Filesystem-first pour les folders** | L'utilisateur choisit un dossier, le projet y stocke ses deliverables. Le workspace est le sandbox racine. |
| 3 | **Workflow partagé entre projets** | `WorkflowAssignedToProject` — modifier un workflow se répercute sur tous les projets liés. |
| 4 | **Project lifecycle = derived** | L'état du projet est calculé depuis l'état de ses tasks. |
| 5 | **Deliverable = port générique + plugins** | Chaque type (Markdown, code, vidéo...) est un plugin. Extensible à l'infini. |
| 6 | **Connectors = step-level** | Chaque step a ses propres connectors. Pas de connector global au workflow. Pour AgentStep c'est secondaire (notifications). Pour HumanStep c'est primaire (transport vers l'humain). |
| 7 | **Delivery = pure infra, pas du domaine** | Pas d'events domaine `DeliverablePublished` ou `NotificationDispatched`. L'infra (ports & adapters) réagit à `TaskCompleted` selon les connectors de la step. |
| 8 | **AgentStep vs HumanStep — symétrie** | AgentStep : config primaire = `agentId` (qui fait le travail). HumanStep : config primaire = `connector` (comment parler à l'humain). Même abstraction, question différente. |
| 9 | **Pas de `StepReady`** | L'agent finit → `TaskCompleted` directement. Pas d'état intermédiaire. Si on veut des checks de conformité plus tard, on ajoutera un event à ce moment-là. |
| 10 | **`MoveTaskToStep` = command unique** | Avancer et reculer sont le même command. L'humain peut bouger la task où il veut. Pour AgentStep, la policy fait `MoveTaskToStep(next)` automatiquement. |
| 11 | **Linear workflow only (v1)** | Séquentiel pour démarrer. Branches conditionnelles hors scope. |
| 12 | **Pas de swarm (v1)** | Un seul agent par step. L'orchestration multi-agents est reportée. |
| 13 | **Step Catalog avec fork** | Steps first-class dans un catalogue, lien vivant vers les workflows. Modifier propage partout. Pour personnaliser → fork. |
| 14 | **Events simplifiés — diff avant/après** | `StepConfigured` / `AgentUpdated` avec diff. Pas d'events granulaires. |
| 15 | **Tools & Skills = code-based + catalogue UI** | Base code-based (tools Pi, skills, extensions). Catalogue UI en surcouche. |
| 16 | **Runtime = Pi** | Agents Pi configurables. Direction long terme. |

---

## Hot Spots & Open Questions

### Résolus

| Hot Spot | Résolution |
|---|---|
| Qu'est-ce qu'un Agent ? | Config : nom, description, system prompt, modèle, tools, skills. Éphémère par exécution. |
| Swarm vs Agent solo ? | Agent solo pour v1. |
| Deliverable polymorphe ? | Plugin system avec port générique. |
| Workflow linéaire ? | Oui, linéaire pour v1. |
| Intégrations agentic vs automated ? | Les deux : tools (agent) + connectors (step-level). |
| Step Catalog model ? | Catalogue avec lien vivant. Pour personnaliser → fork. |
| Events granulaires vs simplifiés ? | Simplifiés : diff avant/après. |
| Validation = flag ou step ? | Step. AgentStep + HumanStep. |
| StepReady nécessaire ? | Non. Agent finit → TaskCompleted directement. |
| Advance vs Revert ? | Un seul command : `MoveTaskToStep`. L'humain bouge la task où il veut. |
| Delivery = domaine ou infra ? | Pure infra. Réagit à TaskCompleted via adapters. |
| Connectors = step ou workflow ? | Step-level. Chaque step définit ses propres connectors. |
| AgentStep config vs HumanStep config ? | Symétrie : AgentStep = agentId (qui), HumanStep = connector (comment). |

### Ouverts

| # | Hot Spot | Notes |
|---|---|---|
| 1 | **Agent Memory** | L'agent pourrait accumuler de la mémoire entre projets. Reporté à une version future. |
| 2 | **MoveTaskToStep — mécanique exacte** | Quand on bouge une task vers une step précédente (ou une step quelconque), que se passe-t-il avec les tasks intermédiaires ? Annulées ? Recréées ? Le métier doit-il restreindre les mouvements ? |
| 3 | **Modification de workflow en cours d'exécution** | Si un workflow est modifié pendant qu'un projet tourne ? Versionning ? Snapshot ? |
| 4 | **Deliverable type plugins — discovery** | Comment le système découvre les plugins ? Registry ? Convention ? |
| 5 | **Contexte agent — granularité** | Injecter les deliverables précédents dans le prompt ou laisser l'agent explorer le dossier ? |

### Roadmap de collaboration (hors scope v1, direction architecturale)

| Palier | Description |
|---|---|
| **v1 (actuel)** | Agent bosse seul → auto-complete → MoveTaskToStep(next). Pas de collaboration en cours de step. |
| **v2 — Human-in-the-loop** | L'agent peut demander un input humain pendant son travail (`CollaborationRequested`). Collaboration, pas validation. |
| **v3 — Agent-in-the-loop** | L'agent peut demander l'aide d'un autre agent. Même event, adapter différent. |
| **v4 — Swarm** | Conversation multi-agents dans une step. Orchestration complète. |

> **Note architecturale :** `CollaborationRequested` est un event générique. Le "répondant"
> peut être un humain ou un agent — c'est un adapter, pas un concept de domaine différent.
> L'architecture (ports & adapters) est déjà prête pour cette extension.
