# Brief — Projet démo

## 1) Vision
Créer un générateur d’images ASCII qui combine une conversion algorithmique fiable et un LLM pour styliser le rendu.

## 2) Problème
Les convertisseurs ASCII classiques sont précis mais peu créatifs. Les utilisateurs veulent un rendu plus artistique, piloté par prompt, sans perdre la lisibilité de l’image.

## 3) Cible
- Développeurs / makers
- Utilisateurs terminal / CLI
- Créateurs de contenu “retro” ou “text-art”

## 4) Proposition de valeur
- **Mode fidèle** : image → ASCII propre et contrôlable
- **Mode stylisé (LLM)** : réécriture selon un style/prompt (cyberpunk, minimal, manga, etc.)
- **Export simple** : `.txt` (puis ANSI couleur en option)

## 5) MVP (v1)
1. Upload image (`png`, `jpg`)
2. Conversion ASCII niveaux de gris
3. Réglages : largeur, contraste, charset
4. Option “style prompt” via LLM (post-processing)
5. Export texte

## 6) Hors scope (v1)
- Animation GIF
- Éditeur avancé multi-calques
- Collaboration temps réel

## 7) Contraintes / risques
- Latence/coût LLM
- Perte de structure visuelle après stylisation
- Sorties trop longues si largeur élevée

## 8) KPIs de succès
- Génération < 3 s en mode fidèle
- 80%+ de sorties jugées “lisibles”
- 60%+ des utilisateurs test activent le mode stylisé

## 9) Stack suggérée
- Prétraitement: Pillow / OpenCV
- Backend: Node/TS ou Python
- LLM: API (OpenAI/Anthropic) ou local (Ollama)
- UI: Web légère ou CLI

## 10) Prochaine étape
Passer ce brief en PRD court (objectifs, user stories, critères d’acceptation).