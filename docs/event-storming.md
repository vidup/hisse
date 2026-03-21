# Event Storming — Hisse Platform

> Plateforme d'orchestration de workflows agentiques. Chaque projet suit un workflow
> composé de steps séquentielles, exécutées par des agents IA configurables, avec
> validation humaine optionnelle et livraison via adapters (filesystem, Slack, Miro...).

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
- Assigner un **agent IA** (avec tools et skills) à chaque step
- Exécuter ces workflows dans des **projets** liés à des dossiers du filesystem
- Obtenir des **deliverables** de n'importe quel type (markdown, code, vidéo, flashcards...)
- Intégrer une **validation humaine** optionnelle à chaque step
- **Publier les deliverables** via des adapters (filesystem local, Slack, Miro, etc.)

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

### Workflow Design

| Event | Description |
|---|---|
| `WorkflowCreated` | Un nouveau workflow est créé (nom, description) |
| `WorkflowUpdated` | Métadonnées du workflow modifiées |
| `StepAddedToWorkflow` | Une step est ajoutée au workflow |
| `StepConfigured` | La step est configurée (type de deliverable, human approval requise, etc.) |
| `StepReorderedInWorkflow` | L'ordre de la step change dans la séquence |
| `StepRemovedFromWorkflow` | Une step est retirée du workflow |

> **Note :** Le tracking atomique des steps (add/configure/reorder/remove) offre un
> undo/redo naturel via event sourcing. Alternative : traiter les steps comme état interne
> du workflow et ne persister que `WorkflowUpdated`. Décision à prendre.

### Agent Registry & Catalogs

| Event | Description |
|---|---|
| `ToolRegistered` | Un tool est ajouté au catalogue global |
| `ToolUpdated` | Un tool du catalogue est modifié |
| `SkillCreated` | Un skill est ajouté au catalogue global |
| `SkillUpdated` | Un skill du catalogue est modifié |
| `AgentCreated` | Un agent est créé (nom, description, system prompt, modèle) |
| `AgentUpdated` | La configuration de l'agent est modifiée |
| `ToolAddedToAgent` | Un tool du catalogue est assigné à l'agent |
| `ToolRemovedFromAgent` | Un tool est retiré de l'agent |
| `SkillAddedToAgent` | Un skill du catalogue est assigné à l'agent |
| `SkillRemovedFromAgent` | Un skill est retiré de l'agent |
| `AgentAssignedToStep` | Un agent est assigné à une step du workflow |
| `AgentRemovedFromStep` | Un agent est retiré d'une step |

### Step Connectors (intégrations au niveau step)

| Event | Description |
|---|---|
| `ConnectorAddedToStep` | Un connecteur est ajouté à une step (ex: Slack, Miro) |
| `ConnectorConfigured` | Le connecteur est configuré (cible: channel, board, etc.) |
| `ConnectorRemovedFromStep` | Un connecteur est retiré d'une step |

> **Distinction importante :** Les connectors sont des automatisations **platform-level**
> déclenchées à la complétion d'une step. Les intégrations **agent-level** (un agent qui
> appelle Slack pendant son travail) sont des **tools** dans le catalogue de l'agent.

### Task Execution (Runtime)

| Event | Description |
|---|---|
| `TaskCreated` | Une task est créée (instance d'exécution d'une step dans un projet) |
| `TaskStarted` | La task démarre — l'agent va être spawné |
| `AgentSpawned` | L'agent est lancé pour exécuter la task |
| `AgentProducedOutput` | L'agent a produit un output intermédiaire pendant son travail |
| `DeliverableGenerated` | Le deliverable final de la step est généré |
| `StepReady` | L'agent a terminé, les deliverables sont prêts — déclenche la suite |
| `TaskCompleted` | La task est terminée (après approval ou auto-complete) |
| `TaskRestarted` | La task est relancée (après rejet + décision humaine) |

### Human-in-the-loop (Review Gate)

| Event | Description |
|---|---|
| `HumanApprovalRequested` | L'approbation humaine est demandée pour un deliverable |
| `HumanInputRequested` | L'agent a besoin d'un input humain (question, clarification) |
| `ApprovalGranted` | Le deliverable est approuvé par l'humain |
| `DeliverableRejected` | Le deliverable est rejeté par l'humain |
| `RevisionRequested` | L'humain demande une révision avec des instructions spécifiques |
| `FeedbackProvided` | L'humain fournit du feedback/input demandé par l'agent |

### Delivery

| Event | Description |
|---|---|
| `DeliverablePublished` | Le deliverable est publié (event générique — les adapters décident où) |
| `NotificationDispatched` | Une notification est envoyée via un connector de step |

### Project Lifecycle (derived — pas de commands dédiés)

| Event | Description |
|---|---|
| `ProjectStarted` | **Dérivé** : au moins une task du projet est started |
| `ProjectCompleted` | **Dérivé** : toutes les tasks du projet sont completed |

---

## Commands

### Workspace & Projects

| Command | Triggered by |
|---|---|
| `CreateWorkspace` | User |
| `CreateProject` | User |
| `AssignProjectToFolder` | User (choisit un path filesystem) |
| `AssignWorkflowToProject` | User |

### Workflow Design

| Command | Triggered by |
|---|---|
| `CreateWorkflow` | User |
| `UpdateWorkflow` | User |
| `AddStepToWorkflow` | User |
| `ConfigureStep` | User |
| `ReorderStep` | User |
| `RemoveStep` | User |

### Agent Registry & Catalogs

| Command | Triggered by |
|---|---|
| `RegisterTool` | User / Admin |
| `UpdateTool` | User / Admin |
| `CreateSkill` | User / Admin |
| `UpdateSkill` | User / Admin |
| `CreateAgent` | User |
| `UpdateAgent` | User |
| `AddToolToAgent` | User |
| `RemoveToolFromAgent` | User |
| `AddSkillToAgent` | User |
| `RemoveSkillFromAgent` | User |
| `AssignAgentToStep` | User |
| `RemoveAgentFromStep` | User |

### Connectors

| Command | Triggered by |
|---|---|
| `AddConnectorToStep` | User |
| `ConfigureConnector` | User |
| `RemoveConnectorFromStep` | User |

### Task Execution

| Command | Triggered by |
|---|---|
| `CreateTask` | Policy (auto, from workflow assignment) |
| `StartTask` | Policy (auto, from workflow start or previous task completion) |
| `SpawnAgent` | Policy (auto, from task start) |
| `CompleteTask` | Policy (auto after approval or when no approval needed) |
| `RestartTask` | User (after rejection) |
| `RevertToStep` | User (after rejection — retourne à une step précédente) |

### Human-in-the-loop

| Command | Triggered by |
|---|---|
| `RequestHumanApproval` | Policy (auto, from step ready + approval required) |
| `RequestHumanInput` | Agent (pendant son travail) |
| `GrantApproval` | User |
| `RejectDeliverable` | User |
| `RequestRevision` | User (avec instructions) |
| `ProvideFeedback` | User (en réponse à input request) |

### Delivery

| Command | Triggered by |
|---|---|
| `PublishDeliverable` | Policy (auto, from task completion) |
| `DispatchNotification` | Policy (auto, from step ready/completed + connectors configured) |

---

## Policies

> Format : **Whenever** [Event], **then** [Command] *(condition optionnelle)*

| Policy | Event trigger | Command | Condition |
|---|---|---|---|
| Create tasks on assignment | `WorkflowAssignedToProject` | `CreateTask` (×N, une par step) | — |
| Start first task | All `TaskCreated` for project | `StartTask` (first step) | Toutes les tasks créées |
| Spawn agent on task start | `TaskStarted` | `SpawnAgent` | Step a un agent assigné |
| Auto-complete on step ready | `StepReady` | `CompleteTask` | Step **sans** human approval |
| Request approval on step ready | `StepReady` | `RequestHumanApproval` | Step **avec** human approval |
| Notify on approval request | `HumanApprovalRequested` | `DispatchNotification` | Step a des connectors configurés |
| Complete on approval | `ApprovalGranted` | `CompleteTask` | — |
| Advance to next step | `TaskCompleted` | `StartTask` (next) | Il existe une step suivante |
| Publish on completion | `TaskCompleted` | `PublishDeliverable` | — |
| Notify on completion | `TaskCompleted` | `DispatchNotification` | Step a des connectors configurés |

---

## Read Models

> Informations nécessaires pour prendre des décisions (humaines ou agent).

### Pour l'approbation humaine (HumanApprovalRequested)

- Contenu du deliverable
- Description et objectifs de la step
- Deliverables des steps précédentes (contexte)
- Brief / requirements du projet

### Pour le démarrage d'un projet

- Liste des workflows disponibles
- Détail d'un workflow (steps, agents assignés, config)
- Dossiers disponibles dans le workspace

### Pour la configuration d'un workflow

- Catalogue des agents disponibles
- Catalogue des tools
- Catalogue des skills
- Types de connectors disponibles

### Pour le suivi d'exécution

- État de chaque task (pending, started, ready, completed)
- Deliverables générés par step
- Historique des approvals/rejections
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
└── steps: Step[] (ordered)

Step
├── position: number
├── name: string
├── description: string
├── deliverableType: string (plugin)
├── humanApprovalRequired: boolean
├── agentId: reference
└── connectors: Connector[]

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
├── status: pending | started | ready | completed
├── deliverables: Deliverable[]
└── reviewHistory: ReviewEntry[]

Deliverable
├── type: string (from plugin)
├── content: any (opaque — géré par le plugin)
└── metadata: object

Connector
├── type: string (slack, miro, email...)
├── target: string (channel, board, address...)
└── configuration: object
```

---

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HISSE PLATFORM                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  WORKSPACE    │  │  WORKFLOW DESIGN  │  │   AGENT REGISTRY     │  │
│  │              │  │                  │  │                      │  │
│  │  Workspace   │  │  Workflow        │  │  Agent               │  │
│  │  Project     │  │  Step            │  │  Tool (catalog)      │  │
│  │  Folder mgmt │  │  Ordering        │  │  Skill (catalog)     │  │
│  │              │  │  Connectors      │  │  Composition         │  │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘  │
│         │                   │                        │              │
│         │    assigns        │    defines             │  provides    │
│         │    workflow       │    steps               │  agents      │
│         ▼                   ▼                        ▼              │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    EXECUTION ENGINE                          │   │
│  │                                                              │   │
│  │  Task lifecycle ─── Agent spawning ─── Step progression      │   │
│  │       │                                      │               │   │
│  │       ▼                                      ▼               │   │
│  │  ┌─────────────────┐              ┌────────────────────┐     │   │
│  │  │  REVIEW GATE    │              │  DELIVERY          │     │   │
│  │  │  (sous-domaine) │              │  (ports & adapters)│     │   │
│  │  │                 │              │                    │     │   │
│  │  │  Approval       │              │  Port: Publish     │     │   │
│  │  │  Input request  │              │  ├─ FS local       │     │   │
│  │  │  Rejection      │              │  ├─ Slack          │     │   │
│  │  │  Revision       │              │  ├─ Miro           │     │   │
│  │  │  Feedback       │              │  └─ ...            │     │   │
│  │  └─────────────────┘              └────────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Responsabilités par contexte

| Bounded Context | Responsabilité | Aggregates |
|---|---|---|
| **Workspace** | Gestion du workspace, projets, assignation de dossiers filesystem | Workspace, Project |
| **Workflow Design** | Création et configuration de workflows et steps | Workflow, Step, Connector |
| **Agent Registry** | Configuration des agents, catalogues de tools et skills | Agent, Tool, Skill |
| **Execution Engine** | Runtime : orchestration des tasks, spawning d'agents, progression entre steps | Task, Deliverable |
| **Review Gate** *(sous-domaine d'Execution)* | Validation humaine, approbation, rejet, feedback | ReviewEntry |
| **Delivery** *(infra — ports & adapters)* | Publication des deliverables via adapters configurables | — (infra, pas de domain model propre) |

---

## Core Flow — Process Modeling

> Flux principal : du `WorkflowAssignedToProject` au `ProjectCompleted`.
> Notation : Event → Policy → Command → Event

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
 │                    │ All tasks created →│                           │
 │                    │ StartTask (first)  │                           │
 │                    └─────────┬──────────┘                           │
 │                              │                                      │
 │                    TaskStarted                                      │
 │                              │                                      │
 │                    ┌─────────┴──────────┐                           │
 │                    │ Policy:            │                           │
 │                    │ Task started →     │                           │
 │                    │ SpawnAgent         │                           │
 │                    └─────────┬──────────┘                           │
 │                              │                                      │
 │                    AgentSpawned ─────────────────────────────────────>│
 │                              │                                      │
 │                              │                     [Agent travaille] │
 │                              │                                      │
 │                              │                  AgentProducedOutput  │
 │                              │<─────────────────────────────────────│
 │                              │                                      │
 │                              │                DeliverableGenerated   │
 │                              │<─────────────────────────────────────│
 │                              │                                      │
 │                              │                       StepReady       │
 │                              │<─────────────────────────────────────│
 │                              │                                      │
 │                    ┌─────────┴──────────────────┐                   │
 │                    │ Policy: StepReady           │                   │
 │                    │                            │                   │
 │                    │ IF human approval required  │                   │
 │                    │ → RequestHumanApproval      │                   │
 │                    │                            │                   │
 │                    │ IF NOT                      │                   │
 │                    │ → CompleteTask              │                   │
 │                    └─────────┬──────────────────┘                   │
 │                              │                                      │
 │              ┌───────────────┴───────────────┐                      │
 │              │                               │                      │
 │     [needs approval]                  [auto-complete]               │
 │              │                               │                      │
 │   HumanApprovalRequested            TaskCompleted ──────> (see below)
 │              │                                                      │
 │   ┌─────────┴──────────┐                                           │
 │   │ Policy:            │                                           │
 │   │ If connectors →    │                                           │
 │   │ DispatchNotif.     │                                           │
 │   └─────────┬──────────┘                                           │
 │              │                                                      │
 │   NotificationDispatched                                            │
 │              │                                                      │
 │<─────────── │ (User reçoit la notif)                                │
 │              │                                                      │
 │  [Reviews deliverable via Read Model]                               │
 │              │                                                      │
 │  ┌──────────┴──────────────────────────────┐                        │
 │  │                                         │                        │
 │  GrantApproval                    RejectDeliverable                 │
 │  │                                         │                        │
 │  ApprovalGranted                  DeliverableRejected               │
 │  │                                         │                        │
 │  ┌──────┴──────┐              ┌────────────┴────────────┐           │
 │  │ Policy:     │              │ Human decides:          │           │
 │  │ → Complete  │              │                         │           │
 │  │   Task      │              │  RestartTask            │           │
 │  └──────┬──────┘              │  RequestRevision        │           │
 │         │                     │  RevertToStep           │           │
 │  TaskCompleted                │  ProvideFeedback        │           │
 │         │                     └────────────┬────────────┘           │
 │         │                                  │                        │
 │         │                     TaskRestarted │                        │
 │         │                     (retour à TaskStarted)                │
 │         │                                                           │
 │         ▼                                                           │
 │  ┌──────────────────────────────────────┐                           │
 │  │ TaskCompleted                        │                           │
 │  │                                      │                           │
 │  │ Policy: PublishDeliverable           │                           │
 │  │ → DeliverablePublished               │                           │
 │  │   (adapters: fs, slack, miro...)     │                           │
 │  │                                      │                           │
 │  │ Policy: If connectors configured     │                           │
 │  │ → DispatchNotification               │                           │
 │  │                                      │                           │
 │  │ Policy: If next step exists          │                           │
 │  │ → StartTask (next step)              │                           │
 │  │ → back to TaskStarted ↑             │                           │
 │  │                                      │                           │
 │  │ Policy: If last step                 │                           │
 │  │ → ProjectCompleted (derived)         │                           │
 │  └──────────────────────────────────────┘                           │
```

---

## Design Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Step = template, Task = runtime instance** | Un même workflow peut tourner dans N projets simultanément. La step est la définition, la task est l'exécution. |
| 2 | **Filesystem-first pour les folders** | Pas besoin de réinventer le filesystem. L'utilisateur choisit un dossier, le projet y stocke ses deliverables. Le workspace est le sandbox racine. |
| 3 | **Workflow partagé entre projets** | `WorkflowAssignedToProject` — modifier un workflow se répercute sur tous les projets liés. Découple la définition de l'exécution. |
| 4 | **Project lifecycle = derived** | L'état du projet est calculé depuis l'état de ses tasks. Pas d'événements project-level autonomes. |
| 5 | **Deliverable = port générique + plugins** | Le domaine ne connaît pas le type concret du deliverable. Chaque type (Markdown, code, vidéo...) est un plugin qui implémente le port `Deliverable`. Extensible à l'infini. |
| 6 | **Deux niveaux d'intégration** | **Connectors** (platform-level) : automatisations déclenchées en fin de step. **Tools** (agent-level) : capacités données à l'agent pendant son travail. Un appel Slack par l'agent = tool. Un post Slack automatique en fin de step = connector. |
| 7 | **Delivery = ports & adapters** | `DeliverablePublished` est un event domaine. Où ça va (fs local, Slack, Miro) = adapters d'infrastructure. Même port, N adapters. |
| 8 | **Rejet = décision humaine** | Après un `DeliverableRejected`, c'est l'humain (ou l'agent-utilisateur) qui choisit l'action : restart, revision avec feedback, retour à une step précédente. Pas d'automatisme. |
| 9 | **Linear workflow only (v1)** | Séquentiel pour démarrer. Les branches conditionnelles et le parallélisme sont hors scope initial. |
| 10 | **Pas de swarm (v1)** | Un seul agent par step. L'orchestration multi-agents est un problème distinct, reporté. |

---

## Hot Spots & Open Questions

### Résolus

| Hot Spot | Résolution |
|---|---|
| Qu'est-ce qu'un Agent ? | Config : nom, description, system prompt, modèle, tools, skills. Éphémère par exécution. |
| Swarm vs Agent solo ? | Agent solo pour v1. |
| Deliverable polymorphe ? | Plugin system avec port générique. |
| Workflow linéaire ? | Oui, linéaire pour v1. |
| Intégrations agentic vs automated ? | Les deux : tools (agent) + connectors (platform). |

### Ouverts

| # | Hot Spot | Notes |
|---|---|---|
| 1 | **Tracking atomique des steps** | Faut-il persister chaque modification de step (add/remove/reorder) comme des events séparés pour avoir un undo/redo ? Ou traiter les steps comme état interne du workflow ? L'event sourcing des steps apporte de la valeur mais ajoute de la complexité. |
| 2 | **Agent Memory** | L'agent pourrait accumuler de la mémoire entre projets (préférences utilisateur, post-mortems). Comment modéliser ça ? Nouveau bounded context ? Extension de l'Agent aggregate ? Reporté à une version future. |
| 3 | **RevertToStep — mécanique exacte** | Quand l'humain décide de retourner à une step précédente après rejet, que se passe-t-il avec les tasks intermédiaires ? Sont-elles annulées ? Recréées ? Faut-il un état `reverted` ? |
| 4 | **Modification de workflow en cours d'exécution** | Si un workflow est modifié alors qu'un projet l'utilise, que se passe-t-il ? Versionning des workflows ? Snapshot au moment de l'assignation ? |
| 5 | **Deliverable type plugins — discovery** | Comment le système découvre-t-il les plugins de deliverable disponibles ? Registry ? Convention de nommage ? Config ? |
| 6 | **Contexte agent — granularité** | L'agent a accès au dossier du projet. Faut-il lui injecter explicitement les deliverables des steps précédentes dans son prompt, ou le laisser explorer le dossier ? |
| 7 | **HumanInputRequested — flow** | Quand l'agent demande un input humain en cours de travail (pas à la fin), comment ça se passe ? La task passe en `waiting_for_input` ? L'agent est suspendu ? |
