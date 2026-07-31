import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Something went wrong—please try again.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? message;
        error = (obj.error as string) ?? error;
      }
    } else if (isNumericOverflow(exception)) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message =
        'Amount is too large to save. Use a smaller target value and try again.';
      this.logger.warn(
        exception instanceof Error ? exception.message : String(exception),
      );
    } else if (isSchemaDrift(exception)) {
      status = HttpStatus.SERVICE_UNAVAILABLE;
      error = 'Service Unavailable';
      message =
        'Database schema is out of date. From the project root run npm run sync, then restart the API.';
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
      );
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

function isNumericOverflow(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  const msg = exception.message ?? '';
  if (/numeric field overflow/i.test(msg)) return true;
  if (
    exception instanceof Prisma.PrismaClientUnknownRequestError &&
    /22003/.test(msg)
  ) {
    return true;
  }
  return false;
}

/** Prisma / Postgres errors when code and DB schema are mismatched. */
function isSchemaDrift(exception: unknown): boolean {
  if (!(exception instanceof Error)) return false;
  const msg = exception.message ?? '';

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    // Column/table missing, invalid enum value in DB, etc.
    if (exception.code === 'P2022' || exception.code === 'P2023') {
      return true;
    }
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    return /Unknown (arg|field)|Invalid .* invocation/i.test(msg);
  }

  if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
    return (
      /column .* does not exist/i.test(msg) ||
      /type .* does not exist/i.test(msg) ||
      /invalid input value for enum/i.test(msg)
    );
  }

  // Prisma 6.x may throw while rendering unknown-field validation errors.
  if (exception instanceof TypeError) {
    const stack = exception.stack ?? '';
    if (
      /applyUnknownSelectionFieldError|getSubSelectionValue/.test(stack) ||
      /Unknown field|Unknown arg/i.test(msg)
    ) {
      return true;
    }
  }

  return false;
}
