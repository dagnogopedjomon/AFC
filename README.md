# AFC – Système de gestion d’une amicale de football

Projet en **local** : frontend (Next.js) + backend (NestJS) + base PostgreSQL (Prisma).

---

## Structure

```
AFC/
├── frontend/     → Next.js, Tailwind, React Hook Form, Zod, Recharts
├── backend/      → NestJS, Prisma, PostgreSQL
└── README.md
```

---

## Prérequis

- **Node.js** 18+ (ou 20+)
- **PostgreSQL** installé et démarré en local (ou utilisation de `npx prisma dev` pour une base Prisma locale)

---

## Lancer en local

### 1. Base de données

Dans `backend/.env`, définir l’URL PostgreSQL :

- **PostgreSQL classique** :  
  `DATABASE_URL="postgresql://USER:MOT_DE_PASSE@localhost:5432/afc_db"`

- **Prisma Postgres (CLI)** :  
  Garder la valeur par défaut et lancer `npx prisma dev` dans `backend/` pour démarrer une base locale.

### 2. Backend (NestJS)

```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

API : **http://localhost:3000**

**Créer un membre de test (optionnel)** :

```bash
cd backend
npx prisma db seed
```

Connexion de test : **0600000000** / **password123**

### 3. Frontend (Next.js)

Dans un autre terminal :

```bash
cd frontend
npm install
npm run dev
```

App : **http://localhost:3001**

Thème : **bleu ciel** et **blanc**, interface UI/UX soignée.

---

## Déjà en place

- **Auth** : login (téléphone + mot de passe), JWT, guard « profil complété »
- **Membres** : CRUD (bureau), compléter son profil, liste des membres
- **Guards** : accès caisse réservé Trésorier + Commissaire aux comptes
- **Frontend** : login, tableau de bord, page Membres, compléter le profil

---

## Prochaines étapes

1. Module **Cotisations** (mensuelle, exceptionnelle, projets)
2. Module **Caisse** (entrées, dépenses, double validation)
3. **Notifications** (WhatsApp Cloud API)
