#!/bin/bash
cd "$(dirname "$0")/.."

EMAIL=""
PASSWORD=""

for arg in "$@"; do
    case "$arg" in
        -email*)
            EMAIL="${arg#-email}"
            ;;
        -password*)
            PASSWORD="${arg#-password}"
            ;;
    esac
done

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
    echo "Usage: ./scripts/update_password.sh -email\"user@mail.kz\" -password\"new_password\""
    exit 1
fi

uv run python update_password.py -email "$EMAIL" -password "ч,"