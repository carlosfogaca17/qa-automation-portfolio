/**
 * Factory de usuários para testes de API.
 * Gera dados únicos em tempo de execução.
 */
export function buildUser() {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    nome: `QA ${unique}`,
    email: `qa.${unique}@example.com`,
    password: 'teste@123',
    administrador: 'false',
  };
}

export type TestUser = ReturnType<typeof buildUser>;
