# 🚀 GUIDE DE DÉPLOIEMENT COMPLET - Vercel + GitHub + Supabase

## ⚡ Configuration Express (15 minutes)

### 1. Configurer Supabase

```bash
# 1. Allez sur https://supabase.com
# 2. Connectez-vous avec: mabusiness227743@gmail.com
# 3. Créez un nouveau projet
# 4. Attendez l'initialisation
```

**Récupérer vos clés** :
- Allez dans **Settings** → **API**
- Copiez :
  - `Project URL` → `VITE_SUPABASE_URL`
  - `anon public` → `VITE_SUPABASE_ANON_KEY`

### 2. Configurer GitHub

```bash
# 1. Connectez-vous à GitHub avec: mabusiness227743@gmail.com
# 2. Clonez le repo:
git clone https://github.com/your-username/vpns-consulting.git
cd vpns-consulting

# 3. Créez un token GitHub:
# https://github.com/settings/tokens/new
# Permissions: repo, workflow

# 4. Sauvegardez le token (ne le perdez pas!)
```

### 3. Configurer Vercel

```bash
# 1. Allez sur https://vercel.com
# 2. Connectez-vous avec: mabusiness227743@gmail.com
# 3. Importez le repo GitHub
# 4. Configurez les variables d'environnement:
```

**Variables Vercel** :
```
VITE_SUPABASE_URL=votre-url-supabase
VITE_SUPABASE_ANON_KEY=votre-clé-anon
VITE_API_URL=https://votre-api.com/api
```

### 4. Configurer les Secrets GitHub

```bash
# Allez dans Settings → Secrets → Actions
# Ajoutez:

VERCEL_TOKEN=votre-token-vercel
VERCEL_ORG_ID=votre-org-id
VERCEL_PROJECT_ID=votre-project-id

VITE_SUPABASE_URL=votre-url-supabase
VITE_SUPABASE_ANON_KEY=votre-clé-anon
VITE_API_URL=https://votre-api.com/api
```

---

## 📋 Checklist de déploiement

### Phase 1: Préparation (10 min)

- [ ] Créer compte Vercel
- [ ] Créer compte GitHub
- [ ] Créer projet Supabase
- [ ] Récupérer toutes les clés API

### Phase 2: Configuration (15 min)

- [ ] Connecter GitHub à Vercel
- [ ] Configurer variables d'environnement
- [ ] Configurer secrets GitHub Actions
- [ ] Tester le build localement

```bash
npm run build
```

### Phase 3: Test (10 min)

- [ ] Faire un commit de test
- [ ] Vérifier que GitHub Actions s'exécute
- [ ] Vérifier que Vercel déploie
- [ ] Tester l'app déployée

### Phase 4: Production (5 min)

- [ ] Activer les déploiements automatiques
- [ ] Configurer domain custom
- [ ] Activer HTTPS
- [ ] Configurer sauvegardes

---

## 🔐 Configuration de Sécurité

### Sur Vercel

1. **Allez dans Project Settings**
2. **Domains** → Ajoutez votre domaine
3. **Security** → Activez HTTPS
4. **Environment Variables** → Vérifiez que c'est protégé

### Sur Supabase

1. **Authentication** → Configurez les providers
2. **Database** → Activez Row Level Security
3. **API** → Configurez CORS:

```javascript
// URL autorisées
https://vpns-consulting.vercel.app
https://votre-domaine.com
```

### Sur GitHub

1. **Settings** → **Security** → **Branch protection**
2. Exigez des reviews avant merge sur main
3. Exigez que le CI passe

---

## 🔄 Déploiement Continu

### Automatique (Main branch)

```
Push sur main
    ↓
Tests + Security Audit
    ↓
Build
    ↓
Deploy sur Vercel
```

### Manuel (Autres branches)

```
Push sur develop
    ↓
Tests uniquement
    ↓
Preview sur Vercel
```

### Pull Requests

```
Créer PR
    ↓
Tests + Security Audit
    ↓
Preview sur Vercel
    ↓
Code review
    ↓
Merge → Deploy
```

---

## 🚨 Dépannage

### Le build échoue

```bash
# Nettoyer le cache:
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erreurs d'authentification

```
Vérifiez:
- VITE_SUPABASE_URL correct
- VITE_SUPABASE_ANON_KEY correct
- CORS configuré dans Supabase
```

### App ne se charge pas en production

```
Vérifiez:
- Network tab (console Firefox/Chrome)
- Logs Vercel: https://vercel.com/dashboard
- Logs Supabase: https://supabase.com/dashboard
```

---

## 📊 Monitoring

### Vercel Analytics

https://vercel.com/dashboard → Votre projet → Analytics

Metriques clés:
- Core Web Vitals
- Response time
- Uptime

### Supabase Monitoring

https://supabase.com/dashboard → Votre projet → Monitoring

Metriques clés:
- Database queries
- API response time
- Storage usage

---

## 🔑 Gestion des Secrets

### ✅ À Faire

- Jamais committer `.env`
- Utiliser GitHub Secrets pour CI/CD
- Rotation des clés tous les 90 jours
- Logs d'accès aux secrets

### ❌ À Éviter

- Hardcoder les clés
- Partager les `.env` par email/chat
- Utiliser la même clé partout
- Laisser les clés dans les logs

---

## 🆘 Support

**Vercel**: https://vercel.com/support  
**GitHub**: https://github.com/support  
**Supabase**: https://supabase.com/support  

Email: mabusiness227743@gmail.com

---

**✅ Déploiement terminé !**
