import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContributionsService } from './contributions.service';
import * as crypto from 'crypto';

const CINETPAY_INIT_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';
/** Montant minimum imposé par CinetPay (FCFA). */
const CINETPAY_MIN_AMOUNT = 100;

function cleanEnv(value: string | undefined): string {
  if (!value) return '';
  return value.toString().trim().replace(/^["']|["']$/g, '');
}

@Injectable()
export class CinetpayService {
  private readonly logger = new Logger(CinetpayService.name);
  private readonly apikey: string;
  private readonly siteId: number;
  private readonly notifyUrl: string;
  private readonly returnUrl: string;
  private readonly currency: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly contributionsService: ContributionsService,
  ) {
    this.apikey = cleanEnv(process.env.CINETPAY_API_KEY);
    const siteIdRaw = cleanEnv(process.env.CINETPAY_SITE_ID);
    this.siteId = parseInt(siteIdRaw, 10) || 0;
    const frontendUrl = cleanEnv(process.env.FRONTEND_URL) || 'http://localhost:3001';
    this.notifyUrl = cleanEnv(process.env.CINETPAY_NOTIFY_URL) || '';
    this.returnUrl = `${frontendUrl}/dashboard/payment/success`;
    this.currency = cleanEnv(process.env.CINETPAY_CURRENCY) || 'XOF';

    this.logger.log(
      `CinetPay: ${this.apikey ? 'API key OK' : 'API key manquante'}, site_id=${this.siteId}, notify=${this.notifyUrl ? 'OK' : 'manquant'}`,
    );
  }

  isConfigured(): boolean {
    return !!(this.apikey && this.siteId > 0 && this.notifyUrl.startsWith('https://'));
  }

  /** Initier un paiement CinetPay (cotisation). Retourne payment_url et transactionId. */
  async initPayment(
    memberId: string,
    body: { contributionId: string; amount: number; periodYear?: number; periodMonth?: number },
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    if (!this.isConfigured()) {
      throw new BadRequestException(
        'CinetPay non configuré (CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_NOTIFY_URL).',
      );
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true },
    });
    if (!member) throw new NotFoundException('Membre introuvable');

    const contribution = await this.prisma.contribution.findUnique({
      where: { id: body.contributionId },
      select: { id: true, name: true, type: true, amount: true, startDate: true, endDate: true },
    });
    if (!contribution) throw new NotFoundException('Cotisation introuvable');

    if (contribution.type === 'EXCEPTIONAL' && contribution.endDate) {
      if (new Date() > new Date(contribution.endDate)) {
        throw new BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
      }
    }

    if (contribution.type === 'MONTHLY' && contribution.amount != null) {
      const minAmount = Number(contribution.amount);
      if (Number(body.amount) < minAmount) {
        throw new BadRequestException(
          `Le montant minimum pour la cotisation mensuelle est de ${minAmount.toLocaleString('fr-FR')} FCFA. Enregistrez un paiement manuel depuis le dashboard si besoin.`,
        );
      }
    }

    // Vérifier qu'il n'existe pas déjà un paiement pour cette période (mensuelle)
    if (body.periodYear != null && body.periodMonth != null && contribution.type === 'MONTHLY') {
      const existing = await this.prisma.payment.findFirst({
        where: {
          memberId,
          contributionId: body.contributionId,
          periodYear: body.periodYear,
          periodMonth: body.periodMonth,
        },
      });
      if (existing) {
        throw new BadRequestException('Un paiement existe déjà pour cette période.');
      }
    }

    const transactionId = `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    let amount = Math.round(Number(body.amount)) || 100;
    if (this.currency !== 'USD' && amount % 5 !== 0) {
      amount = Math.round(amount / 5) * 5;
    }
    if (amount < CINETPAY_MIN_AMOUNT) {
      throw new BadRequestException(`Le montant minimum CinetPay est de ${CINETPAY_MIN_AMOUNT} FCFA.`);
    }

    let phone = (member.phone || '').trim();
    if (!phone) phone = '+2250759928005';
    else if (!phone.startsWith('+')) {
      if (phone.startsWith('0')) phone = '+225' + phone.substring(1);
      else if (phone.startsWith('225')) phone = '+' + phone;
      else phone = '+225' + phone;
    }
    const cleanPhone = phone.replace(/\D/g, '').replace(/^225/, '');
    if (cleanPhone.length < 8) {
      throw new BadRequestException('Numéro de téléphone invalide. Mettez à jour votre profil.');
    }

    const customerCountry = phone.startsWith('+229') ? 'BJ' : phone.startsWith('+226') ? 'BF' : phone.startsWith('+228') ? 'TG' : 'CI';
    let customerEmail = (member.email || '').trim();
    if (!customerEmail || !customerEmail.includes('@')) {
      customerEmail = `membre-${member.id}@afc.local`;
    }

    const description = `Cotisation AFC - ${contribution.name}`.replace(/[#/$_&]/g, '').substring(0, 100);
    const returnUrlWithTx = `${this.returnUrl}${this.returnUrl.includes('?') ? '&' : '?'}transaction_id=${transactionId}`;

    const paymentData = {
      apikey: this.apikey,
      site_id: this.siteId,
      transaction_id: transactionId,
      amount,
      currency: this.currency,
      description,
      notify_url: this.notifyUrl,
      return_url: returnUrlWithTx,
      customer_email: customerEmail.toLowerCase(),
      customer_phone_number: cleanPhone,
      customer_country: customerCountry,
    };

    await this.prisma.cinetPayTransaction.create({
      data: {
        transactionId,
        memberId,
        contributionId: body.contributionId,
        amount,
        currency: this.currency,
        status: 'PENDING',
        periodYear: body.periodYear ?? null,
        periodMonth: body.periodMonth ?? null,
      },
    });

    const res = await fetch(CINETPAY_INIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(paymentData),
    });
    const text = await res.text();
    let result: { code?: string; data?: { payment_url?: string }; message?: string };
    try {
      result = JSON.parse(text);
    } catch {
      this.logger.warn('CinetPay response not JSON: ' + text);
      throw new BadRequestException('Réponse invalide de CinetPay');
    }

    if (result.code === '201' && result.data?.payment_url) {
      return { paymentUrl: result.data.payment_url, transactionId };
    }

    await this.prisma.cinetPayTransaction.updateMany({
      where: { transactionId },
      data: { status: 'FAILED', metadata: result as object },
    });
    throw new BadRequestException(
      result.message || 'Erreur lors de l\'initiation du paiement CinetPay',
    );
  }

  /** Vérifier une transaction auprès de CinetPay (check API). */
  async verifyWithCinetPay(transactionId: string): Promise<{ status: string; amount?: number } | null> {
    const res = await fetch(CINETPAY_CHECK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: this.apikey,
        site_id: this.siteId,
        transaction_id: transactionId,
      }),
    });
    const result = await res.json();
    if (result.code === '00' && result.data) {
      return { status: result.data.status, amount: result.data.amount };
    }
    return null;
  }

  /** Compléter le paiement en base après acceptation CinetPay (enregistrer le Payment). */
  async completePayment(transactionId: string): Promise<void> {
    const tx = await this.prisma.cinetPayTransaction.findUnique({
      where: { transactionId },
      select: { id: true, memberId: true, contributionId: true, amount: true, periodYear: true, periodMonth: true, status: true },
    });
    if (!tx) return;
    if (tx.status === 'COMPLETED') return;

    const amount = Number(tx.amount);
    await this.contributionsService.recordPayment({
      memberId: tx.memberId,
      contributionId: tx.contributionId,
      amount,
      periodYear: tx.periodYear ?? undefined,
      periodMonth: tx.periodMonth ?? undefined,
    });

    await this.prisma.cinetPayTransaction.update({
      where: { transactionId },
      data: { status: 'COMPLETED' },
    });
    this.logger.log(`Paiement CinetPay complété: ${transactionId}`);
  }

  /** Webhook appelé par CinetPay (POST, pas d'auth). */
  async handleNotify(body: Record<string, unknown>): Promise<void> {
    const cpmTransId = body.cpm_trans_id as string;
    const cpmTransStatus = body.cpm_trans_status as string;
    const cpmPayid = body.cpm_payid as string | undefined;

    if (!cpmTransId) return;

    const tx = await this.prisma.cinetPayTransaction.findUnique({
      where: { transactionId: cpmTransId },
    });
    if (!tx) {
      this.logger.warn('Webhook CinetPay: transaction inconnue ' + cpmTransId);
      return;
    }
    if (tx.status === 'COMPLETED') return;

    const verified = await this.verifyWithCinetPay(cpmTransId);
    if (verified && verified.status === 'ACCEPTED') {
      await this.completePayment(cpmTransId);
      await this.prisma.cinetPayTransaction.update({
        where: { transactionId: cpmTransId },
        data: { cinetpayId: cpmPayid ?? undefined, metadata: body as object },
      });
    } else if (verified && verified.status === 'REFUSED') {
      await this.prisma.cinetPayTransaction.update({
        where: { transactionId: cpmTransId },
        data: { status: 'REFUSED', metadata: body as object },
      });
    }
  }

  /** Vérification manuelle (GET) par le front après retour du user. Retourne les mois encore impayés après paiement. */
  async verifyAndComplete(
    transactionId: string,
    memberId: string,
  ): Promise<{ status: string; completed: boolean; remainingUnpaidMonths: { year: number; month: number }[] }> {
    const tx = await this.prisma.cinetPayTransaction.findUnique({
      where: { transactionId },
    });
    if (!tx) throw new NotFoundException('Transaction introuvable');
    if (tx.memberId !== memberId) throw new BadRequestException('Transaction non autorisée');

    const addRemaining = async () => {
      const { unpaidMonths } = await this.contributionsService.getMyUnpaidMonths(memberId);
      return unpaidMonths;
    };

    if (tx.status === 'COMPLETED') {
      const remainingUnpaidMonths = await addRemaining();
      return { status: 'ACCEPTED', completed: true, remainingUnpaidMonths };
    }

    const verified = await this.verifyWithCinetPay(transactionId);
    if (verified && verified.status === 'ACCEPTED') {
      await this.completePayment(transactionId);
      const remainingUnpaidMonths = await addRemaining();
      return { status: 'ACCEPTED', completed: true, remainingUnpaidMonths };
    }
    const remainingUnpaidMonths = await addRemaining();
    if (verified) return { status: verified.status, completed: false, remainingUnpaidMonths };
    return { status: tx.status, completed: false, remainingUnpaidMonths };
  }
}
