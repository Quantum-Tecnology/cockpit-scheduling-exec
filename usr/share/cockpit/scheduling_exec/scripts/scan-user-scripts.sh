#!/bin/bash#!/bin/bash

#!/bin/bash
# Lista scripts .sh existentes no HOME para importar para o gerenciador

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
EXCLUDE_1="$SCRIPTS_DIR"
EXCLUDE_2="$HOME/.scripts-metadata"

# Diretórios ruidosos comuns
EXCLUDE_DIRS=(
  "$HOME/.cache"
  "$HOME/.local"
  "$HOME/.config"
  "$HOME/.npm"
  "$HOME/.cargo"
  "$HOME/.rustup"
  "$HOME/.asdf"
  "$HOME/.pyenv"
  "$HOME/.venv"
  "$HOME/.virtualenvs"
)

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//"/\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

# Monta expressão find com exclusões
find_args=("$HOME" -maxdepth 6 -type f -name '*.sh')
find_args+=(-not -path "$EXCLUDE_1/*")
find_args+=(-not -path "$EXCLUDE_2/*")
for d in "${EXCLUDE_DIRS[@]}"; do
  find_args+=(-not -path "$d/*")
done

mapfile -t matches < <(find "${find_args[@]}" 2>/dev/null | LC_ALL=C sort)

printf '[\n'
first=true
for p in "${matches[@]}"; do
  [ -f "$p" ] || continue
  base=$(basename "$p")

  # Não listar arquivos com nomes incompatíveis com o plugin
  if ! [[ "$base" =~ ^[a-zA-Z0-9._-]+\.sh$ ]]; then
    continue
  fi

  # Não listar se já existe no diretório do plugin
  if [ -f "$SCRIPTS_DIR/$base" ]; then
    continue
  fi

  if [ "$first" = false ]; then
    printf ',\n'
  fi
  first=false

  printf '  {"name":"%s","path":"%s"}' "$(json_escape "$base")" "$(json_escape "$p")"
done
printf '\n]\n'
