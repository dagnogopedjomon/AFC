import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { normalizeE164 } from '../notifications/sayelesend.util';
import { ContributionType, Prisma, RegularizationStatus } from '@prisma/client';

const JEKO_BASE = 'https://api.jeko.africa/partner_api';

@Injectable()
export class JekoService {
  private readonly logger = new Logger(JekoService.name);
  private readonly apiKey = process.env.JEKO_API_KEY;
  private readonly apiKeyId = process.env.JEKO_API_KEY_ID;
  private readonly storeId = process.env.JEKO_STORE_ID;
  /** Première URL du FRONTEND_URL (peut être multi-valeur séparée par virgules). */
  private readonly frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();

  constructor(private readonly prisma: PrismaService) {}

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiKeyId && this.storeId);
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey!,
      'X-API-KEY-ID': this.apiKeyId!,
    };
  }

  /**
   * Crée une demande de paiement Jeko (redirect) avec successUrl/errorUrl.
   * forceProviderDirect: true → redirige directement vers Wave/Orange/etc. sans passer par le checkout Jeko.
   */
  async createPaymentRequest(params: {
    amountFcfa: number;
    memberId: string;
    contributionId: string;
    periodYear?: number;
    periodMonth?: number;
    cashBoxId?: string | null;
    paymentMethod: string;
    payerPhone?: string;
    regularizationAgreementId?: string;
    advanceMonths?: number;
  }): Promise<{ reference: string; redirectUrl: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
    }

    await this.validateRegularizationPayment(params);
    await this.validateAdvancePayment(params);

    const reference = randomUUID();
    const successUrl = `${this.frontendUrl}/dashboard/payment/success?ref=${reference}`;
    const errorUrl = `${this.frontendUrl}/dashboard/cotisations?jeko_error=1`;

    const paymentData: Record<string, unknown> = {
      paymentMethod: params.paymentMethod,
      successUrl,
      errorUrl,
      forceProviderDirect: true,
    };
    if (params.payerPhone) {
      paymentData.payerPhone = normalizeE164(params.payerPhone);
    }

    const res = await fetch(`${JEKO_BASE}/payment_requests`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        storeId: this.storeId,
        // amountCents en centimes : 100 FCFA = 10 000 centimes (confirmé Jeko)
        amountCents: params.amountFcfa * 100,
        currency: 'XOF',
        reference,
        paymentDetails: {
          type: 'redirect',
          data: paymentData,
        },
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      redirectUrl?: string;
      error?: string;
      message?: string;
      errors?: Array<{ message: string }>;
    };

    if (!res.ok || !data.id || !data.redirectUrl) {
      const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
      console.error('[Jeko] createPaymentRequest error:', msg, data);
      throw new BadRequestException(`Impossible de créer la demande de paiement : ${msg}`);
    }

    console.log('[Jeko] demande créée:', data.id, data.redirectUrl);

    // Persister en DB (survit aux redémarrages Render)
    await this.prisma.pendingJekoPayment.create({
      data: {
        reference,
        jekoRequestId: data.id,
        memberId: params.memberId,
        contributionId: params.contributionId,
        amountFcfa: params.amountFcfa,
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
        cashBoxId: params.cashBoxId,
        regularizationAgreementId: params.regularizationAgreementId,
        advanceMonths: params.advanceMonths,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h TTL
      },
    });

    return { reference, redirectUrl: data.redirectUrl };
  }

  /**
   * Crée un lien de paiement Jeko (supporte carte bancaire + mobile money via checkout).
   * Retourne la référence interne et l'URL publique du lien.
   */
  async createPaymentLink(params: {
    amountFcfa: number;
    memberId: string;
    contributionId: string;
    periodYear?: number;
    periodMonth?: number;
    cashBoxId?: string | null;
    title: string;
    regularizationAgreementId?: string;
    advanceMonths?: number;
  }): Promise<{ reference: string; link: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
    }

    await this.validateRegularizationPayment(params);
    await this.validateAdvancePayment(params);

    const reference = randomUUID();
    const res = await fetch(`${JEKO_BASE}/payment_links`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        storeId: this.storeId,
        title: params.title,
        amountCents: params.amountFcfa * 100,
        currency: 'XOF',
        allowMultiplePayments: false,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      link?: string;
      error?: string;
      message?: string;
      errors?: Array<{ message: string }>;
    };

    if (!res.ok || !data.id || !data.link) {
      const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
      console.error('[Jeko] createPaymentLink error:', msg, data);
      throw new BadRequestException(`Impossible de créer le lien de paiement : ${msg}`);
    }

    await this.prisma.pendingJekoPayment.create({
      data: {
        reference,
        jekoLinkId: data.id,
        memberId: params.memberId,
        contributionId: params.contributionId,
        amountFcfa: params.amountFcfa,
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
        cashBoxId: params.cashBoxId,
        regularizationAgreementId: params.regularizationAgreementId,
        advanceMonths: params.advanceMonths,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return { reference, link: data.link };
  }

  /**
   * Vérifie si la demande de paiement ou le lien de paiement est confirmé.
   * Si oui, enregistre le paiement en base et supprime l'entrée pending.
   */
  async verifyAndRecord(reference: string): Promise<{ paid: boolean; payment?: object }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré.');
    }

    // Chercher le contexte en DB
    const context = await this.prisma.pendingJekoPayment.findUnique({ where: { reference } });
    if (!context) {
      // Déjà traité ou référence inconnue → on considère payé (idempotent)
      const existing = await this.prisma.payment.findFirst({
        where: { metadata: { contains: reference } },
      });
      return { paid: !!existing };
    }

    if (context.jekoLinkId) {
      const res = await fetch(`${JEKO_BASE}/payment_links/${context.jekoLinkId}`, {
        headers: this.headers(),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        canReceivePayments?: boolean;
        allowMultiplePayments?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        const msg = data.error || data.message || `HTTP ${res.status}`;
        throw new BadRequestException(`Vérification impossible : ${msg}`);
      }
      if (data.canReceivePayments === false) {
        return this.recordPaymentFromContext(context, reference);
      }
      return { paid: false };
    }

    const res = await fetch(`${JEKO_BASE}/payment_requests/${context.jekoRequestId}`, {
      headers: this.headers(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      status?: string;
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      const msg = data.error || data.message || `HTTP ${res.status}`;
      throw new BadRequestException(`Vérification impossible : ${msg}`);
    }

    if (data.status !== 'success') {
      return { paid: false };
    }

    return this.recordPaymentFromContext(context, reference);
  }

  /**
   * Appelé par le webhook Jeko (transaction.completed).
   * Enregistre automatiquement le paiement sans action côté membre.
   */
  async recordFromWebhook(reference: string): Promise<{
    recorded: boolean;
    context?: { memberId: string; amountFcfa: number; periodYear: number | null; periodMonth: number | null };
  }> {
    const context = await this.prisma.pendingJekoPayment.findUnique({ where: { reference } });
    if (!context) {
      this.logger.warn(`[Webhook] référence inconnue ou déjà traitée : ${reference}`);
      return { recorded: false };
    }
    await this.recordPaymentFromContext(context, reference);
    return {
      recorded: true,
      context: {
        memberId: context.memberId,
        amountFcfa: context.amountFcfa,
        periodYear: context.periodYear,
        periodMonth: context.periodMonth,
      },
    };
  }

  async recordFromWebhookByLinkId(paymentLinkId: string): Promise<{
    recorded: boolean;
    context?: { memberId: string; amountFcfa: number; periodYear: number | null; periodMonth: number | null };
  }> {
    const context = await this.prisma.pendingJekoPayment.findFirst({ where: { jekoLinkId: paymentLinkId } });
    if (!context) {
      this.logger.warn(`[Webhook] paymentLinkId inconnu ou déjà traité : ${paymentLinkId}`);
      return { recorded: false };
    }
    await this.recordPaymentFromContext(context, context.reference);
    return {
      recorded: true,
      context: {
        memberId: context.memberId,
        amountFcfa: context.amountFcfa,
        periodYear: context.periodYear,
        periodMonth: context.periodMonth,
      },
    };
  }

  /** Logique commune d'enregistrement du paiement (partagée verify + webhook). */
  private async recordPaymentFromContext(
    context: { memberId: string; contributionId: string; amountFcfa: number; periodYear: number | null; periodMonth: number | null; cashBoxId: string | null; jekoRequestId: string | null; jekoLinkId: string | null; regularizationAgreementId: string | null; advanceMonths: number | null },
    reference: string,
  ): Promise<{ paid: boolean; payment: object }> {
    let cashBoxId = context.cashBoxId ?? null;
    if (!cashBoxId) {
      const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true } });
      cashBoxId = defaultBox?.id ?? null;
    }

    const contribution = await this.prisma.contribution.findUnique({
      where: { id: context.contributionId },
      select: { type: true, amount: true },
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // Le pending est consommé dans la même transaction que les paiements :
      // un échec ne peut donc pas perdre la référence Jeko.
      const consumed = await tx.pendingJekoPayment.deleteMany({ where: { reference } });
      if (consumed.count === 0) {
        const existing = await tx.payment.findFirst({ where: { metadata: { contains: reference } } });
        return { payment: existing ?? {}, paymentsCount: existing ? 1 : 0, reactivated: false };
      }

      const metadataBase = {
        source: 'jeko',
        jekoRequestId: context.jekoRequestId,
        jekoLinkId: context.jekoLinkId,
        reference,
      };

      if (context.regularizationAgreementId) {
        const agreement = await tx.regularizationAgreement.findUnique({ where: { id: context.regularizationAgreementId } });
        if (!agreement || agreement.memberId !== context.memberId) throw new BadRequestException('Accord de régularisation introuvable.');
        const paidBefore = Number(agreement.paidAmount);
        const paidAfter = paidBefore + context.amountFcfa;
        const agreedAmount = Number(agreement.agreedAmount);
        const expectedAmount = paidBefore === 0 ? Number(agreement.initialAmount) : agreedAmount - paidBefore;
        if (context.amountFcfa !== expectedAmount) throw new BadRequestException('Le montant de cette échéance a changé. Veuillez recommencer le paiement.');
        if (paidAfter > agreedAmount) throw new BadRequestException('Le paiement dépasse le solde de la régularisation.');
        const completed = paidAfter >= agreedAmount;
        const payment = await tx.payment.create({
          data: {
            memberId: context.memberId,
            contributionId: context.contributionId,
            amount: context.amountFcfa,
            cashBoxId,
            regularizationAgreementId: agreement.id,
            metadata: JSON.stringify({ ...metadataBase, regularization: true }),
          },
        });
        await tx.regularizationAgreement.update({
          where: { id: agreement.id },
          data: {
            paidAmount: new Prisma.Decimal(paidAfter),
            status: completed ? RegularizationStatus.COMPLETED : RegularizationStatus.PARTIALLY_PAID,
            activatedAt: agreement.activatedAt ?? new Date(),
            completedAt: completed ? new Date() : null,
          },
        });
        await tx.member.update({ where: { id: context.memberId }, data: { isSuspended: false, reactivatedAt: null } });
        return { payment, paymentsCount: 1, reactivated: true };
      }

      if (context.advanceMonths && contribution?.type === ContributionType.MONTHLY && contribution.amount) {
        const existing = await tx.payment.findMany({
          where: { memberId: context.memberId, contributionId: context.contributionId, cancelledAt: null, periodYear: { not: null }, periodMonth: { not: null } },
          select: { periodYear: true, periodMonth: true },
        });
        const paid = new Set(existing.map((row) => `${row.periodYear}-${row.periodMonth}`));
        const periods: Array<{ year: number; month: number }> = [];
        const cursor = new Date();
        cursor.setDate(1);
        for (let i = 0; periods.length < context.advanceMonths && i < 36; i++) {
          const year = cursor.getFullYear();
          const month = cursor.getMonth() + 1;
          if (!paid.has(`${year}-${month}`)) periods.push({ year, month });
          cursor.setMonth(cursor.getMonth() + 1);
        }
        if (periods.length !== context.advanceMonths) throw new BadRequestException('Impossible d’affecter tous les mois anticipés.');
        const monthlyAmount = Number(contribution.amount);
        if (context.amountFcfa !== monthlyAmount * periods.length) throw new BadRequestException('Le montant du paiement anticipé est invalide.');
        await tx.payment.createMany({ data: periods.map((period) => ({
          memberId: context.memberId,
          contributionId: context.contributionId,
          amount: contribution.amount!,
          periodYear: period.year,
          periodMonth: period.month,
          cashBoxId,
          metadata: JSON.stringify({ ...metadataBase, advancePayment: true }),
        })) });
        return { payment: { reference, advanceMonths: periods }, paymentsCount: periods.length, reactivated: false };
      }

      if (contribution?.type === ContributionType.MONTHLY && contribution.amount) {
        const member = await tx.member.findUnique({
          where: { id: context.memberId },
          select: { createdAt: true },
        });
        const payments = await tx.payment.findMany({
          where: {
            memberId: context.memberId,
            contributionId: context.contributionId,
            cancelledAt: null,
            periodYear: { not: null },
            periodMonth: { not: null },
          },
          select: { periodYear: true, periodMonth: true },
        });
        const paidSet = new Set(payments.map((p) => `${p.periodYear}-${p.periodMonth}`));
        const completedAgreements = await tx.regularizationAgreement.findMany({
          where: { memberId: context.memberId, contributionId: context.contributionId, status: RegularizationStatus.COMPLETED },
          select: { months: true },
        });
        for (const agreement of completedAgreements) {
          for (const period of agreement.months as Array<{ year: number; month: number }>) paidSet.add(`${period.year}-${period.month}`);
        }
        const unpaidMonths: Array<{ year: number; month: number }> = [];
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth() + 1;
        const startYear = member?.createdAt.getFullYear() ?? year;
        const startMonth = member ? member.createdAt.getMonth() + 1 : month;

        for (let i = 0; i < 12; i++) {
          if (year < startYear || (year === startYear && month < startMonth)) break;
          if (!paidSet.has(`${year}-${month}`)) unpaidMonths.push({ year, month });
          month--;
          if (month < 1) {
            month = 12;
            year--;
          }
        }

        const monthlyAmount = Number(contribution.amount);
        const coveredCount = Math.min(unpaidMonths.length, Math.floor(context.amountFcfa / monthlyAmount));
        const coveredMonths = unpaidMonths.slice(0, coveredCount);
        const paymentRows: Prisma.PaymentCreateManyInput[] = coveredMonths.map((period) => ({
          memberId: context.memberId,
          contributionId: context.contributionId,
          amount: monthlyAmount,
          periodYear: period.year,
          periodMonth: period.month,
          cashBoxId,
          metadata: JSON.stringify({ ...metadataBase, bulkMonthlyPayment: true }),
        }));
        const allocatedAmount = coveredCount * monthlyAmount;
        const remainder = context.amountFcfa - allocatedAmount;
        if (remainder > 0) {
          paymentRows.push({
            memberId: context.memberId,
            contributionId: context.contributionId,
            amount: remainder,
            periodYear: null,
            periodMonth: null,
            cashBoxId,
            metadata: JSON.stringify({ ...metadataBase, unallocatedRemainder: true }),
          });
        }

        if (paymentRows.length > 0) await tx.payment.createMany({ data: paymentRows });
        const reactivated = coveredCount === unpaidMonths.length && unpaidMonths.length > 0;
        if (reactivated) {
          await tx.member.update({
            where: { id: context.memberId },
            data: { isSuspended: false, reactivatedAt: null },
          });
        }
        return { payment: { reference, monthsPaid: coveredMonths }, paymentsCount: paymentRows.length, reactivated };
      }

      const payment = await tx.payment.create({
        data: {
          memberId: context.memberId,
          contributionId: context.contributionId,
          amount: context.amountFcfa,
          periodYear: context.periodYear,
          periodMonth: context.periodMonth,
          cashBoxId,
          metadata: JSON.stringify(metadataBase),
        },
      });
      return { payment, paymentsCount: 1, reactivated: false };
    });

    this.logger.log(`[Jeko] ${result.paymentsCount} paiement(s) enregistré(s), réactivation=${result.reactivated}`);
    return { paid: result.paymentsCount > 0, payment: result.payment };
  }

  private async validateRegularizationPayment(params: { regularizationAgreementId?: string; memberId: string; contributionId: string; amountFcfa: number }) {
    if (!params.regularizationAgreementId) return;
    const agreement = await this.prisma.regularizationAgreement.findUnique({ where: { id: params.regularizationAgreementId } });
    if (!agreement || agreement.memberId !== params.memberId || agreement.contributionId !== params.contributionId) {
      throw new BadRequestException('Accord de régularisation invalide.');
    }
    if (agreement.status !== RegularizationStatus.PENDING && agreement.status !== RegularizationStatus.PARTIALLY_PAID && agreement.status !== RegularizationStatus.OVERDUE) {
      throw new BadRequestException('Cet accord de régularisation n’est plus payable.');
    }
    const paid = Number(agreement.paidAmount);
    const expected = paid === 0 ? Number(agreement.initialAmount) : Number(agreement.agreedAmount) - paid;
    if (params.amountFcfa !== expected) {
      throw new BadRequestException(`Le montant attendu pour cette échéance est de ${expected.toLocaleString('fr-FR')} FCFA.`);
    }
  }

  private async validateAdvancePayment(params: { advanceMonths?: number; memberId: string; contributionId: string; amountFcfa: number }) {
    if (!params.advanceMonths) return;
    if (params.advanceMonths < 1 || params.advanceMonths > 12) throw new BadRequestException('Durée de paiement anticipé invalide.');
    const contribution = await this.prisma.contribution.findUnique({ where: { id: params.contributionId } });
    if (!contribution || contribution.type !== ContributionType.MONTHLY || !contribution.amount) throw new BadRequestException('Cotisation mensuelle introuvable.');
    const expected = Number(contribution.amount) * params.advanceMonths;
    if (params.amountFcfa !== expected) throw new BadRequestException(`Le montant attendu est ${expected.toLocaleString('fr-FR')} FCFA.`);
  }

  /** Nettoyage des pending expirés (appelé par un scheduler). */
  async cleanExpired(): Promise<number> {
    const result = await this.prisma.pendingJekoPayment.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
