import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

/**
 * Teste de smoke (fumaça) com k6: valida que a API responde sob carga mínima.
 * API alvo: ServeRest (https://serverest.dev).
 */

// Métrica customizada: taxa de erro das requisições.
export const errorRate = new Rate('errors');

export const options = {
  // Cenário de smoke: poucos usuários por pouco tempo.
  stages: [
    { duration: '10s', target: 5 },   // sobe para 5 VUs
    { duration: '20s', target: 5 },   // mantém 5 VUs
    { duration: '10s', target: 0 },   // desce para 0
  ],
  thresholds: {
    // Critérios de aceitação (SLOs) do teste.
    http_req_duration: ['p(95)<500'], // 95% das reqs < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% de falhas
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'https://serverest.dev';

export default function () {
  const res = http.get(`${BASE_URL}/usuarios`);

  const result = check(res, {
    'status é 200': (r) => r.status === 200,
    'tempo < 500ms': (r) => r.timings.duration < 500,
    'retorno contém quantidade': (r) => r.body.includes('quantidade'),
  });

  errorRate.add(!result);

  sleep(1); // pausa entre iterações de cada VU
}
