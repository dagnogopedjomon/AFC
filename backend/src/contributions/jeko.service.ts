import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const JEKO_BASE = 'https://api.jeko.africa/partner_api';

export type PendingJekoPayment = {
  memberId: string;
  contributionId: string;
  amountFcfa: number;
  periodYear?: number;
  periodMonth?: number;
  cashBoxId?: string | null;
  jekoRequestId: string;
};

@Injectable()
export class JekoService {
  private readonly apiKey = process.env.JEKO_API_KEY;
  private readonly apiKeyId = process.env.JEKO_API_KEY_ID;
  private readonly storeId = process.env.JEKO_STORE_ID;
  /** Première URL du FRONTEND_URL (peut être multi-valeur séparée par virgules). */
  private readonly frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();

  /** Stockage temporaire en mémoire des paiements en attente (reference → contexte). */
  private readonly pending = new Map<string, PendingJekoPayment>();

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
      paymentData.payerPhone = params.payerPhone;
    }

    const res = await fetch(`${JEKO_BASE}/payment_requests`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        storeId: this.storeId,
        // XOF n'a pas de centimes : amountCents = montant XOF directement
        amountCents: params.amountFcfa,
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

    this.pending.set(reference, {
      memberId: params.memberId,
      contributionId: params.contributionId,
      amountFcfa: params.amountFcfa,
      periodYear: params.periodYear,
      periodMonth: params.periodMonth,
      cashBoxId: params.cashBoxId,
      jekoRequestId: data.id,
    });

    return { reference, redirectUrl: data.redirectUrl };
  }

  /**
   * Vérifie si la demande de paiement est confirmée (status === "success").
   * Si oui, enregistre le paiement en base.
   */
  async verifyAndRecord(reference: string): Promise<{ paid: boolean; payment?: object }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré.');
    }

    const context = this.pending.get(reference);
    if (!context) {
      // Déjà traité ou référence inconnue
      return { paid: true };
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

    this.pending.delete(reference);

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
        metadata: JSON.stringify({ source: 'jeko', jekoRequestId: context.jekoRequestId, reference }),
      },
    });

    console.log('[Jeko] paiement enregistré:', payment.id);
    return { paid: true, payment };
  }
}
