# Plano de Implementacao (3 Dias)

## Dia 1 - Fundacao e infraestrutura

- Criar monorepo e projetos base (`backend`, `extension-professor`, `extension-aluno`).
- Configurar `docker-compose.yml` com `postgres`, `redis`, `emqx`, `backend`.
- Implementar auth backend (`register/login`, JWT, hash senha).
- Definir contratos MQTT compartilhados (`packages/shared-mqtt-contracts`).
- Subir conexao MQTT no backend e publicar/assinar topicos base.

**Saida esperada:**
- Ambiente sobe com um comando.
- Login funcional nas extensoes (mock UI inicial).

## Dia 2 - Fluxos funcionais principais

- Implementar presenca com heartbeat + TTL Redis.
- Implementar chat realtime com persistencia PostgreSQL.
- Implementar solicitacao de screenshot ponta a ponta:
  - request professor
  - captura aluno
  - response professor
- Armazenar screenshot em storage (ou base64 temporario com plano de migracao).
- Criar historico de chat e screenshot no backend.

**Saida esperada:**
- Demo funcional: login, online/offline, chat, screenshot.

## Dia 3 - Qualidade, carga e hardening

- Testes unitarios/integracao e cobertura >= 90% em backend/extensoes.
- Script de carga:
  - baseline 10 professores / 50 alunos
  - stress 100 professores / 500 alunos (se suportado)
- Medir e reportar:
  - latencia media e p95/p99 de chat
  - sucesso/perda
  - tempo de resposta screenshot
  - conexoes simultaneas maximas
- README final com decisoes, QoS, topicos e instrucoes operacionais.

**Saida esperada:**
- Projeto pronto para avaliacao tecnica.

## Checklist de pronto

- [ ] `docker compose up --build` funcional.
- [ ] Chat realtime com persistencia.
- [ ] Presenca por TTL em Redis.
- [ ] Screenshot sob demanda funcionando.
- [ ] Testes + cobertura >= 90%.
- [ ] Load test executavel e documentado.
- [ ] README completo com justificativas tecnicas.
