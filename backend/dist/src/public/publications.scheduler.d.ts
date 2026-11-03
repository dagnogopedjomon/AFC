import { OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteRebuildService } from './site-rebuild.service';
export declare class PublicationsScheduler implements OnModuleInit {
    private readonly prisma;
    private readonly siteRebuild;
    private readonly logger;
    private depuis;
    constructor(prisma: PrismaService, siteRebuild: SiteRebuildService);
    onModuleInit(): void;
    sortirLesArticlesProgrammes(): Promise<void>;
}
