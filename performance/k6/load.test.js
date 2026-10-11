import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

/**
 * Teste de carga com k6: simula múltiplos usuários criando registros.
 * Útil para avaliar throughput e tempo de resposta sob estresse.
 */

export const errorRate = new Rate('errors');
export const createDuration = new Trend('create_duration');

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // ramp-up
    { duration: '1m', target: 20 },   // steady state
    { duration: '30s', target: 50 },  // pico
    { duration: '30s', target: 0 },   // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.02'],
    create_duration: ['p(95)<700'],
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'https://serverest.dev';

export default function () {
  const uniqueEmail = `k6.${__VU}.${Date.now()}@example.com`;
  const payload = JSON.stringify({
    nome: `Usuario k6 ${__VU}`,
    email: uniqueEmail,
    password: 'teste@123',
    administrador: 'false',
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${BASE_URL}/usuarios`, payload, params);

  const ok = check(res, {
    'status é 201': (r) => r.status === 201,
    'mensagem de sucesso': (r) => r.body.includes('Cadastro realizado com sucesso'),
  });

  errorRate.add(!ok);
  createDuration.add(res.timings.duration);

  sleep(Math.random() * 3);
}
