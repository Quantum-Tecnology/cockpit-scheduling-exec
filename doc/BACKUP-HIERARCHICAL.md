# 📂 Exemplo de Configuração para Estrutura Hierárquica

## Estrutura de Diretórios

Este exemplo mostra como configurar o Gerenciador de Backups para trabalhar com estruturas hierárquicas de diretórios, como a estrutura abaixo:

```
/mnt/storage/backups/
├── db_backups/
│   ├── 2025-12-21/
│   │   ├── mysql/
│   │   │   ├── database1_2025-12-21.dump
│   │   │   └── database2_2025-12-21.dump
│   │   └── postgresql/
│   │       ├── adm_api_2025-12-21.dump
│   │       └── keycloak_2025-12-21.dump
│   ├── 2025-12-22/
│   │   ├── mysql/
│   │   └── postgresql/
│   ├── 2025-12-25/
│   ├── 2025-12-26/
│   ├── 2025-12-27/
│   └── 2025-12-28/
│       ├── mysql/
│       │   ├── crm_2025-12-28.dump
│       │   └── erp_2025-12-28.dump
│       └── postgresql/
│           ├── adm_api_2025-12-28.dump
│           ├── bc_lucas42fsax_2025-12-28.dump
│           ├── keycloak_2025-12-28.dump
│           └── kong_2025-12-28.dump
└── vm_backups/
    ├── falcon_db_2025-12-25.qcow2
    ├── ubuntu25.10-2025-11-14_2025-12-25.qcow2
    ├── ubuntu25.10-2025-11-14_2025-12-26.qcow2
    ├── ubuntu25.10-2025-11-14_2025-12-27.qcow2
    └── ubuntu25.10-2025-11-14_2025-12-28.qcow2
```

## Configuração no Gerenciador

### 1. Configurar Diretório Principal

**Opção A: Monitorar tudo (recomendado)**

```
Caminho: /mnt/storage/backups
Rótulo: Backups do Servidor
Padrão: *.dump, *.sql, *.sql.gz, *.qcow2, *.tar.gz
Profundidade: 10
```

Esta configuração irá encontrar **todos** os arquivos de backup em qualquer nível de subdiretório.

**Opção B: Diretórios separados**

```
# Configuração 1
Caminho: /mnt/storage/backups/db_backups
Rótulo: Backups de Banco de Dados
Padrão: *.dump, *.sql, *.sql.gz
Profundidade: 10

# Configuração 2
Caminho: /mnt/storage/backups/vm_backups
Rótulo: Backups de VMs
Padrão: *.qcow2, *.vmdk, *.vdi
Profundidade: 2
```

## Como Funciona a Busca Recursiva

### Profundidade Máxima

O campo **"Profundidade Máxima"** controla quantos níveis de subdiretórios serão pesquisados:

- **1**: Apenas arquivos no diretório raiz
- **2**: Raiz + 1 nível de subdiretórios
- **5**: Até 5 níveis de profundidade
- **10**: Até 10 níveis (padrão, recomendado)

**Exemplo com Profundidade 3:**
```
/mnt/storage/backups/          ← Nível 0 (raiz)
├── db_backups/                 ← Nível 1
│   └── 2025-12-28/            ← Nível 2
│       └── postgresql/         ← Nível 3 ✓ (encontrado)
│           └── arquivo.dump    ← Nível 4 ✗ (não encontrado)
```

## Visualização na Interface

### Como os Arquivos Aparecem

Quando configurado, os backups são exibidos assim:

```
┌────────────────────────────────────────────────────────────┐
│ ☑ 🗄️ adm_api_2025-12-28.dump                              │
│      📂 2025-12-28/postgresql/                             │
│   📅 28/12/2024 02:00 | 📁 Backups de Banco | 💾 15 MB    │
│   ⬇️ Download  📧 Email  🗑️ Deletar                        │
├────────────────────────────────────────────────────────────┤
│ ☑ 💿 ubuntu25.10-2025-11-14_2025-12-28.qcow2              │
│      📂 /                                                  │
│   📅 28/12/2024 03:00 | 📁 Backups de VMs | 💾 2.5 GB     │
│   ⬇️ Download  📧 Email  🗑️ Deletar                        │
└────────────────────────────────────────────────────────────┘
```

**Nota:** O caminho relativo (`📂 2025-12-28/postgresql/`) mostra exatamente onde o arquivo está dentro do diretório configurado.

## Filtros e Busca

### Busca por Nome ou Caminho

A busca agora procura em:
- Nome do arquivo
- Caminho relativo completo

**Exemplos:**
- Buscar `"postgresql"` encontra todos os backups em pastas postgresql
- Buscar `"2025-12-28"` encontra todos os backups do dia 28
- Buscar `"adm_api"` encontra backups específicos do adm_api

### Ordenação por Caminho

Novas opções de ordenação:
- **Caminho (A-Z)**: Ordena pelos subdiretórios e nome
- **Caminho (Z-A)**: Ordem reversa

Útil para agrupar backups da mesma estrutura de pastas.

## Casos de Uso Práticos

### Caso 1: Backups Diários Organizados por Data

**Estrutura:**
```
/backups/
├── 2025-12-26/
│   ├── mysql/
│   └── postgresql/
├── 2025-12-27/
└── 2025-12-28/
```

**Configuração:**
```
Caminho: /backups
Rótulo: Backups Diários
Padrão: *.dump, *.sql.gz
Profundidade: 5
```

**Busca:**
- `"2025-12-28"` → Todos os backups de hoje
- `"postgresql"` → Apenas backups PostgreSQL
- `"mysql"` → Apenas backups MySQL

### Caso 2: Backups por Tipo e Cliente

**Estrutura:**
```
/backups/
├── databases/
│   ├── cliente_a/
│   ├── cliente_b/
│   └── cliente_c/
├── files/
│   ├── cliente_a/
│   └── cliente_b/
└── vms/
```

**Configuração:**
```
Caminho: /backups
Rótulo: Backups de Clientes
Padrão: *
Profundidade: 10
```

**Filtros:**
- Buscar `"cliente_a"` → Todos os backups do cliente A
- Buscar `"databases"` → Apenas bancos de dados
- Ordenar por "Caminho" → Agrupa por estrutura

### Caso 3: VMs com Nomenclatura Complexa

**Estrutura:**
```
/vm_backups/
├── production/
│   ├── web-server-01_2025-12-28.qcow2
│   └── db-server-01_2025-12-28.qcow2
├── staging/
└── development/
```

**Configuração:**
```
Caminho: /vm_backups
Rótulo: Backups de VMs
Padrão: *.qcow2, *.vmdk
Profundidade: 5
```

## Ícones por Tipo de Arquivo

O sistema reconhece automaticamente os tipos:

| Tipo | Ícone | Extensões |
|------|-------|-----------|
| Compactados | 📦 | .zip, .tar.gz, .tgz, .tar.bz2, .rar, .7z |
| Banco de Dados | 🗄️ | .sql, .dump, .sql.gz, .db |
| VMs/Imagens | 💿 | .qcow2, .qcow, .vmdk, .vdi, .iso |
| Backup Geral | 💾 | .bak, .backup |
| Logs/Texto | 📋 | .log, .txt |
| Outros | 📁 | Demais extensões |

## Dicas de Performance

### Otimizar Profundidade

Se você sabe a estrutura exata, use profundidade menor:

**Estrutura conhecida:**
```
/backups/YYYY-MM-DD/tipo/arquivo
         ↑           ↑    ↑
      Nível 1    Nível 2  Nível 3
```
**Use:** Profundidade = 3 (mais rápido)

**Estrutura variável:**
**Use:** Profundidade = 10 (mais flexível)

### Padrões Específicos

Use padrões específicos para acelerar a busca:

❌ **Evite:**
```
Padrão: *
```

✅ **Prefira:**
```
Padrão: *.dump, *.sql.gz, *.qcow2
```

## Configuração Avançada via JSON

Você pode editar o arquivo de configuração diretamente:

```json
{
  "directories": [
    {
      "id": "1703778000000",
      "path": "/mnt/storage/backups",
      "label": "Backups do Servidor",
      "pattern": "*.dump, *.sql.gz, *.qcow2",
      "maxDepth": 10,
      "addedAt": "2024-12-28T15:00:00.000Z"
    }
  ],
  "email": {
    "recipient": "admin@example.com",
    "subject": "Backup - {{date}}",
    "maxSize": 25
  }
}
```

Arquivo: `~/.backup-manager/config.json`

## Troubleshooting

### "Não encontra arquivos em subdiretórios"

✅ **Solução:** Aumente a profundidade máxima
```
Profundidade: 10 (ao invés de 1)
```

### "Busca muito lenta"

✅ **Solução 1:** Use padrões específicos
```
Padrão: *.dump (ao invés de *)
```

✅ **Solução 2:** Reduza profundidade se possível
```
Profundidade: 3 (ao invés de 10)
```

### "Arquivos duplicados na lista"

✅ **Solução:** Evite sobreposição de diretórios
```
❌ Não configure:
   - /backups
   - /backups/db_backups

✅ Configure apenas:
   - /backups (com profundidade adequada)
```

## Migração de Configuração Antiga

Se você já tinha configuração sem profundidade, atualize manualmente:

1. Vá em Configurações
2. Remova o diretório antigo
3. Adicione novamente com campo "Profundidade Máxima"

Ou edite o JSON e adicione `"maxDepth": 10` a cada diretório.

## Exemplos Reais

### Servidor de Produção

```json
{
  "directories": [
    {
      "path": "/mnt/storage/backups/db_backups",
      "label": "Backups de Banco",
      "pattern": "*.dump, *.sql.gz",
      "maxDepth": 10
    },
    {
      "path": "/mnt/storage/backups/vm_backups",
      "label": "Backups de VMs",
      "pattern": "*.qcow2",
      "maxDepth": 2
    }
  ]
}
```

### Ambiente de Desenvolvimento

```json
{
  "directories": [
    {
      "path": "/home/dev/backups",
      "label": "Backups Dev",
      "pattern": "*",
      "maxDepth": 5
    }
  ]
}
```

---

**Com busca recursiva, você tem controle total sobre estruturas hierárquicas complexas! 🎯**
