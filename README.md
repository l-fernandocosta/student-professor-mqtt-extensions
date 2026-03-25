# Inicie - Realtime Platform (Desafio Fullstack)

Implementação do desafio técnico com:

- Backend `NestJS + TypeScript`
- `PostgreSQL` para persistência
- `Redis` para presença/cache
- `EMQX` para comunicacao MQTT em tempo real
- 2 extensões Chrome (Professor e Aluno) em `Next.js + React + TypeScript` (MV3)
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
- `apps/extensions/*`: extensões MV3 (Professor/Aluno).
- `packages/shared-contracts`: contratos MQTT compartilhados (topics + envelopes).

---

## 2) Pre-requisitos

- Node.js 18+ (recomendado 20+)
- pnpm (via Corepack: `corepack enable`)
- Docker + Docker Compose
- AWS CLI (apenas para comandos `make localstack-*`)

---

## 3) Setup rápido (recomendado)

1. Copie variáveis de ambiente:

```bash
cp .env.example .env
```

2. Instale dependências:

```bash
make install
```

3. Suba a infraestrutura (Postgres + Redis + EMQX + LocalStack + Backend):

```bash
make docker-up-detached
```

Servicos esperados:

- Backend: `http://localhost:${BACKEND_PORT:-3000}`
- Healthcheck: `http://localhost:${BACKEND_PORT:-3000}/api/health`
- EMQX MQTT: `localhost:1883`
- EMQX WebSocket MQTT: `ws://localhost:8083/mqtt`
- EMQX Dashboard: `http://localhost:18083`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- LocalStack S3 endpoint: `http://localhost:4566`

4. (Opcional) Garanta que o bucket exista no LocalStack:

```bash
make localstack-s3-init
```

---

## 4) Rodando em modo dev (sem Docker do backend)

Se preferir rodar o backend localmente (mas mantendo a infra via Docker):

```bash
make docker-up-detached
make backend-dev
```

---

## 5) Extensões (build + instalação no Chrome)

As extensões são geradas como assets estáticos e empacotadas em `dist/`.

1. Build das duas extensões:

```bash
make build-extensions
```

2. Instale no Chrome:

- Abra `chrome://extensions`
- Ative **Developer mode**
- Clique em **Load unpacked**
- Selecione:
  - `apps/extensions/professor/dist`
  - `apps/extensions/student/dist`

> Dica: se você rebuildar, clique em **Reload** em cada extensão no `chrome://extensions`.

---

## 6) Estado atual da implementação

### Backend

Ja implementado:

- `Auth`: `register/login` com hash (`bcryptjs`) e JWT (`jsonwebtoken`)
- `Session cache`: validação rápida de token em Redis (hash do token)
- `Presence`: heartbeat com TTL real no Redis
- `Chat`: invariantes de dominio + idempotencia por `eventId` + persistencia em Postgres
- `Screenshot`: request + response com `correlationId`, persistencia e rate limit por professor
- `Storage`: upload de screenshot em S3 compativel via LocalStack
- `Historico`: endpoints para historico de chat e screenshots
- `MQTT Gateway`: conexao ao broker EMQX, subscriptions e handlers para `presence/*`, `chat/*`, `screenshot/response/*`
- `Infra`: `DatabaseService` e `RedisService` com inicializacao automatica

### Extensoes

Ja implementado:

- estrutura MV3
- painel funcional minimo Professor:
  - register/login
  - lista de alunos online em tempo real (`presence/online`)
  - envio de chat via MQTT
  - solicitação de screenshot
  - histórico de screenshots no chat
- painel funcional minimo Aluno:
  - register/login
  - heartbeat periódico via MQTT (`presence/student/{studentId}/heartbeat`)
  - envio de resposta de screenshot por `correlationId`
  - badge de mensagens novas
  - auto screenshot sempre habilitado

Pendente:

- autenticação no broker (EMQX) por JWT/credenciais (hardening)
- migrations versionadas do schema Postgres
- testes/carga conforme `development.md`

---

## 7) Contratos MQTT (base)

Definidos em `packages/shared-contracts/src/mqtt-contracts.ts`:

- `presence/student/{studentId}/heartbeat`
- `chat/session/{sessionId}/send`
- `chat/session/{sessionId}/deliver`
- `chat/active/{studentId}` (handshake de sessão professor -> aluno)
- `screenshot/request/{studentId}`
- `screenshot/response/{teacherId}`

Envelope padrao com:

- `eventId`, `eventType`, `timestamp`, `senderId`, `receiverId`, `sessionId`, `correlationId`, `payload`

---

## 8) Banco de dados (schema bootstrap atual)

Tabelas criadas automaticamente no startup do backend:

- `users`
- `idempotency_events`
- `messages`
- `screenshots`

> Proximo passo recomendado: migrar esse bootstrap para migrations versionadas.

---

## 9) Fluxos alvo do desafio (resumo)

1. **Presenca**: aluno envia heartbeat -> backend salva TTL Redis -> professor consulta online.
2. **Chat**: professor/aluno publica evento -> backend valida e persiste -> entrega realtime.
3. **Screenshot**: professor solicita -> aluno captura aba ativa -> resposta retorna ao professor.

---

## 10) O que falta para fechar o desafio

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

## 11) Makefile (atalhos)

Veja `make help` para a lista de comandos. Os mais usados:

```bash
make install
make docker-up-detached
make docker-logs
make backend-dev
make build-extensions
```

---

## 12) Guia de testes

### Rodando a suite do monorepo

Na raiz do projeto:

```bash
make test
make typecheck
make lint
```

> Observação: hoje alguns `scripts` de `test`/`lint` ainda estão como placeholder em alguns pacotes. O `typecheck` é o melhor “sinal rápido” que tudo compila.

### Rodando por app (isolado)

- **Backend**:

```bash
pnpm --filter @inicie/backend typecheck
pnpm --filter @inicie/backend test
```

- **Extensão Professor**:

```bash
pnpm --filter @inicie/extension-professor typecheck
pnpm --filter @inicie/extension-professor test
```

- **Extensão Aluno**:

```bash
pnpm --filter @inicie/extension-student typecheck
pnpm --filter @inicie/extension-student test
```

### Testes de carga (Artillery)

Pré-requisitos:

- Infra levantada: `make docker-up-detached`
- Backend saudável: `curl http://localhost:3000/api/health`

Executar:

```bash
make load-baseline
make load-stress
```

O que cada teste faz:

- **HTTP**: autentica (register/login) e exercita endpoints de `presence`, `chat` e `screenshot` com JWT.
- **MQTT**: abre conexões no broker e publica em:
  - `presence/student/{studentId}/heartbeat`
  - `chat/session/{sessionId}/send`

Arquivos:

- `load-tests/artillery/baseline.http.yml`
- `load-tests/artillery/baseline.mqtt.yml`
- `load-tests/artillery/stress.http.yml`
- `load-tests/artillery/stress.mqtt.yml`
- `load-tests/artillery/processors/auth.cjs`

Personalização rápida:

- `LOADTEST_API_BASE`: base HTTP (default `http://localhost:3000/api`)
- `LOADTEST_PASSWORD`: senha usada nos usuários do load test (default `loadtest123`)

---

## 13) Referências

- EMQX Documentation: https://docs.emqx.com/en/

