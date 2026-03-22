# Event Storming — Hisse Platform

> Plateforme d'orchestration de workflows agentiques. Un workspace contient des catalogues
> partagés (steps, agents, tools, skills, workflows) et des teams. Chaque team a son dossier
> et ses projets. Chaque projet est associé à un workflow et contient des tasks qui le traversent.

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

- Créer un **workspace** avec des catalogues partagés (steps, agents, tools, skills, workflows)
- Créer des **workflows** réutilisables (séquences de steps) au niveau catalogue
- Créer des **teams** avec chacune son dossier et son historique
- Créer des **projets** dans une team — chaque projet est associé à un workflow
- Ajouter des **tasks** dans un projet — chaque task traverse le workflow du projet
- Obtenir des **deliverables** de n'importe quel type (markdown, code, vidéo, flashcards...)
- **Chatter** avec un agent dans le contexte d'un workspace, d'un projet ou d'une task

La validation humaine n'est pas un flag caché — c'est une **HumanStep explicite** dans le
workflow. L'humain peut bouger la task vers n'importe quelle step (avancer ou reculer).

Ce qui n'est **pas** dans le scope initial : swarms multi-agents, workflows non-linéaires
(branches conditionnelles), agent memory persistante.

---

## Domain Events

### Workspace & Teams

| Event              | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `WorkspaceCreated` | Le workspace racine est créé — dossier racine + catalogues partagés |
| `TeamCreated`      | Une team est créée dans le workspace (nom, dossier dédié)           |

### Workflow Catalog

| Event             | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `WorkflowCreated` | Un workflow est créé dans le catalogue (nom, description, séquence de steps) |
| `WorkflowUpdated` | La séquence de steps d'un workflow est modifiée                              |

> **Workflow = entité first-class dans le catalogue.** Comme les steps, agents et skills,
> les workflows vivent au niveau workspace. Plusieurs projets (de teams différentes) peuvent
> utiliser le même workflow. Modifier un workflow impacte les futurs projets qui l'utilisent.
> Les projets en cours gardent le workflow tel qu'il était au moment de l'association.

### Step Catalog

| Event            | Description                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| `StepCreated`    | Une step est créée dans le catalogue (type: agent ou human, config complète)                        |
| `StepConfigured` | La config d'une step est modifiée (diff avant/après) — propage à tous les workflows qui l'utilisent |
| `StepForked`     | Une nouvelle step est créée à partir d'une existante (variante)                                     |

> **Step type = discriminated union extensible.** Chaque type définit : que se passe-t-il
> au start, pendant l'exécution, et qu'est-ce qui signale la complétion. L'Execution Engine
> dispatch vers la bonne stratégie selon le type (pattern Strategy).
>
> Types v1 :
>
> - **AgentStep** : config primaire = `agentId` (**qui** fait le travail). Auto-complete quand l'agent a fini.
> - **HumanStep** : config primaire = `transports[]` (**comment** parler à l'humain — local, Slack, email...).
>   L'humain travaille et bouge la task quand il est prêt.
>
> Types futurs envisagés : **SwarmStep** (multi-agents), **AutomationStep** (webhook/script), etc.

> **Modèle catalogue avec fork :** Les steps sont des entités first-class dans un catalogue
> au niveau workspace, référencées par les workflows (lien vivant). Modifier propage partout.
> Pour une variante → fork.

### Agent Registry & Catalogs

| Event            | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `ToolRegistered` | Un tool est ajouté au catalogue global du workspace         |
| `ToolUpdated`    | Un tool du catalogue est modifié                            |
| `SkillCreated`   | Un skill est ajouté au catalogue global du workspace        |
| `SkillUpdated`   | Un skill du catalogue est modifié                           |
| `AgentCreated`   | Un agent est créé (nom, description, system prompt, modèle) |
| `AgentUpdated`   | La configuration de l'agent est modifiée (diff avant/après) |

### Project Lifecycle

| Event            | Description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `ProjectCreated` | Un projet est créé dans une team (nom, description, référence à un workflow) |
| `ProjectStarted` | **Dérivé** : au moins une task du projet est dans une step                   |

> **Projet = conteneur de tasks dans une team.** Un projet est toujours associé à un
> workflow. Exemples : "Bug Bounty Q1" (workflow: Execute Direct), "Feature Auth"
> (workflow: Plan → Spec → Execute → Review). Un projet long-court comme "Bug Bounty"
> peut accumuler des tasks au fil du temps.

### Task Execution (Runtime)

| Event                  | Description                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `TaskCreated`          | Une task est créée dans un projet (dans le backlog, pas encore dans une step)         |
| `TaskMovedToStep`      | La task est déplacée vers une step (première step = start, ou n'importe quelle autre) |
| `AgentSpawned`         | L'agent est lancé pour travailler sur la task (AgentStep uniquement)                  |
| `AgentProducedOutput`  | L'agent a produit un output intermédiaire (AgentStep uniquement)                      |
| `HumanNotified`        | L'humain est notifié via le transport de la step (HumanStep uniquement)               |
| `ContentAddedToTask`   | L'humain a ajouté du contenu — fichier, commentaire, deliverable (HumanStep)          |
| `DeliverableGenerated` | Un deliverable est généré (par l'agent ou l'humain)                                   |
| `TaskCompleted`        | La task a terminé toutes les steps (ou est marquée comme terminée)                    |

> **Cycle de vie d'une task :** Créée dans le backlog du projet → déplacée vers la step 1
> (start) → traverse les steps du workflow du projet → quand elle sort de la dernière step
> → TaskCompleted. L'humain peut la bouger où il veut. L'agent auto-avance à la step suivante.

> **`MoveTaskToStep` est générique.** Avancer et reculer sont le même event/command.
> La task accumule les deliverables au fur et à mesure de sa progression.

> **Delivery = pure infra.** Pas d'events domaine pour la publication/notification.
> L'infra réagit aux events (TaskMovedToStep, TaskCompleted) selon les transports de la step.

---

## Commands

### Workspace & Teams

| Command           | Triggered by        |
| ----------------- | ------------------- |
| `CreateWorkspace` | User                |
| `CreateTeam`      | User (nom, dossier) |

### Workflow Catalog

| Command          | Triggered by                               |
| ---------------- | ------------------------------------------ |
| `CreateWorkflow` | User (nom, description, séquence de steps) |
| `UpdateWorkflow` | User (modifier la séquence de steps)       |

### Step Catalog

| Command         | Triggered by                           |
| --------------- | -------------------------------------- |
| `CreateStep`    | User (choisit le type: agent ou human) |
| `ConfigureStep` | User (propage — le système prévient)   |
| `ForkStep`      | User (créer une variante)              |

### Agent Registry & Catalogs

| Command        | Triggered by                                    |
| -------------- | ----------------------------------------------- |
| `RegisterTool` | User / Admin                                    |
| `UpdateTool`   | User / Admin                                    |
| `CreateSkill`  | User / Admin                                    |
| `UpdateSkill`  | User / Admin                                    |
| `CreateAgent`  | User                                            |
| `UpdateAgent`  | User (diff avant/après — tools, skills, config) |

### Project & Task Execution

| Command            | Triggered by                                                              |
| ------------------ | ------------------------------------------------------------------------- |
| `CreateProject`    | User (nom, description, team, workflow)                                   |
| `CreateTask`       | User (crée une task dans le backlog du projet)                            |
| `MoveTaskToStep`   | User (HumanStep) ou Policy (AgentStep → auto next)                        |
| `SpawnAgent`       | Policy (auto, quand task arrive sur une AgentStep)                        |
| `NotifyHuman`      | Policy (auto, quand task arrive sur une HumanStep, via transports)        |
| `AddContentToTask` | User (ajoute fichier, commentaire, deliverable — HumanStep)               |
| `CompleteTask`     | Policy (auto, quand task sort de la dernière step) ou User (manuellement) |

---

## Policies

> Format : **Whenever** [Event], **then** [Command] _(condition optionnelle)_

| Policy               | Event trigger                       | Command                                        | Condition                            |
| -------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------ |
| Spawn agent          | `TaskMovedToStep`                   | `SpawnAgent`                                   | Step est un **AgentStep**            |
| Notify human         | `TaskMovedToStep`                   | `NotifyHuman` (via transports)                 | Step est un **HumanStep**            |
| Auto-advance agent   | Agent finished                      | `MoveTaskToStep(next)`                         | Step est un **AgentStep**            |
| Move on human action | User `MoveTaskToStep`               | — (direct)                                     | Step est un **HumanStep**            |
| Auto-complete        | `MoveTaskToStep`                    | `CompleteTask`                                 | Pas de step suivante (dernière step) |
| Infra: delivery      | `TaskMovedToStep` / `TaskCompleted` | _(infra)_ adapters réagissent selon transports | Transports configurés                |

---

## Read Models

> Informations nécessaires pour prendre des décisions (humaines ou agent).

### Pour une HumanStep (quand c'est le tour de l'humain)

- Deliverables accumulés par la task (contexte de travail)
- Description et objectifs de la step courante
- Contenu ajouté à la task (fichiers, commentaires)
- Liste des steps du workflow du projet (pour savoir où bouger la task)

### Pour la création d'un projet

- Liste des teams disponibles dans le workspace
- Catalogue des workflows disponibles (avec leur séquence de steps)

### Pour la création d'une task

- Liste des projets de la team
- Workflow associé au projet

### Pour la configuration d'un workflow

- Catalogue des steps disponibles (avec leur type, config, agent/transport)
- Catalogue des agents disponibles
- Catalogue des tools
- Catalogue des skills
- Types de transports disponibles

### Pour le suivi d'exécution

- Tasks du projet avec leur step courante (vue Kanban)
- Type de la step courante (agent ou human — pour savoir qui travaille)
- Deliverables accumulés par task
- Contenu ajouté par les humains

### Pour le chat avec un agent

- Workspace courant (contexte global)
- Projet courant (contexte spécifique, workflow en cours)
- Task courante (optionnel — contexte encore plus précis)
- Skills et tools de l'agent

---

## Aggregates

```
Workspace
├── workspacePath: string
├── catalogs: steps, agents, tools, skills, workflows (shared)

Team
├── name: string
├── folderPath: string (dossier dédié dans le workspace)
├── projects: Project[]

Project
├── name: string
├── description: string
├── teamId: reference
├── workflowId: reference (to Workflow catalog)
├── status: active | archived
├── tasks: Task[]

Workflow (catalog, workspace-level)
├── name: string
├── description: string
├── stepRefs: StepRef[] (ordered — la séquence de steps)

StepRef (value object in Workflow)
├── stepId: reference (to Step catalog)
└── position: number

AgentStep (catalog, workspace-level)
├── type: 'agent'
├── name: string
├── description: string
├── deliverableType: string (plugin)
├── agentId: reference (required — qui fait le travail)
├── transports: Transport[] (optionnel — notifications post-completion)
└── forkedFromId: reference?

HumanStep (catalog, workspace-level)
├── type: 'human'
├── name: string
├── description: string
├── deliverableType: string? (optional)
├── transports: Transport[] (au moins local par défaut)
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
└── content: string (SKILL.md — terme: filesystem à terme)

Task (runtime, project-level)
├── projectId: reference
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
├── type: string (local, slack, miro, email...)
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
> - AgentStep : `agentId` (required) = **qui** fait le travail. Transports optionnels.
> - HumanStep : `transports[]` = **comment** parler à l'humain. Local par défaut + transports additionnels.

> **Transports = catalogue workspace-level.** Les transports (Slack, email, Miro...) sont
> authentifiés une fois au niveau workspace, puis assignés aux steps. Le transport "local"
> (in-app) est toujours présent par défaut.

> **Catalogues = workspace-level.** Tous les catalogues (steps, agents, tools, skills, workflows)
> sont partagés entre toutes les teams du workspace. Une équipe plateforme peut créer des
> ressources utilisées par toutes les teams.

> **Workspace = un dossier qu'on ouvre, pas un objet qu'on crée.** Le workspace est un
> dossier sur le filesystem. Quand on lance l'app, on pointe vers ce dossier. Tout ce
> qu'il contient (skills, tools, agents, teams, projets) est découvert par convention
> de structure de dossier, pas stocké dans une base externe. Le workspace c'est le
> filesystem lui-même. L'app peut garder une référence locale au workspace courant,
> mais le workspace n'est pas un aggregate persisté — c'est un point d'entrée.
>
> **Cible : tout est file-based.** Skills = dossiers (SKILL.md + rules + assets).
> Tools = dossiers. Teams = sous-dossiers. Projets = sous-dossiers dans les teams.
> La persistence JSONL actuelle est transitoire — à terme, la structure de dossier
> EST la source de vérité, et l'app ne fait que la scanner et la manipuler.

> **Workflow ≠ Team.** Un workflow est un pattern de travail réutilisable. Une team est un
> contexte organisationnel avec un dossier. Un projet fait le lien entre les deux : il
> appartient à une team et utilise un workflow.

---

## Bounded Contexts

```
┌───────────────────────────────────────────────────────────────────────┐
│                          HISSE PLATFORM                               │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    WORKSPACE (Catalogues)                       │   │
│  │                                                                │   │
│  │  ┌──────────────┐  ┌──────────┐  ┌──────────────────┐         │   │
│  │  │ Step Catalog  │  │ Agent    │  │ Tool & Skill     │         │   │
│  │  │ (Agent/Human) │  │ Registry │  │ Catalogs         │         │   │
│  │  └──────────────┘  └──────────┘  └──────────────────┘         │   │
│  │                                                                │   │
│  │  ┌──────────────────┐                                          │   │
│  │  │ Workflow Catalog  │ ← NEW: séquences de steps réutilisables │   │
│  │  └──────────────────┘                                          │   │
│  └──────────────────────────┬─────────────────────────────────────┘   │
│                             │ provides catalogs                       │
│                             ▼                                         │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    TEAM & PROJECT & EXECUTION                   │   │
│  │                                                                │   │
│  │  Team (folder, historique)                                      │   │
│  │  └── Project (workflow ref, tasks)                              │   │
│  │       └── Task lifecycle ── Agent spawning ── MoveTaskToStep    │   │
│  │                             Human notification                  │   │
│  │                                                                │   │
│  │  Infra: Delivery (ports & adapters)                             │   │
│  │  → réagit aux events selon les transports                       │   │
│  └────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────┘
```

### Responsabilités par contexte

| Bounded Context             | Responsabilité                                                                | Aggregates                                                               |
| --------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Workspace**               | Workspace, catalogues partagés (steps, agents, tools, skills, workflows)      | Workspace, AgentStep, HumanStep, Agent, Tool, Skill, Workflow, Transport |
| **Team & Project**          | Teams, projets, tasks, exécution runtime                                      | Team, Project, Task, Deliverable, ContentEntry                           |
| **Delivery** _(pure infra)_ | Réagit aux events — publie deliverables, dispatche notifications via adapters | — (pas de domain model)                                                  |

---

## Core Flow — Process Modeling

> Flux principal : de la création d'un projet à la complétion d'une task.

```
USER                          SYSTEM                              HUMAN/AGENT
 │                              │                                      │
 │  CreateProject               │                                      │
 │  (team, workflow)            │                                      │
 │─────────────────────────────>│                                      │
 │                              │                                      │
 │                    ProjectCreated                                    │
 │                              │                                      │
 │  CreateTask (dans projet)    │                                      │
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
 │              │                         (via transport)              │
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
      │ Infra: transports de la step réagissent│                       │
      │                                        │                       │
      │ Si step existe → back to branching ↑   │                       │
      │                                        │                       │
      │ Si dernière step :                     │                       │
      │ → TaskCompleted                        │                       │
      └────────────────────────────────────────┘                       │
```

---

## Design Decisions

| #   | Decision                                              | Rationale                                                                                                                                                                                 |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Workspace = catalogues partagés**                   | Les catalogues (steps, agents, tools, skills, workflows) sont au niveau workspace. Partagés entre toutes les teams.                                                                       |
| 2   | **Workflow = entité catalogue séparée**               | Un workflow est un pattern de travail réutilisable (séquence de steps). Vit dans le catalogue global, pas dans une team. Plusieurs projets de teams différentes peuvent utiliser le même. |
| 3   | **Team = contexte organisationnel + dossier**         | Une team a un dossier dédié et des projets. Elle ne porte plus de workflow — c'est le projet qui fait le lien avec un workflow.                                                           |
| 4   | **Project = conteneur de tasks + référence workflow** | Un projet appartient à une team, est associé à un workflow, et contient des tasks. Exemples : "Bug Bounty" (long-court), "Feature Auth" (ponctuel).                                       |
| 5   | **Task = unité atomique dans un projet**              | Une task traverse le workflow du projet. Elle accumule deliverables et contenu. Toute task a un projet (pas de tasks orphelines).                                                         |
| 6   | **Filesystem-first**                                  | Workspace = dossier racine. Team = sous-dossier. Skills = dossiers avec SKILL.md (à terme). Deliverables stockés sur le filesystem.                                                       |
| 7   | **Step type = discriminated union extensible**        | AgentStep, HumanStep aujourd'hui. SwarmStep, AutomationStep demain. Pattern Strategy.                                                                                                     |
| 8   | **AgentStep vs HumanStep — symétrie**                 | AgentStep : `agentId` = qui. HumanStep : `transports` = comment.                                                                                                                          |
| 9   | **Transports = step-level**                           | Chaque step a ses propres transports. Local par défaut.                                                                                                                                   |
| 10  | **Delivery = pure infra**                             | L'infra réagit aux events selon les transports. Pas d'events domaine.                                                                                                                     |
| 11  | **MoveTaskToStep = command unique**                   | Avancer et reculer sont le même command.                                                                                                                                                  |
| 12  | **Step Catalog avec fork**                            | Steps first-class, lien vivant, fork pour personnaliser.                                                                                                                                  |
| 13  | **Events simplifiés**                                 | StepConfigured / AgentUpdated avec diff avant/après.                                                                                                                                      |
| 14  | **Skills = filesystem à terme**                       | Aujourd'hui JSONL, à terme dossiers sur le filesystem (SKILL.md + rules + assets). L'app scanne le dossier.                                                                               |
| 15  | **Chat = contextualisé**                              | On parle à un agent dans le contexte d'un workspace, d'un projet ou d'une task. L'agent reçoit le contexte approprié.                                                                     |

---

## Hot Spots & Open Questions

### Résolus

| Hot Spot                               | Résolution                                                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Qu'est-ce qu'un Agent ?                | Config éphémère par exécution.                                                                                                    |
| Swarm vs Agent solo ?                  | Agent solo pour v1.                                                                                                               |
| Deliverable polymorphe ?               | Plugin system.                                                                                                                    |
| Workflow linéaire ?                    | Oui pour v1.                                                                                                                      |
| Intégrations agentic vs automated ?    | Tools (agent) + transports (step-level).                                                                                          |
| Step Catalog model ?                   | Catalogue avec fork.                                                                                                              |
| Events granulaires vs simplifiés ?     | Simplifiés : diff avant/après.                                                                                                    |
| Validation = flag ou step ?            | HumanStep explicite.                                                                                                              |
| StepReady nécessaire ?                 | Non.                                                                                                                              |
| Advance vs Revert ?                    | MoveTaskToStep unique.                                                                                                            |
| Delivery = domaine ou infra ?          | Pure infra.                                                                                                                       |
| Transports = step ou workflow ?        | Step-level.                                                                                                                       |
| AgentStep config vs HumanStep config ? | Symétrie agentId/transports.                                                                                                      |
| Workflow = entité séparée ?            | **Oui.** Workflow est une entité first-class du catalogue, pas un attribut de Team. Un projet fait le lien Team ↔ Workflow.       |
| Project = bonne abstraction ?          | **Oui.** Un projet appartient à une team, est associé à un workflow, et contient des tasks. Pas de tasks orphelines.              |
| Team = workflow ?                      | **Non.** Team = contexte organisationnel + dossier. Workflow = pattern de travail réutilisable. Project = le lien entre les deux. |

### Ouverts

| #   | Hot Spot                                  | Notes                                                                                                                                 |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Agent Memory**                          | L'agent pourrait accumuler de la mémoire entre tasks. Reporté.                                                                        |
| 2   | **MoveTaskToStep — mécanique exacte**     | Quand on bouge une task, que se passe-t-il avec les deliverables des steps "sautées" ? Le métier doit-il restreindre les mouvements ? |
| 3   | **Modification de workflow en cours**     | Si on modifie un workflow alors que des projets l'utilisent ? Snapshot au moment de l'association ?                                   |
| 4   | **Deliverable type plugins — discovery**  | Comment le système découvre les plugins ?                                                                                             |
| 5   | **Contexte agent — granularité**          | Injecter les deliverables précédents dans le prompt ou laisser l'agent explorer le dossier ?                                          |
| 6   | **Chat — scope et persistance**           | L'historique du chat vit où ? Au niveau projet ? Task ? Workspace ? Comment le persister ?                                            |
| 7   | **Projet archivé vs supprimé**            | Un projet terminé est archivé, pas supprimé ? Quid de l'historique des tasks ?                                                        |
| 8   | **Plusieurs teams sur un même dossier ?** | Si deux teams bossent sur le même repo, chacune a-t-elle son propre sous-dossier ou partagent-elles ?                                 |

### Roadmap de collaboration (hors scope v1, direction architecturale)

| Palier                     | Description                                                                     |
| -------------------------- | ------------------------------------------------------------------------------- |
| **v1 (actuel)**            | Agent bosse seul → auto MoveTaskToStep(next).                                   |
| **v2 — Human-in-the-loop** | `CollaborationRequested` — l'agent demande un input humain pendant son travail. |
| **v3 — Agent-in-the-loop** | Même event, adapter différent.                                                  |
| **v4 — Swarm**             | Conversation multi-agents dans une step.                                        |

> **Note architecturale :** `CollaborationRequested` est un event générique.
> Le "répondant" peut être un humain ou un agent — c'est un adapter.
