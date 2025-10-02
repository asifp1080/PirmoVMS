#!/bin/bash

# VMS Database Reset and Reseed Script
# This script provides a quick way to reset the database and reseed with fresh data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_NAME=${DB_NAME:-"vms_dev"}
DB_USER=${DB_USER:-"vms_user"}
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}

echo -e "${BLUE}🔄 VMS Database Reset & Reseed Script${NC}"
echo "=================================="

# Function to check if PostgreSQL is running
check_postgres() {
    if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
        echo -e "${RED}❌ PostgreSQL is not running or not accessible${NC}"
        echo "Please ensure PostgreSQL is running and accessible at $DB_HOST:$DB_PORT"
        exit 1
    fi
    echo -e "${GREEN}✅ PostgreSQL connection verified${NC}"
}

# Function to reset database
reset_database() {
    echo -e "${YELLOW}🗑️  Resetting database...${NC}"
    
    # Drop and recreate database
    echo "Dropping database $DB_NAME..."
    dropdb -h $DB_HOST -p $DB_PORT -U $DB_USER --if-exists $DB_NAME
    
    echo "Creating database $DB_NAME..."
    createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME
    
    echo -e "${GREEN}✅ Database reset complete${NC}"
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}🔧 Running database migrations...${NC}"
    
    cd apps/api
    npm run db:migrate
    cd ../..
    
    echo -e "${GREEN}✅ Migrations complete${NC}"
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}🌱 Seeding database with sample data...${NC}"
    
    node scripts/seed-database.js
    
    echo -e "${GREEN}✅ Database seeding complete${NC}"
}

# Function to generate additional test data
generate_analytics_data() {
    echo -e "${YELLOW}📊 Generating additional analytics data...${NC}"
    
    node scripts/generate-analytics-data.js
    
    echo -e "${GREEN}✅ Analytics data generation complete${NC}"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --full          Full reset: drop DB, migrate, seed, and generate analytics"
    echo "  --reset-only    Only reset database (drop and recreate)"
    echo "  --migrate-only  Only run migrations"
    echo "  --seed-only     Only seed database"
    echo "  --analytics     Only generate analytics data"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_NAME         Database name (default: vms_dev)"
    echo "  DB_USER         Database user (default: vms_user)"
    echo "  DB_HOST         Database host (default: localhost)"
    echo "  DB_PORT         Database port (default: 5432)"
}

# Parse command line arguments
case "${1:-}" in
    --full)
        check_postgres
        reset_database
        run_migrations
        seed_database
        generate_analytics_data
        ;;
    --reset-only)
        check_postgres
        reset_database
        ;;
    --migrate-only)
        check_postgres
        run_migrations
        ;;
    --seed-only)
        check_postgres
        seed_database
        ;;
    --analytics)
        check_postgres
        generate_analytics_data
        ;;
    --help)
        show_usage
        exit 0
        ;;
    "")
        # Default: full reset and seed
        check_postgres
        reset_database
        run_migrations
        seed_database
        ;;
    *)
        echo -e "${RED}❌ Unknown option: $1${NC}"
        show_usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Database operations completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Start the API server: cd apps/api && npm run start:dev"
echo "2. Start the web app: cd apps/web && npm run dev"
echo "3. Access the admin panel at: http://localhost:3000"
echo ""
echo -e "${BLUE}🔑 Sample Login Credentials:${NC}"
echo "Check the output above for organization-specific login details"