import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const JEKO_BASE = 'https://api.jeko.africa/partner_api';

export type PendingJekoPayment = {
  memberId: string;
  contributionId: string;
  amountFcfa: number;
  periodYear?: number;
  periodMonth?: number;
  cashBoxId?: string | null;
};

@Injectable()
export class JekoService {
  private readonly apiKey = process.env.JEKO_API_KEY;
  private readonly apiKeyId = process.env.JEKO_API_KEY_ID;
  private readonly storeId = process.env.JEKO_STORE_ID;

  /** Stockage temporaire en mémoire des paiements en attente (linkId → contexte). */
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
   * Crée un lien de paiement Jeko (usage unique).
   * Retourne le linkId Jeko et l'URL de paiement.
   */
  async createPaymentLink(params: {
    amountFcfa: number;
    title: string;
    memberId: string;
    contributionId: string;
    periodYear?: number;
    periodMonth?: number;
    cashBoxId?: string | null;
  }): Promise<{ linkId: string; paymentUrl: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
    }

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
    };

    if (!res.ok || !data.id || !data.link) {
      const msg = data.error || data.message || `HTTP ${res.status}`;
      console.error('[Jeko] createPaymentLink error:', msg, data);
      throw new BadRequestException(`Impossible de créer le lien de paiement : ${msg}`);
    }

    console.log('[Jeko] lien créé:', data.id, data.link);

    this.pending.set(data.id, {
      memberId: params.memberId,
      contributionId: params.contributionId,
      amountFcfa: params.amountFcfa,
      periodYear: params.periodYear,
      periodMonth: params.periodMonth,
      cashBoxId: params.cashBoxId,
    });

    return { linkId: data.id, paymentUrl: data.link };
  }

  /**
   * Vérifie si le lien de paiement a été utilisé.
   * Si oui, enregistre le paiement en base et retourne le Payment créé.
   */
  async verifyAndRecord(linkId: string): Promise<{
    paid: boolean;
    payment?: object;
  }> {
    if (!this.isConfigured()) {
      throw new BadRequestException('Paiement en ligne non configuré.');
    }

    const res = await fetch(`${JEKO_BASE}/payment_links/${linkId}`, {
      headers: this.headers(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      id?: string;
      canReceivePayments?: boolean;
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      const msg = data.error || data.message || `HTTP ${res.status}`;
      throw new BadRequestException(`Vérification impossible : ${msg}`);
    }

    // Lien encore actif → paiement pas encore effectué
    if (data.canReceivePayments !== false) {
      return { paid: false };
    }

    // Paiement effectué : récupérer le contexte
    const context = this.pending.get(linkId);
    if (!context) {
      // Déjà traité ou inconnu
      return { paid: true };
    }
    this.pending.delete(linkId);

    // Récupérer la caisse par défaut si pas fournie
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
        metadata: JSON.stringify({ source: 'jeko', jekoLinkId: linkId }),
      },
    });

    console.log('[Jeko] paiement enregistré:', payment.id);
    return { paid: true, payment };
  }
}
