SHELL := /bin/bash

AWS_ACCESS_KEY_ID ?= test
AWS_SECRET_ACCESS_KEY ?= test
AWS_DEFAULT_REGION ?= us-east-1
LOCALSTACK_ENDPOINT ?= http://localhost:4566
S3_BUCKET ?= inicie-screenshots

.PHONY: help install dev build test lint typecheck format \
	docker-up docker-up-detached docker-down docker-logs \
	docker-ps \
	backend-dev professor-dev student-dev \
	build-extension-professor build-extension-student build-extensions \
	load-baseline load-stress \
	localstack-s3-init \
	localstack-s3-ls localstack-s3-tree localstack-s3-download-last \
	localstack-s3-rm-all

help:
	@echo "Comandos principais:"
	@echo "  make install                  # Instala dependencias do monorepo"
	@echo "  make dev                      # Turbo dev (todos os apps)"
	@echo "  make backend-dev              # Backend em watch"
	@echo "  make professor-dev            # Extensao professor em localhost:3101"
	@echo "  make student-dev              # Extensao aluno em localhost:3102"
	@echo "  make build-extension-professor # Gera dist instalavel da extensao professor"
	@echo "  make build-extension-student   # Gera dist instalavel da extensao aluno"
	@echo "  make build-extensions          # Gera dist instalavel das duas extensoes"
	@echo "  make build                    # Build geral"
	@echo "  make test                     # Testes gerais"
	@echo "  make lint                     # Lint geral"
	@echo "  make typecheck                # Typecheck geral"
	@echo "  make format                   # Format geral"
	@echo "  make load-baseline            # Load test (baseline 10x50) via Artillery"
	@echo "  make load-stress              # Load test (stress 100x500) via Artillery"
	@echo ""
	@echo "Docker / Infra:"
	@echo "  make docker-up                # Sobe infra + backend (foreground)"
	@echo "  make docker-up-detached       # Sobe infra + backend (background)"
	@echo "  make docker-down              # Derruba containers e volumes"
	@echo "  make docker-logs              # Logs de todos os servicos"
	@echo "  make docker-ps                # Lista containers do compose"
	@echo ""
	@echo "LocalStack S3:"
	@echo "  make localstack-s3-init       # Cria bucket (se nao existir)"
	@echo "  make localstack-s3-ls         # Lista buckets"
	@echo "  make localstack-s3-tree       # Lista objetos do bucket"
	@echo "  make localstack-s3-download-last # Baixa o ultimo screenshot para ./tmp-last-screenshot.png"
	@echo "  make localstack-s3-rm-all     # Remove todos os objetos do bucket"

install:
	pnpm install

dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

typecheck:
	pnpm typecheck

format:
	pnpm format

docker-up:
	docker compose up --build

docker-up-detached:
	docker compose up --build -d

docker-down:
	docker compose down -v

docker-logs:
	docker compose logs -f

docker-ps:
	docker compose ps

backend-dev:
	pnpm --filter @inicie/backend dev

professor-dev:
	pnpm --filter @inicie/extension-professor dev

student-dev:
	pnpm --filter @inicie/extension-student dev

build-extension-professor:
	pnpm --filter @inicie/extension-professor build:extension

build-extension-student:
	pnpm --filter @inicie/extension-student build:extension

build-extensions:
	pnpm --filter @inicie/extension-professor build:extension && \
	pnpm --filter @inicie/extension-student build:extension

load-baseline:
	pnpm run load:baseline

load-stress:
	pnpm run load:stress

localstack-s3-init:
	@set -euo pipefail; \
	echo "Garantindo bucket s3://$(S3_BUCKET) em $(LOCALSTACK_ENDPOINT)"; \
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 mb s3://$(S3_BUCKET) 2>/dev/null || true; \
	echo "OK"

localstack-s3-ls:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 ls

localstack-s3-tree:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 ls s3://$(S3_BUCKET) --recursive

localstack-s3-download-last:
	@set -euo pipefail; \
	KEY=$$(AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 ls s3://$(S3_BUCKET) --recursive | sort | tail -n1 | awk '{print $$4}'); \
	if [[ -z "$$KEY" ]]; then \
	  echo "Nenhum objeto encontrado em s3://$(S3_BUCKET)"; \
	  exit 1; \
	fi; \
	echo "Baixando: $$KEY"; \
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 cp s3://$(S3_BUCKET)/$$KEY ./tmp-last-screenshot.png; \
	echo "Arquivo salvo em ./tmp-last-screenshot.png"

localstack-s3-rm-all:
	AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) AWS_DEFAULT_REGION=$(AWS_DEFAULT_REGION) \
	aws --endpoint-url $(LOCALSTACK_ENDPOINT) s3 rm s3://$(S3_BUCKET) --recursive
