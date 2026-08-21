-- Add allowPartialPayment field to Contribution model
-- Migration: 20260821100000_add_allow_partial_payment

ALTER TABLE "Contribution" ADD COLUMN "allowPartialPayment" BOOLEAN NOT NULL DEFAULT false;
