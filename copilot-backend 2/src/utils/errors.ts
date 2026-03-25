export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} '${id}' nao encontrado`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(409, code, message, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'UNAUTHORIZED', 'API Key invalida ou ausente');
    this.name = 'UnauthorizedError';
  }
}

export class UpstreamError extends AppError {
  constructor(code: string, message: string, statusCode = 503) {
    super(statusCode, code, message);
    this.name = 'UpstreamError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}
