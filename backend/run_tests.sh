#!/bin/bash
# Run the backend test suite inside the r3p-backend container.
# Tests use SQLite in-memory — no effect on the live PostgreSQL database.
set -e
podman cp "$(dirname "$0")/tests" r3p-backend:/app/tests
podman exec -w /app r3p-backend python -m pytest tests/ "$@"
