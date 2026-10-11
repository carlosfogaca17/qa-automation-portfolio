# Database — PostgreSQL

Scripts SQL para popular, consultar e validar o banco de dados usado nos testes.

## Estrutura

```
database/postgresql/
├── schema/      # DDL (criação de tabelas)
├── seed/        # Dados iniciais para teste
├── queries/     # Queries de validação utilitárias
└── migrations/  # Controle de versão do schema
```

## Subir o banco (via Docker)

A configuração fica em [`docker/docker-compose.yml`](../../docker/docker-compose.yml).
Os arquivos desta pasta são montados automaticamente e executados na inicialização:

```bash
# Sobe o PostgreSQL e aplica schema + seed
npm run db:up

# Derruba os containers
npm run db:down
```

## Conexão padrão

| Parâmetro | Valor          |
| --------- | -------------- |
| Host      | `localhost`    |
| Porta     | `5432`         |
| Database  | `qa_portfolio` |
| Usuário   | `qa_user`      |
| Senha     | `qa_password`  |

Exemplo via `psql`:

```bash
psql -h localhost -p 5432 -U qa_user -d qa_portfolio
```

## Uso em testes

O driver `pg` está disponível neste módulo para escrever validações programáticas:

```ts
import { Client } from 'pg';

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'qa_user',
  password: 'qa_password',
  database: 'qa_portfolio',
});

await client.connect();
const res = await client.query('SELECT COUNT(*) FROM usuarios WHERE ativo = TRUE');
console.log(res.rows[0].count);
await client.end();
```
