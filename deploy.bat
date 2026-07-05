@echo off
REM VPNS Consulting - Script de déploiement Windows
REM Usage: deploy.bat

echo 🚀 VPNS Consulting - Déploiement en production
echo ================================================
echo.

REM Vérifier Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ✗ Node.js non installé
    exit /b 1
)

echo ✓ Node.js trouvé

REM Vérifier .env.local
if not exist ".env.local" (
    echo ✗ .env.local manquant
    echo Créez .env.local avec:
    echo   VITE_SUPABASE_URL=...
    echo   VITE_SUPABASE_ANON_KEY=...
    exit /b 1
)

echo ✓ Configuration OK

REM Installation
echo.
echo Installation des dépendances...
call npm ci
if %ERRORLEVEL% NEQ 0 (
    call npm install
)

REM Tests
echo.
echo Exécution des tests...
call npm test

REM Type checking
echo.
echo Vérification des types...
call npm run type-check

REM Build
echo.
echo Construction de l'app...
call npm run build

REM Vercel
echo.
echo Installation de Vercel CLI...
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    call npm install -g vercel
)

REM Déploiement
echo.
echo Déploiement sur Vercel...

if "%1"=="--prod" (
    call vercel --prod
) else (
    call vercel
)

REM Git
echo.
echo Commit et push sur GitHub...
call git add -A
call git commit -m "chore: deployment %date% %time%"
call git push origin main

echo.
echo ✅ Déploiement réussi !
echo.
echo Prochaines étapes:
echo   - Vérifier le déploiement: https://vpns-consulting.vercel.app
echo   - Vérifier les logs: https://vercel.com/dashboard
echo   - Vérifier la base de données: https://supabase.com/dashboard
echo.
pause
