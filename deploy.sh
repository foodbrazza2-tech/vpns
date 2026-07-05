#!/bin/bash
#
# VPNS Consulting - Script de déploiement automatisé
# Usage: ./deploy.sh
#

set -e

echo "🚀 VPNS Consulting - Déploiement en production"
echo "================================================"

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Vérifier les dépendances
echo -e "${YELLOW}1. Vérification des dépendances...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js non installé${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm non installé${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git non installé${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dépendances OK${NC}"

# Vérifier .env
echo -e "${YELLOW}2. Vérification de la configuration...${NC}"

if [ ! -f .env.local ]; then
    echo -e "${RED}✗ .env.local manquant${NC}"
    echo "Créez .env.local avec:"
    echo "  VITE_SUPABASE_URL=..."
    echo "  VITE_SUPABASE_ANON_KEY=..."
    exit 1
fi

echo -e "${GREEN}✓ Configuration OK${NC}"

# Installer les dépendances
echo -e "${YELLOW}3. Installation des dépendances...${NC}"
npm ci || npm install

echo -e "${GREEN}✓ Dépendances installées${NC}"

# Tests
echo -e "${YELLOW}4. Exécution des tests...${NC}"
npm test

echo -e "${GREEN}✓ Tests passés${NC}"

# Type checking
echo -e "${YELLOW}5. Vérification des types...${NC}"
npm run type-check

echo -e "${GREEN}✓ Types OK${NC}"

# Build
echo -e "${YELLOW}6. Construction de l'app...${NC}"
npm run build

echo -e "${GREEN}✓ Build réussi${NC}"

# Vercel CLI check
echo -e "${YELLOW}7. Vérification de Vercel CLI...${NC}"

if ! command -v vercel &> /dev/null; then
    echo "Installation de Vercel CLI..."
    npm install -g vercel
fi

echo -e "${GREEN}✓ Vercel CLI OK${NC}"

# Déploiement
echo -e "${YELLOW}8. Déploiement sur Vercel...${NC}"

if [ "$1" == "--prod" ]; then
    vercel --prod
else
    vercel --confirm
fi

echo -e "${YELLOW}9. Commit et push sur GitHub...${NC}"

git add -A
git commit -m "chore: deployment $(date +%Y-%m-%d_%H:%M:%S)"
git push origin main

echo ""
echo -e "${GREEN}✅ Déploiement réussi !${NC}"
echo ""
echo "Prochaines étapes:"
echo "  - Vérifier le déploiement: https://vpns-consulting.vercel.app"
echo "  - Vérifier les logs: https://vercel.com/dashboard"
echo "  - Vérifier la base de données: https://supabase.com/dashboard"
echo ""
