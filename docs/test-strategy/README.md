# Estratégia de Testes

Define **o que**, **como** e **quanto** testar em cada camada do portfólio.

## 1. Pirâmide de testes aplicada

```
        ╱╲
       ╱  ╲        E2E / UI (poucos)
      ╱────╲       → web/playwright
     ╱      ╲
    ╱────────╲     API / Integração (médio)
   ╱          ╲    → api/playwright
  ╱────────────╲
 ╱              ╲  Unitários / Dados / Performance (base)
╱────────────────╲ → database, performance/k6
```

Regra prática: quanto mais próximo da base, mais rápido e numeroso o teste.

## 2. Escopo por camada

| Camada          | Tipo de teste      | Objetivo                                       |
| --------------- | ------------------ | ---------------------------------------------- |
| **Web (UI)**    | E2E / funcional    | Fluxos críticos do usuário (login, carrinho)   |
| **API**         | Integração/contrato| Endpoints, status codes, payloads, regras      |
| **Database**    | Integridade/dados  | Seed, queries de validação, integridade ref.   |
| **Performance** | Carga/smoke        | Latência, throughput, estabilidade sob carga   |

## 3. Critérios de aceitação (Performance)

Definidos como **thresholds** nos scripts k6:

- `p(95) < 500ms` (smoke) e `p(95) < 800ms` (load).
- Taxa de erro `< 1%` (smoke) e `< 2%` (load).

## 4. Dados de teste

- **Fixtures:** dados fixos e fictícios versionados (`test-data/fixtures/`).
- **Factories:** dados dinâmicos e únicos gerados em runtime (`test-data/factories/`).
- Nunca utilizar dados reais/sensíveis.

## 5. Ambientes

| Ambiente | Uso                          | Configuração                     |
| -------- | ---------------------------- | -------------------------------- |
| Local    | Desenvolvimento dos testes   | Docker + variáveis `.env`        |
| CI       | Validação automática (PR)    | GitHub Actions                   |

## 6. Relatórios

- **Web/API:** HTML (Playwright) + JSON (em `reports/`).
- **Performance:** saída nativa do k6 no terminal.
- Em CI, relatórios são publicados como **artefatos**.

## 7. Riscos e mitigações

| Risco                                  | Mitigação                                  |
| -------------------------------------- | ------------------------------------------ |
| Dependência de APIs públicas           | Isolamento via `baseURL` configurável      |
| Dados mutáveis entre execuções (flaky) | Uso de factories com dados únicos          |
| Seed não reaplicado no Docker          | Documentado o uso de `down -v`             |
