# QA Automation Portfolio

Portfólio de automação de testes que reúne diferentes estratégias e ferramentas de
Qualidade de Software em um único repositório (monorepo).

O objetivo é demonstrar, de forma prática e executável, conhecimentos em automação
**Web**, **API**, **Database**, **Performance** e **CI/CD**.

---

## 🧭 Visão geral da arquitetura

| Camada          | Stack principal         | Local                          |
| --------------- | ----------------------- | ------------------------------ |
| Web (UI)        | Playwright + TypeScript | [`web/playwright`](web/playwright) |
| API             | Playwright + TypeScript | [`api/playwright`](api/playwright) |
| Database        | PostgreSQL              | [`database/postgresql`](database/postgresql) |
| Performance     | k6                      | [`performance/k6`](performance/k6) |
| CI/CD           | GitHub Actions          | [`ci-cd`](ci-cd)               |
| Infra local     | Docker Compose          | [`docker`](docker)             |

Documentação complementar em [`docs/`](docs).

---

## 🚀 Como executar

Consulte o guia detalhado em cada módulo. Resumo rápido:

```bash
# 1. Instalar dependências (raiz do monorepo)
npm install

# 2. Subir infraestrutura local (PostgreSQL + seed)
docker compose -f docker/docker-compose.yml up -d

# 3. Testes Web
npm run test:web

# 4. Testes de API
npm run test:api

# 5. Testes de Performance (k6)
npm run test:performance
```

---

## 🗂️ Estrutura de pastas

```
qa-automation-portfolio/
├── docs/            # Documentação (arquitetura, estratégia, ADRs)
├── web/playwright/  # Automação Web (UI)
├── api/playwright/  # Automação de API
├── database/        # Scripts SQL, seed e queries de teste
├── performance/k6/  # Scripts de teste de carga
├── ci-cd/           # Pipelines de integração contínua
├── test-data/       # Massa de dados e factories
├── reports/         # Relatórios gerados (não versionado)
└── docker/          # Infraestrutura como código (Docker Compose)
```

## ✅ Pré-requisitos

- Node.js 20+
- Docker + Docker Compose
- npm 10+
