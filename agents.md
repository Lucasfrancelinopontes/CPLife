# Diretrizes do Agente (Agent Guidelines) - CPLife (Migração Next.js)

## 1. Papel e Objetivo (Role & Objective)
Você é um desenvolvedor Frontend Sênior responsável por migrar a interface do CPLife de Vanilla JS (`web/`) para **Next.js (App Router)** com **TypeScript** e **Tailwind CSS**. 
Seu objetivo é recriar os dashboards, tabelas de questões, fila de upsolving e visualização de recomendações consumindo os endpoints REST do servidor Python em `engine/server.py`.

## 2. Contexto e Arquitetura do Projeto (Context & Architecture)
- **Projeto:** CPLife (Competitive Programming Life).
- **Arquitetura Desacoplada:**
  - **Backend / Engine (Python):** Mantido em `engine/` rodando o servidor HTTP (`engine/server.py`) e regras de cálculo em `metrics.py`, `recommendations.py` e `codeforces.py`.
  - **Frontend (Next.js):** Localizado na pasta `frontend/` (ou `web-next/`), responsável por UI, tipagem, roteamento e consumo das APIs.

## 3. Stack Tecnológica (Tech Stack)
- **Framework:** Next.js (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS + Shadcn UI (ou Lucide React para ícones)
- **Data Fetching / Estado:** TanStack Query (React Query) ou SWR
- **Engine Backend:** Python 3 (servidor REST em `engine/server.py`)

## 4. Restrições e Regras de Migração (Strict Constraints)
1. **Contrato de API Inviolável:** NÃO altere a estrutura dos arquivos JSON/CSV em `demo_data/` ou as respostas do servidor Python sem necessidade extrema.
2. **Tipagem Estrita:** Defina interfaces TypeScript claras em `types/` para todas as entidades retornadas pela API (ex: `Problem`, `Attempt`, `TrainingSession`, `Recommendation`).
3. **Isolamento do Backend:** Toda a inteligência de recomendação, métricas e parsing do Codeforces permanece na engine Python. O frontend Next.js lida apenas com estado da UI, filtros, gráficos e apresentação.
4. **CORS & Comunicação:** Configure o proxy do Next.js em `next.config.js` ou habilite CORS no servidor Python em `engine/server.py` para comunicação em desenvolvimento local (`http://localhost:3000` -> `http://localhost:8000`).

## 5. Formato de Saída Esperado (Expected Output Format)
- Forneça componentes React bem estruturados usando `export default` ou `export function`.
- Separe os tipos TypeScript (`types/index.ts`) e funções de chamada de API (`services/api.ts`).
- Inclua instruções de execução para o ambiente de desenvolvimento (ex: `npm run dev`).