#!/bin/bash

# Database management script for CBA Server tests
# Usage: ./scripts/db.sh [up|down|status|wait]
#
# Supports both Docker and local PostgreSQL installations.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
CONTAINER_NAME="cba-postgres-test"

# Database configuration
DB_HOST="${TEST_DB_HOST:-localhost}"
DB_PORT="${TEST_DB_PORT:-5432}"
DB_NAME="${TEST_DB_NAME:-cba_test}"
DB_USER="${TEST_DB_USER:-postgres}"
DB_PASSWORD="${TEST_DB_PASSWORD:-postgres}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Find pg_isready command
find_pg_isready() {
    if command -v pg_isready &> /dev/null; then
        echo "pg_isready"
    elif [ -f "/opt/homebrew/opt/postgresql@16/bin/pg_isready" ]; then
        echo "/opt/homebrew/opt/postgresql@16/bin/pg_isready"
    elif [ -f "/usr/local/opt/postgresql@16/bin/pg_isready" ]; then
        echo "/usr/local/opt/postgresql@16/bin/pg_isready"
    else
        echo ""
    fi
}

# Find psql command
find_psql() {
    if command -v psql &> /dev/null; then
        echo "psql"
    elif [ -f "/opt/homebrew/opt/postgresql@16/bin/psql" ]; then
        echo "/opt/homebrew/opt/postgresql@16/bin/psql"
    elif [ -f "/usr/local/opt/postgresql@16/bin/psql" ]; then
        echo "/usr/local/opt/postgresql@16/bin/psql"
    else
        echo ""
    fi
}

PG_ISREADY=$(find_pg_isready)
PSQL=$(find_psql)

check_docker() {
    command -v docker &> /dev/null
}

check_local_postgres() {
    if [ -z "$PG_ISREADY" ]; then
        return 1
    fi

    PGPASSWORD="$DB_PASSWORD" $PG_ISREADY -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" > /dev/null 2>&1
}

check_database_exists() {
    if [ -z "$PSQL" ]; then
        return 1
    fi

    PGPASSWORD="$DB_PASSWORD" $PSQL -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"
}

status() {
    # First check Docker
    if check_docker; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
            echo -e "${GREEN}PostgreSQL is running via Docker${NC} (container: $CONTAINER_NAME)"
            return 0
        fi
    fi

    # Then check local PostgreSQL
    if check_local_postgres; then
        echo -e "${GREEN}PostgreSQL is running locally${NC} (${DB_HOST}:${DB_PORT})"

        if check_database_exists; then
            echo -e "${GREEN}Database '${DB_NAME}' exists and is ready${NC}"
            return 0
        else
            echo -e "${YELLOW}Database '${DB_NAME}' does not exist - will be created on first test run${NC}"
            return 0
        fi
    fi

    echo -e "${RED}PostgreSQL is not running${NC}"
    echo ""
    echo "To start PostgreSQL:"
    echo "  - Via Docker: npm run db:up"
    echo "  - Via Homebrew: brew services start postgresql@16"
    return 1
}

up() {
    # Check if local postgres is already running
    if check_local_postgres; then
        echo -e "${GREEN}PostgreSQL is already running locally${NC}"
        ensure_database_exists
        return 0
    fi

    # Try Docker if available
    if check_docker; then
        echo "Starting PostgreSQL test database via Docker..."
        cd "$PROJECT_DIR"
        docker compose up -d postgres-test

        echo "Waiting for database to be ready..."
        wait_for_db

        echo -e "${GREEN}PostgreSQL test database is ready!${NC}"
    else
        # Try Homebrew
        if command -v brew &> /dev/null; then
            echo "Starting PostgreSQL via Homebrew..."
            brew services start postgresql@16

            echo "Waiting for database to be ready..."
            wait_for_db
            ensure_database_exists

            echo -e "${GREEN}PostgreSQL is ready!${NC}"
        else
            echo -e "${RED}Neither Docker nor Homebrew PostgreSQL available${NC}"
            echo "Install PostgreSQL via Docker or Homebrew first."
            exit 1
        fi
    fi

    echo "Connection: postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
}

down() {
    if check_docker; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
            echo "Stopping PostgreSQL test database (Docker)..."
            cd "$PROJECT_DIR"
            docker compose down
            echo -e "${GREEN}PostgreSQL test database stopped${NC}"
            return 0
        fi
    fi

    if command -v brew &> /dev/null; then
        echo "Stopping PostgreSQL (Homebrew)..."
        brew services stop postgresql@16
        echo -e "${GREEN}PostgreSQL stopped${NC}"
        return 0
    fi

    echo -e "${YELLOW}No running PostgreSQL instance found to stop${NC}"
}

wait_for_db() {
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if check_local_postgres; then
            return 0
        fi
        echo "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 1
        ((attempt++))
    done

    echo -e "${RED}Database failed to become ready after $max_attempts attempts${NC}"
    exit 1
}

ensure_database_exists() {
    if [ -z "$PSQL" ]; then
        echo -e "${YELLOW}psql not found, skipping database creation check${NC}"
        return 0
    fi

    if ! check_database_exists; then
        echo "Creating database '${DB_NAME}'..."
        PGPASSWORD="$DB_PASSWORD" $PSQL -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};" 2>/dev/null || true
        echo -e "${GREEN}Database '${DB_NAME}' created${NC}"
    fi
}

case "${1:-status}" in
    up)
        up
        ;;
    down)
        down
        ;;
    status)
        status
        ;;
    wait)
        wait_for_db
        ;;
    *)
        echo "Usage: $0 [up|down|status|wait]"
        echo ""
        echo "Commands:"
        echo "  up      Start the PostgreSQL test database"
        echo "  down    Stop the PostgreSQL test database"
        echo "  status  Check if database is running (default)"
        echo "  wait    Wait for database to be ready"
        exit 1
        ;;
esac
