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

Os scripts npm rodam com `--summary-export=reports/k6/<testid>.json`. Esse
resumo é lido pelo **test-metrics-exporter**, que republica o Último resultado
como métricas persistentes (`k6_last_*`) no Prometheus. Assim o dashboard
"QA Portfolio — k6 Performance" mostra a última execução indefinidamente,
mesmo depois de o teste ter terminado (não depende da janela de tempo).

> Observação: as métricas publicadas via Remote Write (`k6_http_req_*`) são
> "ao vivo" e só existem durante a execução. As `k6_last_*` (resumo) são as
> que garantem a visualização da última execução. Requer o binário do k6 no
> PATH (ex.: `/home/fogaca/qa-stack/bin/k6-.../k6`).

## Conceitos aplicados

- **VUs (Virtual Users):** usuários simultâneos simulados.
- **Stages:** controle de ramp-up/steady-state/ramp-down ao longo do tempo.
- **Thresholds:** critérios de aceitação (SLOs) que determinam passa/falha.
- **Métricas customizadas:** `Rate` (taxa de erro) e `Trend` (tempo de resposta).
