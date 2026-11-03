"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JekoService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JekoService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const sayelesend_util_1 = require("../notifications/sayelesend.util");
const client_1 = require("@prisma/client");
const advance_periods_1 = require("./advance-periods");
const payment_notifications_1 = require("./payment-notifications");
const JEKO_BASE = 'https://api.jeko.africa/partner_api';
let JekoService = JekoService_1 = class JekoService {
    prisma;
    logger = new common_1.Logger(JekoService_1.name);
    apiKey = process.env.JEKO_API_KEY;
    apiKeyId = process.env.JEKO_API_KEY_ID;
    storeId = process.env.JEKO_STORE_ID;
    frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').split(',')[0].trim();
    constructor(prisma) {
        this.prisma = prisma;
    }
    isConfigured() {
        return !!(this.apiKey && this.apiKeyId && this.storeId);
    }
    headers() {
        return {
            'Content-Type': 'application/json',
            'X-API-KEY': this.apiKey,
            'X-API-KEY-ID': this.apiKeyId,
        };
    }
    async createPaymentRequest(params) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
        }
        await this.validateRegularizationPayment(params);
        await this.validateAdvancePayment(params);
        const reference = (0, crypto_1.randomUUID)();
        const successUrl = `${this.frontendUrl}/dashboard/payment/success?ref=${reference}`;
        const errorUrl = `${this.frontendUrl}/dashboard/cotisations?jeko_error=1`;
        const paymentData = {
            paymentMethod: params.paymentMethod,
            successUrl,
            errorUrl,
            forceProviderDirect: true,
        };
        if (params.payerPhone) {
            paymentData.payerPhone = (0, sayelesend_util_1.normalizeE164)(params.payerPhone);
        }
        const res = await fetch(`${JEKO_BASE}/payment_requests`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                storeId: this.storeId,
                amountCents: params.amountFcfa * 100,
                currency: 'XOF',
                reference,
                paymentDetails: {
                    type: 'redirect',
                    data: paymentData,
                },
            }),
        });
        const data = (await res.json().catch(() => ({})));
        if (!res.ok || !data.id || !data.redirectUrl) {
            const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
            console.error('[Jeko] createPaymentRequest error:', msg, data);
            throw new common_1.BadRequestException(`Impossible de créer la demande de paiement : ${msg}`);
        }
        console.log('[Jeko] demande créée:', data.id, data.redirectUrl);
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
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return { reference, redirectUrl: data.redirectUrl };
    }
    async createPaymentLink(params) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
        }
        await this.validateRegularizationPayment(params);
        await this.validateAdvancePayment(params);
        const reference = (0, crypto_1.randomUUID)();
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
        const data = (await res.json().catch(() => ({})));
        if (!res.ok || !data.id || !data.link) {
            const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
            console.error('[Jeko] createPaymentLink error:', msg, data);
            throw new common_1.BadRequestException(`Impossible de créer le lien de paiement : ${msg}`);
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
    async createFinePaymentRequest(params) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
        }
        const reference = (0, crypto_1.randomUUID)();
        const successUrl = `${this.frontendUrl}/dashboard/payment/success?ref=${reference}&type=fine`;
        const errorUrl = `${this.frontendUrl}/dashboard/mes-amendes?jeko_error=1`;
        const paymentData = {
            paymentMethod: params.paymentMethod,
            successUrl,
            errorUrl,
            forceProviderDirect: true,
        };
        if (params.payerPhone) {
            paymentData.payerPhone = (0, sayelesend_util_1.normalizeE164)(params.payerPhone);
        }
        const res = await fetch(`${JEKO_BASE}/payment_requests`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify({
                storeId: this.storeId,
                amountCents: params.amountFcfa * 100,
                currency: 'XOF',
                reference,
                paymentDetails: { type: 'redirect', data: paymentData },
            }),
        });
        const data = (await res.json().catch(() => ({})));
        if (!res.ok || !data.id || !data.redirectUrl) {
            const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
            console.error('[Jeko] createFinePaymentRequest error:', msg, data);
            throw new common_1.BadRequestException(`Impossible de créer la demande de paiement : ${msg}`);
        }
        await this.prisma.pendingJekoPayment.create({
            data: {
                reference,
                jekoRequestId: data.id,
                memberId: params.memberId,
                fineId: params.fineId,
                amountFcfa: params.amountFcfa,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return { reference, redirectUrl: data.redirectUrl };
    }
    async createFinePaymentLink(params) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non configuré (variables JEKO manquantes).');
        }
        const reference = (0, crypto_1.randomUUID)();
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
        const data = (await res.json().catch(() => ({})));
        if (!res.ok || !data.id || !data.link) {
            const msg = data.error || data.message || data.errors?.[0]?.message || `HTTP ${res.status}`;
            console.error('[Jeko] createFinePaymentLink error:', msg, data);
            throw new common_1.BadRequestException(`Impossible de créer le lien de paiement : ${msg}`);
        }
        await this.prisma.pendingJekoPayment.create({
            data: {
                reference,
                jekoLinkId: data.id,
                memberId: params.memberId,
                fineId: params.fineId,
                amountFcfa: params.amountFcfa,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
        });
        return { reference, link: data.link };
    }
    async verifyAndRecord(reference) {
        if (!this.isConfigured()) {
            throw new common_1.BadRequestException('Paiement en ligne non configuré.');
        }
        const context = await this.prisma.pendingJekoPayment.findUnique({ where: { reference } });
        if (!context) {
            const existing = await this.prisma.payment.findFirst({
                where: { metadata: { contains: reference } },
            });
            return { paid: !!existing };
        }
        if (context.jekoLinkId) {
            const res = await fetch(`${JEKO_BASE}/payment_links/${context.jekoLinkId}`, {
                headers: this.headers(),
            });
            const data = (await res.json().catch(() => ({})));
            if (!res.ok) {
                const msg = data.error || data.message || `HTTP ${res.status}`;
                throw new common_1.BadRequestException(`Vérification impossible : ${msg}`);
            }
            if (data.canReceivePayments === false) {
                return this.recordPaymentFromContext(context, reference);
            }
            return { paid: false };
        }
        const res = await fetch(`${JEKO_BASE}/payment_requests/${context.jekoRequestId}`, {
            headers: this.headers(),
        });
        const data = (await res.json().catch(() => ({})));
        if (!res.ok) {
            const msg = data.error || data.message || `HTTP ${res.status}`;
            throw new common_1.BadRequestException(`Vérification impossible : ${msg}`);
        }
        if (data.status !== 'success') {
            return { paid: false };
        }
        return this.recordPaymentFromContext(context, reference);
    }
    async recordFromWebhook(reference) {
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
    async recordFromWebhookByLinkId(paymentLinkId) {
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
    async recordPaymentFromContext(context, reference) {
        if (context.fineId) {
            return this.recordFinePaymentFromContext({ ...context, fineId: context.fineId }, reference);
        }
        const contributionId = context.contributionId;
        let cashBoxId = context.cashBoxId ?? null;
        if (!cashBoxId) {
            const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true } });
            cashBoxId = defaultBox?.id ?? null;
        }
        const contribution = await this.prisma.contribution.findUnique({
            where: { id: contributionId },
            select: { type: true, amount: true, name: true },
        });
        const result = await this.prisma.$transaction(async (tx) => {
            const consumed = await tx.pendingJekoPayment.deleteMany({ where: { reference } });
            if (consumed.count === 0) {
                const existing = await tx.payment.findFirst({ where: { metadata: { contains: reference } } });
                return { payment: existing ?? {}, paymentsCount: existing ? 1 : 0, reactivated: false, fresh: false, periods: [], label: undefined };
            }
            const metadataBase = {
                source: 'jeko',
                jekoRequestId: context.jekoRequestId,
                jekoLinkId: context.jekoLinkId,
                reference,
            };
            if (context.regularizationAgreementId) {
                const agreement = await tx.regularizationAgreement.findUnique({ where: { id: context.regularizationAgreementId } });
                if (!agreement || agreement.memberId !== context.memberId)
                    throw new common_1.BadRequestException('Accord de régularisation introuvable.');
                const paidBefore = Number(agreement.paidAmount);
                const paidAfter = paidBefore + context.amountFcfa;
                const agreedAmount = Number(agreement.agreedAmount);
                const expectedAmount = paidBefore === 0 ? Number(agreement.initialAmount) : agreedAmount - paidBefore;
                if (context.amountFcfa !== expectedAmount)
                    throw new common_1.BadRequestException('Le montant de cette échéance a changé. Veuillez recommencer le paiement.');
                if (paidAfter > agreedAmount)
                    throw new common_1.BadRequestException('Le paiement dépasse le solde de la régularisation.');
                const completed = paidAfter >= agreedAmount;
                const payment = await tx.payment.create({
                    data: {
                        memberId: context.memberId,
                        contributionId: contributionId,
                        amount: context.amountFcfa,
                        cashBoxId,
                        regularizationAgreementId: agreement.id,
                        metadata: JSON.stringify({ ...metadataBase, regularization: true }),
                    },
                });
                await tx.regularizationAgreement.update({
                    where: { id: agreement.id },
                    data: {
                        paidAmount: new client_1.Prisma.Decimal(paidAfter),
                        status: completed ? client_1.RegularizationStatus.COMPLETED : client_1.RegularizationStatus.PARTIALLY_PAID,
                        activatedAt: agreement.activatedAt ?? new Date(),
                        completedAt: completed ? new Date() : null,
                    },
                });
                await tx.member.update({ where: { id: context.memberId }, data: { isSuspended: false, reactivatedAt: null } });
                return { payment, paymentsCount: 1, reactivated: true, fresh: true, periods: [], label: 'tranche de votre accord de régularisation' };
            }
            if (context.advanceMonths && contribution?.type === client_1.ContributionType.MONTHLY && contribution.amount) {
                const periods = await (0, advance_periods_1.getPeriodsToCover)(tx, context.memberId, contributionId, context.advanceMonths);
                if (periods.length !== context.advanceMonths)
                    throw new common_1.BadRequestException('Impossible d’affecter tous les mois anticipés.');
                const monthlyAmount = Number(contribution.amount);
                if (context.amountFcfa !== monthlyAmount * periods.length)
                    throw new common_1.BadRequestException('Le montant du paiement anticipé est invalide.');
                await tx.payment.createMany({ data: periods.map((period) => ({
                        memberId: context.memberId,
                        contributionId: contributionId,
                        amount: contribution.amount,
                        periodYear: period.year,
                        periodMonth: period.month,
                        cashBoxId,
                        metadata: JSON.stringify({ ...metadataBase, advancePayment: true }),
                    })) });
                await tx.member.update({
                    where: { id: context.memberId },
                    data: { isSuspended: false, reactivatedAt: null },
                });
                return { payment: { reference, advanceMonths: periods }, paymentsCount: periods.length, reactivated: true, fresh: true, periods, label: undefined };
            }
            if (contribution?.type === client_1.ContributionType.MONTHLY && contribution.amount) {
                const member = await tx.member.findUnique({
                    where: { id: context.memberId },
                    select: { createdAt: true },
                });
                const payments = await tx.payment.findMany({
                    where: {
                        memberId: context.memberId,
                        contributionId: contributionId,
                        cancelledAt: null,
                        periodYear: { not: null },
                        periodMonth: { not: null },
                    },
                    select: { periodYear: true, periodMonth: true },
                });
                const paidSet = new Set(payments.map((p) => `${p.periodYear}-${p.periodMonth}`));
                const completedAgreements = await tx.regularizationAgreement.findMany({
                    where: { memberId: context.memberId, contributionId: contributionId, status: client_1.RegularizationStatus.COMPLETED },
                    select: { months: true },
                });
                for (const agreement of completedAgreements) {
                    for (const period of agreement.months)
                        paidSet.add(`${period.year}-${period.month}`);
                }
                const unpaidMonths = [];
                const now = new Date();
                let year = now.getFullYear();
                let month = now.getMonth() + 1;
                const startYear = member?.createdAt.getFullYear() ?? year;
                const startMonth = member ? member.createdAt.getMonth() + 1 : month;
                for (let i = 0; i < 12; i++) {
                    if (year < startYear || (year === startYear && month < startMonth))
                        break;
                    if (!paidSet.has(`${year}-${month}`))
                        unpaidMonths.push({ year, month });
                    month--;
                    if (month < 1) {
                        month = 12;
                        year--;
                    }
                }
                const monthlyAmount = Number(contribution.amount);
                const coveredCount = Math.min(unpaidMonths.length, Math.floor(context.amountFcfa / monthlyAmount));
                const coveredMonths = unpaidMonths.slice(0, coveredCount);
                const paymentRows = coveredMonths.map((period) => ({
                    memberId: context.memberId,
                    contributionId: contributionId,
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
                        contributionId: contributionId,
                        amount: remainder,
                        periodYear: null,
                        periodMonth: null,
                        cashBoxId,
                        metadata: JSON.stringify({ ...metadataBase, unallocatedRemainder: true }),
                    });
                }
                if (paymentRows.length > 0)
                    await tx.payment.createMany({ data: paymentRows });
                const reactivated = coveredCount === unpaidMonths.length && unpaidMonths.length > 0;
                if (reactivated) {
                    await tx.member.update({
                        where: { id: context.memberId },
                        data: { isSuspended: false, reactivatedAt: null },
                    });
                }
                return { payment: { reference, monthsPaid: coveredMonths }, paymentsCount: paymentRows.length, reactivated, fresh: true, periods: coveredMonths, label: undefined };
            }
            const payment = await tx.payment.create({
                data: {
                    memberId: context.memberId,
                    contributionId: contributionId,
                    amount: context.amountFcfa,
                    periodYear: context.periodYear,
                    periodMonth: context.periodMonth,
                    cashBoxId,
                    metadata: JSON.stringify(metadataBase),
                },
            });
            return {
                payment, paymentsCount: 1, reactivated: false, fresh: true,
                periods: context.periodYear && context.periodMonth ? [{ year: context.periodYear, month: context.periodMonth }] : [],
                label: contribution?.type === client_1.ContributionType.MONTHLY ? undefined : `cotisation « ${contribution?.name ?? 'exceptionnelle'} »`,
            };
        });
        this.logger.log(`[Jeko] ${result.paymentsCount} paiement(s) enregistré(s), réactivation=${result.reactivated}`);
        if (result.fresh && result.paymentsCount > 0) {
            await (0, payment_notifications_1.notifyPaymentValidated)(this.prisma, {
                memberId: context.memberId,
                amountFcfa: context.amountFcfa,
                periods: result.periods,
                label: result.label,
            }).catch(() => undefined);
        }
        return { paid: result.paymentsCount > 0, payment: result.payment };
    }
    async recordFinePaymentFromContext(context, reference) {
        let cashBoxId = context.cashBoxId ?? null;
        if (!cashBoxId) {
            const defaultBox = await this.prisma.cashBox.findFirst({ where: { isDefault: true } });
            cashBoxId = defaultBox?.id ?? null;
        }
        const result = await this.prisma.$transaction(async (tx) => {
            const consumed = await tx.pendingJekoPayment.deleteMany({ where: { reference } });
            if (consumed.count === 0) {
                const fine = await tx.fine.findUnique({ where: { id: context.fineId } });
                return { payment: fine ?? {}, paymentsCount: fine?.status === client_1.FineStatus.PAID ? 1 : 0 };
            }
            const fine = await tx.fine.findUnique({ where: { id: context.fineId } });
            if (!fine)
                throw new common_1.BadRequestException('Amende introuvable.');
            if (fine.status !== client_1.FineStatus.UNPAID) {
                return { payment: fine, paymentsCount: fine.status === client_1.FineStatus.PAID ? 1 : 0 };
            }
            if (context.amountFcfa !== Number(fine.amount)) {
                throw new common_1.BadRequestException('Le montant du paiement ne correspond pas au montant de l’amende.');
            }
            const updated = await tx.fine.update({
                where: { id: context.fineId },
                data: { status: client_1.FineStatus.PAID, paidAt: new Date(), cashBoxId },
            });
            return { payment: updated, paymentsCount: 1 };
        });
        this.logger.log(`[Jeko] Amende ${context.fineId} réglée=${result.paymentsCount > 0}`);
        if (result.paymentsCount > 0) {
            await this.prisma.inAppNotification.create({
                data: {
                    memberId: context.memberId,
                    title: 'Amende réglée',
                    message: `Votre amende de ${context.amountFcfa.toLocaleString('fr-FR')} FCFA a été réglée.`,
                },
            }).catch(() => undefined);
        }
        return { paid: result.paymentsCount > 0, payment: result.payment };
    }
    async validateRegularizationPayment(params) {
        if (!params.regularizationAgreementId) {
            const activeAgreement = await this.prisma.regularizationAgreement.findFirst({
                where: {
                    memberId: params.memberId,
                    contributionId: params.contributionId,
                    status: { in: [client_1.RegularizationStatus.PENDING, client_1.RegularizationStatus.PARTIALLY_PAID, client_1.RegularizationStatus.OVERDUE] },
                },
            });
            if (activeAgreement) {
                throw new common_1.BadRequestException('Ce membre a un accord de régularisation actif : utilisez le paiement de la page Régulariser pour que le solde de l’accord soit mis à jour.');
            }
            return;
        }
        const agreement = await this.prisma.regularizationAgreement.findUnique({ where: { id: params.regularizationAgreementId } });
        if (!agreement || agreement.memberId !== params.memberId || agreement.contributionId !== params.contributionId) {
            throw new common_1.BadRequestException('Accord de régularisation invalide.');
        }
        if (agreement.status !== client_1.RegularizationStatus.PENDING && agreement.status !== client_1.RegularizationStatus.PARTIALLY_PAID && agreement.status !== client_1.RegularizationStatus.OVERDUE) {
            throw new common_1.BadRequestException('Cet accord de régularisation n’est plus payable.');
        }
        const paid = Number(agreement.paidAmount);
        const expected = paid === 0 ? Number(agreement.initialAmount) : Number(agreement.agreedAmount) - paid;
        if (params.amountFcfa !== expected) {
            throw new common_1.BadRequestException(`Le montant attendu pour cette échéance est de ${expected.toLocaleString('fr-FR')} FCFA.`);
        }
    }
    async validateAdvancePayment(params) {
        if (!params.advanceMonths)
            return;
        if (params.advanceMonths < 1 || params.advanceMonths > 12)
            throw new common_1.BadRequestException('Durée de paiement anticipé invalide.');
        const contribution = await this.prisma.contribution.findUnique({ where: { id: params.contributionId } });
        if (!contribution || contribution.type !== client_1.ContributionType.MONTHLY || !contribution.amount)
            throw new common_1.BadRequestException('Cotisation mensuelle introuvable.');
        const expected = Number(contribution.amount) * params.advanceMonths;
        if (params.amountFcfa !== expected)
            throw new common_1.BadRequestException(`Le montant attendu est ${expected.toLocaleString('fr-FR')} FCFA.`);
    }
    async cleanExpired() {
        const result = await this.prisma.pendingJekoPayment.deleteMany({
            where: { expiresAt: { lt: new Date() } },
        });
        return result.count;
    }
};
exports.JekoService = JekoService;
exports.JekoService = JekoService = JekoService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], JekoService);
//# sourceMappingURL=jeko.service.js.map