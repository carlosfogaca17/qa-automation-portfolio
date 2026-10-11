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
| `qa-alerts`             | `alerts.json`               | Resumo firing/pending + lista de alertas (Alertmanager/Prometheus) |

Acesso: **http://localhost:3000** (usuário/senha padrão `admin`/`admin`).

## 5. API local (alvo do k6)

Os testes de performance rodam contra uma **API local** ([ServeRest](https://serverest.dev))
em Docker — o próprio projeto ServeRest recomenda que teste de carga **não** rode no
`serverest.dev` público. O serviço `serverest` (imagem `paulogoncalvesbh/serverest`) sobe na
porta `3000`:

```bash
npm run api:up                       # sobe só a API local (http://localhost:3000)
npm run test:performance:local       # smoke contra a API local
npm run test:performance:local:load  # carga contra a API local
```

O CI (`job performance`) usa a mesma imagem como *service container* em `http://localhost:3000`.

## 6. Como usar (passo a passo)

```bash
# 1. Subir a stack de observabilidade (Prometheus + Grafana + exporter)
npm run observability:up

# 2. Subir a API local (alvo do k6) — recomendado para teste de carga
npm run api:up                     # http://localhost:3000

# 3. Rodar as suítes e gerar os relatórios JSON
npm run test:web      # gera reports/web/results.json
npm run test:api      # gera reports/api/results.json

# 4. Rodar um teste de carga LOCAL enviando métricas ao Prometheus
K6_PROMETHEUS_RW_SERVER_URL=http://localhost:9090/api/v1/write \
K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true \
API_URL=http://localhost:3000 \
k6 run --out experimental-prometheus-rw --tag testid=local performance/k6/smoke.test.js
# (atalho: npm run test:performance:local:observe)

# 5. Abrir o Grafana e inspecionar os dashboards (inclusive "QA Portfolio — Alertas")
#    http://localhost:3000  →  Dashboards → "QA Portfolio"

# (opcional) Notificações por e-mail — requer SMTP no docker/.env
npm run alerting:up

# (opcional) Rodar o exporter localmente, sem Docker
npm run exporter:local

# 6. Derrubar a stack
npm run observability:down
npm run api:down
npm run alerting:down
```

## 7. Alertas (Prometheus)

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

- Visualize em **http://localhost:9090/alerts** (Prometheus) ou no dashboard
  **`QA Portfolio — Alertas`** no Grafana (painel *Alert list* + tabela via PromQL).
- O painel *Alert list* usa o datasource **Alertmanager** (provisionado em
  `docker/grafana/provisioning/datasources/datasource.yml`); a tabela "Estado dos
  alertas" lê a métrica `ALERTS` direto do Prometheus e funciona **mesmo sem** o
  Alertmanager no ar.

### 7.1 Notificação por e-mail (Alertmanager)

O **Alertmanager** recebe os alertas do Prometheus (`alerting:` no `prometheus.yml`) e
envia e-mails via SMTP. Fica em [`docker/alertmanager/alertmanager.yml`](../../docker/alertmanager/alertmanager.yml),
com todas as credenciais via **variáveis de ambiente** (`${VAR}`), sem dados sensíveis
versionados.

Sobe somente com o **profile `alerting`** (não interfere no `up` padrão):

```bash
# 1. Defina as credenciais SMTP no docker/.env (veja docker/.env.example)
# 2. Suba o Alertmanager
npm run alerting:up
#    → Prometheus envia alertas → Alertmanager envia e-mail para $ALERT_RECEIVER_EMAIL

npm run alerting:logs   # acompanha
npm run alerting:down   # para
```

| Variável                | Descrição                          | Exemplo (Brevo)                     |
| ----------------------- | ---------------------------------- | ----------------------------------- |
| `SMTP_SERVER`           | Servidor SMTP (relay)              | `smtp-relay.brevo.com`              |
| `SMTP_PORT`             | Porta (587 = STARTTLS)             | `587`                               |
| `SMTP_FROM`             | Remetente (deve ser autorizado)    | `alertmanager.bot@gmail.com`        |
| `SMTP_USER`             | Usuário/login SMTP                  | `bdb001001@smtp-brevo.com`          |
| `SMTP_PASS`             | Chave SMTP gerada no provedor       | (chave do painel Brevo)             |
| `SMTP_REQUIRE_TLS`      | Exigir TLS                          | `true`                              |
| `ALERT_RECEIVER_EMAIL`  | Destinatário dos alertas            | `alertmanager.bot@gmail.com`        |

> **Brevo:** em `SMTP_PASS` use a **chave SMTP** gerada no painel (não a senha da
> conta). O `SMTP_FROM` precisa ser um remetente autorizado/verificado no provedor.
> Teste o envio na UI do Alertmanager em **http://localhost:9093**.

## 8. Performance no CI

O workflow [`ci-cd/.github/workflows/ci.yml`](../../ci-cd/.github/workflows/ci.yml) possui
um job **`performance`** que:

1. Instala o k6 (`grafana/setup-k6-action@v1`).
2. Executa o **smoke test** com `grafana/run-k6-action@v1` — os *thresholds* do script
   (`p(95)<500ms`, `rate<0.01`) agem como **gate**: o job falha se os SLOs estourarem.
3. Exporta um resumo JSON (`--summary-export`) e publica como artefato `k6-reports`.

> O CI valida os SLOs via *thresholds* (sem exigir a stack Prometheus/Grafana).
> O Remote Write + dashboards é para observabilidade **local** e análise histórica.

## 9. Decisões de projeto

- **Native Histograms** no k6: nome de métrica determinístico
  (`k6_http_req_duration_seconds`) e queries `histogram_quantile()` canônicas.
  Alternativa (gauges por stat) exigiria fixar `K6_PROMETHEUS_RW_TREND_STATS` e
  resultaria em nomes como `k6_http_req_duration_p95`.
- **Exporter em vez de instrumentação direta**: o Playwright não fala com o
  Prometheus nativamente; ler o relatório JSON é desacoplado e não exige
  modificar os testes.
- **Provisionamento declarativo** (datasource + dashboards via arquivos): a stack
  sobe "pronta", favorecendo reprodutibilidade e Infraestrutura como Código.

## 10. Troubleshooting

| Sintoma                                  | Causa provável                         | Ação                                                      |
| ---------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| k6 não envia métricas                    | Remote Write desabilitado              | Confirme a flag `--web.enable-remote-write-receiver`      |
| Painel de latência vazio                 | Native Histogram desabilitado          | Use `K6_PROMETHEUS_RW_TREND_AS_NATIVE_HISTOGRAM=true`     |
| Métricas `qa_tests_*` zeradas            | Relatório JSON não existe              | Rode `npm run test:web` / `test:api` primeiro             |
| Exporter não encontra os relatórios      | Caminho/volume incorreto               | Verifique o mount `../reports:/reports` no Compose        |
| Dashboard não aparece no Grafana         | Provisioning não montado               | Confirme os volumes em `docker/grafana/provisioning`      |
| Alertas não aparecem em `/alerts`        | `alerts.yml` não montado/parseado      | Confira o mount e a sintaxe em `docker/prometheus/alerts.yml` |
| Job `performance` falha no CI            | SLO de latência estourado na API alvo  | Ajuste os thresholds ou use uma API mais estável          |

