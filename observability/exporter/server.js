'use strict';

/**
 * Exporter de métricas dos testes (Playwright + k6) para o Prometheus.
 *
 * O que faz:
 *  - Playwright: lê os relatórios JSON gerados pelo reporter 'json'
 *    (por padrão em reports/<suite>/results.json) e converte os agregados
 *    (passou/falhou/flaky/skipped, duração) em métricas Prometheus (Gauge).
 *  - k6: lê os resumos JSON gerados por `k6 run --summary-export`
 *    (por padrão em reports/k6/<testid>.json) e republica o ÚLTIMO resultado
 *    de cada teste de performance como Gauges persistentes (k6_last_*).
 *    Assim o dashboard mostra a última execução indefinidamente, sem depender
 *    da janela de tempo — mesma estratégia usada para o Playwright.
 *
 * O Prometheus faz scrape deste endpoint periodicamente (scrape_interval).
 *
 * Variáveis de ambiente:
 *  - REPORTS_DIR           pasta base dos relatórios (default: /reports)
 *  - SUITES                suítes Playwright sep. por vírgula (default: web,api)
 *  - K6_DIR                pasta dos resumos do k6 (default: <REPORTS_DIR>/k6)
 *  - PORT                  porta do servidor HTTP (default: 9101)
 *  - REFRESH_INTERVAL_MS   intervalo de releitura dos arquivos (default: 15000)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const client = require('prom-client');

const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';
const SUITES = (process.env.SUITES || 'web,api').split(',').map((s) => s.trim()).filter(Boolean);
const K6_DIR = process.env.K6_DIR || path.join(REPORTS_DIR, 'k6');
const PORT = Number(process.env.PORT || 9101);
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS || 15000);

// Registrador dedicado + métricas padrão do processo (CPU, memória, etc.).
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const gaugeOpts = (name, help) => ({
  name,
  help,
  labelNames: ['suite'],
  registers: [register],
});

const testsTotal = new client.Gauge(
  gaugeOpts('qa_tests_total', 'Número total de testes reportados na suíte.'),
);
const testsPassed = new client.Gauge(
  gaugeOpts('qa_tests_passed', 'Número de testes que passaram (expected).'),
);
const testsFailed = new client.Gauge(
  gaugeOpts('qa_tests_failed', 'Número de testes que falharam (unexpected).'),
);
const testsFlaky = new client.Gauge(
  gaugeOpts('qa_tests_flaky', 'Número de testes instáveis (flaky).'),
);
const testsSkipped = new client.Gauge(
  gaugeOpts('qa_tests_skipped', 'Número de testes ignorados (skipped).'),
);
const suiteDuration = new client.Gauge(
  gaugeOpts('qa_test_suite_duration_seconds', 'Duração total da suíte em segundos.'),
);
const reportTimestamp = new client.Gauge(
  gaugeOpts('qa_tests_report_timestamp_seconds', 'Timestamp (Unix) da última modificação do relatório.'),
);

// --- k6 (última execução de cada teste de performance) ---------------------
// As métricas do k6 publicadas via Remote Write são "ao vivo" e somem quando o
// teste termina. Aqui republicamos o ÚLTIMO resumo (--summary-export) como
// Gauges persistentes, rotulados por `testid`, para o dashboard sempre mostrar
// a última execução — igual à estratégia das suítes Playwright.

const k6GaugeOpts = (name, help) => ({
  name,
  help,
  labelNames: ['testid'],
  registers: [register],
});

const k6Vus = new client.Gauge(
  k6GaugeOpts('k6_last_vus', 'VUs ativos no fim da última execução (k6).'),
);
const k6VusMax = new client.Gauge(
  k6GaugeOpts('k6_last_vus_max', 'VUs máximos configurados na última execução (k6).'),
);
const k6Iterations = new client.Gauge(
  k6GaugeOpts('k6_last_iterations_total', 'Total de iterações da última execução (k6).'),
);
const k6HttpReqs = new client.Gauge(
  k6GaugeOpts('k6_last_http_reqs_total', 'Total de requisições HTTP da última execução (k6).'),
);
const k6HttpReqFailedRate = new client.Gauge(
  k6GaugeOpts('k6_last_http_req_failed_rate', 'Taxa de falha HTTP (0..1) da última execução (k6).'),
);
const k6ErrorRate = new client.Gauge(
  k6GaugeOpts('k6_last_errors_rate', 'Taxa de erro das métricas customizadas (0..1) da última execução (k6).'),
);
const k6ChecksRate = new client.Gauge(
  k6GaugeOpts('k6_last_checks_rate', 'Taxa de sucesso dos checks (0..1) da última execução (k6).'),
);
const k6DurationAvg = new client.Gauge(
  k6GaugeOpts('k6_last_http_req_duration_avg_seconds', 'Duração média das requisições (s) na última execução (k6).'),
);
const k6DurationP95 = new client.Gauge(
  k6GaugeOpts('k6_last_http_req_duration_p95_seconds', 'Duração p95 das requisições (s) na última execução (k6).'),
);
const k6DurationMax = new client.Gauge(
  k6GaugeOpts('k6_last_http_req_duration_max_seconds', 'Duração máxima das requisições (s) na última execução (k6).'),
);
const k6DataSent = new client.Gauge(
  k6GaugeOpts('k6_last_data_sent_bytes', 'Total de bytes enviados na última execução (k6).'),
);
const k6DataReceived = new client.Gauge(
  k6GaugeOpts('k6_last_data_received_bytes', 'Total de bytes recebidos na última execução (k6).'),
);
const k6LastRunTimestamp = new client.Gauge(
  k6GaugeOpts('k6_last_run_timestamp_seconds', 'Timestamp (Unix) da geração do resumo da última execução (k6).'),
);

// Guarda os testids já vistos para limpar gauges de execuções removidas.
let k6KnownTestIds = [];

/** Lê e agrega as estatísticas de uma suíte a partir do relatório JSON. */
function readSuiteStats(suite) {
  const file = path.join(REPORTS_DIR, suite, 'results.json');
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    const stats = data.stats || {};
    const mtimeMs = fs.statSync(file).mtimeMs;
    return {
      expected: Number(stats.expected) || 0,
      unexpected: Number(stats.unexpected) || 0,
      flaky: Number(stats.flaky) || 0,
      skipped: Number(stats.skipped) || 0,
      // A duração do Playwright é em milissegundos.
      durationSeconds: (Number(stats.duration) || 0) / 1000,
      timestampSeconds: Math.floor(mtimeMs / 1000),
    };
  } catch (err) {
    // Relatório ainda não existe (testes não rodados) → tudo zero.
    return {
      expected: 0,
      unexpected: 0,
      flaky: 0,
      skipped: 0,
      durationSeconds: 0,
      timestampSeconds: 0,
    };
  }
}

/** Lê e agrega as estatísticas de um resumo do k6 (--summary-export). */
function readK6Summary(testid) {
  const file = path.join(K6_DIR, `${testid}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const data = JSON.parse(raw);
  const m = data.metrics || {};
  const mtimeMs = fs.statSync(file).mtimeMs;

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  // Durações do k6 vêm em milissegundos; o Prometheus trabalha em segundos.
  const msToSec = (v) => num(v) / 1000;

  return {
    vus: num(m.vus && m.vus.value),
    vusMax: num(m.vus_max && m.vus_max.value),
    iterations: num(m.iterations && m.iterations.count),
    httpReqs: num(m.http_reqs && m.http_reqs.count),
    httpReqFailedRate: num(m.http_req_failed && m.http_req_failed.value),
    errorRate: num(m.errors && m.errors.value),
    checksRate: num(m.checks && m.checks.value),
    durationAvgSeconds: msToSec(m.http_req_duration && m.http_req_duration.avg),
    durationP95Seconds: msToSec(m.http_req_duration && m.http_req_duration['p(95)']),
    durationMaxSeconds: msToSec(m.http_req_duration && m.http_req_duration.max),
    dataSent: num(m.data_sent && m.data_sent.count),
    dataReceived: num(m.data_received && m.data_received.count),
    timestampSeconds: Math.floor(mtimeMs / 1000),
  };
}

/** Lista os testids disponíveis a partir dos arquivos <testid>.json em K6_DIR. */
function listK6TestIds() {
  try {
    return fs
      .readdirSync(K6_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch (err) {
    // Pasta ainda não existe (nenhum teste de performance rodado).
    return [];
  }
}

/** Atualiza as gauges do k6 com base nos resumos atuais. */
function updateK6Metrics() {
  const testids = listK6TestIds();

  for (const testid of testids) {
    let s;
    try {
      s = readK6Summary(testid);
    } catch (err) {
      // JSON corrompido/parcial → ignora este testid.
      continue;
    }
    k6Vus.set({ testid }, s.vus);
    k6VusMax.set({ testid }, s.vusMax);
    k6Iterations.set({ testid }, s.iterations);
    k6HttpReqs.set({ testid }, s.httpReqs);
    k6HttpReqFailedRate.set({ testid }, s.httpReqFailedRate);
    k6ErrorRate.set({ testid }, s.errorRate);
    k6ChecksRate.set({ testid }, s.checksRate);
    k6DurationAvg.set({ testid }, s.durationAvgSeconds);
    k6DurationP95.set({ testid }, s.durationP95Seconds);
    k6DurationMax.set({ testid }, s.durationMaxSeconds);
    k6DataSent.set({ testid }, s.dataSent);
    k6DataReceived.set({ testid }, s.dataReceived);
    k6LastRunTimestamp.set({ testid }, s.timestampSeconds);
  }

  // Remove séries de testids que deixaram de existir (evita dados obsoletos).
  for (const testid of k6KnownTestIds) {
    if (!testids.includes(testid)) {
      const labels = { testid };
      k6Vus.remove(labels);
      k6VusMax.remove(labels);
      k6Iterations.remove(labels);
      k6HttpReqs.remove(labels);
      k6HttpReqFailedRate.remove(labels);
      k6ErrorRate.remove(labels);
      k6ChecksRate.remove(labels);
      k6DurationAvg.remove(labels);
      k6DurationP95.remove(labels);
      k6DurationMax.remove(labels);
      k6DataSent.remove(labels);
      k6DataReceived.remove(labels);
      k6LastRunTimestamp.remove(labels);
    }
  }
  k6KnownTestIds = testids;
}

/** Atualiza todas as gauges com base nos relatórios atuais. */
function updateMetrics() {
  for (const suite of SUITES) {
    const s = readSuiteStats(suite);
    const total = s.expected + s.unexpected + s.flaky + s.skipped;

    testsTotal.set({ suite }, total);
    testsPassed.set({ suite }, s.expected);
    testsFailed.set({ suite }, s.unexpected);
    testsFlaky.set({ suite }, s.flaky);
    testsSkipped.set({ suite }, s.skipped);
    suiteDuration.set({ suite }, s.durationSeconds);
    reportTimestamp.set({ suite }, s.timestampSeconds);
  }

  updateK6Metrics();
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    try {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (err) {
      res.statusCode = 500;
      res.end(`# erro ao gerar métricas: ${err.message}\n`);
    }
    return;
  }
  if (req.url === '/health' || req.url === '/') {
    res.statusCode = 200;
    res.end('OK');
    return;
  }
  res.statusCode = 404;
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`[exporter] métricas dos testes expostas em http://0.0.0.0:${PORT}/metrics`);
  console.log(`[exporter] REPORTS_DIR=${REPORTS_DIR} SUITES=${SUITES.join(',')}`);
  console.log(`[exporter] K6_DIR=${K6_DIR}`);
  updateMetrics();
  setInterval(updateMetrics, REFRESH_INTERVAL_MS);
});
