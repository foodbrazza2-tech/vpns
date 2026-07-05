# 🚀 DÉPLOIEMENT RAPIDE EN 5 MINUTES

## ⚡ Setup Express

### Étape 1: Supabase (2 min)

```bash
# 1. Allez sur https://supabase.com
# 2. Sign in avec: mabusiness227743@gmail.com
# 3. Créez un nouveau projet → Attendez 2 min
```

Récupérez:
- Project URL → Sauvegardez
- Anon Key → Sauvegardez

### Étape 2: Variables locales (1 min)

```bash
# Créez .env.local
cp .env.example .env.local

# Remplissez:
VITE_SUPABASE_URL=votre_url
VITE_SUPABASE_ANON_KEY=votre_clé
```

### Étape 3: GitHub (1 min)

```bash
# Connectez-vous
git clone https://github.com/your-username/vpns-consulting.git
cd vpns-consulting

# Configurez l'origin
git remote set-url origin https://github.com/your-username/vpns-consulting.git
```

### Étape 4: Vercel (1 min)

```bash
# Installez Vercel
npm install -g vercel

# Déployez
vercel
# Répondez aux questions
```

---

## ✅ C'est fini !

Votre app est maintenant déployée sur:
```
https://vpns-consulting.vercel.app
```

Configur les secrets GitHub automatiquement:
```bash
# Vercel le fait pour vous quand vous connexinez
```

---

## 🔍 Vérifier le déploiement

```bash
# Logs Vercel
vercel logs

# Ouvrir le dashboard
vercel dashboard
```

---

## 📱 Tests mobiles

```bash
# Build local
npm run build
npm run preview

# Ouvrir sur http://localhost:5173
# Tester sur mobile (ou device emulator)
```

---

## 🆘 Problèmes courants

### Build échoue
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erreur d'auth Supabase
```
Vérifiez:
- VITE_SUPABASE_URL correct
- VITE_SUPABASE_ANON_KEY correct
- Supabase project actif
```

### App ne se charge pas en prod
```bash
# Vérifiez les logs
vercel logs --tail
```

---

## 📊 Dashboard

- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://supabase.com/dashboard
- **GitHub**: https://github.com/your-username/vpns-consulting

---

**Créé pour déploiement ultra-rapide !** 🚀
