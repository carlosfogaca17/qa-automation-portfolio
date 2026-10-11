import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object base. Centraliza ações e asserções comuns a todas as páginas.
 * Padrão Page Object Model (POM).
 */
export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Navega para uma rota relativa à baseURL. */
  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  /** Retorna um locator. */
  protected locator(selector: string): Locator {
    return this.page.locator(selector);
  }

  /** Preenche um campo de texto. */
  async fill(selector: string, value: string): Promise<void> {
    await this.page.fill(selector, value);
  }

  /** Clica em um elemento. */
  async click(selector: string): Promise<void> {
    await this.page.click(selector);
  }

  /** Retorna o texto visível de um elemento. */
  async getText(selector: string): Promise<string> {
    return (await this.page.textContent(selector)) ?? '';
  }

  /** Assere que um elemento está visível. */
  async expectVisible(selector: string): Promise<void> {
    await expect(this.locator(selector)).toBeVisible();
  }
}
