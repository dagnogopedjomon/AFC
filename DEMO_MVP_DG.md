# Démo MVP AFC — Script pour le DG

**Durée suggérée : 8–12 minutes**

---

## Avant la démo (à préparer ce soir)

1. **Lancer l’app**
   - Backend : `cd backend && npm run start:dev`
   - Frontend : `cd frontend && npm run dev`
   - Base PostgreSQL démarrée, `.env` configuré

2. **Compte admin**
   - Téléphone : `0600000000`
   - Mot de passe : `password123`

3. **WhatsApp**
   - Avec `hello_world` dans le `.env` : l’invitation envoie un message « Hello World » (sans lien).
   - Pour montrer le lien d’activation : commente ou retire `WHATSAPP_INVITATION_TEMPLATE_NAME` dans le `.env` → le backend enverra le message en **texte libre avec le lien**. Ou attends que le template `invitation_activation` soit approuvé et configure-le.

4. **Données de démo**
   - Quelques membres déjà présents (ou inviter pendant la démo).
   - Optionnel : 1–2 activités, 1 dépense, 1 cotisation pour que le tableau de bord soit parlant.

---

## Scénario de démo (ordre proposé)

### 1. Connexion (1 min)

- Ouvrir l’app (ex. `http://localhost:3000`).
- **Message clé :** « C’est l’interface unique : bureau et membres. »
- Se connecter avec `0600000000` / `password123`.
- Montrer l’arrivée sur le **tableau de bord**.

---

### 2. Tableau de bord (2 min)

- **Message clé :** « Vue d’ensemble de l’amicale en un coup d’œil. »
- Montrer :
  - **Résumé caisse** (solde, dépenses récentes) si visible.
  - **Cotisations** : membres à jour / en retard (graphique ou chiffres).
  - **Activités à venir** (liste ou cartes).
  - **Liens rapides** : Caisse, Cotisations, Rapports, Activités, Membres.

---

### 3. Membres et invitation (2–3 min)

- Aller dans **Membres**.
- **Message clé :** « On gère les membres et on les invite par WhatsApp. »
- Montrer la **liste** (noms, rôles, statuts).
- Cliquer **Inviter un membre** (ou « Nouveau membre »).
  - Saisir un **numéro de test** (le tien ou un numéro de démo).
  - Choisir un **rôle** (ex. Joueur).
  - Envoyer l’invitation.
- **Montrer** : « Le membre reçoit un message WhatsApp (pour l’instant « Hello World » ou un texte avec lien selon la config). Il pourra activer son compte (lien → code OTP → mot de passe → compléter son profil). »
- Revenir à la liste et montrer le **nouveau membre** (statut « invité » ou équivalent).

---

### 4. Activités (1–2 min)

- Aller dans **Activités**.
- **Message clé :** « On planifie les matchs, entraînements, anniversaires, annonces. »
- Montrer la **liste** des activités.
- Optionnel : **Créer une activité** (type, date, lieu, description) ou **Publier une annonce**.
- Ouvrir **une activité** pour montrer le détail (et éventuellement les pièces jointes).

---

### 5. Cotisations (1 min)

- Aller dans **Cotisations**.
- **Message clé :** « Suivi des cotisations et des paiements. »
- Montrer :
  - **Historique** des cotisations / paiements.
  - **Enregistrer un paiement** (si le temps le permet).

---

### 6. Caisse (1 min)

- Aller dans **Caisse**.
- **Message clé :** « Trésorerie : dépenses et validation. »
- Montrer la **liste des dépenses** (et statuts : en attente trésorier / commissaire, validée).
- Optionnel : **Nouvelle dépense** (montant, motif, pièce jointe).

---

### 7. Rapports (30 s)

- Aller dans **Rapports**.
- **Message clé :** « Synthèses et exports pour le bureau. »
- Montrer la page (graphiques, tableaux, ou message « à venir » selon l’état actuel).

---

### 8. Notifications (30 s, si visible)

- Si le menu **Notifications** est visible (admin / trésorier / commissaire) : ouvrir et dire que c’est l’historique des envois (invitations, OTP, etc.).

---

## Messages à retenir pour le DG

| Thème | Phrase type |
|-------|-------------|
| **Valeur** | « Une seule app pour le bureau et les membres : tableau de bord, membres, cotisations, caisse, activités. » |
| **Invitation** | « On invite par téléphone et rôle ; le membre reçoit un WhatsApp avec un lien pour activer son compte et compléter son profil. » |
| **Sécurité / rôles** | « Les droits dépendent du rôle : admin pour inviter, trésorier pour la caisse, etc. » |
| **MVP** | « C’est le MVP : on peut déjà gérer les membres, les cotisations, la caisse et les activités. Ensuite on pourra ajouter X, Y, Z. » |

---

## Si quelque chose ne marche pas

- **WhatsApp** : « En prod on utilisera le template approuvé avec le lien ; là on est en test (message simple ou texte avec lien). »
- **Base vide** : « On peut inviter un membre maintenant pour montrer le flux. »
- **Erreur technique** : « On est en environnement de dev ; en prod ce sera sur un serveur dédié. »

---

## Checklist rapide (à cocher avant la démo)

- [ ] Backend démarré (`npm run start:dev`)
- [ ] Frontend démarré (`npm run dev`)
- [ ] PostgreSQL OK
- [ ] Connexion admin testée (0600000000 / password123)
- [ ] Au moins 1 écran de chaque module ouvert une fois (dashboard, membres, activités, cotisations, caisse, rapports)
- [ ] Numéro de test sous la main pour l’invitation WhatsApp
