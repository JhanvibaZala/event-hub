import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardApiResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, StandardApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response.statusCode || 200;

    return next.handle().pipe(
      map((res) => {
        let message = 'Operation completed successfully';
        let data = res;

        // Extract custom message if returned as { message, ...data } or { message, data }
        if (
          res &&
          typeof res === 'object' &&
          'message' in res &&
          typeof res.message === 'string'
        ) {
          message = res.message;
          if ('data' in res) {
            data = res.data;
          } else {
            const { message: _, ...rest } = res;
            data = Object.keys(rest).length > 0 ? (rest as T) : null;
          }
        }

        return {
          statusCode,
          success: true,
          message,
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
