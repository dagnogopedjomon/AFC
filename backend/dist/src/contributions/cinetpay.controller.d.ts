import { CinetpayService } from './cinetpay.service';
export declare class CinetpayController {
    private readonly cinetpayService;
    constructor(cinetpayService: CinetpayService);
    notify(req: {
        body: Record<string, unknown>;
    }): Promise<{
        message: string;
    }>;
}
