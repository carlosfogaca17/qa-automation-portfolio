import { Page, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object da página de login do "Sauce Demo".
 * Demonstra encapsulamento de seletores e ações de negócio.
 */
export class LoginPage extends BasePage {
  private readonly usernameInput = '[data-test="username"]';
  private readonly passwordInput = '[data-test="password"]';
  private readonly loginButton = '[data-test="login-button"]';
  private readonly errorMessage = '[data-test="error"]';

  /** Realiza login com as credenciais informadas. */
  async login(username: string, password: string): Promise<void> {
    await this.fill(this.usernameInput, username);
    await this.fill(this.passwordInput, password);
    await this.click(this.loginButton);
  }

  /** Assere que a mensagem de erro esperada é exibida. */
  async expectLoginError(expectedText: string): Promise<void> {
    await expect(this.locator(this.errorMessage)).toContainText(expectedText);
  }

  /** Assere que o login foi bem-sucedido (redirecionou para /inventory). */
  async expectLoggedIn(): Promise<void> {
    await expect(this.page).toHaveURL(/.*inventory\.html/);
  }
}
