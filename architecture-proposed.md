# Arquitetura Proposta

Este documento aplica melhorias na proposta original para facilitar implementacao, escalabilidade e avaliacao tecnica.

## 1) Objetivos Tecnicos

- Manter aderencia total ao desafio: `NestJS`, `PostgreSQL`, `Redis`, `EMQX`, `Chrome Extension MV3`.
- Garantir baixa latencia para chat e screenshot sob carga concorrente.
- Evitar duplicidade de mensagens com QoS 1 e semantica idempotente.
- Facilitar debug com correlacao ponta a ponta.

## 2) Componentes

- **Extensao Professor (MV3 + React/Next):**
  - Login, lista de alunos online, chat, solicitacao de screenshot, historico.
  - Cliente MQTT com reconexao e backoff exponencial.
- **Extensao Aluno (MV3 + React/Next):**
  - Login, heartbeat de presenca, chat, captura `chrome.tabs.captureVisibleTab`.
  - Cliente MQTT com reconexao e backoff exponencial.
- **Backend NestJS:**
  - Modulos: Auth, Presence, Chat, Screenshot, MQTT Gateway, History.
  - Validacao com `class-validator` (ou Zod, se padronizado no projeto).
- **PostgreSQL:**
  - Persistencia de usuarios, mensagens, screenshots e tabela de idempotencia.
- **Redis:**
  - Presenca por TTL.
  - Sessao/cache rapido.
  - Rate limit de screenshot por professor.
- **EMQX:**
  - Transporte realtime.
  - ACL por topico por perfil de usuario.
- **Object Storage (recomendado):**
  - Armazenar imagem de screenshot fora do banco (S3/MinIO).

## 3) Topicos MQTT e Contratos

## 3.1 Topicos

- `presence/student/{studentId}/heartbeat`
- `chat/session/{sessionId}/send`
- `chat/session/{sessionId}/deliver`
- `screenshot/request/{studentId}`
- `screenshot/response/{teacherId}`
- `system/ack/{userId}`

## 3.2 Envelope padrao (todas as mensagens)

```json
{
  "eventId": "uuid",
  "eventType": "CHAT_MESSAGE | SCREENSHOT_REQUEST | SCREENSHOT_RESPONSE | HEARTBEAT",
  "version": 1,
  "timestamp": "2026-03-23T00:00:00.000Z",
  "senderId": "uuid",
  "receiverId": "uuid",
  "sessionId": "uuid",
  "correlationId": "uuid",
  "payload": {}
}
```

## 3.3 QoS por dominio

- **Presenca:** QoS 0 (alta frequencia; perda pontual aceitavel).
- **Chat:** QoS 1 (com idempotencia no backend).
- **Screenshot request/response:** QoS 1 (com timeout e retry controlado).

## 4) Fluxos Criticos

## 4.1 Presenca

1. Aluno publica heartbeat a cada 10s.
2. Backend grava `SETEX presence:student:{id} 30`.
3. Professor consulta endpoint de online.
4. Sem heartbeat por 30s => offline.

## 4.2 Chat

1. Professor/Aluno publica em `chat/session/{sessionId}/send`.
2. Backend consome, valida permissao, verifica idempotencia por `eventId`.
3. Persiste no PostgreSQL.
4. Publica em `chat/session/{sessionId}/deliver`.

## 4.3 Screenshot

1. Professor solicita screenshot do aluno.
2. Backend aplica rate limit e publica `screenshot/request/{studentId}`.
3. Aluno captura tela e envia resposta com `correlationId`.
4. Backend salva imagem em object storage e metadados em PostgreSQL.
5. Backend publica retorno para professor em `screenshot/response/{teacherId}`.

## 5) Modelo de Dados (minimo)

- `users(id, role, email, password_hash, created_at)`
- `messages(id, session_id, sender_id, receiver_id, content, created_at, event_id_unique)`
- `screenshots(id, request_id, teacher_id, student_id, storage_url, captured_at, size_bytes)`
- `idempotency_events(event_id, event_type, processed_at)`

Indices recomendados:

- `messages(session_id, created_at desc)`
- `screenshots(teacher_id, captured_at desc)`
- `idempotency_events(event_id unique)`

## 6) Seguranca

- JWT curto para API.
- MQTT com autenticacao por credencial temporaria e ACL por topico.
- Validacao estrita de payload.
- Nunca confiar em `senderId` enviado pelo cliente sem validar token/sessao.
- Sanitizacao de entrada de chat.

## 7) Resiliencia e Operacao

- Reconexao MQTT com backoff exponencial e jitter nas extensoes.
- Dead-letter/log de falhas de persistencia.
- Timeouts de screenshot (ex.: 8s) e status de expirado.
- Logs estruturados com `eventId`, `correlationId`, `sessionId`.
- Health checks no Docker Compose para `postgres`, `redis`, `emqx`, `backend`.

## 8) Estrutura de Monorepo Recomendada

```text
apps/
  backend/
  extension-professor/
  extension-aluno/
packages/
  shared-types/
  shared-mqtt-contracts/
  shared-utils/
infra/
  docker/
  emqx/
```

## 9) Criterios de aceite tecnicos

- Chat fim a fim com persistencia e latencia p95 dentro da meta definida.
- Presenca online/offline consistente com TTL.
- Screenshot sob demanda com `correlationId` rastreavel.
- Cobertura >= 90% com testes significativos (nao inflados).
- `docker compose up --build` sobe stack completa sem ajustes manuais.
