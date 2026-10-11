# 0003. Observabilidade com Prometheus + Grafana

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

O portfólio cobre performance (k6) e suítes funcionais (Web/API via Playwright).
Sem observabilidade, os resultados ficam restritos a relatórios pontuais
(HTML/JSON/terminal), sem visão temporal, histórico ou correlação entre
performance e qualidade.

Era necessário decidir **como coletar e visualizar métricas** dessas execuções.

## Decisão

Adotar **Prometheus + Grafana** como stack de observabilidade, com dois caminhos
de coleta:

1. **k6 → Prometheus (Remote Write):** o k6 publica métricas diretamente via
   `--out experimental-prometheus-rw`, usando **Native Histograms** para Trends
   (`K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`).
2. **Playwright → Exporter → Prometheus (scrape):** como o Playwright não exporta
   métricas nativamente, um exporter Node.js (`observability/exporter`) lê os
   relatórios JSON (`reports/<suite>/results.json`) e expõe métricas `qa_tests_*`.

Grafana consome o Prometheus via **provisioning declarativo** (datasource e
dashboards em `docker/grafana/`), sem importação manual.

## Consequências

### Positivas

- Visão temporal e histórica de performance (p50/p95/p99, throughput, erros).
- Acompanhamento agregado dos resultados das suítes (passou/falhou/flaky).
- Regras de alerta (p95/p99, error rate, checks, testes falhando) prontas.
- Gate de performance no CI (k6 thresholds) sem exigir a stack de observabilidade.
- Stack sobe "pronta" via Docker Compose; reprodutível e versionada.

### Negativas / Trade-offs

- Native Histograms exigem **Prometheus 3.x** (por isso a imagem é fixada em `v3.0.1`).
- O exporter depende da existência prévia dos relatórios JSON.
- O pacote `prom-client` está em transição para `@prometheus-io/client`.
- **Sem Alertmanager**: os alertas ficam visíveis no Prometheus/Grafana, mas não
  são notificados externamente (e-mail/Slack). É uma extensão futura explícita.

### Mitigações

- Versão do Prometheus fixada no Compose; requisito documentado.
- Documentação (`docs/architecture/observability.md`) com seção de troubleshooting.
- Dashboards com fallback visual quando não há dados.
