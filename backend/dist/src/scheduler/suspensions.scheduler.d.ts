import { ContributionsService } from '../contributions/contributions.service';
export declare class SuspensionsScheduler {
    private readonly contributionsService;
    constructor(contributionsService: ContributionsService);
    handleDailySuspensions(): Promise<void>;
    handleReactivationDeadline(): Promise<void>;
}
