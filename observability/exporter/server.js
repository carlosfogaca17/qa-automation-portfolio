'use strict';

/**
 * Exporter de métricas dos testes Playwright (API/Web) para o Prometheus.
 *
 * O que faz:
 *  - Lê os relatórios JSON gerados pelo reporter 'json' do Playwright
 *    (por padrão em reports/<suite>/results.json).
 *  - Converte os agregados (passou/falhou/flaky/skipped, duração) em
 *    métricas Prometheus do tipo Gauge, expostas em /metrics.
 *
 * O Prometheus faz scrape deste endpoint periodicamente (scrape_interval).
 *
 * Variáveis de ambiente:
 *  - REPORTS_DIR           pasta base dos relatórios (default: /reports)
 *  - SUITES                suítes separadas por vírgula (default: web,api)
 *  - PORT                  porta do servidor HTTP (default: 9101)
 *  - REFRESH_INTERVAL_MS   intervalo de releitura dos arquivos (default: 15000)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const client = require('prom-client');

const REPORTS_DIR = process.env.REPORTS_DIR || '/reports';
const SUITES = (process.env.SUITES || 'web,api').split(',').map((s) => s.trim()).filter(Boolean);
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
  updateMetrics();
  setInterval(updateMetrics, REFRESH_INTERVAL_MS);
});
