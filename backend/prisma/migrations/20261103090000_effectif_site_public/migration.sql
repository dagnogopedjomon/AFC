-- Module « Publications » : l'effectif sur le site public (écran 03).
--
-- Le site affiche le prénom, le nom, le poste et la photo des personnes.
-- Ce sont des données personnelles : rien ne sort sans l'accord explicite de
-- l'intéressé. L'accord se donne et se retire depuis l'écran Membres ; le
-- retirer fait disparaître la fiche du site à la reconstruction suivante.
--
-- À passer dans l'éditeur SQL de Supabase. Le script peut être rejoué sans
-- risque : chaque ajout est conditionnel.

ALTER TABLE "Member"
  ADD COLUMN IF NOT EXISTS "sitePublicConsent" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Member"
  ADD COLUMN IF NOT EXISTS "sitePublicConsentAt" TIMESTAMP(3);

ALTER TABLE "Member"
  ADD COLUMN IF NOT EXISTS "sitePublicOrder" INTEGER;

-- La route publique ne lit que les personnes qui ont donné leur accord.
CREATE INDEX IF NOT EXISTS "Member_sitePublicConsent_idx"
  ON "Member" ("sitePublicConsent");
