# Docker — Infraestrutura local

Infraestrutura como código para subir as dependências do portfólio localmente.

## Serviços

| Serviço    | Imagem             | Porta | Descrição                       |
| ---------- | ------------------ | ----- | ------------------------------- |
| `postgres` | `postgres:16-alpine` | 5432  | Banco de dados com schema + seed |

## Como usar

```bash
# Sobe o PostgreSQL (aplica schema e seed automaticamente)
docker compose -f docker/docker-compose.yml up -d

# Acompanha os logs de inicialização
docker compose -f docker/docker-compose.yml logs -f postgres

# Derruba e remove os volumes (recria do zero no próximo up)
docker compose -f docker/docker-compose.yml down -v
```

## Configuração

As credenciais possuem valores padrão, mas podem ser sobrescritas criando um
arquivo `.env` nesta pasta (use o `.env.example` como base).

> **Nota:** os volumes montados aplicam o schema/seed apenas na **primeira**
> inicialização de um volume novo. Para reaplicar, use `down -v` antes do `up`.
