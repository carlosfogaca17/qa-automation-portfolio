# Arquitetura

Este documento descreve a arquitetura do portfólio de automação de QA.

## 1. Princípios

- **Monorepo:** todas as frentes de teste em um único repositório, facilitando
  reuso de configurações, massa de dados e padronização.
- **Separação por camada:** cada estratégia de teste (Web, API, DB, Performance)
  é isolada em seu próprio módulo, com dependências e ciclo de vida próprios.
- **Tudo executável:** cada módulo roda fora da caixa com dependências públicas
  (sites/APIs de prática e Docker local).
- **Documentação como código:** decisões e estratégias versionadas junto ao código.

## 2. Visão de camadas

```
┌─────────────────────────────────────────────────────────────┐
│                         CI/CD (GitHub Actions)                │
│   Orquestra a execução de todas as suítes e publica relatórios │
└───────────────┬───────────────┬───────────────┬─────────────┘
                │               │               │
        ┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼───────┐
        │  Web (UI)    │ │   API       │ │ Performance  │
        │  Playwright  │ │  Playwright │ │    k6        │
        └───────┬──────┘ └──────┬──────┘ └──────────────┘
                │               │
                │        ┌──────▼───────┐
                │        │  Test Data   │
                │        │ (fixtures /  │
                │        │  factories)  │
                │        └──────────────┘
                │
         ┌──────▼───────────────────┐
         │  Database (PostgreSQL)   │
         │  schema / seed / queries │
         │  via Docker Compose      │
         └──────────────────────────┘
```

## 3. Organização de pastas

| Pasta              | Responsabilidade                                     |
| ------------------ | ---------------------------------------------------- |
| `docs/`            | Arquitetura, estratégia de testes e ADRs             |
| `web/playwright/`  | Testes de UI (Page Object Model)                     |
| `api/playwright/   | Testes de API REST (cliente HTTP reutilizável)       |
| `database/`        | Scripts SQL (schema, seed, queries de validação)     |
| `performance/k6/`  | Testes de carga (smoke e load)                       |
| `ci-cd/`           | Pipeline de integração contínua                      |
| `test-data/`       | Massa de dados (fixtures estáticas e factories)      |
| `reports/`         | Saída dos relatórios (não versionada)                |
| `docker/`          | Infraestrutura local (PostgreSQL via Compose)        |

## 4. Fluxo de execução

1. **Local:** dev sobe o Docker (`docker/`) → instala deps (`npm install`) →
   roda as suítes desejadas.
2. **CI:** a cada push/PR, o GitHub Actions instala deps, roda Web + API e
   publica relatórios como artefatos.

## 5. Tecnologias e versões

| Tecnologia     | Versão | Finalidade                    |
| -------------- | ------ | ----------------------------- |
| Node.js        | 20+    | Runtime dos testes            |
| TypeScript     | 5.x    | Tipagem estática              |
| Playwright     | 1.48+  | Automação Web e API           |
| k6             | latest | Testes de performance         |
| PostgreSQL     | 16     | Banco de dados (Docker)       |
| GitHub Actions | —      | CI/CD                         |

## 6. Decisões registradas

As decisões arquiteturais relevantes estão documentadas como ADRs em
[`decisions/`](decisions/).
