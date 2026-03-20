# Pi pour Hisse / CC-SHIP

Cette note sert de **documentation locale de référence** pour le projet.

Objectif : éviter d’avoir à replonger à chaque fois dans la doc upstream de Pi pour retrouver ce qui est vraiment utile à Hisse / CC-SHIP.

Elle est basée sur la lecture des docs et exemples Pi les plus pertinents :

- `node_modules/@mariozechner/pi-coding-agent/README.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/extensions.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/sdk.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/tui.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/packages.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/session.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/rpc.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/skills.md`
- `node_modules/@mariozechner/pi-coding-agent/docs/prompt-templates.md`
- `node_modules/@mariozechner/pi-coding-agent/examples/extensions/README.md`
- `node_modules/@mariozechner/pi-coding-agent/examples/extensions/subagent/README.md`
- `node_modules/@mariozechner/pi-coding-agent/examples/extensions/plan-mode/README.md`
- `node_modules/@mariozechner/pi-coding-agent/examples/sdk/README.md`

---

## 1. Lecture rapide : ce que Pi est, et ce qu’il n’est pas

### Ce que Pi apporte très bien

Pi est un **harness minimal, extensible, programmable**.

Il fournit :

- une boucle agent + outils
- un terminal interactif (TUI)
- un système d’extensions TypeScript
- un SDK Node pour embarquer l’agent dans une app
- un mode RPC pour pilotage par un autre process
- des sessions persistées en JSONL avec arbre de branches
- une UI extensible côté terminal

### Ce que Pi n’essaie pas d’imposer

Pi ne veut pas imposer en dur :

- des subagents
- un plan mode natif
- des popups de permission natives
- un système de todos métier
- un orchestrateur workflow métier

Au contraire, la philosophie de Pi est :

> si tu veux ces capacités, construis-les avec des extensions, des tools, du SDK, ou des packages.

### Pourquoi c’est intéressant pour Hisse

C’est précisément compatible avec l’objectif Hisse / CC-SHIP :

- **laisser Pi faire l’interface agent + exécution**
- **sortir l’orchestration métier du prompt**
- **mettre la logique critique dans un moteur déterministe**
- **laisser le LLM agir à l’intérieur d’un cadre contrôlé**

Autrement dit :

- **Pi = shell agentique extensible**
- **Hisse = moteur de workflow / règles / états**
- **L’extension Pi = adaptateur entre les deux**

---

## 2. Cartographie de l’existant dans ce repo

À date, le repo contient déjà la première brique correcte.

### Core métier

- `src/core/model.ts`
  - définit les `Stage` : `backlog`, `brainstorming`, `prd`, `srs`, `shaping`, `executing`, `verifying`, `shipped`
  - définit les `TaskStatus` : `todo`, `in_progress`, `done`, `blocked`
  - expose `canTransitionStage()` avec une table de transitions autorisées

- `src/core/reducer.ts`
  - reconstruit `ProjectState` à partir des événements
  - fait respecter les invariants métier :
    - un projet ne peut être créé qu’une fois
    - un event doit viser le bon `projectId`
    - un changement de stage doit partir du stage courant
    - une transition interdite est rejetée
    - un changement de statut de tâche doit partir du statut courant

- `src/core/events/*`
  - événements typés et sérialisables :
    - `project.created`
    - `stage.changed`
    - `task.added`
    - `task.status_changed`

### Persistance

- `src/store/jsonl-event-store.ts`
  - persistance append-only par projet dans : `.hisse/<projectId>/events.jsonl`
  - chargement complet puis replay du reducer

### Adaptateur Pi

- `src/pi/hisse-extension.ts`
  - extension Pi MVP
  - tools exposés :
    - `hisse_project` (`create`, `open`, `status`, `list`)
    - `hisse_task` (`add`, `set_status`, `list`)
    - `hisse_stage` (`advance`, `status`)
  - commande `/hisse`
  - widget/status TUI
  - persistance d’un `activeProjectId` via `pi.appendEntry()` dans la session Pi

### Lecture importante

Le projet est donc déjà structuré selon une bonne séparation :

1. **moteur métier**
2. **store d’événements**
3. **adaptateur Pi**

C’est exactement la bonne base pour faire évoluer Hisse vers un orchestrateur plus fort.

---

## 3. La brique la plus importante pour Hisse : les extensions Pi

La doc la plus critique pour ce projet est `docs/extensions.md`.

### Une extension peut

- enregistrer des **tools** appelables par le LLM
- enregistrer des **commands** (`/ma-commande`)
- écouter des **événements du cycle agent/session/tool**
- modifier ou bloquer des appels d’outils
- injecter des messages dans la session
- persister de l’état dans la session
- personnaliser l’UI terminal
- enregistrer/retirer dynamiquement des providers et outils

### Le modèle mental à retenir

Une extension Pi n’est pas juste un “plugin de prompt”.
C’est plutôt une **couche d’orchestration applicative** branchée sur le runtime de l’agent.

Pour Hisse, c’est crucial :

- les règles de passage d’un état à l’autre vivent dans le domaine
- l’extension Pi expose ces règles via des tools/commands/UI
- le LLM n’invente pas le workflow : il **l’utilise**

### Où mettre les extensions

Pour du test rapide :

```bash
pi -e ./src/pi/hisse-extension.ts
```

Mais pour du vrai développement avec `/reload`, Pi recommande plutôt :

- global : `~/.pi/agent/extensions/`
- projet : `.pi/extensions/`

Donc à terme, pour Hisse, il sera plus confortable d’avoir une vraie extension dans `.pi/extensions/` ou un package Pi.

---

## 4. Les événements Pi utiles pour Hisse

Pi expose un vrai cycle d’événements.

### Événements de session utiles

- `session_start`
- `session_switch`
- `session_fork`
- `session_tree`
- `session_shutdown`
- `session_before_switch`
- `session_before_fork`
- `session_before_compact`
- `session_before_tree`

### Événements agent utiles

- `before_agent_start`
- `agent_start`
- `agent_end`
- `turn_start`
- `turn_end`
- `context`
- `before_provider_request`

### Événements tools utiles

- `tool_execution_start`
- `tool_call`
- `tool_result`
- `tool_execution_end`

### Pourquoi c’est stratégique pour Hisse

Ces hooks permettent de construire de vrais garde-fous :

- empêcher certains outils selon le stage courant
- injecter du contexte métier avant un tour agent
- refuser une mutation si le projet n’est pas dans le bon état
- enrichir les résultats d’outils
- afficher un statut de progression en UI
- imposer des checkpoints avant `session_fork`, `session_switch`, etc.

### Deux hooks particulièrement importants

#### `tool_call`
Permet de **bloquer** un outil avant exécution.

Exemples Hisse :

- interdire `write/edit/bash` sur certains fichiers tant qu’un stage n’est pas validé
- empêcher un outil de “ship” tant que les tâches bloquantes ne sont pas résolues
- vérifier qu’un agent spécialisé n’est lancé qu’à partir d’un état autorisé

#### `before_agent_start`
Permet de modifier le system prompt pour le tour courant et d’injecter un message custom.

Exemples Hisse :

- rappeler au modèle le projet actif et son état
- injecter le stage courant et les contraintes applicables
- rappeler quelles transitions sont autorisées/interdites

---

## 5. Les tools Pi : le vrai point d’entrée métier

Pour Hisse, les tools sont la surface la plus importante.

### Ce qu’un tool Pi peut faire

Un tool peut :

- recevoir des paramètres typés (`TypeBox`)
- exécuter du code arbitraire
- streamer des updates partielles
- retourner du contenu visible par le LLM
- retourner des `details` persistés dans la session
- avoir un rendu TUI custom

### Ce qu’il faut retenir pour Hisse

Le LLM ne doit pas manipuler directement le workflow métier via du texte libre.
Il doit appeler des tools du style :

- `hisse_project`
- `hisse_task`
- `hisse_stage`
- plus tard : `hisse_spec`, `hisse_validation`, `hisse_release`, etc.

Le bon pattern est :

1. le LLM exprime une intention
2. le tool valide la demande côté domaine
3. le domaine produit ou refuse un événement
4. le state est reconstruit
5. le tool renvoie un résultat lisible

### `promptSnippet` et `promptGuidelines`

Un tool custom peut enrichir le system prompt par défaut :

- `promptSnippet` : une ligne dans la liste des tools
- `promptGuidelines` : des règles d’usage spécifiques au tool

C’est utile pour rendre les outils Hisse **plus découvrables** et **moins ambigus** pour le modèle.

### Point critique : Pi exécute les tools en parallèle

Par défaut, les tools d’un même tour peuvent s’exécuter en parallèle.

Conséquences :

- il ne faut pas supposer un ordre implicite entre deux tools frères
- si plusieurs tools mutent un même fichier, il faut protéger la mutation
- `tool_call` ne voit pas forcément les résultats des autres tools du même tour

Pi fournit `withFileMutationQueue()` pour les fenêtres read-modify-write sur un fichier.

Pour Hisse, cela veut dire :

- les tools de mutation de fichiers devront utiliser la file de mutation
- les tools purement append-only sur l’event store sont plus simples
- si un tool lit l’état puis écrit autre chose ailleurs, il faudra penser concurrence

### Point critique : les tools doivent tronquer leur sortie

Pi impose une discipline importante : gros outputs à tronquer.

Règle upstream :

- max ~50KB
- max 2000 lignes

C’est fondamental pour Hisse si vous faites plus tard :

- génération de gros rapports
- lecture de logs
- audits multi-fichiers
- résultats d’agents spécialisés

Sinon, on casse vite le contexte du modèle.

---

## 6. Persistance : ce qu’il faut stocker où

C’est un point très important de design avec Pi.

### A. État métier durable

Pour Hisse, l’état métier doit rester dans votre propre store :

- `.hisse/<projectId>/events.jsonl`

C’est là que vivent :

- stages
- tâches
- transitions
- futurs artefacts métier

### B. État de session Pi non métier

Pour du state lié à la session Pi mais pas au domaine métier, on peut utiliser :

- `pi.appendEntry(customType, data)`

Exemple actuel correct dans le repo :

- `hisse.active_project`

C’est bien pour mémoriser :

- le projet actif dans la session
- des préférences runtime
- un mode UI local à la session

### C. État d’un tool qui doit suivre les branches

La doc Pi insiste sur un point : pour un tool stateful, il vaut souvent mieux persister l’état dans les **`details` des tool results**.

Pourquoi ?

Parce que cet état suit naturellement les branches de session, les forks, les restores.

### Règle pratique pour Hisse

- **État métier du projet** → store Hisse
- **État de session Pi** → `appendEntry()`
- **État de rendu / résultat d’un tool** → `details` du tool result
- **Contexte à donner au LLM** → custom message ou contexte calculé, pas état brut persistant partout

---

## 7. Session Pi : utile, mais à ne pas confondre avec le workflow Hisse

Pi a son propre système de session JSONL en arbre.

### Ce que la session Pi sait faire

- persistance de conversation
- branching
- fork
- compaction
- labels/bookmarks
- custom entries d’extensions
- custom messages injectés dans le contexte

### Ce qu’il ne faut pas faire

Il ne faut pas faire reposer le workflow métier Hisse sur l’arbre de session Pi.

Pourquoi :

- la session Pi = historique conversationnel et ergonomie agent
- Hisse = vérité métier du lifecycle projet

### Comment les faire coopérer

Le bon usage est plutôt :

- la session Pi conserve le contexte conversationnel
- Hisse conserve l’état métier déterministe
- quand la session change (`switch`, `fork`, `tree`), l’extension recalcule l’UI à partir :
  - du projet actif mémorisé en session
  - de l’état relu depuis `.hisse/...`

C’est déjà ce que fait en partie `src/pi/hisse-extension.ts`.

---

## 8. L’UI TUI : très utile pour un mode terminal sérieux

La doc `docs/tui.md` est très pertinente pour la suite.

### Pi permet côté terminal

- `ctx.ui.notify()`
- `ctx.ui.select()`
- `ctx.ui.confirm()`
- `ctx.ui.input()`
- `ctx.ui.editor()`
- `ctx.ui.setStatus()`
- `ctx.ui.setWidget()`
- `ctx.ui.setFooter()`
- `ctx.ui.custom()` pour des composants TUI complets
- `ctx.ui.setEditorComponent()` pour remplacer l’éditeur

### Pourquoi c’est utile pour Hisse

Sans construire l’app finale tout de suite, vous pouvez déjà avoir dans le TUI :

- un widget d’état projet
- un footer de progression
- une UI de validation de transitions
- un panneau “gates bloquants”
- une liste des tâches ouvertes
- un mode “plan / review / execute” bien visible

### Patterns TUI à retenir

Pi fournit déjà des patterns pour :

- listes de sélection
- loaders annulables
- widgets persistants
- overlays
- custom footer
- custom editor

Donc il est réaliste de faire un Hisse terminal assez riche **sans construire l’app graphique tout de suite**.

### Limite importante

Le TUI custom est surtout pour le mode interactif terminal.

En mode RPC :

- `select/confirm/input/editor` passent par un sous-protocole JSON
- `custom()` ne marche pas vraiment comme dans le TUI
- plusieurs features TUI deviennent des no-op ou des versions dégradées

Conclusion :

- **pour le terminal natif** : TUI très intéressant
- **pour l’app future** : le vrai point d’entrée sera plutôt le SDK ou RPC

---

## 9. SDK : la brique clé pour l’app future

La doc `docs/sdk.md` est probablement la plus importante après les extensions.

### Ce que permet le SDK

Le SDK permet de créer une session agent Pi dans votre propre application Node :

- créer une session
- pousser des prompts
- écouter tous les événements de streaming
- contrôler modèle / niveau de thinking
- injecter tools, extensions, skills, prompts
- gérer sessions, settings, ressources
- embarquer Pi dans une app custom

### Pourquoi c’est crucial pour votre vision

Votre cible long terme est une app qui :

- lance des agents Pi sous le capot
- suit l’état des projets
- orchestre plusieurs étapes et vues
- garde la maîtrise applicative du lifecycle

Le SDK est fait pour ça.

### Choix recommandé

Si votre future app est en **Node/TypeScript**, le SDK est le choix naturel.

Le SDK est préférable quand on veut :

- rester dans le même process
- garder du typage
- accéder directement à l’état agent
- brancher ses propres outils/extensions
- construire une interface custom sans sheller un binaire

### Objets à connaître

- `createAgentSession()`
- `AgentSession`
- `DefaultResourceLoader`
- `SessionManager`
- `SettingsManager`
- `AuthStorage`
- `ModelRegistry`

### Point important pour Hisse

Vous pourrez garder la même logique Hisse :

- le domaine reste votre code
- l’extension ou les tools Hisse restent du code partagé
- le TUI terminal et l’app future peuvent réutiliser les mêmes briques

---

## 10. RPC : utile si l’app n’est pas dans le même process

Le mode `pi --mode rpc` expose Pi sur stdin/stdout en JSONL.

### Quand préférer RPC

RPC est utile si :

- l’app future n’est pas en Node
- vous voulez isoler les agents dans des process séparés
- vous voulez un client multi-langages
- vous préférez une frontière process claire

### Quand préférer le SDK

Le SDK est préférable si :

- l’app est en Node/TS
- vous voulez une intégration profonde
- vous voulez moins de friction et plus de typage

### Pour Hisse

Le plus probable est :

- **TUI / dev local / extension** → extension Pi + TUI
- **app Node** → SDK
- **orchestrateur externe / multi-runtime** → RPC

---

## 11. Skills et prompt templates : utiles, mais secondaires

C’est important vis-à-vis de votre problème initial.

### Skills

Les skills sont des paquets d’instructions chargés à la demande.
Ils sont utiles pour :

- documenter une procédure
- apporter des recettes spécialisées
- fournir des scripts et références

Mais ils restent fondamentalement du **guidage du modèle**.

### Prompt templates

Les prompt templates sont des snippets markdown invoqués par `/commande`.
Très bien pour :

- lancer un workflow textuel standard
- préparer un prompt complexe
- offrir des raccourcis opératoires

Mais ce n’est pas de l’orchestration déterministe.

### Conclusion pour Hisse

- **Skills / prompts** = couche d’aide, de guidance, de documentation
- **Tools / domaine / extension / SDK** = couche d’orchestration réelle

Autrement dit :

- on peut garder des skills et des templates
- mais ils ne doivent pas porter le coeur du lifecycle métier

C’est exactement le problème que vous aviez avec le harness précédent.

---

## 12. Packages Pi : très utile pour distribuer Hisse proprement

Pi permet de packager :

- extensions
- skills
- prompts
- themes

via npm ou git.

### Pourquoi c’est utile pour Hisse

À terme, Hisse pourra être distribué comme :

- une extension Pi
- éventuellement un bundle avec prompts/skills/thèmes
- potentiellement un package installable par projet ou globalement

### Intérêt concret

- installation propre
- versioning
- partage d’un setup complet
- activation/désactivation via `pi config`

### Vision plausible

À moyen terme, Hisse pourrait devenir un **package Pi** qui embarque :

- l’extension métier
- des prompts utilitaires
- éventuellement des skills de workflows récurrents
- une UI terminal dédiée

---

## 13. Subagents : Pi n’en a pas nativement, mais il laisse les construire

C’est un point central pour votre vision.

### Position de Pi

Pi n’a pas de subagents intégrés, volontairement.

### Mais l’exemple upstream montre que c’est faisable

L’exemple :

- `examples/extensions/subagent/`

montre une approche où l’extension lance d’autres processus Pi avec :

- contexte isolé
- modèles/outils dédiés
- output streamé
- agents spécialisés (`scout`, `planner`, `reviewer`, `worker`)

### Ce qu’il faut en retenir pour Hisse

Vous n’êtes pas bloqué par l’absence de subagents natifs.
Vous pouvez choisir explicitement votre modèle :

- sous-processus Pi isolés
- workers spécialisés
- outils-agents avec prompts dédiés
- plus tard, orchestration depuis votre app

Donc Pi n’empêche pas votre cible ; il vous laisse juste la construire vous-même.

---

## 14. Plan mode : même logique

Pi n’a pas de plan mode natif, mais fournit un exemple complet :

- `examples/extensions/plan-mode/`

### Ce que montre cet exemple

On peut, via extension :

- restreindre les tools actifs
- filtrer des commandes bash
- piloter des modes de travail
- afficher un widget de progression
- extraire un plan et suivre son exécution

### Pourquoi c’est important pour Hisse

Cela prouve qu’on peut implémenter des **modes de gouvernance** par extension, par exemple :

- exploration
- cadrage
- PRD
- SRS
- shaping
- exécution
- vérification

Donc les “modes” Hisse peuvent très bien être une combinaison de :

- stage métier dans le domaine
- outils autorisés/interdits
- UI dédiée
- hooks de validation

---

## 15. Ce qu’il faut retenir pour le design Hisse

### A. Pi doit rester l’orchestrateur conversationnel

Pi est très bien pour :

- dialoguer
- appeler des outils
- streamer
- tenir la session
- offrir le TUI
- embarquer l’agent dans une app

### B. Hisse doit rester la source de vérité métier

Le domaine Hisse doit décider :

- quels états existent
- quelles transitions sont légales
- quelles actions sont autorisées
- quelles validations sont nécessaires
- quels artefacts doivent exister avant de passer au stage suivant

### C. Le LLM ne doit pas porter la logique critique

Le LLM peut :

- proposer
- analyser
- résumer
- générer
- choisir le bon tool

Mais il ne doit pas être l’arbitre final de la machine à états.

### D. Les skills ne doivent pas redevenir le centre

Les skills sont utiles, mais seulement comme support.
Le coeur doit être dans :

- le domaine
- les tools
- les hooks
- l’app

---

## 16. Guide pratique : quel mécanisme utiliser pour quoi ?

### Utiliser un tool custom quand…

- on veut une action métier explicite
- on veut une validation déterministe
- on veut exposer une capacité au LLM
- on veut contrôler précisément l’I/O

Exemples :

- créer un projet
- avancer un stage
- enregistrer une validation
- lancer une génération cadrée

### Utiliser un hook d’extension quand…

- on veut observer ou bloquer un comportement
- on veut injecter du contexte
- on veut modifier l’UX de manière globale

Exemples :

- bloquer un write interdit
- changer les tools actifs selon le stage
- injecter le contexte métier avant le tour agent

### Utiliser `appendEntry()` quand…

- l’état concerne la session Pi
- ce n’est pas la vérité métier projet

Exemples :

- projet actif
- mode UI local
- préférence temporaire

### Utiliser les `details` d’un tool result quand…

- l’état doit suivre naturellement les branches/forks de session
- il est attaché au résultat d’un tool

### Utiliser le SDK quand…

- on construit l’app future
- on veut piloter Pi depuis Node
- on veut composer plusieurs agents/outils/programmes

### Utiliser RPC quand…

- on veut une frontière process
- l’app n’est pas en Node
- on veut intégrer depuis un autre langage

### Utiliser un skill quand…

- on veut enseigner une procédure ou une méthode
- on veut fournir des scripts/références
- on accepte que ce soit encore du guidage LLM

### Utiliser un prompt template quand…

- on veut un raccourci textuel de workflow
- on veut une commande opératoire pratique

---

## 17. Exemples upstream à réutiliser pour Hisse

Les exemples Pi les plus pertinents pour ce projet sont :

### Pour la gouvernance / sécurité

- `examples/extensions/permission-gate.ts`
- `examples/extensions/protected-paths.ts`
- `examples/extensions/confirm-destructive.ts`
- `examples/extensions/dirty-repo-guard.ts`

### Pour les modes de travail

- `examples/extensions/plan-mode/`
- `examples/extensions/tools.ts`
- `examples/extensions/preset.ts`

### Pour l’UI terminal

- `examples/extensions/status-line.ts`
- `examples/extensions/widget-placement.ts`
- `examples/extensions/custom-footer.ts`
- `examples/extensions/modal-editor.ts`
- `examples/extensions/overlay-qa-tests.ts`

### Pour les agents spécialisés

- `examples/extensions/subagent/`

### Pour l’embarqué applicatif

- `examples/sdk/01-minimal.ts`
- `examples/sdk/05-tools.ts`
- `examples/sdk/06-extensions.ts`
- `examples/sdk/11-sessions.ts`
- `examples/sdk/12-full-control.ts`

---

## 18. Résumé exécutable

Si on réduit cette note à l’essentiel :

1. **Pi est adapté à Hisse** parce qu’il est volontairement minimal et extensible.
2. **Le coeur métier doit rester hors du LLM**.
3. **Les extensions Pi sont la bonne surface** pour connecter Hisse au runtime agent.
4. **Les tools sont le point d’entrée principal** du lifecycle déterministe.
5. **Le TUI permet déjà une bonne UX terminal** sans attendre l’app finale.
6. **Le SDK est la vraie porte d’entrée pour l’app future**.
7. **Les skills et prompts restent utiles, mais secondaires**.
8. **Subagents et plan mode sont faisables** via extensions, même s’ils ne sont pas natifs.

---

## 19. Pour la suite du projet

Cette note sert de base documentaire locale.

Les prochaines notes utiles à produire ici seraient probablement :

1. une **architecture cible Hisse sur Pi**
2. une **spécification du moteur de state machine**
3. une **cartographie des tools métier à créer**
4. une **stratégie d’intégration app (SDK vs RPC)**
5. une **stratégie subagents / workers spécialisés**

---

## 20. Important : les emplacements d’extensions ne concernent surtout que le mode Pi “classique”

Le point à bien garder en tête :

- les dossiers comme `~/.pi/agent/extensions/` et `.pi/extensions/`
- la découverte automatique des skills/prompts/themes
- le `/reload` basé sur ces ressources

… concernent principalement le **mode Pi standalone / CLI / TUI**.

### Ce que ça veut dire pour Hisse

Pour Hisse aujourd’hui, ces emplacements sont utiles pour :

- développer vite
- tester l’extension dans Pi
- profiter de l’auto-discovery et du `/reload`

Mais ce n’est **pas du tout** une contrainte d’architecture pour le produit final.

### Dans l’app finale

Si Hisse devient une app (par exemple Electron), vous n’êtes pas obligé de :

- déposer une extension dans `~/.pi/agent/extensions/`
- exposer un dossier `.pi/extensions/`
- laisser l’utilisateur voir ou manipuler les extensions comme des fichiers séparés

Vous pouvez au contraire :

- **bundler l’extension Hisse dans l’application**
- créer la session agent via le **SDK**
- enregistrer les extensions directement en mémoire
- contrôler complètement le chargement des tools, prompts, skills, providers, thèmes

Autrement dit :

- **mode dev / harness Pi** → extension sur disque
- **mode app embarquée** → extension chargée par code, sans discovery publique nécessaire

---

## 21. Cas cible : app Electron / app embarquée

Dans une app Electron, le plus logique n’est probablement pas d’exposer le TUI Pi tel quel, mais plutôt de :

1. utiliser **Pi comme runtime agentique via le SDK**
2. réutiliser vos extensions Hisse comme code applicatif embarqué
3. piloter les sessions depuis votre UI maison
4. stocker ou non les sessions Pi selon vos besoins

### Ce qu’on bundle dans l’app

Typiquement, l’app peut embarquer :

- le domaine Hisse
- les reducers / state machines
- les tools Hisse
- les extensions Pi utiles
- éventuellement des prompts/skills internes
- éventuellement des agents spécialisés

### Ce qu’on n’est pas obligé d’exposer

On n’est pas obligé d’exposer à l’utilisateur final :

- les commandes `/...` de Pi
- l’arborescence `~/.pi/...`
- la mécanique de `pi install`
- les ressources comme packages séparés

Tout cela peut rester une **implémentation interne**.

### Chargement embarqué

Côté SDK, Pi permet déjà de charger des extensions sans passer par l’auto-discovery disque, notamment via :

- `DefaultResourceLoader` avec `extensionFactories`
- ou, plus radicalement, une intégration totalement contrôlée

Donc le bon modèle mental est :

- **Pi CLI** = shell prêt à l’emploi
- **Pi SDK** = moteur embarquable

Et pour votre cible produit, c’est surtout **Pi SDK** qui compte.

### Persistance : disque ou mémoire

Oui, vous pouvez aussi aller vers de l’**in-memory** si c’est ce que vous voulez.

Pi permet par exemple :

- `SessionManager.inMemory()` pour ne pas persister la session Pi sur disque
- `SettingsManager.inMemory()` pour ne pas dépendre des settings fichiers
- un chargement contrôlé des ressources

Donc plusieurs stratégies sont possibles.

#### Option A — Full mémoire

Utile si :

- vous voulez une session purement volatile
- l’app garde elle-même l’historique ailleurs
- Pi ne doit être qu’un runtime temporaire

#### Option B — Persistance applicative custom

Utile si :

- vous voulez sauver l’historique dans votre propre base
- vous voulez synchroniser plusieurs vues / utilisateurs / processus
- vous ne voulez pas dépendre du format de session Pi comme stockage principal

Dans ce cas, la session Pi peut être :

- soit en mémoire
- soit persistée, mais considérée comme un cache technique

#### Option C — Persistance Pi locale

Utile si :

- vous voulez aller vite
- vous voulez réutiliser le système de session Pi tel quel
- vous acceptez que l’historique agent soit stocké comme une donnée locale technique

### Recommandation pour Hisse

Pour l’instant :

- **harness / proto terminal** → continuer avec la forme extension Pi sur disque
- **app future** → penser en priorité **SDK embarqué + chargement bundlé**
- **stockage métier** → continuer à le séparer du stockage conversationnel Pi

Le point essentiel est celui-ci :

> la doc Pi sur les emplacements de ressources est surtout une doc d’exploitation du harness Pi lui-même, pas une limite de conception pour une app embarquée.

