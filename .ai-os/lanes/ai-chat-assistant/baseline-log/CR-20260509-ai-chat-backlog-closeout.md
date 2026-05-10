# CR-20260509 AI Chat Backlog Closeout

## Scope

Close the remaining AI chat assistant backlog without adding a new product
surface or changing public API/backend schema.

## Implemented

- All active AI assistant requests resolve global account configuration through
  `getResolvedGlobalAiConfig()` before calling providers.
- Manual context chips are now selectable in the assistant stream area; manual
  policy starts with all chips disabled until the author opts in.
- The assistant composer switches to a stop action while streaming; stopping
  aborts the current request and keeps any received content.
- Conversation titles now display derived or manually renamed titles instead
  of fixed sequence labels. The history drawer exposes a rename action backed
  by the existing `ai:updateConversationTitle` IPC.
- Global provider status checks remain in the AI global settings surface for
  OpenAI, Gemini, Ollama, custom, and Gemini CLI.
- Style analysis no longer runs automatically on modal open. Full-book style
  analysis uses sampled chapter excerpts instead of sending the whole book.

## Verification

- `npm run typecheck`
- `npx vitest run src/renderer/src/utils/ai/__tests__/assistant-workflow.test.ts src/renderer/src/components/ai/__tests__/conversation-list.test.ts src/renderer/src/components/ai/__tests__/use-ai-assistant-request.test.ts src/renderer/src/utils/ai/__tests__/provider-routing.test.ts src/renderer/src/utils/ai/__tests__/global-config-status.test.ts src/main/ai/__tests__/gemini-cli-service.test.ts`

## Residual Runtime Evidence

Private provider live calls still require owner-held keys or local provider
setup. No keys, credentials, provider response logs, or private manuscript
content are committed.
