DESAFIO TÉCNICO
Processo Seletivo — Desenvolvedor(a) Full Stack Pleno




Documento confidencial — Uso exclusivo do processo seletivo
Prazo de entrega: 3 dias corridos após o recebimento

1. Contexto
Você foi selecionado(a) para a fase de desafio técnico do nosso processo seletivo. Este teste tem como objetivo avaliar suas habilidades práticas em desenvolvimento full stack, arquitetura de sistemas em tempo real e qualidade de código.
O desafio consiste em construir um sistema de comunicação em tempo real entre dois perfis de usuário (Professor e Aluno), composto por duas Chrome Extensions, um backend e toda a infraestrutura necessária.


2. Visão Geral do Desafio
Construa um sistema composto por:
2 Chrome Extensions: uma para o perfil Professor e outra para o perfil Aluno.
1 Backend API: responsável pela lógica de negócios, persistência e orquestração da comunicação.
Infraestrutura completa: todos os serviços devem subir com um único comando via Docker Compose.

O sistema deve permitir:
Chat em tempo real entre Professor e Aluno
Captura de screenshot sob demanda: o Professor clica em um botão e recebe instantaneamente o print da tela do Aluno
Script de teste de carga que simula múltiplos professores e alunos simultaneamente, atestando a eficiência e escala do sistema


3. Stack Tecnológica Obrigatoria

Camada
Tecnologia
Backend API
NestJS + TypeScript
Banco de Dados
PostgreSQL
Cache / Sessao
Redis
Mensageria
MQTT via EMQX Broker
Chrome Extensions
Manifest V3 + Next.js + React + TypeScript
Testes
Vitest (cobertura minima de 90%)
Infraestrutura
Docker Compose (tudo sobe com um comando)



4. Requisitos Funcionais
4.1 Chrome Extension do Professor
Autenticação: login com credenciais (email/senha). Token JWT armazenado de forma segura na Extension.
Lista de Alunos Conectados: exibir em tempo real quais alunos estão online. A presença deve ser gerenciada via Redis com TTL.
Chat: enviar e receber mensagens em tempo real com qualquer aluno conectado. As mensagens devem trafegar via MQTT (EMQX) e ser persistidas no PostgreSQL.
Captura de Screenshot: botão que solicita o print da tela do aluno selecionado. O print deve ser capturado instantaneamente e exibido na extensao do Professor. O fluxo deve ser: clique no botao -> comando via MQTT -> Extension do Aluno captura a tela -> imagem retorna via MQTT ou endpoint -> exibição no Professor.
Histórico: visualizar histórico de mensagens e screenshots anteriores.
4.2 Chrome Extension do Aluno
Autenticação: login com credenciais (email/senha). Token JWT.
Presença: ao conectar, o Aluno deve enviar pings periódicos ao backend (via MQTT) para indicar que esta online. O backend registra a presença no Redis com TTL.
Chat: enviar e receber mensagens em tempo real com o Professor. Mensagens via MQTT, persistidas no PostgreSQL.
Captura de Screenshot: ao receber o comando do Professor (via MQTT), capturar o conteúdo visível da aba ativa e enviar de volta. A captura deve usar as APIs do Chrome (chrome.tabs.captureVisibleTab ou similar).
Notificação: exibir indicador visual quando receber nova mensagem.
4.3 Backend API (NestJS)
Autenticação: endpoints de registro e login com JWT + bcrypt.
MQTT: o backend deve se conectar ao broker EMQX como client, publicando e assinando tópicos para orquestrar a comunicação entre Professor e Aluno.
Presença: gerenciar presença dos alunos usando Redis com estratégia de TTL. Endpoint para listar alunos online.
Chat: persistir mensagens no PostgreSQL. Endpoints para consulta de histórico.
Screenshot: orquestrar o fluxo de solicitação e recebimento de screenshots. Persistir imagens (base64 ou storage) e metadados.
Validação: todas as entradas devem ser validadas com Zod ou class-validator.
4.4 Script de Teste de Carga
Desenvolva um script de carga que simule múltiplos professores e alunos conectados simultaneamente, validando a eficiência e a capacidade de escala da aplicação.

Requisitos do script:
Simulação de usuários: o script deve criar conexões MQTT simultâneas simulando no minimo 10 professores e 50 alunos conectados ao mesmo tempo. Quanto maior o volume suportado, melhor sera a avaliação — esperamos que candidatos fortes consigam escalar para 100 professores e 500 alunos ou mais.
Troca de mensagens: cada professor deve enviar mensagens de chat para seus alunos e cada aluno deve responder, gerando trafego bidirecional concorrente.
Solicitação de screenshots: os professores devem disparar solicitações de screenshot em paralelo, e o script deve simular as respostas dos alunos.
Métricas: o script deve coletar e exibir ao final: tempo medio de entrega das mensagens (latência), taxa de mensagens entregues com sucesso vs perdidas, tempo medio de resposta dos screenshots, e numero maximo de ligações simultâneas sustentadas.
Execução: deve ser executável via linha de comando com um unico comando (ex: npm run load-test ou ts-node load-test.ts) e deve funcionar com a infraestrutura Docker Compose ja levantada.
Relatório: ao finalizar, o script deve gerar um resumo no terminal com as métricas coletadas. Opcionalmente, pode gerar um arquivo de relatório (JSON ou texto).


5. Requisitos Tecnicos
5.1 Comunicação MQTT (EMQX)
Toda a comunicação em tempo real (chat, presença, comandos de screenshot) deve trafegar via MQTT utilizando o broker EMQX.
Defina uma estrutura de tópicos clara e organizada (ex: chat/{sessionId}, presence/{userId}, screenshot/request/{userId}, screenshot/response/{userId}).
A autenticação no broker deve utilizar JWT ou credenciais validadas pelo backend.
Utilize o QoS adequado para cada tipo de mensagem (QoS 0, 1 ou 2) e justifique a escolha no README.
5.2 Redis
Presença de alunos: cada aluno envia ping periódico. O backend registra no Redis com TTL (ex: 30 segundos). Se o ping não chega, o aluno e considerado offline.
Cache de sessão: armazenar dados de sessão/token no Redis para validação rápida.
Opcional: cache de mensagens recentes para reduzir consultas ao banco.
5.3 PostgreSQL
Tabelas mínimas: users, messages, screenshots.
Relacionamentos adequados e índices para consultas frequentes.
Migrations versionadas.
5.4 Docker Compose
Todo o ambiente deve subir com um unico comando:

  docker compose up --build

Servicos obrigatórios no docker-compose.yml:
backend (NestJS)
postgresql
redis
emqx

As Chrome Extensions nao precisam estar no Docker (serão carregadas manualmente no navegador), mas devem ter instruções claras de build e instalação.
5.5 Testes
Cobertura minima exigida: 90% em ambos os projetos (backend e extensions).

Backend:
Testes unitários para services, guards, pipes e interceptors.
Testes de integração para os endpoints REST.
Testes para os fluxos MQTT (publicação e assinatura de tópicos).

Chrome Extensions:
Testes unitários para componentes React e hooks customizados.
Testes para a lógica de comunicação MQTT.
Testes para a captura de screenshot.

Ferramenta obrigatória: Vitest. O relatório de cobertura deve ser gerado e incluso no repositório.


6. Critérios de Avaliação

Criterio
Peso
O que observaremos
Funcionalidade
25%
Chat funciona? Screenshot e instantâneo? Presença atualiza?
Arquitetura e Organização
25%
Estrutura de modulos NestJS, separação de responsabilidades, tópicos MQTT bem definidos
Qualidade de Codigo
20%
Clean Code, tipagem TypeScript, tratamento de erros, validações
Cobertura de Testes
20%
Minimo 90% de cobertura. Testes relevantes (não apenas para inflar numero)
Infraestrutura e DevOps
10%
Docker Compose funcional, README claro, facilidade de setup



7. Entregáveis
Repositorio Git (GitHub ou GitLab) contendo todo o código-fonte.
README.md completo com: instrucoes de setup, como rodar (docker compose up), como carregar as extensions no Chrome, estrutura de tópicos MQTT utilizada, decisões arquiteturais e justificativas (ex: escolha de QoS), e como rodar e visualizar os testes.
Relatório de cobertura de testes gerado pelo Vitest (HTML ou texto).
Video curto (3-5 min) demonstrando o sistema funcionando: login, chat em tempo real, screenshot instantâneo, presença online/offline.
Script de teste de carga funcional e documentado, com instruções de execução no README e exemplo do relatório de métricas gerado.


8. Regras e Observações
Prazo: 3 dias corridos apos o recebimento deste documento.
O projeto deve ser desenvolvido individualmente.
E permitido o uso de IA como ferramenta de apoio, porem voce deve ser capaz de explicar cada decisão técnica em detalhes durante a entrevista de revisão.
O repositório deve ter histórico de commits organizado e com mensagens descritivas (commits atômicos).
Não é permitido utilizar templates ou boilerplates prontos para a estrutura principal do projeto.
Duvidas sobre o desafio podem ser enviadas por e-mail. Não sera penalizado por perguntar.


9. Diferenciais (não obrigatórios)
Autenticacao MQTT via JWT validado pelo EMQX (built-in database ou HTTP auth).
Implementar reconexão automática no MQTT das extensions (com backoff exponencial).
Criptografia das mensagens do chat.
Indicador de digitação (typing indicator) no chat.
Paginação no histórico de mensagens.
Testes E2E alem dos unitários e de integração.
Documentação da API com Swagger.
Lint e formatação configurados (ESLint + Prettier).




Boa sorte!
Estamos ansiosos para ver sua solução. Capriche na arquitetura e nos testes.
