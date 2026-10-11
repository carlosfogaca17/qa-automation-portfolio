# Observabilidade (Prometheus + Grafana)

Este documento descreve a stack de observabilidade do portfólio: **como as métricas
dos testes de performance (k6) e das suítes Web/API (Playwright) são coletadas,
armazenadas e visualizadas**.

## 1. Objetivo

Tornar a execução dos testes **observável**, permitindo:

- Acompanhar, em tempo real, a latência, throughput e taxa de erro dos testes **k6**.
- Visualizar o histórico de resultados (passou/falhou/flaky/skipped) das suítes
  **Playwright** (Web e API).
- Correlacionar performance e qualidade em dashboards unificados no Grafana.

## 2. Componentes

| Componente                | Imagem                     | Porta  | Papel                                                              |
| ------------------------- | -------------------------- | ------ | ----------------------------------------------------------------- |
| **Prometheus**            | `prom/prometheus:v3.0.1`   | 9090   | TSDB; recebe métricas do k6 (Remote Write) e faz scrape do exporter |
| **Grafana**               | `grafana/grafana:11.4.0`   | 3000   | Visualização (dashboards provisionados automaticamente)            |
| **test-metrics-exporter** | build local (Node 20)      | 9101   | Converte relatórios JSON do Playwright em métricas `qa_tests_*`    |

Todos sobem juntos via [`docker/docker-compose.yml`](../../docker/docker-compose.yml).

## 3. Fluxo de coleta

```
                 ┌─────────────────────────── k6 (performance) ───────────────────────────┐
                 │  k6 run --out experimental-prometheus-rw  →  POST /api/v1/write         │
                 └───────────────────────────────────┬────────────────────────────────────┘
                                                     │ (Remote Write)
                                                     ▼
   reports/web/*.json  ──►  test-metrics-exporter  ──scrape──►  ┌─────────────┐      ┌─────────┐
   reports/api/*.json       (métricas qa_tests_*)   (:9101)     │  Prometheus │ ───► │ Grafana │
                                                     ▲         │   (:9090)   │      │ (:3000) │
                                                     └─────────└─────────────┘      └─────────┘
```

### 3.1 Performance (k6 → Prometheus via Remote Write)

O k6 publica métricas diretamente no Prometheus usando o **Remote Write**:

```bash
npm run observability:up   # sobe prometheus + grafana + exporter

K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
k6 run --out experimental-prometheus-rw --tag testid=smoke performance/k6/smoke.test.js
```

> O Prometheus é iniciado com a flag `--web.enable-remote-write-receiver`
> (obrigatória para receber o Remote Write do k6).

#### Nomes das métricas no Prometheus

Todas as métricas do k6 recebem o prefixo `k6_`. Com **Native Histograms** habilitado
(`K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`), os Trends viram histogramas nativos:

| Métrica k6              | Nome no Prometheus              | Tipo     |
| ----------------------- | ------------------------------- | -------- |
| `http_reqs`             | `k6_http_reqs_total`            | Counter  |
| `http_req_failed`       | `k6_http_req_failed_rate`       | Gauge    |
| `http_req_duration`     | `k6_http_req_duration_seconds`  | Histogram|
| `iterations`            | `k6_iterations_total`           | Counter  |
| `vus`                   | `k6_vus`                        | Gauge    |
| `checks`                | `k6_checks_rate`                | Gauge    |
| `data_sent/received`    | `k6_data_sent_total` / `k6_data_received_total` | Counter |

A tag `--tag testid=<id>` vira o **label `testid`**, usado para filtrar execuções
no dashboard (variável `$testid`).

### 3.2 Suítes Web/API (Playwright → Exporter → Prometheus)

O Playwright **não** exporta métricas nativamente para o Prometheus. A estratégia
aqui é um **exporter** Node.js ([`observability/exporter/server.js`](../../observability/exporter/server.js)):

1. Os testes geram um relatório JSON (reporter nativo do Playwright) em
   `reports/<suite>/results.json` — ex.: `reports/web/results.json`, `reports/api/results.json`.
2. O exporter lê esse JSON periodicamente e expõe métricas no formato Prometheus
   em `http://localhost:9101/metrics`.
3. O Prometheus faz **scrape** do exporter (job `playwright-tests`, `scrape_interval: 30s`).

#### Métricas expostas pelo exporter

| Métrica                             | Tipo  | Descrição                                  |
| ----------------------------------- | ----- | ------------------------------------------ |
| `qa_tests_total{suite}`             | Gauge | Total de testes reportados                 |
| `qa_tests_passed{suite}`            | Gauge | Testes que passaram (`expected`)           |
| `qa_tests_failed{suite}`            | Gauge | Testes que falharam (`unexpected`)         |
| `qa_tests_flaky{suite}`             | Gauge | Testes instáveis (`flaky`)                 |
| `qa_tests_skipped{suite}`           | Gauge | Testes ignorados (`skipped`)               |
| `qa_test_suite_duration_seconds`    | Gauge | Duração total da suíte (s)                 |
| `qa_tests_report_timestamp_seconds` | Gauge | Quando o relatório foi atualizado          |

O label `suite` aceita os valores `web` e `api` (configurável via `SUITES`).

## 4. Dashboards (provisionados)

Os dashboards em [`docker/grafana/dashboards/`](../../docker/grafana/dashboards/) são
carregados automaticamente pelo Grafana (via *provisioning*), sem importação manual:

| Dashboard (UID)         | Arquivo                     | Conteúdo                                                       |
| ----------------------- | --------------------------- | -------------------------------------------------------------- |
| `qa-k6-performance`     | `k6-performance.json`       | VUs, throughput, failure rate, checks, p50/p95/p99, dados      |
| `qa-tests-execution`    | `test-results.json`         | Total/passou/falhou, taxa de aprovação, distribuição, duração  |

Acesso: **http://localhost:3000** (usuário/senha padrão `admin`/`admin`).

## 5. Como usar (passo a passo)

```bash
# 1. Subir a stack de observabilidade
npm run observability:up

# 2. Rodar as suítes e gerar os relatórios JSON
npm run test:web      # gera reports/web/results.json
npm run test:api      # gera reports/api/results.json

# 3. Rodar um teste de carga enviando métricas ao Prometheus
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
k6 run --out experimental-prometheus-rw --tag testid=smoke performance/k6/smoke.test.js

# 4. Abrir o Grafana e inspecionar os dashboards
#    http://localhost:3000  →  Dashboards → "QA Portfolio"

# (opcional) Rodar o exporter localmente, sem Docker
npm run exporter:local

# 5. Derrubar a stack
npm run observability:down
```

## 6. Alertas (Prometheus)

As regras ficam em [`docker/prometheus/alerts.yml`](../../docker/prometheus/alerts.yml) e são
carregadas via `rule_files` no `prometheus.yml`. Como as métricas de latência são
**Native Histograms**, os percentis usam `histogram_quantile()`.

| Alerta                | Expressão (resumo)                                             | Severidade |
| --------------------- | -------------------------------------------------------------- | ---------- |
| `K6HighLatencyP95`    | `histogram_quantile(0.95, …) > 0.5` por 2m                      | warning    |
| `K6HighLatencyP99`    | `histogram_quantile(0.99, …) > 1` por 2m                        | critical   |
| `K6HighErrorRate`     | `avg(k6_http_req_failed_rate) > 0.05` por 2m                    | critical   |
| `K6LowChecksSuccess`  | `avg(k6_checks_rate) < 0.95` por 2m                            | warning    |
| `QATestsFailing`      | `sum(qa_tests_failed) > 0`                                     | critical   |
| `QATestExporterDown`  | `up{job="playwright-tests"} == 0` por 1m                        | warning    |

- Visualize em **http://localhost:9090/alerts** (Prometheus) ou crie um painel de
  alertas no Grafana (tipo *Alert list* / datasource Alertmanager).
- **Notificação:** a stack atual **não** inclui Alertmanager; os alertas ficam
  visíveis no Prometheus/Grafana. Para envio a e-mail/Slack, adicione um serviço
  `alertmanager` e a flag `--alertmanager.config.file` no Prometheus.

## 7. Performance no CI

O workflow [`ci-cd/.github/workflows/ci.yml`](../../ci-cd/.github/workflows/ci.yml) possui
um job **`performance`** que:

1. Instala o k6 (`grafana/setup-k6-action@v1`).
2. Executa o **smoke test** com `grafana/run-k6-action@v1` — os *thresholds* do script
   (`p(95)<500ms`, `rate<0.01`) agem como **gate**: o job falha se os SLOs estourarem.
3. Exporta um resumo JSON (`--summary-export`) e publica como artefato `k6-reports`.

> O CI valida os SLOs via *thresholds* (sem exigir a stack Prometheus/Grafana).
> O Remote Write + dashboards é para observabilidade **local** e análise histórica.

## 8. Decisões de projeto

- **Native Histograms** no k6: nome de métrica determinístico
  (`k6_http_req_duration_seconds`) e queries `histogram_quantile()` canônicas.
  Alternativa (gauges por stat) exigiria fixar `K6_PROMETHEUS_RW_TREND_STATS` e
  resultaria em nomes como `k6_http_req_duration_p95`.
- **Exporter em vez de instrumentação direta**: o Playwright não fala com o
  Prometheus nativamente; ler o relatório JSON é desacoplado e não exige
  modificar os testes.
- **Provisionamento declarativo** (datasource + dashboards via arquivos): a stack
  sobe "pronta", favorecendo reprodutibilidade e Infraestrutura como Código.

## 9. Troubleshooting

| Sintoma                                  | Causa provável                         | Ação                                                      |
| ---------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| k6 não envia métricas                    | Remote Write desabilitado              | Confirme a flag `--web.enable-remote-write-receiver`      |
| Painel de latência vazio                 | Native Histogram desabilitado          | Use `K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`     |
| Métricas `qa_tests_*` zeradas            | Relatório JSON não existe              | Rode `npm run test:web` / `test:api` primeiro             |
| Exporter não encontra os relatórios      | Caminho/volume incorreto               | Verifique o mount `../reports:/reports` no Compose        |
| Dashboard não aparece no Grafana         | Provisioning não montado               | Confirme os volumes em `docker/grafana/provisioning`      |
| Alertas não aparecem em `/alerts`        | `alerts.yml` não montado/parseado      | Confira o mount e a sintaxe em `docker/prometheus/alerts.yml` |
| Job `performance` falha no CI            | SLO de latência estourado na API alvo  | Ajuste os thresholds ou use uma API mais estável          |

