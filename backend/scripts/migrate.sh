#!/bin/bash
uv run alembic revision --autogenerate -m "$1"
uv run alembic upgrade head