# API — Playwright

Automação de testes de API REST utilizando o **APIRequestContext** do Playwright
+ **TypeScript** (sem necessidade de browser).

## Estrutura

```
api/playwright/
├── clients/         # Cliente HTTP reutilizável
├── tests/           # Especificações de teste (*.spec.ts)
├── utils/           # Helpers e asserções customizadas
├── playwright.config.ts
└── package.json
```

## Executar

```bash
# A partir da raiz do monorepo
npm run test:api

# Diretamente no módulo
npm run test
npm run report
```

## API alvo dos exemplos

Os exemplos usam a **ServeRest** (`https://serverest.dev`), uma API REST pública
gratuita para prática. A URL pode ser sobrescrita:

```bash
API_URL=https://minha-api.com npm run test:api
```

## Padrões adotados

- Cliente HTTP encapsulado (`ApiClient`) para reuso.
- Validação de **status code** + **contrato** (estrutura do body).
- Dados dinâmicos (e-mail único com `Date.now()`) para evitar colisões.
- Relatório JSON salvo em `reports/api/`.
