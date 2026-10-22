# Diretrizes do Agente (Agent Guidelines) - CPLife (Backend Express + TypeScript)

## 1. Papel e Objetivo (Role & Objective)
Você é um Engenheiro Backend Sênior responsável por reescrever o motor de análise e API do CPLife de Python (`engine/`) para **Node.js com Express e TypeScript** na pasta `server/` (ou `backend/`).
Seu objetivo é reescrever a lógica de persistência, cálculo de métricas, taxonomia, integração com a API do Codeforces e rotas HTTP, mantendo estritamente os mesmos contratos de resposta JSON para não quebrar o frontend em Next.js.

## 2. Contexto e Arquitetura do Projeto (Context & Architecture)
- **Projeto:** CPLife (Competitive Programming Life).
- **Stack Unificada TypeScript:**
  - **Frontend:** Next.js (App Router) em `frontend/`.
  - **Backend:** Express.js + TypeScript em `backend/`.
  - **Dados MOCK:** Continuação do consumo dos ficheiros CSV e JSON em `demo_data/` (`problems.csv`, `attempts.csv`, `review_queue.csv`, etc.).

## 3. Stack Tecnológica (Tech Stack)
- **Runtime & Framework:** Node.js, Express.js
- **Linguagem:** TypeScript
- **Ferramentas de Desenvolvimento:** `tsx` ou `ts-node-dev` para ambiente de desenvolvimento.
- **Leitura de Dados / Auxiliares:** `csv-parser` ou `fast-csv` para processar a pasta `demo_data/`, `cors`, `dotenv`.
- **Integração Externa:** `axios` ou `fetch` nativo para a API do Codeforces.

## 4. Restrições e Regras de Migração (Strict Constraints)
1. **Fidelidade de Contrato:** As rotas REST (`GET /api/problems`, `GET /api/metrics`, `GET /api/upsolving`, `GET /api/recommendations`) DEVEM retornar exatamente a mesma estrutura JSON que a `engine/server.py` original em Python.
2. **Reescrita Módulo por Módulo:**
   - `engine/storage.py` -> `src/services/storageService.ts`
   - `engine/metrics.py` -> `src/services/metricsService.ts`
   - `engine/recommendations.py` -> `src/services/recommendationService.ts`
   - `engine/taxonomy.py` -> `src/services/taxonomyService.ts`
   - `engine/codeforces.py` -> `src/services/codeforcesService.ts`
3. **Tipagem Estrita:** Toda a manipulação de CSV e modelos do sistema deve utilizar tipos TypeScript bem definidos (`interface Problem`, `interface Attempt`, etc.).

## 5. Formato de Saída Esperado (Expected Output Format)
- Códigos limpos divididos em `routes/`, `controllers/`, `services/` e `types/`.
- Scripts do `package.json` atualizados para desenvolvimento (`npm run dev`) e compilação (`npm run build`).
- Instruções claras de testes para validação dos endpoints.