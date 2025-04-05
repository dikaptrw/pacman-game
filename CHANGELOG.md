# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2025-04-05

### Added

- Added the `firestore` listener for real-time high score data updates.

## [2.0.0] - 2025-04-05

### Added

- New touch controls system for mobile devices:
  - Quick tap detection for game actions (300ms threshold) to start and pause the game.
  - Movement detection to distinguish between taps and holds.
- Added the high score storage with Firestore (optional) or local storage.
- Added the player name support alongside high score storage.

### Updated

- Refactored `GameBoard` component by extracting logic into reusable hooks, components, types, and utility functions.
- Improved mobile device detection logic
- Enhanced touch event handling to prevent accidental triggers
- Reduced the number of ghosts in the Pacman game for improved gameplay balance.
- Replaced some game sound effects.
- Adjusted sound logic for better synchronization and behavior.

## [1.0.2] - 2025-03-29

### Updated

- Updated SEO and favicon images.

## [1.0.1] - 2025-03-29

### Fixed

- Fixed wrong metadata URL.

## [1.0.0] - 2025-03-28

### Added

- Initial release of the project.
