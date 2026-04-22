# Changelog

All notable changes to this project will be documented in this file.

The project follows Semantic Versioning for release numbers. Release entries use a simple `Added / Changed / Fixed / Docs / Release` structure so the app package, Git tag, GitHub Release and changelog can stay aligned.

## v1.2.0 - 2026-04-22

### Release

- Add AI creative assistant and Gemini CLI workflow

### Added

- Add the bottom-right AI creative assistant with normal chat, skill cards, conversation history, stream rendering, draggable/resizable panel controls and draft-basket confirmation before writing into novel assets.
- Add global AI account management for Gemini CLI/API-compatible providers and work-level AI profiles for writing prompts, context policy and asset-generation rules.
- Add Gemini CLI login, status detection and default Gemini 3 Pro model routing for CLI-based conversations.

### Changed

- Replace older scattered AI entry buttons with the unified AI assistant and AI capability/profile configuration flow.
- Render structured AI drafts as readable cards for chapters, characters, wiki entries, plot nodes and foreshadowing instead of exposing raw JSON.

### Fixed

- Harden Gemini CLI stream handling for empty/partial stream-json responses and synchronous bridge cleanup.
- Rebuild and verify `better-sqlite3` against the Electron ABI before packaging checks.

### Docs

- Document the AGPL-3.0 license change and AI/Gemini CLI release scope.

## v1.1.5 - 2026-04-21

### Release

- Force Electron ABI rebuild before packaging

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.1.4 - 2026-04-21

### Release

- Fix native module ABI in packaged installers

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.1.3 - 2026-04-21

### Release

- Use ASCII release artifact names

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.1.2 - 2026-04-21

### Release

- Fix unsigned macOS release packaging

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.1.1 - 2026-04-21

### Release

- Fix release CI native module rebuild before packaging

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.1.0 - 2026-04-21

### Release

- Add in-app updates, branded desktop shell, and installer icons

### Changed

- Fill in notable user-facing changes before publishing if more detail is needed.

### Fixed

- Fill in important fixes before publishing if applicable.

### Docs

- Update documentation references if this release changed installation or workflow details.

## v1.0.0 - 2026-04-20

### Added

- First public open-source release of the Zhengdao desktop writing application.
- Immersive editor, role library, setting wiki, plot sandbox, foreshadow board, statistics dashboard, trash and backup workflows.
- GitHub Releases based in-app update flow for packaged builds.

### Docs

- Initial open-source README, contribution guide, security policy, support guide, code of conduct and issue / PR templates.
- Initial maintainer release process and project-level GitHub release skill.

### Release

- Windows x64 installer and macOS Apple Silicon package as the primary public build targets.
- Tagged GitHub Actions release workflow for future packaged releases.
