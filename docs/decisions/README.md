# Architecture Decision Records (ADRs)

Registro das decisões arquiteturais relevantes do projeto, seguindo o formato
[ADR](https://adr.github.io/).

Cada decisão é um arquivo Markdown numerado. Use o template abaixo para novas ADRs.

## Índice

| ADR  | Título                              | Status |
| ---- | ----------------------------------- | ------ |
| [0001](0001-monorepo.md) | Uso de monorepo para o portfólio | Aceito |
| [0002](0002-playwright-web-api.md) | Playwright para Web e API | Aceito |
| [0003](0003-observability-prometheus-grafana.md) | Observabilidade com Prometheus + Grafana | Aceito |

## Template

Copie o modelo abaixo para um novo arquivo `NNNN-titulo.md`:

```markdown
# NNNN. Título da decisão

- **Status:** Proposto | Aceito | Depreciado | Substituído
- **Data:** AAAA-MM-DD

## Contexto

Qual problema ou necessidade motivou a decisão.

## Decisão

O que foi decidido.

## Consequências

Resultados positivos, negativos e trade-offs.
```
