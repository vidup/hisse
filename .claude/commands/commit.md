---
name: commit
description: "Commit les changements stages avec le format du projet"
---

# Commande commit

Cree un commit Git en suivant strictement le format du projet.

## Format

```
feat (package): description courte
```

- **Une seule ligne**, jamais de body multi-ligne
- **Jamais de `Co-Authored-By`**
- Le `package` correspond au contexte de travail actuel (ex: `run-minimale`, `transitions`, `weapons`)
- La description est concise et en minuscules

## Workflow

1. `git status` pour voir les fichiers modifies/stages
2. `git diff --cached --stat` pour comprendre les changements stages
3. `git log --oneline -5` pour verifier le package en cours et le style
4. Si rien n'est stage, stager les fichiers pertinents (jamais `.env`, credentials, ou `.claude/settings.local.json`)
5. Deduire le nom du package depuis les commits recents
6. Rediger un message d'une ligne au format `feat (package): description`
7. Committer

## Argument optionnel

Si l'utilisateur passe un argument (ex: `/commit rename arena_boss`), l'utiliser comme base pour la description. Sinon, deduire depuis le diff.

## Exemples

```
feat (run-minimale): scope 3
feat (transitions): add arena_transition scene and routing
feat (weapons): port plasma cutter from Rust
```
