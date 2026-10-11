# 0001. Uso de monorepo para o portfólio

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

O portfólio reúne múltiplas frentes de automação (Web, API, Database,
Performance, CI/CD). Havia a opção de separar cada frente em um repositório
independente ou consolidar tudo em um único repositório.

O objetivo do projeto é servir como **portfólio demonstrativo** dos
conhecimentos em QA, com ênfase em organização, padronização e reuso.

## Decisão

Adotar uma estrutura de **monorepo** utilizando **npm workspaces**, com cada
frente isolada em seu próprio diretório e `package.json` quando aplicável.

## Consequências

### Positivas

- Configuração e massa de dados compartilhadas entre frentes.
- Uma única pipeline de CI para todas as suítes.
- Navegação e onboarding simplificados para quem avalia o portfólio.
- Versionamento atômico de mudanças que afetam múltiplas camadas.

### Negativas / Trade-offs

- Repositório maior; builds podem ficar mais lentos conforme cresce.
- Requer disciplina para manter o isolamento entre módulos.

### Mitigações

- `.gitignore` robusto para evitar versionar artefados (`node_modules`, `reports`).
- Scripts na raiz (`test:web`, `test:api`) que delegam aos workspaces.
