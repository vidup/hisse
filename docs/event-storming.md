# Event Storming — Hisse Platform

> Plateforme d'orchestration de workflows agentiques. Un workspace contient des catalogues
> partagés (steps, agents, tools, skills) et des teams. Chaque team définit son workflow
> (séquence de steps) et reçoit des tasks qui traversent ce workflow.

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

- Créer un **workspace** avec des catalogues partagés (steps, agents, tools, skills)
- Créer des **teams** avec chacune son workflow (séquence de steps, configuré une fois)
- Deux types de steps : **AgentStep** (agent IA fait le travail) et **HumanStep** (humain fait le travail)
- Ajouter des **tasks** dans une team — chaque task traverse le workflow de la team
- Obtenir des **deliverables** de n'importe quel type (markdown, code, vidéo, flashcards...)

La validation humaine n'est pas un flag caché — c'est une **HumanStep explicite** dans le
workflow. L'humain peut bouger la task vers n'importe quelle step (avancer ou reculer).

"Projet" est réservé pour plus tard — quand on voudra grouper les tasks entre elles (tags, epics).

Ce qui n'est **pas** dans le scope initial : swarms multi-agents, workflows non-linéaires
(branches conditionnelles), agent memory persistante, projets/epics.

---

## Domain Events

### Workspace & Teams

| Event                    | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `WorkspaceCreated`       | Le workspace racine est créé — dossier racine + catalogues partagés      |
| `TeamCreated`            | Une team est créée dans le workspace (nom, sous-dossier)                 |
| `StepAssignedToTeam`     | Une step du catalogue est ajoutée au workflow de la team (avec position) |
| `StepReorderedInTeam`    | L'ordre d'une step change dans le workflow de la team                    |
| `StepUnassignedFromTeam` | Une step est retirée du workflow de la team                              |

### Step Catalog

| Event            | Description                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `StepCreated`    | Une step est créée dans le catalogue (type: agent ou human, config complète)                      |
| `StepConfigured` | La config d'une step est modifiée (diff avant/après) — propage à toutes les teams qui l'utilisent |
| `StepForked`     | Une nouvelle step est créée à partir d'une existante (variante)                                   |

> **Step type = discriminated union extensible.** Chaque type définit : que se passe-t-il
> au start, pendant l'exécution, et qu'est-ce qui signale la complétion. L'Execution Engine
> dispatch vers la bonne stratégie selon le type (pattern Strategy).
>
> Types v1 :
>
> - **AgentStep** : config primaire = `agentId` (**qui** fait le travail). Auto-complete quand l'agent a fini.
> - **HumanStep** : config primaire = `connector` (**comment** parler à l'humain — Slack, email, app...).
>   L'humain travaille et bouge la task quand il est prêt.
>
> Types futurs envisagés : **SwarmStep** (multi-agents), **AutomationStep** (webhook/script), etc.

> **Modèle catalogue avec fork :** Les steps sont des entités first-class dans un catalogue
> au niveau workspace, référencées par les teams (lien vivant). Modifier propage partout.
> Pour une variante → fork.

> **Events simplifiés :** `StepCreated` porte la config initiale complète. `StepConfigured`
> porte la diff (avant/après). Pas d'events granulaires.

### Agent Registry & Catalogs

| Event            | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `ToolRegistered` | Un tool est ajouté au catalogue global du workspace         |
| `ToolUpdated`    | Un tool du catalogue est modifié                            |
| `SkillCreated`   | Un skill est ajouté au catalogue global du workspace        |
| `SkillUpdated`   | Un skill du catalogue est modifié                           |
| `AgentCreated`   | Un agent est créé (nom, description, system prompt, modèle) |
| `AgentUpdated`   | La configuration de l'agent est modifiée (diff avant/après) |

### Task Execution (Runtime)

| Event                  | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `TaskCreated`          | Une task est créée dans une team (dans le backlog, pas encore dans une step)          |
| `TaskMovedToStep`      | La task est déplacée vers une step (première step = start, ou n'importe quelle autre) |
| `AgentSpawned`         | L'agent est lancé pour travailler sur la task (AgentStep uniquement)                  |
| `AgentProducedOutput`  | L'agent a produit un output intermédiaire (AgentStep uniquement)                      |
| `HumanNotified`        | L'humain est notifié via le connector de la step (HumanStep uniquement)               |
| `ContentAddedToTask`   | L'humain a ajouté du contenu — fichier, commentaire, deliverable (HumanStep)          |
| `DeliverableGenerated` | Un deliverable est généré (par l'agent ou l'humain)                                   |
| `TaskCompleted`        | La task a terminé toutes les steps (ou est marquée comme terminée)                    |

> **Cycle de vie d'une task :** Créée dans le backlog → déplacée vers la step 1 (start) →
> traverse les steps → quand elle sort de la dernière step → TaskCompleted.
> L'humain peut la bouger où il veut. L'agent auto-avance à la step suivante.

> **`MoveTaskToStep` est générique.** Avancer et reculer sont le même event/command.
> La task accumule les deliverables au fur et à mesure de sa progression.

> **Delivery = pure infra.** Pas d'events domaine pour la publication/notification.
> L'infra réagit aux events (TaskMovedToStep, TaskCompleted) selon les connectors de la step.

### Team & Task Lifecycle (derived)

| Event           | Description                                                       |
| --------------- | ----------------------------------------------------------------- |
| `TeamStarted`   | **Dérivé** : au moins une task de la team est dans une step       |
| `TaskCompleted` | La task est terminée (sortie du workflow ou marquée manuellement) |

---

## Commands

### Workspace & Teams

| Command                | Triggered by                                    |
| ---------------------- | ----------------------------------------------- |
| `CreateWorkspace`      | User                                            |
| `CreateTeam`           | User (nom, sous-dossier)                        |
| `AssignStepToTeam`     | User (choisit une step du catalogue + position) |
| `ReorderStepInTeam`    | User                                            |
| `UnassignStepFromTeam` | User                                            |

### Step Catalog

| Command         | Triggered by                                            |
| --------------- | ------------------------------------------------------- |
| `CreateStep`    | User (choisit le type: agent ou human)                  |
| `ConfigureStep` | User (propage à toutes les teams — le système prévient) |
| `ForkStep`      | User (créer une variante)                               |

### Agent Registry & Catalogs

| Command        | Triggered by                                    |
| -------------- | ----------------------------------------------- |
| `RegisterTool` | User / Admin                                    |
| `UpdateTool`   | User / Admin                                    |
| `CreateSkill`  | User / Admin                                    |
| `UpdateSkill`  | User / Admin                                    |
| `CreateAgent`  | User                                            |
| `UpdateAgent`  | User (diff avant/après — tools, skills, config) |

### Task Execution

| Command            | Triggered by                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `CreateTask`       | User (crée une task dans le backlog de la team)                           |
| `MoveTaskToStep`   | User (HumanStep) ou Policy (AgentStep → auto next)                        |
| `SpawnAgent`       | Policy (auto, quand task arrive sur une AgentStep)                        |
| `NotifyHuman`      | Policy (auto, quand task arrive sur une HumanStep, via step connector)    |
| `AddContentToTask` | User (ajoute fichier, commentaire, deliverable — HumanStep)               |
| `CompleteTask`     | Policy (auto, quand task sort de la dernière step) ou User (manuellement) |

---

## Policies

> Format : **Whenever** [Event], **then** [Command] _(condition optionnelle)_

| Policy               | Event trigger                       | Command                                        | Condition                            |
| -------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------ |
| Spawn agent          | `TaskMovedToStep`                   | `SpawnAgent`                                   | Step est un **AgentStep**            |
| Notify human         | `TaskMovedToStep`                   | `NotifyHuman` (via step connector)             | Step est un **HumanStep**            |
| Auto-advance agent   | Agent finished                      | `MoveTaskToStep(next)`                         | Step est un **AgentStep**            |
| Move on human action | User `MoveTaskToStep`               | — (direct)                                     | Step est un **HumanStep**            |
| Auto-complete        | `MoveTaskToStep`                    | `CompleteTask`                                 | Pas de step suivante (dernière step) |
| Infra: delivery      | `TaskMovedToStep` / `TaskCompleted` | _(infra)_ adapters réagissent selon connectors | Connectors configurés                |

---

## Read Models

> Informations nécessaires pour prendre des décisions (humaines ou agent).

### Pour une HumanStep (quand c'est le tour de l'humain)

- Deliverables accumulés par la task (contexte de travail)
- Description et objectifs de la step courante
- Contenu ajouté à la task (fichiers, commentaires)
- Liste des steps de la team (pour savoir où bouger la task)

### Pour la création d'une task

- Liste des teams disponibles dans le workspace
- Workflow de chaque team (steps, types)

### Pour la configuration d'une team

- Catalogue des steps disponibles (avec leur type, config, agent/connector)
- Catalogue des agents disponibles
- Catalogue des tools
- Catalogue des skills
- Types de connectors disponibles
- Nombre de teams utilisant chaque step (pour informer avant modification/fork)

### Pour le suivi d'exécution

- Tasks de la team avec leur step courante (vue Kanban)
- Type de la step courante (agent ou human — pour savoir qui travaille)
- Deliverables accumulés par task
- Contenu ajouté par les humains

---

## Aggregates

```
Workspace
├── workspacePath: string
├── catalogs: steps, agents, tools, skills (shared)

Team
├── name: string
├── folderPath: string (sous-dossier dans le workspace)
├── stepRefs: StepRef[] (ordered — le workflow de la team)
└── tasks: Task[]

StepRef (value object in Team)
├── stepId: reference (to Step catalog)
└── position: number

AgentStep (catalog, workspace-level)
├── type: 'agent'
├── name: string
├── description: string
├── deliverableType: string (plugin)
├── agentId: reference (required — qui fait le travail)
├── connectors: Connector[] (optionnel — notifications post-completion)
└── forkedFromId: reference?

HumanStep (catalog, workspace-level)
├── type: 'human'
├── name: string
├── description: string
├── deliverableType: string? (optional)
├── connectors: Transport[] (au moins in-app par défaut, + transports additionnels)
└── forkedFromId: reference?

Agent (catalog, workspace-level)
├── name: string
├── description: string
├── systemPrompt: string
├── model: string
├── tools: ToolReference[]
└── skills: SkillReference[]

Tool (catalog, workspace-level)
├── name: string
├── description: string
└── configuration: object

Skill (catalog, workspace-level)
├── name: string
├── description: string
└── configuration: object

Task (runtime, team-level)
├── teamId: reference
├── currentStepId: reference? (null = backlog)
├── status: backlog | in_progress | completed
├── deliverables: Deliverable[] (accumulés au fil des steps)
└── content: ContentEntry[] (fichiers, commentaires)

Deliverable
├── type: string (from plugin)
├── content: any (opaque — géré par le plugin)
├── stepId: reference (à quelle step ce deliverable a été produit)
└── metadata: object

Transport (catalog, workspace-level)
├── type: string (slack, miro, email, app...)
├── target: string (channel, board, address...)
├── configuration: object
└── authenticated: boolean

ContentEntry
├── addedBy: string (userId)
├── type: string (file, comment, deliverable)
├── content: any
└── addedAt: timestamp
```

> **Symétrie step types :**
>
> - AgentStep : `agentId` (required) = **qui** fait le travail. Connectors optionnels.
> - HumanStep : `connectors[]` = **comment** parler à l'humain. In-app par défaut + transports additionnels.
>
> **Transports = catalogue workspace-level.** Les transports (Slack, email, Miro...) sont
> authentifiés une fois au niveau workspace, puis assignés aux HumanSteps. Le transport "app"
> (in-app) est toujours présent par défaut.

> **Catalogues = workspace-level.** Tous les catalogues (steps, agents, tools, skills) sont
> partagés entre toutes les teams du workspace. Une équipe plateforme peut créer des steps
> et tools que les autres teams utilisent.

---

## Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HISSE PLATFORM                             │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    WORKSPACE                                  │   │
│  │                                                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │   │
│  │  │ Step Catalog  │  │ Agent        │  │ Tool & Skill     │   │   │
│  │  │ (Agent/Human) │  │ Registry     │  │ Catalogs         │   │   │
│  │  │ + fork        │  │              │  │                  │   │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────┘   │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ provides catalogs                     │
│                             ▼                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    TEAM & EXECUTION                           │   │
│  │                                                              │   │
│  │  Team (workflow = step sequence)                              │   │
│  │  Task lifecycle ─── Agent spawning ─── MoveTaskToStep        │   │
│  │                     Human notification                       │   │
│  │                                                              │   │
│  │  Infra: Delivery (ports & adapters)                          │   │
│  │  → réagit aux events selon les connectors                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Responsabilités par contexte

| Bounded Context             | Responsabilité                                                                | Aggregates                                                     |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Workspace**               | Workspace, catalogues partagés (steps, agents, tools, skills)                 | Workspace, AgentStep, HumanStep, Agent, Tool, Skill, Connector |
| **Team & Execution**        | Teams, workflows (step sequences), tasks, runtime                             | Team, StepRef, Task, Deliverable, ContentEntry                 |
| **Delivery** _(pure infra)_ | Réagit aux events — publie deliverables, dispatche notifications via adapters | — (pas de domain model)                                        |

---

## Core Flow — Process Modeling

> Flux principal : de la création d'une task à sa complétion.

```
USER                          SYSTEM                              HUMAN/AGENT
 │                              │                                      │
 │  CreateTask (dans team)      │                                      │
 │─────────────────────────────>│                                      │
 │                              │                                      │
 │                    TaskCreated (backlog)                             │
 │                              │                                      │
 │  MoveTaskToStep (step 1)     │                                      │
 │─────────────────────────────>│                                      │
 │                              │                                      │
 │                    TaskMovedToStep                                   │
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
 │    MoveTaskToStep(next)              TaskMovedToStep                │
 │       [auto par policy]                      │                      │
 │              │                               │                      │
 └──────────────┴───────────────────────────────┘                      │
                │                                                      │
      ┌─────────┴──────────────────────────────┐                       │
      │ TaskMovedToStep                        │                       │
      │                                        │                       │
      │ Infra: connectors de la step réagissent│                       │
      │                                        │                       │
      │ Si step existe → back to branching ↑   │                       │
      │                                        │                       │
      │ Si dernière step :                     │                       │
      │ → TaskCompleted                        │                       │
      └────────────────────────────────────────┘                       │
```

---

## Design Decisions

| #   | Decision                                             | Rationale                                                                                                                                                                    |
| --- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Workspace = catalogues partagés**                  | Les catalogues (steps, agents, tools, skills) sont au niveau workspace. Partagés entre toutes les teams. Une équipe plateforme peut créer des ressources utilisées par tous. |
| 2   | **Team = workflow**                                  | Chaque team a son workflow (séquence de steps). Configuré une fois, utilisé par toutes les tasks de la team. Remplace "Project" + "Workflow" par une seule entité.           |
| 3   | **Task = unité de travail qui traverse le workflow** | Une task est créée dans le backlog, puis traverse les steps. Elle accumule deliverables et contenu. Pas de création de N tasks à l'avance.                                   |
| 4   | **Pas de "Projet" (v1)**                             | "Projet" est réservé pour plus tard (groupement de tasks, tags, epics). Pour v1, on a juste des tasks dans des teams.                                                        |
| 5   | **Filesystem-first**                                 | Workspace = dossier racine. Team = sous-dossier. Les deliverables sont stockés dans le filesystem.                                                                           |
| 6   | **Step type = discriminated union extensible**       | AgentStep, HumanStep aujourd'hui. SwarmStep, AutomationStep demain. Pattern Strategy.                                                                                        |
| 7   | **AgentStep vs HumanStep — symétrie**                | AgentStep : `agentId` = qui. HumanStep : `connector` = comment.                                                                                                              |
| 8   | **Connectors = step-level**                          | Chaque step a ses propres connectors.                                                                                                                                        |
| 9   | **Delivery = pure infra**                            | L'infra réagit aux events selon les connectors. Pas d'events domaine.                                                                                                        |
| 10  | **Pas de StepReady**                                 | Agent finit → auto MoveTaskToStep(next).                                                                                                                                     |
| 11  | **MoveTaskToStep = command unique**                  | Avancer et reculer sont le même command.                                                                                                                                     |
| 12  | **Step Catalog avec fork**                           | Steps first-class, lien vivant, fork pour personnaliser.                                                                                                                     |
| 13  | **Events simplifiés**                                | StepConfigured / AgentUpdated avec diff avant/après.                                                                                                                         |
| 14  | **Tools & Skills = code-based + catalogue UI**       | Base code-based (Pi). UI en surcouche.                                                                                                                                       |
| 15  | **Runtime = Pi**                                     | Agents Pi configurables.                                                                                                                                                     |

---

## Hot Spots & Open Questions

### Résolus

| Hot Spot                               | Résolution                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Qu'est-ce qu'un Agent ?                | Config éphémère par exécution.                                                          |
| Swarm vs Agent solo ?                  | Agent solo pour v1.                                                                     |
| Deliverable polymorphe ?               | Plugin system.                                                                          |
| Workflow linéaire ?                    | Oui pour v1.                                                                            |
| Intégrations agentic vs automated ?    | Tools (agent) + connectors (step-level).                                                |
| Step Catalog model ?                   | Catalogue avec fork.                                                                    |
| Events granulaires vs simplifiés ?     | Simplifiés : diff avant/après.                                                          |
| Validation = flag ou step ?            | HumanStep explicite.                                                                    |
| StepReady nécessaire ?                 | Non.                                                                                    |
| Advance vs Revert ?                    | MoveTaskToStep unique.                                                                  |
| Delivery = domaine ou infra ?          | Pure infra.                                                                             |
| Connectors = step ou workflow ?        | Step-level.                                                                             |
| AgentStep config vs HumanStep config ? | Symétrie agentId/connector.                                                             |
| Workflow = entité séparée ?            | Non. La team porte directement sa séquence de steps. Pas d'entité Workflow.             |
| Project = bonne abstraction ?          | Non pour v1. Renommé en "Team". "Projet" réservé pour le groupement futur (epics/tags). |

### Ouverts

| #   | Hot Spot                                   | Notes                                                                                                                                 |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Agent Memory**                           | L'agent pourrait accumuler de la mémoire entre tasks. Reporté.                                                                        |
| 2   | **MoveTaskToStep — mécanique exacte**      | Quand on bouge une task, que se passe-t-il avec les deliverables des steps "sautées" ? Le métier doit-il restreindre les mouvements ? |
| 3   | **Modification de team workflow en cours** | Si on modifie le workflow d'une team alors que des tasks sont en cours ?                                                              |
| 4   | **Deliverable type plugins — discovery**   | Comment le système découvre les plugins ?                                                                                             |
| 5   | **Contexte agent — granularité**           | Injecter les deliverables précédents dans le prompt ou laisser l'agent explorer le dossier ?                                          |

### Roadmap de collaboration (hors scope v1, direction architecturale)

| Palier                     | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| **v1 (actuel)**            | Agent bosse seul → auto MoveTaskToStep(next).                                   |
| **v2 — Human-in-the-loop** | `CollaborationRequested` — l'agent demande un input humain pendant son travail. |
| **v3 — Agent-in-the-loop** | Même event, adapter différent.                                                  |
| **v4 — Swarm**             | Conversation multi-agents dans une step.                                        |

> **Note architecturale :** `CollaborationRequested` est un event générique.
> Le "répondant" peut être un humain ou un agent — c'est un adapter.
