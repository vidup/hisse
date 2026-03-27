# Chatbot Architecture

> Architecture cible du système de chat Hisse. Le chat est un sous-domaine produit possédé par Hisse. Pi est un moteur d'exécution et un fournisseur de transcript brut, pas la source de vérité canonique du produit.

---

## Objectif

Le système de chat doit permettre de :

- démarrer une conversation avec un agent
- envoyer des messages dans une conversation existante
- streamer la réponse de l'agent
- relire une conversation sans dépendre d'un state interne provider
- conserver les traces brutes provider pour audit, debug et réparation

L'objectif n'est pas de répliquer tout le modèle interne de Pi. L'objectif est de posséder un modèle produit stable du chat, tout en continuant à bénéficier de la puissance de Pi pour l'exécution et le transcript brut.

---

## Décision Principale

La décision structurante est la suivante :

- `Conversation` est l'aggregate root du chat
- `Message` est une entité interne à l'aggregate `Conversation`
- Hisse possède le modèle canonique du chat
- Pi exécute la conversation et produit un transcript brut en infrastructure

En conséquence :

- le write-side du domaine expose un `ConversationRepository`
- il n'y a pas de `MessageRepository` exposé comme port métier principal
- le stockage physique peut rester séparé entre métadonnées de conversation, messages canoniques et transcript brut Pi
- les queries de lecture UI lisent le modèle canonique Hisse, jamais directement le state interne de Pi

---

## Pourquoi Cette Direction

Cette architecture résout la tension entre deux besoins légitimes :

- ne pas dupliquer inutilement la logique et la persistance de Pi
- ne pas laisser le produit dépendre du format ou du state interne de Pi

Pi peut parfaitement rester la source de vérité technique de bas niveau :

- événements bruts
- signatures
- reasoning
- usage tokens
- références provider

Mais Hisse doit posséder la source de vérité produit de haut niveau :

- quelles conversations existent
- quels messages l'utilisateur et l'agent ont échangés
- quel est le statut d'un message
- ce que l'UI affiche
- ce qui peut être recherché, filtré, réparé ou rejoué

La règle est simple :

- ce que le produit affiche ou manipule durablement appartient au modèle canonique Hisse
- ce qui est purement provider, debug ou compatibilité reste dans le transcript brut infra

---

## Frontière De Responsabilité

### Hisse possède

- `Conversation`
- `Message`
- l'ordre des messages
- le statut métier d'une conversation
- le statut métier d'un message
- les références nécessaires à l'UI et aux queries

### Pi possède

- l'exécution d'un prompt
- la session provider
- les événements de streaming bruts
- le transcript technique détaillé

### L'application/adaptateur fait le pont

L'application et l'adapter runtime traduisent :

- les événements Pi vers des événements de streaming normalisés
- les événements de streaming vers des mutations du modèle canonique Hisse

Le domaine ne lit pas de JSON Pi. Le domaine manipule des conversations et des messages.

---

## Modèle Canonique

Le modèle canonique doit rester volontairement petit au départ.

### Conversation

`Conversation` est l'aggregate root.

Champs minimaux :

- `id`
- `agentId`
- `title`
- `status`
- `createdAt`
- `updatedAt`
- `providerSessionRef?`

Responsabilités :

- contenir l'historique canonique des messages
- garantir l'ordre logique des messages
- garantir qu'une seule réponse assistant est en cours de streaming à un instant donné
- porter les transitions d'état globales de la conversation

### Message

`Message` est une entité de `Conversation`.

Champs minimaux :

- `id`
- `conversationId`
- `role`
- `sequence`
- `contentText`
- `status`
- `createdAt`
- `completedAt?`
- `error?`
- `providerMessageRef?`

Au départ, `contentText: string` suffit.

Si le produit doit plus tard afficher :

- du contenu structuré
- des pièces jointes
- des citations
- des tool calls visibles
- des blocs riches

alors le modèle canonique pourra évoluer vers un contenu structuré. Cette évolution ne justifie pas de faire fuiter dès maintenant tout le schéma Pi dans le domaine.

---

## Aggregate Et Repository

Le choix d'aggregate root n'impose pas un format de stockage monolithique.

Principe :

- `Conversation` définit la frontière de cohérence
- `ConversationRepository` expose cette frontière
- l'infrastructure est libre d'éclater le stockage derrière

### Port métier recommandé

```ts
interface ConversationRepository {
  findById(id: ConversationId): Promise<Conversation | null>;
  findAll(): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
}
```

### Pourquoi pas de MessageRepository métier séparé

Un `MessageRepository` métier séparé introduirait un risque de contournement des invariants :

- ajout d'un message hors conversation
- séquence incohérente
- plusieurs messages assistant `streaming`
- écriture directe d'un état illégal

Le message n'a de sens que dans la conversation. Les invariants importants vivent au niveau conversation. C'est donc cette frontière qui doit être exposée par le domaine.

---

## Invariants Métier

Les invariants suivants doivent être protégés par l'aggregate `Conversation` :

- un message appartient à une seule conversation
- les messages ont une séquence strictement croissante dans une conversation
- on ne démarre pas un nouveau message assistant `streaming` tant qu'un autre n'est pas terminé
- un message `completed`, `failed` ou `cancelled` n'accepte plus de delta
- `updatedAt` de la conversation reflète la dernière mutation du transcript canonique
- si la conversation est fermée, aucun nouveau message ne peut être ajouté

Ces invariants sont métier. Ils ne doivent pas dépendre du provider.

---

## Runtime Port

Le runtime doit être normalisé et réduit à ce dont l'application a besoin pour mettre à jour le modèle canonique.

```ts
type ChatRuntimeEvent =
  | { type: "text_delta"; delta: string }
  | { type: "done" }
  | { type: "error"; error: string };

interface ChatRuntime {
  createSession(params: {
    conversationId: string;
    systemPrompt: string;
    provider: string;
    model: string;
  }): Promise<void>;

  resumeSession(conversationId: string): Promise<void>;

  prompt(conversationId: string, input: string): AsyncIterable<ChatRuntimeEvent>;
}
```

Le port runtime n'expose pas le state interne de Pi. Il expose un contrat applicatif stable.

---

## Transcript Brut Provider

Le transcript provider doit être conservé tel quel en infrastructure.

Exemples de contenu brut :

- événements bruts Pi
- signatures
- reasoning
- usage tokens
- références techniques provider

Ce transcript brut sert à :

- l'audit
- le debug
- la réparation
- la migration
- la relecture technique en cas d'incident

Ce transcript brut ne doit pas servir directement l'UI ni les queries métier.

### Port infra possible

```ts
interface ProviderTranscriptStore {
  append(conversationId: string, rawEvent: unknown): Promise<void>;
  read(conversationId: string): Promise<unknown[]>;
}
```

Ce port est infra. Ce n'est pas un repository métier.

---

## Projection Canonique

Le transcript canonique Hisse est une projection stable et possédée par Hisse.

Le runtime Pi produit des événements bruts, puis l'application :

- crée ou reprend la conversation
- ajoute le message utilisateur
- crée un message assistant en statut `streaming`
- replie les `text_delta` dans le contenu canonique du message assistant
- finalise le message en `completed` ou `failed`

Cette projection doit être persistée au fur et à mesure. La relecture d'une conversation ne doit pas dépendre d'une reconstruction depuis le provider.

---

## Flux Applicatifs

### StartConversation

1. Résoudre l'agent et son contexte
2. Créer la `Conversation`
3. Ajouter le message utilisateur
4. Créer la session provider
5. Ajouter un message assistant `streaming`
6. Streamer les deltas
7. Mettre à jour le message assistant à chaque delta
8. Finaliser le message assistant en `completed` ou `failed`
9. Sauvegarder la conversation

### SendMessage

1. Charger la `Conversation`
2. Vérifier les invariants
3. Ajouter le message utilisateur
4. Reprendre la session provider
5. Ajouter un message assistant `streaming`
6. Streamer les deltas
7. Mettre à jour le message assistant à chaque delta
8. Finaliser le message assistant
9. Sauvegarder la conversation

### GetConversation

1. Charger la conversation canonique
2. Retourner la timeline canonique

Cette query ne doit pas dépendre d'un `session.agent.state.messages` provider.

---

## Stockage Physique Recommandé

Le stockage physique peut être éclaté sans exposer plusieurs repositories métier.

Exemple de structure :

```text
.hisse/
  conversations/
    <conversationId>/
      conversation.json
      messages/
        000001_<messageId>.json
        000002_<messageId>.json
      providers/
        pi/
          <session>.jsonl
```

Interprétation :

- `conversation.json` contient les métadonnées globales
- `messages/*` contient le transcript canonique Hisse
- `providers/pi/*` contient le transcript brut provider

Le `ConversationRepository` est libre d'utiliser cette structure en interne.

---

## Query Side

Le read-side peut rester pragmatique.

Recommandations :

- les queries UI lisent le transcript canonique Hisse
- les listes de conversations peuvent être optimisées indépendamment
- les besoins de recherche ou de filtrage peuvent être servis par des query services

Le fait d'avoir un seul repository métier côté write n'interdit pas d'avoir des query services séparés côté read.

---

## Ce Qu'il Faut Éviter

- lire directement les messages depuis le state interne de Pi pour servir l'UI
- exposer un `MessageRepository` métier qui contourne les invariants de `Conversation`
- modéliser tout le schéma Pi dans le domaine par anticipation
- faire du transcript brut provider la source de vérité produit
- rendre la relecture d'une conversation dépendante de la reprise réussie d'une session provider

---

## Décisions Concrètes

Les décisions d'architecture retenues sont :

- `Conversation` est l'aggregate root du sous-domaine chat
- `Message` est une entité de `Conversation`
- le write-side expose un seul `ConversationRepository`
- le transcript canonique Hisse est la source de vérité produit
- Pi reste le moteur d'exécution et le transcript brut technique
- le transcript brut Pi est conservé en infrastructure
- les queries lisent le modèle canonique Hisse
- l'évolution future vers un contenu structuré reste possible sans contaminer le domaine avec le format provider

---

## Conséquence Sur Le Code Existant

La direction cible implique :

- ne plus relire les conversations depuis le state runtime provider
- déplacer la logique de reconstitution de la timeline dans le modèle canonique Hisse
- faire du runtime Pi un adaptateur de streaming, pas un repository de messages
- persister explicitement le transcript canonique du chat

En d'autres termes :

- Pi sait exécuter
- Hisse sait représenter

Cette séparation est la frontière de responsabilité recherchée.
