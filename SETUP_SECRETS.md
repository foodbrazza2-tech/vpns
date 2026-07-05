# 🔑 GUIDE DE CONFIGURATION SUPABASE + GITHUB SECRETS

## 📋 Étape 1: Créer un Projet Supabase

### 1.1 Inscription / Connexion

```
URL: https://supabase.com
Email: mabusiness227743@gmail.com
Password: [Votre mot de passe sécurisé]
```

### 1.2 Créer un Nouveau Projet

1. Cliquez sur **"New Project"**
2. **Organization**: Créez-en une ou utilisez l'existante
3. **Project name**: `vpns-consulting`
4. **Database Password**: [Générez un mot de passe fort]
5. **Region**: `France (Paris)` pour la latence basse
6. Cliquez **"Create new project"**
7. Attendez 2-3 minutes l'initialisation

### 1.3 Récupérer vos Clés API

Allez dans **Settings** → **API**

Vous verrez:
```
Project URL:        https://xxxxx.supabase.co
anon (public):      eyJ...
service_role:       eyJ...  (Ne jamais partager!)
```

**Copiez et sauvegardez temporairement**:
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 🛠️ Étape 2: Configuration du Projet Local

### 2.1 Créez .env.local

```bash
cd vpns-consulting

# Copiez le template
cp .env.example .env.local
```

### 2.2 Éditez .env.local

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your-key...
VITE_API_URL=http://localhost:5000/api
```

### 2.3 Testez Localement

```bash
npm run dev
# Ouvrez http://localhost:5173
# Testez le login (crééz un compte de test)
```

---

## 🔐 Étape 3: GitHub Secrets pour CI/CD

### 3.1 Accédez au Settings GitHub

1. Allez sur: https://github.com/your-username/vpns-consulting
2. Cliquez sur **Settings** (en haut)
3. À gauche: **Secrets and variables** → **Actions**

### 3.2 Créez les Secrets

Cliquez **"New repository secret"** pour chaque:

#### Secret 1: VITE_SUPABASE_URL
```
Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
```
Cliquez **Add secret**

#### Secret 2: VITE_SUPABASE_ANON_KEY
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJ...votre-clé...
```
Cliquez **Add secret**

#### Secret 3: VITE_API_URL
```
Name: VITE_API_URL
Value: https://vpns-consulting.vercel.app/api
```
Cliquez **Add secret**

#### Secret 4: VERCEL_TOKEN (À générer)

Voir section Vercel ci-dessous

#### Secret 5: VERCEL_ORG_ID (À générer)

Voir section Vercel ci-dessous

#### Secret 6: VERCEL_PROJECT_ID (À générer)

Voir section Vercel ci-dessous

**Résultat final** (6 secrets):
```
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY
✓ VITE_API_URL
✓ VERCEL_TOKEN
✓ VERCEL_ORG_ID
✓ VERCEL_PROJECT_ID
```

---

## 🚀 Étape 4: Vercel Deployment

### 4.1 Créez un Vercel Token

1. Allez sur: https://vercel.com/account/tokens
2. Cliquez **Create**
3. **Token name**: `github-actions`
4. **Scope**: All scopes
5. Cliquez **Create**
6. **Copiez le token** (affiché une seule fois!)

```
Token example: a1b2c3d4e5f6g7h8i9j0
```

### 4.2 Connectez votre GitHub Repo à Vercel

1. Allez sur: https://vercel.com/dashboard
2. Cliquez **Add New** → **Project**
3. **Import Git Repository**
4. Cherchez `vpns-consulting`
5. Cliquez **Import**

### 4.3 Configurez les Environment Variables sur Vercel

Dans Vercel → Votre projet → **Settings** → **Environment Variables**

Ajoutez (Production):
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://vpns-consulting.vercel.app/api
```

Cliquez **Save**

### 4.4 Récupérez votre Vercel IDs

Votre projet Vercel URL ressemble à:
```
https://vercel.com/your-username/vpns-consulting
```

Pour obtenir les IDs:
1. Dans le terminal, exécutez:
```bash
vercel link
# Répondez "Y" aux questions
# Les IDs seront sauvegardés dans .vercel/project.json
```

2. Ouvrez `.vercel/project.json`:
```json
{
  "projectId": "abc123...",
  "orgId": "xyz789..."
}
```

3. Copiez ces valeurs

### 4.5 Ajoutez les Vercel IDs à GitHub Secrets

Allez sur GitHub Settings → Secrets

Ajoutez:
```
VERCEL_TOKEN=a1b2c3d4e5f6g7h8i9j0
VERCEL_ORG_ID=xyz789...
VERCEL_PROJECT_ID=abc123...
```

---

## ✅ Vérification Finale

### Checklist Supabase

- [x] Compte créé et authentifié
- [x] Projet créé (FR - Paris)
- [x] URL du projet: `https://xxxxx.supabase.co`
- [x] Clé anon (publique) copiée
- [x] Clé service (privée) en sécurité

### Checklist GitHub

- [x] 3 secrets Supabase ajoutés
- [x] 3 secrets Vercel ajoutés
- [x] Tous les 6 secrets visibles dans Settings → Secrets

### Checklist Vercel

- [x] Token généré et copié
- [x] Repo connecté à Vercel
- [x] Environment variables configurées
- [x] IDs extraits et sauvegardés dans GitHub

### Checklist Local

- [x] .env.local créé avec les bonnes valeurs
- [x] `npm run dev` fonctionne
- [x] Login/signup fonctionnent

---

## 🔄 Déploiement Test

### Première Deployment

```bash
# 1. Commitez les fichiers
git add .
git commit -m "initial: setup supabase and github secrets"
git push origin main

# 2. Regardez GitHub Actions
# - Allez sur https://github.com/your-username/vpns-consulting
# - Cliquez "Actions"
# - Vérifiez que le workflow passe ✓

# 3. Vérifiez Vercel
# - Allez sur https://vercel.com/dashboard
# - Vérifiez que le deploy est OK ✓
# - Ouvrez votre URL: https://vpns-consulting.vercel.app

# 4. Testez!
# - Créez un compte
# - Uploadez un document
# - Vérifiez sur Supabase
```

---

## 🆘 Dépannage

### "Secrets not found during deploy"

```
Solution:
1. Vérifiez que les secrets sont dans GitHub Settings
2. Vérifiez l'orthographe exacte
3. Redéployez après d'ajouter les secrets
```

### "Invalid Supabase credentials"

```
Vérifiez:
- VITE_SUPABASE_URL est complet (https://xxxxx.supabase.co)
- VITE_SUPABASE_ANON_KEY n'a pas d'espaces
- Copiez directement depuis Supabase (pas de modification)
```

### "Build fails on Vercel"

```bash
# Regardez les logs:
# 1. Vercel Dashboard → Logs
# 2. GitHub Actions → Workflow logs

# Ou en local:
npm run build
# Vérifiez les erreurs

# Solution commune:
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Login doesn't work in prod"

```
Vérifiez:
1. VITE_SUPABASE_URL configuré sur Vercel
2. VITE_SUPABASE_ANON_KEY configuré sur Vercel
3. CORS permettre votre domaine Vercel
   - Supabase → Settings → API → CORS origins
   - Ajoutez: https://vpns-consulting.vercel.app
```

---

## 🔒 Sécurité des Secrets

### ✅ À Faire

- ✓ Jamais committer `.env.local`
- ✓ Utiliser GitHub Secrets pour CI/CD
- ✓ Jamais partager tokens par email/chat
- ✓ Rotation des tokens chaque 90 jours
- ✓ Différentes clés dev/prod

### ❌ À Éviter

- ✗ Hardcoder les secrets dans le code
- ✗ Les mettre dans Git
- ✗ Les partager en messages
- ✗ Les garder indéfiniment
- ✗ La même clé pour tout

---

## 📚 Ressources

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Actions](https://docs.github.com/en/actions)

---

**Confiture complet: 30 minutes maximum**  
**Support**: mabusiness227743@gmail.com

✅ Vous êtes maintenant prêt pour le déploiement !
