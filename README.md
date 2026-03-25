# Inicie - Realtime Platform (Desafio Fullstack)

Implementacao em andamento do desafio tecnico com:

- Backend `NestJS + TypeScript`
- `PostgreSQL` para persistencia
- `Redis` para presenca/rate-limit/cache
- `EMQX` para comunicacao MQTT em tempo real
- 2 extensoes Chrome (Professor e Aluno) em `Next.js + React + TypeScript`
- Monorepo com `Turborepo + pnpm workspaces`

---

## 1) Estrutura do projeto

```txt
apps/
  backend/
  extensions/
    professor/
    student/
packages/
  shared-contracts/
docker-compose.yml
```

- `apps/backend`: API NestJS e orquestracao dos fluxos.
- `apps/extensions/*`: UIs iniciais das extensoes.
- `packages/shared-contracts`: contratos MQTT compartilhados (topics + envelopes).

---

## 2) Pre-requisitos

- Node.js 18+ (recomendado 20+)
- pnpm (via Corepack)
- Docker + Docker Compose

---

## 3) Setup rapido

1. Copie variaveis de ambiente:

```bash
cp .env.example .env
```

2. Suba a infraestrutura:

```bash
docker compose up --build
```

Servicos esperados:

- Backend: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/api/health`
- EMQX MQTT: `localhost:1883`
- EMQX WebSocket MQTT: `ws://localhost:8083/mqtt`
- EMQX Dashboard: `http://localhost:18083`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- LocalStack S3 endpoint: `http://localhost:4566`

> Nota: em alguns ambientes, o `pnpm install` pode falhar por restricao de rede. Se ocorrer timeout, execute novamente quando houver acesso ao registry.

---

## 4) Scripts uteis

Na raiz:

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm docker:up
pnpm docker:down
```

---

## 5) Estado atual da implementacao

### Backend

Ja implementado:

- `Auth`: `register/login` com hash (`bcryptjs`) e JWT (`jsonwebtoken`)
- `Presence`: heartbeat com TTL real no Redis
- `Chat`: invariantes de dominio + idempotencia por `eventId` + persistencia em Postgres
- `Screenshot`: request + response com `correlationId`, persistencia e rate limit por professor
- `Storage`: upload de screenshot em S3 compativel via LocalStack
- `Historico`: endpoints para historico de chat e screenshots
- `MQTT Gateway`: conexao ao broker EMQX, subscriptions e handlers para `presence/*`, `chat/*`, `screenshot/response/*`
- `Infra`: `DatabaseService` e `RedisService` com inicializacao automatica

### Extensoes

Ja implementado:

- estrutura MV3 minima
- painel funcional minimo Professor:
  - register/login
  - consulta de alunos online
  - envio de chat
  - solicitacao de screenshot
- painel funcional minimo Aluno:
  - register/login
  - heartbeat periodico
  - envio de resposta de screenshot por `correlationId`

Pendente:

- captura real 100% no contexto MV3 (service worker/background) para fluxo final
- UI final de chat/historico em formato produto

---

## 6) Contratos MQTT (base)

Definidos em `packages/shared-contracts/src/mqtt-contracts.ts`:

- `presence/student/{studentId}/heartbeat`
- `chat/session/{sessionId}/send`
- `chat/session/{sessionId}/deliver`
- `screenshot/request/{studentId}`
- `screenshot/response/{teacherId}`

Envelope padrao com:

- `eventId`, `eventType`, `timestamp`, `senderId`, `receiverId`, `sessionId`, `correlationId`, `payload`

---

## 7) Banco de dados (schema bootstrap atual)

Tabelas criadas automaticamente no startup do backend:

- `users`
- `idempotency_events`
- `messages`
- `screenshots`

> Proximo passo recomendado: migrar esse bootstrap para migrations versionadas.

---

## 8) Fluxos alvo do desafio (resumo)

1. **Presenca**: aluno envia heartbeat -> backend salva TTL Redis -> professor consulta online.
2. **Chat**: professor/aluno publica evento -> backend valida e persiste -> entrega realtime.
3. **Screenshot**: professor solicita -> aluno captura aba ativa -> resposta retorna ao professor.

---

## 9) O que falta para fechar o desafio

### Critico (funcionalidade)

- Implementar extensoes com fluxo real:
  - auth + armazenamento seguro de token
  - chat realtime via MQTT
  - captura e envio de screenshot no Aluno via API nativa do Chrome (fluxo final MV3)
  - exibicao de screenshot e historico no Professor (UI final)
- Persistencia final de screenshot:
  - storage real (S3/LocalStack ja integrado; opcional migrar para S3 gerenciado)

### Qualidade tecnica

- Cobertura de testes com Vitest >= 90% (backend e extensoes)
- Testes de integracao para endpoints e fluxos MQTT
- Script de carga (`10x50` baseline e meta `100x500`) com metricas:
  - latencia media/p95/p99 chat
  - sucesso vs perda
  - tempo de resposta screenshot
  - conexoes simultaneas maximas

### Entrega final

- README final com arquitetura, QoS e decisoes tecnicas
- video de demonstracao (3-5 min)
- relatorio de cobertura e relatorio de carga

---

## 10) Referencias

- EMQX Documentation: https://docs.emqx.com/en/

