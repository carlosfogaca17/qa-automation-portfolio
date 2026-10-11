# Web — Playwright (UI)

Automação de testes de interface web utilizando **Playwright** + **TypeScript**.

## Estrutura

```
web/playwright/
├── pages/          # Page Objects (POM)
├── tests/          # Especificações de teste (*.spec.ts)
├── utils/          # Helpers e carregadores de dados
├── playwright.config.ts
└── package.json
```

## Executar

```bash
# A partir da raiz do monorepo
npm run test:web

# Modo interativo (UI do Playwright)
npm run test:web:ui

# Diretamente no módulo
npm run test
npm run test:headed
npm run report
```

## Site alvo dos exemplos

Os testes de exemplo usam o **Sauce Demo** (`https://www.saucedemo.com`), um site
público de prática. A URL pode ser sobrescrita via variável de ambiente:

```bash
BASE_URL=https://minha-app.com npm run test:web
```

## Padrões adotados

- **Page Object Model (POM)** para separar seletores/ações das asserções.
- Massa de dados centralizada em `../../test-data/`.
- Relatórios em HTML e JSON (JSON salvo em `reports/web/`).
