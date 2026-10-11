import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

/**
 * Suíte de exemplo: fluxo de login.
 * Demonstra uso de Page Object, dados centralizados e asserções.
 */
test.describe('Login - Sauce Demo', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto('/');
  });

  test('deve exibir mensagem de erro para credenciais inválidas', async ({ page }) => {
    await loginPage.login('invalid_user', 'invalid_pass');
    await loginPage.expectLoginError('Username and password do not match');
  });

  test('deve exibir erro quando o usuário está bloqueado', async ({ page }) => {
    await loginPage.login('locked_out_user', 'secret_sauce');
    await loginPage.expectLoginError('Sorry, this user has been locked out');
  });

  test('deve realizar login com sucesso com usuário padrão', async ({ page }) => {
    await loginPage.login('standard_user', 'secret_sauce');
    await loginPage.expectLoggedIn();
  });
});
