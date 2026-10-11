import usersFixture from '../../../test-data/fixtures/users.fixture.json';

export interface User {
  username: string;
  password: string;
}

interface UsersFixture {
  users: Record<string, User>;
}

/** Carrega e expõe a massa de dados de usuários do fixture JSON. */
export const testData = usersFixture as UsersFixture;

/** Usuário padrão utilizado nos testes de login. */
export const standardUser: User = testData.users.standard;

