# Decisões — raptor-chatbot

## Modelo de interação Discord
Uso do modelo HTTP interactions (Discord POSTs para `/interactions`) em vez de manter uma conexão WebSocket permanente com o gateway do Discord.

## Components v2
Respostas usam a flag `IS_COMPONENTS_V2` com componentes `TEXT_DISPLAY`, sem o campo legado `content`.

---

## Escolhido pelo agente AI

- **`verifyKeyMiddleware` como primeira camada** — autenticação de toda request via `PUBLIC_KEY` antes de qualquer dispatch.
- **Separação `app.js` / `commands.js`** — registro de comandos isolado em arquivo próprio, executado manualmente.
