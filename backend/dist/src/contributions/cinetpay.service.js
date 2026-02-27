"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var CinetpayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CinetpayService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const contributions_service_1 = require("./contributions.service");
const crypto = __importStar(require("crypto"));
const CINETPAY_INIT_URL = 'https://api-checkout.cinetpay.com/v2/payment';
const CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check';
const CINETPAY_MIN_AMOUNT = 100;
function cleanEnv(value) {
    if (!value)
        return '';
    return value.toString().trim().replace(/^["']|["']$/g, '');
}
let CinetpayService = CinetpayService_1 = class CinetpayService {
    prisma;
    contributionsService;
    logger = new common_1.Logger(CinetpayService_1.name);
    apikey;
    siteId;
    notifyUrl;
    returnUrl;
    currency;
    constructor(prisma, contributionsService) {
        this.prisma = prisma;
        this.contributionsService = contributionsService;
        this.apikey = cleanEnv(process.env.CINETPAY_API_KEY);
        const siteIdRaw = cleanEnv(process.env.CINETPAY_SITE_ID);
        this.siteId = parseInt(siteIdRaw, 10) || 0;
        const frontendUrl = cleanEnv(process.env.FRONTEND_URL) || 'http://localhost:3001';
        this.notifyUrl = cleanEnv(process.env.CINETPAY_NOTIFY_URL) || '';
        this.returnUrl = `${frontendUrl}/dashboard/payment/success`;
        this.currency = cleanEnv(process.env.CINETPAY_CURRENCY) || 'XOF';
        this.logger.log(`CinetPay: ${this.apikey ? 'API key OK' : 'API key manquante'}, site_id=${this.siteId}, notify=${this.notifyUrl ? 'OK' : 'manquant'}`);
    }
    isConfigured() {
        return !!(this.apikey && this.siteId > 0 && this.notifyUrl.startsWith('https://'));
    }
    async initPayment(memberId, body) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('CinetPay non configuré (CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_NOTIFY_URL).');
        }
        const member = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        });
        if (!member)
            throw new common_1.NotFoundException('Membre introuvable');
        const contribution = await this.prisma.contribution.findUnique({
            where: { id: body.contributionId },
            select: { id: true, name: true, type: true, amount: true, startDate: true, endDate: true },
        });
        if (!contribution)
            throw new common_1.NotFoundException('Cotisation introuvable');
        if (contribution.type === 'EXCEPTIONAL' && contribution.endDate) {
            if (new Date() > new Date(contribution.endDate)) {
                throw new common_1.BadRequestException('Cette cotisation exceptionnelle est clôturée (date de fin dépassée).');
            }
        }
        if (contribution.type === 'MONTHLY' && contribution.amount != null) {
            const minAmount = Number(contribution.amount);
            if (Number(body.amount) < minAmount) {
                throw new common_1.BadRequestException(`Le montant minimum pour la cotisation mensuelle est de ${minAmount.toLocaleString('fr-FR')} FCFA. Enregistrez un paiement manuel depuis le dashboard si besoin.`);
            }
        }
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
                throw new common_1.BadRequestException('Un paiement existe déjà pour cette période.');
            }
        }
        const transactionId = `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        let amount = Math.round(Number(body.amount)) || 100;
        if (this.currency !== 'USD' && amount % 5 !== 0) {
            amount = Math.round(amount / 5) * 5;
        }
        if (amount < CINETPAY_MIN_AMOUNT) {
            throw new common_1.BadRequestException(`Le montant minimum CinetPay est de ${CINETPAY_MIN_AMOUNT} FCFA.`);
        }
        let phone = (member.phone || '').trim();
        if (!phone)
            phone = '+2250759928005';
        else if (!phone.startsWith('+')) {
            if (phone.startsWith('0'))
                phone = '+225' + phone.substring(1);
            else if (phone.startsWith('225'))
                phone = '+' + phone;
            else
                phone = '+225' + phone;
        }
        const cleanPhone = phone.replace(/\D/g, '').replace(/^225/, '');
        if (cleanPhone.length < 8) {
            throw new common_1.BadRequestException('Numéro de téléphone invalide. Mettez à jour votre profil.');
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
        let result;
        try {
            result = JSON.parse(text);
        }
        catch {
            this.logger.warn('CinetPay response not JSON: ' + text);
            throw new common_1.BadRequestException('Réponse invalide de CinetPay');
        }
        if (result.code === '201' && result.data?.payment_url) {
            return { paymentUrl: result.data.payment_url, transactionId };
        }
        await this.prisma.cinetPayTransaction.updateMany({
            where: { transactionId },
            data: { status: 'FAILED', metadata: result },
        });
        throw new common_1.BadRequestException(result.message || 'Erreur lors de l\'initiation du paiement CinetPay');
    }
    async verifyWithCinetPay(transactionId) {
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
    async completePayment(transactionId) {
        const tx = await this.prisma.cinetPayTransaction.findUnique({
            where: { transactionId },
            select: { id: true, memberId: true, contributionId: true, amount: true, periodYear: true, periodMonth: true, status: true },
        });
        if (!tx)
            return;
        if (tx.status === 'COMPLETED')
            return;
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
    async handleNotify(body) {
        const cpmTransId = body.cpm_trans_id;
        const cpmTransStatus = body.cpm_trans_status;
        const cpmPayid = body.cpm_payid;
        if (!cpmTransId)
            return;
        const tx = await this.prisma.cinetPayTransaction.findUnique({
            where: { transactionId: cpmTransId },
        });
        if (!tx) {
            this.logger.warn('Webhook CinetPay: transaction inconnue ' + cpmTransId);
            return;
        }
        if (tx.status === 'COMPLETED')
            return;
        const verified = await this.verifyWithCinetPay(cpmTransId);
        if (verified && verified.status === 'ACCEPTED') {
            await this.completePayment(cpmTransId);
            await this.prisma.cinetPayTransaction.update({
                where: { transactionId: cpmTransId },
                data: { cinetpayId: cpmPayid ?? undefined, metadata: body },
            });
        }
        else if (verified && verified.status === 'REFUSED') {
            await this.prisma.cinetPayTransaction.update({
                where: { transactionId: cpmTransId },
                data: { status: 'REFUSED', metadata: body },
            });
        }
    }
    async verifyAndComplete(transactionId, memberId) {
        const tx = await this.prisma.cinetPayTransaction.findUnique({
            where: { transactionId },
        });
        if (!tx)
            throw new common_1.NotFoundException('Transaction introuvable');
        if (tx.memberId !== memberId)
            throw new common_1.BadRequestException('Transaction non autorisée');
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
        if (verified)
            return { status: verified.status, completed: false, remainingUnpaidMonths };
        return { status: tx.status, completed: false, remainingUnpaidMonths };
    }
};
exports.CinetpayService = CinetpayService;
exports.CinetpayService = CinetpayService = CinetpayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        contributions_service_1.ContributionsService])
], CinetpayService);
//# sourceMappingURL=cinetpay.service.js.map