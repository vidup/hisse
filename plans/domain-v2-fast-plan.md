# Hisse — Domaine V2 (résumé rapide)

## Intention

Ne pas coder en dur un workflow unique du type :

- brainstorm
- PRD
- SRS
- exécution
- vérification

Mais modéliser un système plus générique :

> un projet suit un workflow séquentiel configurable,
> chaque étape peut avoir un agent,
> des livrables,
> des règles de passage,
> et quelques effets simples.

Le workflow software factory devient alors **un template**, pas le coeur du domaine.

---

## 1. Les 2 niveaux à distinguer

### A. Définition
Ce qui est configurable.

- quel workflow existe
- quelles étapes il contient
- quel agent est associé à chaque étape
- quels livrables sont attendus
- quelles règles doivent être satisfaites

### B. Instance
Ce qui s’exécute réellement.

- un projet concret
- son étape courante
- ses livrables réels
- les runs d’agents
- l’historique des transitions

---

## 2. Concepts métier minimaux

### WorkflowDefinition
Décrit un workflow réutilisable.

Champs minimaux :
- `id`
- `name`
- `description?`
- `firstStageId`
- `stages[]`

### StageDefinition
Décrit une étape du workflow.

Champs minimaux :
- `id`
- `name`
- `description?`
- `nextStageId?`
- `agentProfileId?`
- `deliverables[]`
- `exitRules[]`
- `effects[]`

> V1 : workflow **séquentiel uniquement**.

### AgentProfile
Décrit un agent spécialisé réutilisable.

Champs minimaux :
- `id`
- `name`
- `rolePrompt`
- `systemPrompt?`
- `model?`
- `thinkingLevel?`
- `tools[]`
- `skills[]`
- `promptTemplates[]`

### DeliverableDefinition
Décrit un livrable attendu dans une étape.

Champs minimaux :
- `id`
- `name`
- `type` (`text`, `markdown`, `json`, `file`)
- `required`
- `template?`

### ExitRule
Décrit une condition pour quitter une étape.

V1 : liste fermée de règles simples :
- `required_deliverables_completed`
- `manual_approval_required`
- `agent_run_completed`

### StageEffect
Décrit une action déclenchable par l’étape.

V1 : liste fermée d’effets simples :
- `launch_agent`
- `create_deliverable`
- `notify`

---

## 3. Concepts d’exécution

### ProjectInstance
Représente un projet réel.

Champs minimaux :
- `id`
- `name`
- `workflowDefinitionId`
- `currentStageId`
- `status`
- `createdAt`
- `updatedAt`

### DeliverableInstance
Représente un livrable concret d’un projet.

Champs minimaux :
- `projectId`
- `stageId`
- `deliverableDefinitionId`
- `status`
- `contentRef?`
- `validatedAt?`

### AgentRun
Représente un run réel d’agent.

Champs minimaux :
- `id`
- `projectId`
- `stageId`
- `agentProfileId`
- `status`
- `startedAt`
- `finishedAt?`

---

## 4. Invariants métier V1

### Workflow
- un workflow a une première étape
- une étape pointe au plus vers une étape suivante
- pas de graphe complexe en V1

### Stage
- une étape appartient à un workflow
- une étape peut avoir zéro ou un agent principal en V1

### Transition
On peut passer à l’étape suivante seulement si :
- on est bien sur l’étape courante attendue
- les règles de sortie sont satisfaites

### Deliverables
- un livrable requis doit être complété avant la sortie si la règle correspondante est active

### Agent runs
- un run d’agent appartient à un projet et à une étape
- une règle peut exiger qu’un run soit terminé avant sortie

---

## 5. Événements métier à viser

### Définitions
Si on veut versionner/configurer plus tard :
- `workflow.created`
- `stage.defined`
- `agent_profile.created`

### Exécution
Pour la verticale rapide, on s’intéresse surtout à :
- `project.created`
- `project.stage_entered`
- `deliverable.created`
- `deliverable.completed`
- `deliverable.validated`
- `agent_run.started`
- `agent_run.completed`
- `agent_run.failed`
- `project.advanced_to_next_stage`

---

## 6. Traduction produit immédiate

### Ce qu’on veut construire vite

#### Verticale 1 — créer des agents
Une petite app permet de :
- créer un `AgentProfile`
- choisir son nom
- son prompt/rôle
- ses skills
- ses outils
- éventuellement son modèle

#### Verticale 2 — créer un workflow simple
Une petite app permet de :
- créer un `WorkflowDefinition`
- ajouter des étapes séquentielles
- assigner un agent à chaque étape
- définir quelques livrables

#### Verticale 3 — lancer un projet sur ce workflow
Une petite app permet de :
- créer un `ProjectInstance`
- choisir un workflow
- voir l’étape courante
- lancer l’agent de l’étape
- compléter les livrables
- passer à l’étape suivante

---

## 7. Décision de simplification pour aller vite

Pour ne pas exploser la complexité, V1 doit rester très contrainte.

### V1 oui
- workflow séquentiel
- un agent principal par étape
- livrables simples
- règles simples fermées
- effets simples fermés

### V1 non
- graphe complexe
- agents multiples collaboratifs dans une même étape
- moteur de règles libre
- scripting générique de toutes les actions
- orchestration distribuée compliquée

---

## 8. Conclusion

Le vrai domaine cible n’est pas :

- projet + stages fixes

Le vrai domaine cible est :

> workflow configurable + agents spécialisés + livrables + règles de passage.

Et pour aller vite, la meilleure trajectoire est :

1. **petite app pour créer des agents**
2. **petite app pour créer des workflows séquentiels**
3. **petite app pour lancer un projet sur ce workflow**
4. ensuite seulement enrichir le moteur
