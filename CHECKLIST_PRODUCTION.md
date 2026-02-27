# Checklist mise en production — AFC

**Cibles :** Frontend → Vercel | Backend → Render | Base → Supabase ou Neon

---

## 1. Backend (Render)

- [ ] **Variables d’environnement** (Render Dashboard → Environment)
  - `DATABASE_URL` : URL PostgreSQL (Supabase/Neon)
  - `JWT_SECRET` : secret fort (min. 32 caractères), **jamais** le défaut dev
  - `FRONTEND_URL` : URL du frontend Vercel (ex. `https://afc.vercel.app`)
  - `NODE_ENV=production`
  - Optionnel : CinetPay, WhatsApp, SMS (voir `backend/.env.example`)
- [ ] **Build** : `npm install && npm run build`
- [ ] **Migrations** : avant ou au démarrage, ex. `npm run prisma:migrate:deploy`
- [ ] **Start** : `npm run start:prod` (ou `node dist/src/main.js`)
- [ ] **Health check** : Render peut appeler `GET /health` (sans auth)
- [ ] **Webhook CinetPay** : `CINETPAY_NOTIFY_URL` = URL publique du backend (ex. `https://votre-backend.onrender.com/contributions/payments/cinetpay/notify`)

---

## 2. Frontend (Vercel)

- [ ] **Variable** : `NEXT_PUBLIC_API_URL` = URL du backend (ex. `https://votre-backend.onrender.com`)
- [ ] Aucune autre variable sensible en `NEXT_PUBLIC_*`
- [ ] Build : `npm run build` (défaut Vercel)
- [ ] Redirections protégées : layout dashboard + auth context (pas de token → login ; compte suspendu → `/compte-suspendu`)

---

## 3. Base de données (Supabase ou Neon)

- [ ] Créer un projet et récupérer l’URL PostgreSQL (format `postgresql://...`)
- [ ] Coller l’URL dans `DATABASE_URL` du backend (Render)
- [ ] Lancer les migrations depuis la machine de dev ou un job Render :  
  `cd backend && npx prisma migrate deploy`
- [ ] (Optionnel) Seed initial : `npx prisma db seed`

---

## 4. Sécurité

- [ ] **JWT** : en production, `JWT_SECRET` est défini et différent de `afc-dev-secret-change-in-prod` (sinon le backend refuse de démarrer)
- [ ] **OTP** : expiration 15 min ; limite 5 envois / heure / IP sur `POST /auth/send-activation-otp`
- [ ] **Comptes suspendus** : refus d’accès API (403) sauf rôle ADMIN ; frontend redirige vers `/compte-suspendu`
- [ ] **CORS** : en production, limité à `FRONTEND_URL`
- [ ] **Headers** : Helmet activé (CSP désactivée pour éviter les conflits)
- [ ] **Rate limiting** : 100 req/min par défaut ; OTP plus strict (voir ci‑dessus)

---

## 5. Fichiers livrés / à ne pas commiter

- [ ] `backend/.env` et `frontend/.env.local` : **ne jamais** les commiter
- [ ] Utiliser `backend/.env.example` et `frontend/.env.example` comme modèles (sans valeurs réelles)
- [ ] Vérifier que `.env` et `.env.local` sont dans `.gitignore`

---

## 6. Après déploiement

- [ ] Tester login / activation / mot de passe
- [ ] Tester une cotisation (CinetPay en mode test si dispo)
- [ ] Vérifier `GET /health` (sans auth)
- [ ] Vérifier que les appels API du frontend vont bien vers le backend (pas de mixed content si HTTPS)
- [ ] Contrôler les logs backend (Render logs) en cas d’erreur 5xx

---

## Résumé des modifications apportées (sans supprimer l’existant)

| Zone | Modification |
|------|--------------|
| **Backend** | Validation `JWT_SECRET` + `DATABASE_URL` en prod au démarrage |
| **Backend** | CORS : en prod, origine = `FRONTEND_URL` uniquement |
| **Backend** | Helmet (headers de sécurité), CSP désactivée |
| **Backend** | Filtre d’exceptions global (réponses JSON, log des 5xx) |
| **Backend** | Rate limiting : 100 req/min ; OTP 5/heure par IP |
| **Backend** | `GET /health` public pour Render |
| **Backend** | JwtStrategy : refus 403 si compte suspendu (sauf ADMIN) |
| **Frontend** | Gestion 403 API : redirection `/compte-suspendu` si message “suspendu” |
| **Projet** | `backend/.env.example`, `frontend/.env.example` |
| **Projet** | Scripts Prisma : `prisma:migrate:deploy`, etc. |
| **Projet** | Dockerfile backend (optionnel), `.dockerignore` |
