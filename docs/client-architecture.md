# Zhengdao Desktop Client Architecture

This repository owns the AGPL Electron desktop client. Cross-client behavior is
managed by the workspace governance document:

- `../../docs/client-platform-governance.md`
- Backend contract package: `../agentx-backend/packages/client-contracts`

## Boundaries

- Desktop UX stays desktop-native: high-density writing workspace, multi-panel
  editor, local-first author workflows, Electron shell, IPC, and desktop release
  packaging.
- Do not copy mobile implementation code into this repository. Shared behavior
  with mobile must come from backend-owned contracts, generated SDK/types,
  sanitized fixtures, or parity tests.
- Pro-only desktop behavior remains thin UI and API calls. Commercial rules,
  entitlements, quota, and point balances belong to Agent X Backend.

## Layers

| Layer | Owner |
| --- | --- |
| UI | React renderer, desktop panels, editor integrations, settings modals |
| Application | writing use cases, AI assistant workflow, draft basket, cloud sync orchestration, conflict decisions |
| Data | `better-sqlite3` repositories in main process, Electron IPC/preload boundary, desktop book package import/export |
| API | Agent X backend contracts and generated SDK route shapes |

## Required Contract Checks

Run the focused desktop parity check when changing cloud sync, auth/account,
AI draft application, entitlement/point display, or shared error handling:

```bash
npm test -- src/main/__tests__/client-contracts.test.ts
```

For cross-repo changes, run from the workspace root:

```bash
scripts/verify-client-platform.sh
```

Desktop may optimize its own implementation for local-first performance, but
the wire contract and golden fixture behavior must remain compatible with
`agentx-backend`.
