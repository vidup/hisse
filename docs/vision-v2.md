# Hisse — Vision v2

> Plateforme d’orchestration du travail hybride. Agentique quand il faut, workflow quand il faut, automation quand il faut. Ou les trois à la fois.

---

## Intuition

Le futur du travail logiciel n’est probablement ni :

- un monde de **workflows entièrement câblés** où tout est figé à l’avance,
- ni un monde de **full autonomie agentique** où l’on lance des agents et des sous-agents en espérant que tout converge.

La réalité utile se situe entre les deux.

Les agents sont déjà capables de beaucoup : explorer, synthétiser, chercher, écrire, proposer, adapter leur stratégie d’un run à l’autre.
Mais ils restent limités : fiabilité inégale, difficulté à tenir des contraintes implicites, besoin fréquent de validation, fragilité sur certaines tâches longues ou critiques.

Hisse part de ce constat simple :

> il faut pouvoir **composer différents degrés d’autonomie** au lieu de choisir entre workflow rigide et agent autonome.

---

## La thèse centrale

Hisse n’est pas seulement un outil de workflow pour agents.
Hisse n’est pas seulement un runtime de chat pour agents.
Hisse n’est pas seulement un moteur d’automation.

Hisse veut être une **plateforme combinatoire** qui permet de mélanger :

- du **chat libre** avec un agent,
- des **workflows explicites**,
- des **étapes humaines**,
- des **étapes agentiques**,
- des **étapes d’automation déterministes**,
- et demain potentiellement des **étapes multi-agents**.

Le but n’est pas de tout mettre dans un workflow.
Le but n’est pas non plus de tout abandonner à l’agent.

Le but est de fournir un cadre où l’on peut décider, pour chaque cas d’usage :

- où laisser de la liberté,
- où imposer du contrôle,
- où demander une validation humaine,
- où automatiser de manière stricte,
- et où combiner plusieurs de ces logiques.

---

## Pourquoi les workflows restent nécessaires

Les outils comme Linear ou Jira orchestrent bien du travail humain, mais ne sont pas pensés pour des agents.
À l’inverse, certains harness agentiques proposent une logique implicite du type :

- on donne une mission à un agent,
- l’agent lance des sous-agents,
- puis on espère qu’à la fin le résultat soit bon.

Cette approche peut être impressionnante, mais elle reste insuffisante dès qu’on a besoin de :

- contrôle,
- traçabilité,
- points de validation,
- rollback,
- reprise,
- coordination avec des humains,
- garanties minimales sur les outputs.

Les workflows servent donc à **cadrer** le travail.
Mais dans Hisse, ils ne servent pas à décrire chaque détail du comportement.

> On ne veut pas hard-coder le travail de l’agent. On veut hard-coder le cadre dans lequel il travaille.

---

## Pourquoi l’agentique reste essentielle

Les outils de workflow classiques comme n8n ou Zapier excellent quand tout est connu à l’avance.
Mais ils deviennent vite rigides dès qu’on veut de l’exploration ou de l’adaptation.

Or c’est précisément ce que les agents apportent :

- variabilité utile,
- recherche contextuelle,
- capacité à aller chercher l’information pertinente,
- adaptation à des inputs imparfaits,
- initiative locale,
- exécution non strictement identique d’un run à l’autre.

Réduire un agent à une simple brique dans un workflow trop déterministe, c’est perdre une grande partie de sa valeur.

Hisse veut donc préserver cette puissance :

- parfois dans un simple chat,
- parfois à l’intérieur d’une étape de workflow,
- parfois sur une mission entière,
- parfois plus tard dans une collaboration entre plusieurs agents.

---

## Le bon modèle : des degrés d’autonomie

Le concept central de Hisse est le suivant :

> une organisation n’a pas besoin d’un seul mode d’exécution ; elle a besoin d’un système qui lui permet de régler le niveau d’autonomie.

Exemples :

### Chat libre

Un utilisateur parle à un agent dans le contexte d’un workspace, d’un projet ou d’une task.
L’agent agit librement, comme dans une expérience type cowork.

### Workflow léger

Une mission très simple traverse peu d’étapes.
Exemple : intake, tri, qualification, enrichissement, dispatch.

### Workflow structuré

Une task passe par une suite explicite d’étapes : spec, code, review, ship.
Certaines étapes sont agentiques, d’autres humaines.

### Workflow hybride

Le workflow structure le travail, mais chaque étape laisse à l’agent une vraie marge d’action.

### Automation stricte

Une étape non agentique exécute du code déterministe pour contrôler, valider, router ou rejeter un résultat.

---

## Une troisième brique : l’automation déterministe

Entre le workflow classique et l’agent, il existe une troisième logique très importante :
**l’automation stricte**.

Une étape de workflow ne doit pas forcément être :

- humaine,
- ou pilotée par un LLM.

Elle peut être un morceau de logique exécutable qui vérifie des invariants ou prend une décision simple.

Exemples :

- si tel fichier manque, retour à l’étape précédente,
- si les tests échouent, retour,
- si le brief est incomplet, rejet,
- si une structure attendue n’est pas présente, blocage,
- si un livrable ne respecte pas un format, rework automatique.

C’est une différence importante avec les systèmes qui ne savent qu’“influencer” l’agent via des prompts ou des hooks.

Hisse veut permettre de faire plus que conseiller le modèle :

> à certaines étapes, le système doit pouvoir **contrôler explicitement**.

Cela permet de combiner :

- intelligence probabiliste,
- validation déterministe,
- boucle de rework automatisée,
- et intervention humaine seulement quand elle est réellement utile.

---

## Une plateforme, pas un produit verrouillé

L’écosystème des modèles et des runtimes évolue extrêmement vite.
Être enfermé dans un seul provider, un seul modèle ou un seul harness devient vite un handicap.

Hisse part donc d’une autre hypothèse :

> tout ce qui dépend d’un choix technologique contingent doit être remplaçable.

Cela vaut pour :

- les **providers**,
- les **modèles**,
- les **runtimes d’agents**,
- les **tools**,
- les **transports**,
- les **types de steps**,
- les **connecteurs externes**,
- et potentiellement demain les **politiques d’orchestration**.

Un agent donné peut être excellent avec un modèle pour le code.
Un autre avec un modèle pour l’analyse.
Une équipe peut vouloir mixer plusieurs providers.
Une tâche peut justifier une configuration différente d’une autre.

Hisse veut rendre cela possible nativement, au lieu de le rendre difficile ou impossible.

---

## Les agents comme objets configurables

Dans cette logique, les agents deviennent des objets configurables et composables.
Ils ne sont pas liés à un seul runtime ni à un seul provider par essence.

Un agent doit pouvoir définir, selon le besoin :

- son rôle,
- son prompt système,
- son modèle,
- son provider,
- ses tools,
- ses skills,
- éventuellement demain son runtime d’exécution,
- et potentiellement ses politiques de collaboration avec d’autres agents.

L’inspiration est proche d’un registre d’agents à la Dust, mais poussé vers une plus grande ouverture technique et une intégration plus profonde avec l’exécution réelle.

---

## Runtimes pluggables

Aujourd’hui Hisse peut s’appuyer sur Pi.
Demain, il doit pouvoir s’appuyer sur autre chose.

L’objectif n’est pas de nier l’intérêt de Pi ou d’un autre runtime.
L’objectif est de garder une architecture capable d’évoluer avec l’écosystème.

Demain, selon les contextes, on pourrait vouloir utiliser :

- Pi,
- Claude Code,
- Codex,
- Gemini CLI,
- OpenCode,
- ou d’autres runtimes encore à venir.

Le runtime est donc un **port**, pas une vérité absolue.

Même logique pour les outils disponibles à l’exécution :

- les tools natifs,
- les tools maison,
- les MCP,
- les capacités locales ou cloud,
- tout cela doit pouvoir être branché, remplacé, combiné.

---

## Transports pluggables

Le même raisonnement vaut pour les interactions humaines.

Une étape humaine ne doit pas être liée à un seul canal.
Selon l’équipe, le contexte et l’urgence, on peut vouloir :

- une notification locale OS,
- Slack,
- Discord,
- Telegram,
- WhatsApp,
- email,
- Notion,
- Jira,
- ou plusieurs transports à la fois.

Une même step peut devoir :

- notifier une personne sur Slack,
- créer un artefact dans Jira,
- poster un résumé dans Notion,
- et garder une trace locale dans l’application.

Le transport n’est donc pas un détail d’implémentation.
C’est une capacité métier importante.

---

## Filesystem-first, mais pas filesystem-only

Le filesystem est aujourd’hui un excellent support car il permet :

- inspection,
- versioning,
- portabilité,
- hackabilité,
- intégration naturelle avec Git.

C’est donc un très bon point de départ pour :

- les skills,
- les agents,
- les workflows,
- les projets,
- les transcripts,
- les deliverables.

Mais Hisse ne doit pas enfermer sa vision dans Git ou même dans le filesystem local.

À terme, on peut imaginer :

- du stockage cloud pour les chats,
- des espaces d’équipe partagés,
- des chats privés ou publics,
- des synchronisations avec Jira,
- des documents SharePoint,
- d’autres backends de persistance,
- d’autres surfaces de collaboration.

Le bon principe n’est donc pas “tout doit être sur disque pour toujours”.
Le bon principe est :

> choisir des abstractions qui laissent ouvertes plusieurs formes de persistance et de collaboration.

Le filesystem reste un excellent défaut.
Il ne doit pas devenir une prison conceptuelle.

---

## Architecture : ne fermer aucune porte trop tôt

La philosophie générale de Hisse peut se résumer ainsi :

- ne pas supposer qu’un seul mode d’exécution suffira,
- ne pas supposer qu’un seul provider restera le meilleur,
- ne pas supposer qu’un seul canal humain conviendra à toutes les équipes,
- ne pas supposer qu’un seul backend de stockage durera,
- ne pas supposer qu’un seul type de step suffit à modéliser le réel.

Autrement dit :

> garder les portes ouvertes là où l’écosystème est encore en mouvement.

C’est précisément ce que permet une architecture hexagonale et pluggable :

- un domaine métier clair,
- des ports stables,
- des adapters remplaçables,
- des catalogues composables,
- une plateforme qui absorbe l’évolution au lieu de la subir.

---

## Positionnement

Hisse n’est pas :

- un Jira pour humains avec un peu d’IA,
- un Zapier boosté au LLM,
- un cowork autonome fermé sur un seul provider,
- un simple chat d’agent,
- ni un runtime unique d’exécution.

Hisse veut être :

> une plateforme ouverte d’orchestration du travail hybride, où l’on peut combiner agents, humains, automation et intégrations externes, avec un niveau de structure adapté à chaque contexte.

---

## Recentrer Le Workflow Sur Le Projet

Une simplification importante consiste a inverser la relation entre projet et workflow.

Au lieu de partir d'un catalogue de workflows obligatoire pour lancer un projet, Hisse peut
partir d'un principe plus simple :

> un projet porte son workflow en propre.

Autrement dit :

- quand on cree un projet, on definit directement comment ce projet fonctionne,
- ce workflow vit avec le projet,
- il peut etre modifie ensuite,
- et s'il devient utile a reutiliser, on peut alors le publier comme template.

Cela revient a snapshotter le workflow by design, sans couche supplementaire.

Dans ce modele :

- le projet est l'unite de travail centrale,
- le workflow template devient une couche de reutilisation, pas un prerequis,
- le catalogue de steps peut exister comme aide ou preset, mais il ne doit pas etre au centre du setup initial.

Le flux naturel devient donc :

1. creer un projet,
2. definir son workflow local,
3. executer le travail,
4. puis eventuellement promouvoir ce workflow en template reutilisable.

Cette inversion simplifie fortement le modele mental, la persistence et l'execution runtime.

---

## Une Infrastructure D'Execution Commune Pour Toutes Les Steps

Une autre direction importante pour la v2 est de ne pas avoir une infrastructure differente
pour chaque type de step.

Le systeme peut au contraire reposer sur une meme implementation runtime pour toutes les steps :

- entree dans une step,
- etat courant,
- historique,
- output,
- transitions,
- reprise,
- blocage,
- completion.

La difference entre les steps ne serait pas dans leur cycle de vie bas niveau, mais dans la
fonction qu'elles executent.

On peut voir cela comme une `stepFunction` branchee sur une infrastructure commune.

Exemples :

- **AgentStep** : la `stepFunction` lance un agent.
- **HumanStep** : la `stepFunction` declenche un `transportCall`, puis place la step en `waiting_for_input`.
- **AutomationStep** : la `stepFunction` execute une logique deterministe definie en code, dans un esprit proche d'un node d'automation a la n8n.

Cette approche permet de partager :

- les memes statuts d'execution,
- la meme mecanique de transition,
- la meme observabilite,
- la meme persistence,
- et le meme moteur d'orchestration.

Autrement dit :

> agent, humain et automation ne sont pas trois infrastructures differentes ; ce sont trois variantes d'une meme machine d'execution.

Cela donne une base plus saine pour introduire ensuite l'automation, plutot que de l'ajouter
sur un modele encore trop couple a l'existant.

---

## En pratique

Hisse doit permettre aussi bien :

- un chat libre dans le contexte d’un projet,
- un workflow d’auto-mission très simple,
- un pipeline structuré de production,
- une step d’automatisation qui contrôle les outputs,
- une exécution basée sur plusieurs providers,
- des interactions humaines via différents transports,
- et demain des setups d’équipe plus riches, partagés ou synchronisés avec d’autres systèmes.

---

## Résumé

La vision de Hisse est simple à énoncer, même si elle est ambitieuse à construire :

> donner aux équipes un système pour orchestrer des degrés d’autonomie.

Cela implique de pouvoir combiner :

- liberté agentique,
- workflow explicite,
- contrôle déterministe,
- intervention humaine,
- et composants techniques interchangeables.

En bref :

> Hisse n’est ni un moteur de workflow classique, ni un simple harness d’agents.
> C’est une plateforme ouverte pour rendre l’agentique réellement utilisable dans le travail réel.
