import { test, expect } from '@playwright/test';
import { ApiClient } from '../clients/api-client';

/**
 * Exemplo de testes de API contra a ServeRest (https://serverest.dev).
 * Demonstra cliente reutilizável, validação de contrato e dados dinâmicos.
 */
test.describe('API - Usuários (ServeRest)', () => {
  let api: ApiClient;

  test.beforeEach(async ({ request, baseURL }) => {
    api = new ApiClient(request, baseURL ?? 'https://serverest.dev');
  });

  test('GET /usuarios retorna 200 e estrutura esperada', async () => {
    const response = await api.get('/usuarios');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('quantidade');
    expect(body).toHaveProperty('usuarios');
    expect(Array.isArray(body.usuarios)).toBeTruthy();
  });

  test('POST /usuarios cria um novo usuário', async () => {
    const uniqueEmail = `qa.${Date.now()}@example.com`;
    const payload = {
      nome: 'QA Portfolio',
      email: uniqueEmail,
      password: 'teste@123',
      administrador: 'true',
    };

    const response = await api.post('/usuarios', payload);
    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body.message).toBe('Cadastro realizado com sucesso');
    expect(body).toHaveProperty('_id');
  });

  test('POST /usuarios valida e-mail já cadastrado', async () => {
    const payload = {
      nome: 'Fulano',
      email: 'fulano@qa.com',
      password: 'teste@123',
      administrador: 'false',
    };

    // Cria o primeiro usuário
    await api.post('/usuarios', payload);

    // Tenta criar novamente com o mesmo e-mail
    const duplicated = await api.post('/usuarios', payload);
    expect(duplicated.status()).toBe(400);
    const body = await duplicated.json();
    expect(body.message).toBe('Este email já está sendo usado');
  });
});
