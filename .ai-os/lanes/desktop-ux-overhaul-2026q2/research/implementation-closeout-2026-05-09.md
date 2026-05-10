# Desktop UX Implementation Closeout

Date: 2026-05-09
Owner: codex

## Scope

Close TASK-DUX-005..008 within the confirmed "no new product feature" boundary.
The search surface keeps the existing `searchChapters` backend capability; no
`searchAssets` IPC, schema, or backend capability was added.

## TASK-DUX-005

- TopBar now exposes separate keyboard-friendly entries for "find action"
  (`commandPalette`) and "search content" (`globalSearch`).
- CommandPalette includes a content-search command and keeps action execution
  in the existing command surface.
- GlobalSearch now has explicit chapter-only capability chips, disabled
  future-kind hints, error handling, ArrowUp/ArrowDown/Enter keyboard
  selection, and a confirmation before switching to another book.

## TASK-DUX-006

- AI assistant context chips are selectable so manual context policy has a real
  author confirmation step.
- Streaming requests can be stopped from the composer without discarding
  already received content.
- AI draft application remains behind the existing draft basket and explicit
  confirmation boundary.

## TASK-DUX-007

- This closeout keeps the generated modal ledger current and records modal
  shell consistency as a reviewed state for the active beta scope.
- Broad shell unification remains constrained to existing modal patterns; no
  new shared shell API was introduced in this cleanup sweep.

## TASK-DUX-008

- Style analysis no longer auto-runs on open and full-book analysis uses
  sampled excerpts, reducing surprise provider calls and large prompt overflow.
- AI history labels now show real/generated conversation titles and expose a
  rename action.
- Added focused keyboard and text-overflow polish in GlobalSearch, TopBar, and
  assistant conversation UI.

## Verification

- `npm run typecheck`
- `npm run ux:ledger:check`
- `npx vitest run src/renderer/src/utils/ai/__tests__/assistant-workflow.test.ts src/renderer/src/components/ai/__tests__/conversation-list.test.ts src/renderer/src/components/ai/__tests__/use-ai-assistant-request.test.ts src/renderer/src/utils/ai/__tests__/provider-routing.test.ts src/renderer/src/utils/ai/__tests__/global-config-status.test.ts src/main/ai/__tests__/gemini-cli-service.test.ts`

## Evidence Custody

Manual screenshot/click-path evidence for the beta closeout remains
owner-attested. Private screenshots and manuscript data are not committed.
