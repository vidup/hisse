# Hisse — Vision

> Plateforme d'orchestration de workflows agentiques. Composable, modulaire, pluggable.

---

## Le problème

Les outils actuels fragmentent l'expérience :

- **Linear / Jira** orchestrent du travail humain, pas des agents
- **Dust** permet de configurer des agents, mais reste haut niveau et peu composable
- **Claude Cowork** exécute de manière autonome, mais dans un contexte individuel
- Aucun ne réunit les trois : orchestration projet + agents composables + exécution sandboxée

---

## La proposition Hisse

Un **Linear pour les agents** : composer des workflows mêlant agents et humains, les assigner à des projets, et laisser les agents exécuter dans des sandboxes isolés.

### Les 3 piliers

#### 1. Orchestration (Linear/Jira-like)

Le workflow est au centre. On compose des séquences de steps (agent ou human), on les assigne à des projets, et les tasks traversent le workflow.

```
Workflow: "Feature Development"
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Spec    │ →  │  Code    │ →  │  Review  │ →  │  Ship    │
│ (Agent)  │    │ (Agent)  │    │ (Human)  │    │ (Agent)  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

- Les workflows vivent dans un **catalogue partagé** au niveau workspace
- Chaque projet est associé à un workflow
- Les tasks traversent les steps — les agents auto-avancent, les humains bougent manuellement
- L'humain peut reculer une task à n'importe quelle step (rework)

#### 2. Agent Registry (Dust-like, mais plus technique)

Les agents sont **100% configurables** : system prompt, modèle, tools et skills.

```
Agent: "Coder"
├── systemPrompt: "Tu es un développeur senior..."
├── model: "claude-sonnet-4-6"
├── tools: [file-writer, test-runner, linter]
└── skills: [typescript-conventions, git-workflow]
```

Tout est dans des catalogues workspace-level :

- **Agents** — qui fait le travail
- **Tools** — les capacités techniques (file I/O, API calls, etc.)
- **Skills** — les connaissances (conventions, guidelines, domain knowledge)
- **Steps** — les étapes réutilisables, composables dans des workflows
- **Workflows** — les séquences de steps, assignables à des projets

Chaque élément est une entité first-class, forkable pour créer des variantes.

#### 3. Ports pluggables (modulaire par design)

Tout ce qui est infrastructure est un **port** :

```
                    ┌─────────────┐
                    │  Domain     │
                    │  (Steps,    │
                    │   Tasks,    │
                    │   Agents)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      ┌───────▼──────┐ ┌──▼────────┐ ┌─▼───────────┐
      │ Runtime Port │ │ Transport │ │ Persistence  │
      │              │ │ Port      │ │ Port         │
      └───────┬──────┘ └──┬────────┘ └─┬───────────┘
              │            │            │
      ┌───────▼──────┐ ┌──▼────────┐ ┌─▼───────────┐
      │ Dynamic      │ │ Slack     │ │ JSONL       │
      │ Workers (v1) │ │ Discord   │ │ Filesystem  │
      │              │ │ Email     │ │ (v1)        │
      │ VM (target)  │ │ WhatsApp  │ │             │
      │ Other...     │ │ Local     │ │ Folder-based│
      └──────────────┘ └───────────┘ │ (target)    │
                                     └─────────────┘
```

**Runtime Port** — Où les agents s'exécutent :

| Adapter          | Isolation           | Use case                          |
| ---------------- | ------------------- | --------------------------------- |
| Dynamic Workers  | V8 isolates (cloud) | Code execution, data processing   |
| VM (Cowork-like) | Linux VM + bwrap    | Filesystem access, system tools   |

**Transport Port** — Comment parler aux humains (HumanSteps) :

| Adapter   | Direction    | Use case               |
| --------- | ------------ | ---------------------- |
| Local     | In-app       | Default, toujours actif |
| Slack     | Bidirectionnel | Team communication    |
| Discord   | Bidirectionnel | Community             |
| Email     | Notification | Stakeholders externes  |
| WhatsApp  | Notification | Mobile                 |

---

## Architecture

### Bounded Contexts

```
┌─────────────────────────────────────────────────────┐
│                     WORKSPACE                        │
│                                                      │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ Step       │ │ Agent      │ │ Tool & Skill     │ │
│  │ Catalog    │ │ Registry   │ │ Catalogs         │ │
│  └────────────┘ └────────────┘ └──────────────────┘ │
│  ┌────────────────────┐                              │
│  │ Workflow Catalog    │                              │
│  └────────────────────┘                              │
│                                                      │
├──────────────────────────────────────────────────────┤
│              TEAM & PROJECT & EXECUTION               │
│                                                      │
│  Team (dossier, contexte orga)                       │
│  └── Project (workflow ref, tasks)                   │
│       └── Task → traverse le workflow                │
│            ├── AgentStep → Runtime Port → sandbox    │
│            └── HumanStep → Transport Port → Slack... │
│                                                      │
├──────────────────────────────────────────────────────┤
│              DELIVERY (pure infra)                    │
│  Réagit aux events, dispatch via adapters            │
└──────────────────────────────────────────────────────┘
```

### Principes

- **Hexagonal par package** — chaque bounded context a ses ports et adapters
- **Filesystem-first** — le workspace est un dossier, pas une base de données
- **Event-driven** — policies réagissent aux events (`TaskMovedToStep` → `SpawnAgent` ou `NotifyHuman`)
- **Discriminated union extensible** — Step types: AgentStep, HumanStep aujourd'hui. SwarmStep, AutomationStep demain.

---

## Exécution sandboxée — Dynamic Workers (v1)

L'Execution Engine dispatch un `AgentStep` vers un **Cloudflare Dynamic Worker** :

```
TaskMovedToStep (AgentStep)
  │
  ▼
ExecutionEngine (policy)
  │
  ├── Résout l'agent (config, tools, skills)
  ├── Prépare les bindings autorisés
  │
  ▼
Dynamic Worker (V8 isolate)
  ├── Bindings: tools autorisés uniquement
  ├── Egress: contrôlé (allow-list de domaines)
  ├── Observability: Tail Worker pour les logs
  │
  ├── Agent travaille...
  ├── AgentProducedOutput (×N)
  ├── DeliverableGenerated
  │
  ▼
Agent finished → MoveTaskToStep(next)
```

**Pourquoi Dynamic Workers pour la v1 :**

- Spin-up instantané (millisecondes)
- Isolation native (V8 isolates)
- Contrôle fin des bindings et du réseau
- Observabilité intégrée (Tail Workers)
- Pas d'infra à gérer
- Économie de tokens (jusqu'à 80% vs tout-en-prompt)

**Vision cible :** le runtime est un port. Dynamic Workers, VM locale, ou autre — c'est un adapter swap.

---

## Positionnement

|                         | Linear/Jira | Dust  | Cowork | **Hisse**         |
| ----------------------- | ----------- | ----- | ------ | ----------------- |
| Orchestration projet    | +++         | -     | -      | +++               |
| Config agents           | -           | ++    | +      | +++ (full config) |
| Exécution sandboxée     | -           | -     | +++    | ++ (v1) / +++ (cible) |
| Human-in-the-loop       | +++         | +     | +      | +++ (transport ports) |
| Composabilité           | +           | +     | -      | +++ (tout est catalogue) |
| Modularité runtime      | -           | -     | -      | +++ (ports)       |

---

## Roadmap

| Palier               | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| **v1 — Solo agent**  | Agent exécute seul dans Dynamic Worker → auto-avance            |
| **v2 — HITL**        | `CollaborationRequested` — l'agent demande un input humain      |
| **v3 — AITL**        | Même event, adapter différent — un agent répond à un autre      |
| **v4 — Swarm**       | Conversation multi-agents dans une step                         |
| **v5 — Multi-runtime** | VM locale, containers, choix du runtime par step              |
