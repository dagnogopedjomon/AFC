import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { normalizeE164 } from '../notifications/sayelesend.util';

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
  }): Promise<{ reference: string; redirectUrl: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
    }

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
  }): Promise<{ reference: string; link: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
    }

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
    context: { memberId: string; contributionId: string; amountFcfa: number; periodYear: number | null; periodMonth: number | null; cashBoxId: string | null; jekoRequestId: string | null; jekoLinkId: string | null },
    reference: string,
  ): Promise<{ paid: boolean; payment: object }> {
    // Supprimer le pending (idempotence)
    await this.prisma.pendingJekoPayment.deleteMany({ where: { reference } });

    let cashBoxId = context.cashBoxId ?? null;
    if (!cashBoxId) {
      const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true } });
      cashBoxId = defaultBox?.id ?? null;
    }

    const payment = await this.prisma.payment.create({
      data: {
        memberId: context.memberId,
        contributionId: context.contributionId,
        amount: context.amountFcfa,
        periodYear: context.periodYear,
        periodMonth: context.periodMonth,
        cashBoxId,
        metadata: JSON.stringify({ source: 'jeko', jekoRequestId: context.jekoRequestId, jekoLinkId: context.jekoLinkId, reference }),
      },
    });

    this.logger.log(`[Jeko] paiement enregistré: ${payment.id}`);
    return { paid: true, payment };
  }

  /** Nettoyage des pending expirés (appelé par un scheduler). */
  async cleanExpired(): Promise<number> {
    const result = await this.prisma.pendingJekoPayment.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}
