#!/bin/bash
# Script de desinstalação

set -e

echo "================================================"
echo "  Desinstalação - Cockpit Scheduling Exec"
echo "================================================"
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo "Este script precisa ser executado como root (sudo)"
    exit 1
fi

read -p "Tem certeza que deseja desinstalar o Cockpit Scheduling Exec? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Desinstalação cancelada."
    exit 0
fi

echo "Removendo arquivos..."
rm -rf /usr/share/cockpit/scheduling-exec

echo "Reiniciando Cockpit..."
systemctl restart cockpit

echo ""
echo "================================================"
echo "  Desinstalação concluída!"
echo "================================================"
echo ""
echo "Nota: Os scripts criados pelos usuários em ~/scripts"
echo "e seus metadados em ~/.scripts-metadata foram preservados."
echo "Se desejar removê-los, execute:"
echo "  rm -rf ~/scripts ~/.scripts-metadata"
echo ""
