Déploiement sur Vercel — guide rapide

Pré-requis:
- Avoir un compte Vercel
- Node.js + npm installés localement
- (optionnel) CLI `vercel` pour déploiement rapide: `npm i -g vercel`

Étapes — méthode recommandée (GitHub → Vercel):

1. Commit & push sur GitHub

```bash
git init
git add .
git commit -m "chore: prepare project for Vercel"
# créer le repo via GitHub UI ou CLI (gh)
# ex: gh repo create my-org/vpns --public --source=. --push
git push origin main
```

2. Importer le projet sur Vercel
- Dans Vercel Dashboard -> New Project -> Import Git Repository
- Choisir le repo et configurer:
  - Framework preset: `Other` ou laisser détecter (Vite)
  - Build command: `npm run build`
  - Output directory: `dist`

3. Configurer les variables d'environnement (Dashboard -> Settings -> Environment Variables)
- `VITE_SUPABASE_URL` = <votre supabase url>
- `VITE_SUPABASE_ANON_KEY` = <votre clé anonyme>
- (Si votre backend Express reste utilisé) `MONGODB_URI` = <mongodb connection string>

4. Déployer (via Dashboard) ou avec CLI

```bash
# via CLI
vercel login
vercel --prod
```

Le déploiement renverra une URL publique comme `https://your-project.vercel.app`. Copiez-la — c'est l'URL de déploiement.

Notes et recommandations:
- Cette configuration déploie uniquement le frontend Vite (output `dist`).
- Si vous souhaitez héberger l'API Express sur Vercel, il faut la convertir en fonctions serverless (API routes) ou séparer le backend (ex: déployer sur Render/Heroku/Cloud Run) et pointer `API_BASE_URL` vers son URL.
- Pour l'usage de Supabase comme base de données et authentification, créez un projet Supabase et utilisez les clés dans les variables d'environnement. Mettez en place des politiques RLS pour la sécurité des données.
- Pour obtenir l'URL finale: après un déploiement `vercel --prod` la CLI affiche l'URL en sortie; sinon récupérez-la depuis le Dashboard.

Dépannage rapide:
- Build échoue: vérifier `npm run build` localement et corriger les erreurs.
- Variables manquantes: ajoutez-les dans Vercel Dashboard puis redéployez.

Si vous voulez, je peux:
- Préparer un commit/branch `deploy/vercel` et pousser (nécessite accès Git remote), ou
- Générer les commandes précises pour vous à exécuter localement.
