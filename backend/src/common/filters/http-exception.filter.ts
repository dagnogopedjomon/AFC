import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtre global : formate toutes les exceptions en JSON et log les erreurs 5xx.
 * En production, on n'expose pas le stack trace au client.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const defaultMessage = exception instanceof Error && exception.message ? exception.message : 'Erreur interne du serveur';
    const responseBody = isHttp
      ? exception.getResponse()
      : { statusCode: 500, message: defaultMessage };
    const finalMessage = typeof responseBody === 'string'
      ? responseBody
      : typeof responseBody === 'object' && responseBody !== null && 'message' in responseBody
        ? (responseBody as { message?: string | string[] }).message
        : exception instanceof Error && exception.message
          ? exception.message
          : 'Erreur serveur';

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} ${status} - ${JSON.stringify(finalMessage)}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(status).json(
      typeof responseBody === 'object' && responseBody !== null
        ? {
          ...responseBody,
          statusCode: status,
          message: finalMessage ?? (status >= 500 ? 'Erreur interne du serveur' : undefined),
        }
        : { statusCode: status, message: finalMessage ?? 'Erreur interne du serveur' },
    );
  }
}
