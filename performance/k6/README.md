# Performance — k6

Testes de performance utilizando **k6** (ferramenta open-source de teste de carga).

## Estrutura

```
performance/k6/
├── smoke.test.js   # Teste de fumaça (carga mínima, valida saúde)
└── load.test.js    # Teste de carga (ramp-up, steady state, pico)
```

## Pré-requisito

Instale o k6: https://k6.io/docs/get-started/installation/

## Executar

```bash
# A partir da raiz do monorepo
npm run test:performance

# Diretamente com k6
k6 run performance/k6/smoke.test.js
k6 run performance/k6/load.test.js

# Sobrescrevendo a API alvo
API_URL=https://minha-api.com k6 run performance/k6/load.test.js
```

## Conceitos aplicados

- **VUs (Virtual Users):** usuários simultâneos simulados.
- **Stages:** controle de ramp-up/steady-state/ramp-down ao longo do tempo.
- **Thresholds:** critérios de aceitação (SLOs) que determinam passa/falha.
- **Métricas customizadas:** `Rate` (taxa de erro) e `Trend` (tempo de resposta).
