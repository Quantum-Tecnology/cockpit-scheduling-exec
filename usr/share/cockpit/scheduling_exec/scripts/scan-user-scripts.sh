#!/bin/bash
# Lista scripts .sh existentes no HOME para importar para o gerenciador

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"

# Diretórios ruidosos comuns (evita varredura desnecessária)
EXCLUDE_DIRS=(
  "$SCRIPTS_DIR"
  "$METADATA_DIR"
  "$HOME/.cache"
  "$HOME/.local/share"
  "$HOME/.local/state"
  "$HOME/.local/lib"
  "$HOME/.npm"
  "$HOME/.cargo"
  "$HOME/.rustup"
  "$HOME/.asdf"
  "$HOME/.pyenv"
  "$HOME/.venv"
  "$HOME/.virtualenvs"
  "$HOME/.git"
)

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

find_args=("$HOME" -maxdepth 8 -type f -name '*.sh')
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

  # Não listar se já existe no diretório gerenciado pelo plugin
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
