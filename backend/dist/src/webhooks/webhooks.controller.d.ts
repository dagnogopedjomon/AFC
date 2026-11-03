import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JekoService } from '../contributions/jeko.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class WebhooksController {
    private readonly jekoService;
    private readonly notifications;
    private readonly logger;
    private readonly webhookSecret;
    constructor(jekoService: JekoService, notifications: NotificationsService);
    handleJeko(req: RawBodyRequest<Request>, res: Response): Promise<Response<any, Record<string, any>>>;
}
