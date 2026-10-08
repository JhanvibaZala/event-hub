import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it('should wrap basic response data into standardized envelope', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of({ foo: 'bar' }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res.statusCode).toBe(200);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Operation completed successfully');
      expect(res.data).toEqual({ foo: 'bar' });
      expect(res.timestamp).toBeDefined();
      done();
    });
  });

  it('should extract custom message when provided in returned object', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getResponse: () => ({ statusCode: 201 }),
      }),
    } as ExecutionContext;

    const mockCallHandler: CallHandler = {
      handle: () => of({ message: 'Item created!', item: { id: 1 } }),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe((res) => {
      expect(res.statusCode).toBe(201);
      expect(res.success).toBe(true);
      expect(res.message).toBe('Item created!');
      expect(res.data).toEqual({ item: { id: 1 } });
      done();
    });
  });
});
