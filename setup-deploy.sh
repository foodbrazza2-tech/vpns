#!/bin/bash
#
# Script de configuration initial pour le déploiement
# Exécutez ceci une fois avant le premier déploiement
#

echo "🔧 VPNS Consulting - Configuration initiale"
echo "=============================================="
echo ""

# Créer le répertoire d'icônes s'il n'existe pas
mkdir -p public/icons

# Créer des icônes PNG depuis SVG (nécessite ImageMagick)
# ou utiliser les SVG directement

echo "✓ Structure des fichiers créée"
echo ""

# Vérifier Vercel
echo "Vérification de Vercel..."
npm install -g vercel 2>/dev/null

# Instructions pour l'utilisateur
echo ""
echo "📋 PROCHAINES ÉTAPES:"
echo ""
echo "1️⃣  Configurez le fichier .env.local:"
echo "   cp .env.example .env.local"
echo "   # Éditez avec vos clés Supabase"
echo ""
echo "2️⃣  Connectez votre GitHub à Vercel:"
echo "   vercel link"
echo ""
echo "3️⃣  Déployez:"
echo "   npm run build"
echo "   vercel --prod"
echo ""
echo "✅ Configuration terminée !"
echo ""
