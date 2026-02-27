# Configurer Twilio pour les SMS (AFC)

Quand Twilio est configuré dans le `.env`, l’**invitation** et le **code OTP** d’activation sont envoyés par **SMS** au lieu de WhatsApp.

---

## 1. Créer un compte Twilio

1. Va sur **[twilio.com](https://www.twilio.com)** → **Sign up**.
2. Renseigne email, mot de passe, prénom, nom.
3. Valide ton **email** puis ton **téléphone** (numéro où tu recevras un code).
4. Réponds au court questionnaire (usage = SMS, type d’appli, etc.).
5. Tu arrives sur le **Console** (tableau de bord).

---

## 2. Récupérer Account SID et Auth Token

1. Dans le Console Twilio : **Account** (en haut à droite) → **Account Info** (ou page d’accueil du projet).
2. Note :
   - **Account SID** : `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token** : clique sur **Show** et copie la valeur.

À ne **jamais** partager ni commiter dans Git.

---

## 3. Obtenir un numéro Twilio (expéditeur des SMS)

Tu as besoin d’un **numéro Twilio** qui enverra les SMS (invitation + OTP).

### Option A : Essai gratuit (trial)

1. Console → **Phone Numbers** → **Manage** → **Get a trial number** (ou **Try it free**).
2. Choisis le **pays** :
   - **France** : numéro au format +33… (coût SMS France)
   - **Côte d’Ivoire** : si disponible, numéro +225… (coût SMS Côte d’Ivoire)
3. En trial, tu ne peux envoyer des SMS **qu’aux numéros vérifiés** :  
   **Phone Numbers** → **Manage** → **Verified Caller IDs** → **Add** et ajoute ton numéro (ou celui de test).

### Option B : Compte payant (numéro acheté)

1. Console → **Phone Numbers** → **Manage** → **Buy a number**.
2. Choisis le pays (France, Côte d’Ivoire, etc.) et filtre par **SMS**.
3. Achète un numéro (quelques €/mois + SMS à l’usage).
4. Tu pourras envoyer à **n’importe quel numéro** (sous réserve des règles Twilio par pays).

Note le numéro au format **E.164** : `+33612345678` ou `+2250700000000`.

---

## 4. Configurer le backend (`.env`)

Dans **`backend/.env`**, décommente et remplis :

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33600000000
```

Remplace par **tes** valeurs :

- **TWILIO_ACCOUNT_SID** : ton Account SID.
- **TWILIO_AUTH_TOKEN** : ton Auth Token.
- **TWILIO_PHONE_NUMBER** : le numéro Twilio (format +33… ou +225…).

Le backend utilise déjà **COUNTRY_CODE** (ex. `225` pour Côte d’Ivoire) pour normaliser les numéros locaux (ex. `0759928005` → `+2250759928005`).

---

## 5. Comportement dans l’app

- **Twilio configuré** : invitation + OTP partent en **SMS** (priorité sur WhatsApp dans le code).
- **Twilio non configuré** : invitation + OTP partent en **WhatsApp** (si configuré).

Redémarre le backend après modification du `.env`.

---

## 6. Tarification (indicative)

- **Trial** : crédit offert (ex. ~15 $), SMS uniquement vers numéros vérifiés.
- **Payant** : facturation à l’usage (quelques centimes par SMS selon pays).  
  Voir [twilio.com/pricing](https://www.twilio.com/pricing) pour les tarifs par pays (France, Côte d’Ivoire, etc.).

---

## Dépannage

- **"From number is not a valid phone number"** : vérifie que `TWILIO_PHONE_NUMBER` est au format E.164 avec `+`.
- **"Unable to create record" / 21608** : en trial, le destinataire doit être dans **Verified Caller IDs**.
- **Pas de SMS reçu** : vérifie les logs du backend (`[SMS/Twilio]`), et dans Twilio : **Monitor** → **Logs** → **Messaging**.
