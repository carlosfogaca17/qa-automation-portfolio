# Docker — Infraestrutura local

Infraestrutura como código para subir as dependências do portfólio localmente.

## Serviços

| Serviço                | Imagem                       | Porta | Descrição                                          |
| ---------------------- | ---------------------------- | ----- | -------------------------------------------------- |
| `postgres`             | `postgres:16-alpine`         | 5432  | Banco de dados com schema + seed                   |
| `prometheus`           | `prom/prometheus:v3.0.1`     | 9090  | Métricas do k6 (Remote Write) + scrape do exporter |
| `grafana`              | `grafana/grafana:11.4.0`     | 3000  | Dashboards provisionados automaticamente           |
| `test-metrics-exporter`| build local (`observability/exporter`) | 9101 | Relatórios do Playwright → métricas `qa_tests_*` |

Detalhes de coleta e arquitetura em [`docs/architecture/observability.md`](../../docs/architecture/observability.md).

## Como usar

```bash
# Sobe apenas o PostgreSQL (aplica schema e seed automaticamente)
docker compose -f docker/docker-compose.yml up -d postgres

# Sobe apenas a stack de observabilidade (Prometheus + Grafana + exporter)
docker compose -f docker/docker-compose.yml up -d prometheus grafana test-metrics-exporter

# Sobe tudo
docker compose -f docker/docker-compose.yml up -d

# Acompanha os logs de um serviço
docker compose -f docker/docker-compose.yml logs -f prometheus

# Derruba e remove os volumes (recria do zero no próximo up)
docker compose -f docker/docker-compose.yml down -v
```

## Observabilidade (atalhos via npm)

Na raiz do projeto existem atalhos equivalentes:

```bash
npm run observability:up     # sobe prometheus + grafana + exporter
npm run observability:logs   # acompanha os logs
npm run observability:down   # para os serviços
```

Após subir, acesse o **Grafana** em http://localhost:3000 (`admin`/`admin`) e o
**Prometheus** em http://localhost:9090.

### Alertas

O Prometheus carrega regras de alerta de [`prometheus/alerts.yml`](prometheus/alerts.yml)
(p95/p99 de latência, taxa de erro, checks e testes falhando). Visualize em
http://localhost:9090/alerts. A stack atual não inclui Alertmanager (sem notificação
externa) — veja [`docs/architecture/observability.md`](../../docs/architecture/observability.md).

## Configuração

As credenciais possuem valores padrão, mas podem ser sobrescritas criando um
arquivo `.env` nesta pasta (use o `.env.example` como base).

> **Nota:** os volumes montados aplicam o schema/seed apenas na **primeira**
> inicialização de um volume novo. Para reaplicar, use `down -v` antes do `up`.

