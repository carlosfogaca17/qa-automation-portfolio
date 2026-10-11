# 0002. Playwright para Web e API

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

Era necessário escolher ferramentas de automação para as camadas Web (UI) e API.
Opções consideradas: Cypress + Supertest, Selenium + RestAssured,
Playwright para ambos.

## Decisão

Utilizar **Playwright** tanto para testes de UI quanto para testes de API,
aproveitando o `APIRequestContext` para chamadas HTTP e o runner nativo para
ambos os cenários. TypeScript como linguagem única.

## Consequências

### Positivas

- Uma única ferramenta e linguagem para duas frentes — menor curva de aprendizado.
- `APIRequestContext` integrado elimina dependências externas para API.
- Comunidade ativa, execução paralela nativa e relatórios built-in.

### Negativas / Trade-offs

- Ecossistema de API menos rico que clientes dedicados (ex.: RestAssured).
- Para contratos muito complexos, pode ser necessário complementar com outras
  ferramentas no futuro.
