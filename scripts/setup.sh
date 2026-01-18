#!/bin/bash

set -e

echo "================================================"
echo "  Read Master - Setup Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for pnpm
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}Error: pnpm is not installed${NC}"
        echo ""
        echo "Please install pnpm first:"
        echo "  npm install -g pnpm"
        echo "  or"
        echo "  corepack enable && corepack prepare pnpm@latest --activate"
        echo ""
        exit 1
    fi

    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}✓${NC} pnpm found (v$PNPM_VERSION)"
}

# Check Node.js version
check_node() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi

    NODE_VERSION=$(node --version | sed 's/v//')
    REQUIRED_VERSION="20.0.0"

    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        echo -e "${RED}Error: Node.js version must be >= 20.0.0 (found v$NODE_VERSION)${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓${NC} Node.js found (v$NODE_VERSION)"
}

# Check for timeout command
check_timeout() {
    if command -v gtimeout &> /dev/null; then
        echo -e "${GREEN}✓${NC} gtimeout found (required for Ralph scripts)"
    elif command -v timeout &> /dev/null; then
        echo -e "${GREEN}✓${NC} timeout found (required for Ralph scripts)"
    else
        echo -e "${YELLOW}!${NC} timeout command not found"
        echo "  Ralph scripts will work but without timeout protection"
        echo "  Install with: brew install coreutils"
        echo ""
    fi
}

# Setup environment file
setup_env() {
    if [ -f ".env.local" ]; then
        echo -e "${YELLOW}!${NC} .env.local already exists"
        read -p "  Do you want to overwrite it? (y/N) " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "  Keeping existing .env.local"
            return
        fi
    fi

    if [ -f ".env.example" ]; then
        cp .env.example .env.local
        echo -e "${GREEN}✓${NC} Created .env.local from .env.example"
        echo -e "${YELLOW}!${NC} Please edit .env.local with your actual credentials"
    else
        echo -e "${YELLOW}!${NC} .env.example not found - skipping .env.local creation"
    fi
}

# Install dependencies
install_deps() {
    echo ""
    echo "Installing dependencies..."
    pnpm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
}

# Setup Husky (if it exists)
setup_husky() {
    if [ -f "package.json" ] && grep -q '"prepare"' package.json; then
        echo ""
        echo "Setting up Husky..."
        pnpm prepare
        echo -e "${GREEN}✓${NC} Husky configured"
    fi
}

# Make scripts executable
make_scripts_executable() {
    echo ""
    echo "Making Ralph scripts executable..."
    chmod +x scripts/ralph.sh scripts/ralph-loop.sh scripts/ralph-once.sh
    echo -e "${GREEN}✓${NC} Scripts are now executable"
}

# Main
main() {
    echo "Checking prerequisites..."
    echo ""

    check_node
    check_pnpm
    check_timeout

    echo ""
    setup_env
    install_deps
    setup_husky
    make_scripts_executable

    echo ""
    echo "================================================"
    echo -e "${GREEN}Setup complete!${NC}"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "  1. Edit .env.local with your credentials (if created)"
    echo "  2. Run database setup:"
    echo "     - pnpm db:generate"
    echo "     - pnpm db:migrate"
    echo "  3. Start development:"
    echo "     - pnpm dev"
    echo ""
    echo "Ralph Wiggum Scripts:"
    echo "  - ./scripts/ralph-once.sh [timeout]  # HITL single iteration"
    echo "  - ./scripts/ralph-loop.sh [iters] [timeout]  # AFK loop"
    echo "  - ./scripts/ralph.sh <iters> [timeout]  # Fully automated"
    echo ""
}

main
