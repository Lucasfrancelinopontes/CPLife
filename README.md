# CPLife

Aplicativo local para acompanhar estudos de programação competitiva. O CPLife
registra problemas, tentativas, revisões espaçadas, contests, upsolving,
habilidades, patterns e templates. As métricas são calculadas a partir de
arquivos CSV abertos, sem banco de dados, conta online ou envio automático de
informações.

> **Beta local:** esta versão é para testar e enviar feedback. O servidor
> escuta apenas em `localhost`; não o exponha à internet.

## Requisitos

- Windows 10/11 (ou Python 3.9+ em outro sistema operacional);
- Python 3.9 ou mais recente;
- navegador moderno;
- nenhuma biblioteca externa: somente a biblioteca padrão do Python.

## Instalação no Windows

1. Instale o Python marcando **Add Python to PATH**, se ainda não estiver
   instalado.
2. Baixe ou clone este repositório.
3. Abra a pasta e execute `run.bat`, ou rode:

   ```powershell
   python run.py
   ```

4. O navegador abrirá `http://localhost:8080`. Para outra porta:

   ```powershell
   python run.py 9000
   ```

Também é possível iniciar diretamente com dados fictícios:

```powershell
python run.py --demo
```

Para desenvolvimento/testes, use um diretório isolado:

```powershell
python run.py --data-dir C:\cplife-test-data
```

## Primeiro acesso e modos

Na primeira execução, escolha uma opção na tela de boas-vindas:

- **Demonstração:** copia um conjunto fictício, coerente e restaurável para o
  espaço de demonstração. Ele contém AC, WA, TLE, níveis de ajuda, revisões,
  tópicos, contest, upsolving e patterns/templates.
- **Espaço pessoal vazio:** cria um conjunto novo sem dados de demonstração.

O modo atual aparece no topo da aplicação. O diretório de dados também é
informado no endpoint local `/api/status` e no terminal ao iniciar.

No Windows, os dados ficam por padrão em:

```text
%LOCALAPPDATA%\CPLife\personal-data
%LOCALAPPDATA%\CPLife\demo-data
%LOCALAPPDATA%\CPLife\backups
```

`CPLIFE_DATA_DIR` ou `--data-dir` permitem escolher outro diretório. Os dados
antigos que possam existir em `data/` no checkout são preservados localmente,
mas não são usados automaticamente e não fazem parte da distribuição.

No modo demonstração, **Restaurar demo** cria um backup local antes de
recolocar os CSVs iniciais. Isso não toca no espaço pessoal.

## Funcionalidades atuais

- dashboard com métricas auditáveis;
- catálogo e histórico de problemas;
- tentativas AC, WA, TLE e outros resultados;
- níveis de ajuda e taxonomia de erros;
- fila de revisão espaçada;
- registro de contests e upsolving;
- habilidades, análise de erros, patterns e templates;
- objetivo, temporada e plataformas preparados para configuração;
- feedback local com tipo, módulo, título, descrição, reprodução, resultados e
  gravidade;
- exportação manual de feedback em JSON pelo botão **Salvar relatório JSON**.

O feedback exportado não inclui histórico de tentativas, conteúdo dos CSVs ou
caminhos privados. Anexe informações adicionais somente por escolha explícita
ao enviar o arquivo manualmente.

## Dados, backup e restauração

Todos os CSVs do espaço ativo ficam no diretório exibido no terminal. Para
backup, encerre o CPLife e copie a pasta inteira para outro local. Para
restaurar, mantenha uma cópia do diretório atual e substitua-o por uma cópia
de backup com o mesmo conjunto de CSVs.

Operações internas de restauração da demonstração sempre criam uma cópia em
`backups/`. Não edite nem exclua os CSVs pessoais do checkout durante a
configuração inicial; eles são arquivos legados preservados e ignorados pelo
Git.

## Testes

Os testes usam diretórios temporários e fixtures próprias:

```powershell
python scripts\test_engine.py
python scripts\test_beta.py
```

Eles cobrem leitura/escrita CSV, métricas, APIs principais, primeiro acesso
demo/pessoal, isolamento entre modos, restauração, feedback e ausência de
alteração dos dados reais.

## Limitações conhecidas

- é uma aplicação local de usuário único; não há autenticação, sincronização
  em nuvem ou colaboração;
- o servidor não oferece HTTPS e não deve ser exposto à rede;
- não há build de frontend nem testes de navegador automatizados;
- algumas telas de patterns/templates continuam sendo catálogos simples;
- recomendações continuam limitadas aos indicadores existentes;
- CSV é editável e aberto, portanto cópias de backup são responsabilidade do
  usuário.

## Contribuição

Abra uma issue descrevendo o problema ou proposta, preferencialmente incluindo
um relatório JSON exportado pelo CPLife sem dados privados. Para desenvolver:

```powershell
python run.py --data-dir C:\cplife-dev-data
python scripts\test_engine.py
python scripts\test_beta.py
```

O projeto é distribuído sob a licença **GNU GPL v3.0**, conforme o arquivo
[LICENSE](./LICENSE).
