#!/bin/bash

echo "- Ruff check"
uv run ruff check .

echo ""
echo "- Ruff fix"
uv run ruff check . --fix

echo ""
echo "- Ruff format"
uv run ruff format .

echo ""
echo "- Mypy"
uv run mypy .