import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('IncomingRequest');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const requestId = req.headers['x-request-id'] || '-';

    this.logger.log(
      `[${requestId}] ${method} ${originalUrl} from ${ip} (${userAgent})`,
    );

    next();
  }
}
