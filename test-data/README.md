# Test Data

Massa de dados centralizada, reutilizada pelos módulos de teste.

## Estrutura

```
test-data/
├── fixtures/    # Dados estáticos (JSON) — ex.: credenciais de teste
└── factories/   # Geradores de dados dinâmicos (ex.: Faker)
```

## Boas práticas

- **Não versionar dados sensíveis.** Este diretório contém apenas dados fictícios.
- **Factories** geram dados únicos em tempo de execução (evita colisões entre execuções).
- **Fixtures** guardam dados fixos e versionados junto ao código.

### Exemplo de factory (Node.js)

```ts
// test-data/factories/user.factory.ts
export function buildUser() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    nome: `QA ${unique}`,
    email: `qa.${unique}@example.com`,
    password: 'teste@123',
    administrador: 'false',
  };
}
```
