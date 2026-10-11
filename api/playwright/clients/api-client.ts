import { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Cliente HTTP genérico que encapsula o `APIRequestContext` do Playwright.
 * Demonstra como organizar chamadas de API de forma reutilizável.
 */
export class ApiClient {
  private readonly request: APIRequestContext;
  private readonly baseURL: string;

  constructor(request: APIRequestContext, baseURL: string) {
    this.request = request;
    this.baseURL = baseURL;
  }

  get(path: string, options: Parameters<APIRequestContext['get']>[1] = {}): Promise<APIResponse> {
    return this.request.get(`${this.baseURL}${path}`, options);
  }

  post<T>(path: string, data: T, options: Parameters<APIRequestContext['post']>[1] = {}): Promise<APIResponse> {
    return this.request.post(`${this.baseURL}${path}`, { data, ...options });
  }

  put<T>(path: string, data: T, options: Parameters<APIRequestContext['put']>[1] = {}): Promise<APIResponse> {
    return this.request.put(`${this.baseURL}${path}`, { data, ...options });
  }

  delete(path: string, options: Parameters<APIRequestContext['delete']>[1] = {}): Promise<APIResponse> {
    return this.request.delete(`${this.baseURL}${path}`, options);
  }
}
