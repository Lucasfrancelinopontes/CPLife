# CP Life — Painel de Treinamento Adaptativo para Programação Competitiva

Painel local para acompanhar treino de programação competitiva: registro rápido de tentativas, cálculo auditável de domínio por tópico (0 a 5), fila de revisão espaçada e distribuição de erros. Todos os dados ficam em **arquivos CSV** editáveis em Excel, Google Sheets ou qualquer editor de texto — sem banco de dados, sem dependências externas.

> **Status**: projeto pessoal em uso ativo, funcional mas em evolução. Veja [Limitações e Roadmap](#6-limitações-e-roadmap) antes de adotar.

---

## 1. Por que existe

Ferramentas de treino para maratonas de programação (ICPC, CSES, etc.) costumam ser planilhas soltas ou nada. Este projeto tenta um meio-termo: interface de uso rápido (< 15s por registro), mas com os dados sempre em formato aberto e auditável — nenhuma métrica é uma caixa-preta, cada score vem com a explicação do cálculo.

## 2. Pré-requisitos

- **Python 3.9+** (usa apenas a biblioteca padrão — testado em 3.12)
- Um navegador moderno
- Nenhuma instalação de pacotes é necessária (`pip install` não é usado)

## 3. Instalação e Execução

```bash
git clone <url-do-repositorio> cp-Life
cd cp-Life
python run.py
```

O servidor sobe em `http://localhost:8080` e o navegador abre automaticamente. Para usar outra porta:

```bash
python run.py 9000
```

> ⚠️ **Uso estritamente local.** O servidor não tem autenticação nem HTTPS. Não exponha a porta à internet nem rode em rede compartilhada sem um proxy com autenticação na frente.

### Começando com dados vazios

O repositório vem com os arquivos CSV em `data/` já com cabeçalho mas sem conteúdo real de exemplo (um `data_backup_ficticios/` com dados fictícios está incluído como referência de formato). Para começar do zero:

1. Abra `data/topics.csv` e cadastre os tópicos que você quer acompanhar (coluna `category` agrupa visualmente, `icpc_weight` pondera a métrica geral).
2. Use o atalho **N** no dashboard para registrar sua primeira tentativa — se o `problem_id` ainda não existir no catálogo, o formulário permite cadastrá-lo na hora.
3. As métricas (`/api/metrics`) são recalculadas a cada carregamento da página a partir dos CSVs — não há cache nem necessidade de "importar" nada.

## 4. Estrutura do Projeto

```text
cp-Life/
├── data/                       # CSVs mestre (persistência central)
│   ├── problems.csv            # Catálogo de problemas (fonte da verdade)
│   ├── attempts.csv            # Histórico de tentativas e resoluções
│   ├── topics.csv              # Taxonomia de tópicos e peso ICPC
│   ├── review_queue.csv        # Fila de retenção espaçada (7, 30, 90 dias)
│   ├── training_sessions.csv   # Estrutura para blocos de treino
│   ├── contests.csv            # Competições e simulados
│   ├── upsolving.csv           # Rastreamento de upsolving
│   ├── patterns.csv            # Caderno de padrões (gatilho → ideia)
│   ├── templates.csv           # Catálogo de templates de código
│   └── weekly_reviews.csv      # Retrospectiva semanal
├── templates/                  # Código-fonte real dos templates (ex.: search/binary_search_answer.cpp)
├── engine/                     # Backend Python (biblioteca padrão apenas)
│   ├── storage.py              # Leitura/escrita CSV com escrita atômica
│   ├── metrics.py              # Cálculo de autonomia, domínio 0–5 e distribuição de erros
│   └── server.py               # Servidor HTTP e rotas da API REST
├── web/                        # Frontend (HTML/CSS/JS puro, sem build step)
│   ├── index.html
│   ├── app.js
│   └── style.css
├── scripts/
│   └── test_engine.py          # Testes automatizados (rodam em diretório isolado, não tocam data/)
├── run.py                      # Ponto de entrada
└── README.md
```

## 5. Funcionalidades

### Registro de tentativas
- Atalho **`N`** em qualquer tela abre o modal de registro.
- Autocompletar: selecionar um `problem_id` já cadastrado preenche título, plataforma, tópico e dificuldade.
- Campos mínimos: problema, resultado (`AC`/`WA`/`TLE`/...), tempo em minutos, nível de ajuda (0–4).
- Erros classificados por código A–J (ex.: `B` = não reconheceu a técnica, `D` = raciocínio errado).
- Se o nível de ajuda for ≥ 2 ou o resultado não for `AC`, o problema entra automaticamente na fila de revisão em 7 dias.

### Domínio por tópico (0.0 a 5.0)

```
Domínio(T) = max(0, min(5, Base × Multiplicador_Autonomia − Penalidade))
```

- **Base** (até 3.5 pts): soma por problema resolvido, ponderada pela dificuldade (+0.8 difícil, +0.5 médio, +0.3 básico); tentativas de upsolving contam 60% do peso de uma resolução direta.
- **Multiplicador de autonomia** (0.3x a 1.4x): `0.3 + 1.1 × (4 − ajuda_média) / 4`. Resolver sozinho (ajuda 0) dá 1.4x; copiar a solução (ajuda 4) dá 0.3x.
- **Penalidade**: −0.1 pt por erro conceitual recente (códigos B/C/D), até um teto de −0.5 pt.
- Cada score é clicável e mostra a auditoria completa do cálculo (quantas resoluções, qual ajuda média, qual penalidade foi aplicada).

Rótulos: `0–0.9` Sem Prática · `1–1.9` Contato Inicial · `2–2.9` Básico · `3–3.9` Funcional · `4–4.9` Sólido · `5.0` Domínio Elevado.

### Revisão espaçada
Ao concluir uma revisão com `AC`, o item avança de ciclo automaticamente (7 → 30 → 90 dias), registrando o histórico de evolução (ex.: ajuda 3 na tentativa inicial → ajuda 1 aos 7 dias → ajuda 0 aos 30 dias).

## 6. Limitações e Roadmap

O projeto está funcional para uso diário, mas algumas partes são deliberadamente simples:

| Área | Status atual |
|---|---|
| Contests e Upsolving | Estrutura de dados (`contests.csv`, `upsolving.csv`) pronta; interface dedicada de registro ainda não existe — hoje é editável só via CSV direto |
| Patterns e Templates | `patterns.csv`/`templates.csv` funcionam e têm exemplos reais em `templates/`, mas não há visualização de código *in-browser* — é preciso abrir o `.cpp` separadamente |
| Recomendações adaptativas | O painel mostra os tópicos mais fracos por score, mas não sugere sequências de treino automaticamente — decisão deliberada até haver volume de dados suficiente |
| Autenticação / multiusuário | Inexistente, por design — é uma ferramenta de uso individual e local |
| Testes automatizados | Cobrem o fluxo principal da engine (`scripts/test_engine.py`); não cobrem o frontend |

Contribuições, issues e forks são bem-vindos. Antes de abrir um PR grande, abra uma issue descrevendo a mudança proposta.

## 7. Testando

```bash
python scripts/test_engine.py
```

Os testes criam um diretório temporário isolado e não alteram os dados em `data/`.

## 8. Licença

Defina a licença do projeto aqui (ex.: MIT, Apache 2.0) antes de publicar — atualmente não há nenhuma declarada, o que legalmente restringe uso e redistribuição por terceiros.