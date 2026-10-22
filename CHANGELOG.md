# CHANGELOG

Tous les changements notables apportés à ce projet sont documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte le [Versioning Sémantique](https://semver.org/lang/fr/).

## [1.0.0] - 2026-10-22

### Added
- Portfolio configurable : front public + admin caché, sections dynamiques, SEO
- 22 thèmes (dark-matter, neon-pulse, …) switchables à chaud via variables CSS
- Sections dynamiques : créer, modifier, supprimer, réordonner (drag & drop), archiver vs suppression définitive
- Administration cachée : authentification, mot de passe hashé, rate limiting sur les connexions
- Mode éphémère : le contenu survit aux hébergeurs sans stockage persistant (snapshots, sauvegardes)
- Base de données SQLite locale (better-sqlite3) avec journal d'actions et snapshots de config
- Formulaire de contact avec honeypot anti-spam et validation des champs requis

### Changed
- (aucune)

### Fixed
- (aucune)

### Removed
- (aucune)
