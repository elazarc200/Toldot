export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "NOT_FOUND"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly publicMessage: string;

  constructor(options: {
    code: AppErrorCode;
    status: number;
    publicMessage: string;
    message?: string;
  }) {
    super(options.message ?? options.publicMessage);
    this.name = "AppError";
    this.code = options.code;
    this.status = options.status;
    this.publicMessage = options.publicMessage;
  }
}

export class UnauthenticatedError extends AppError {
  constructor(publicMessage = "נדרשת התחברות") {
    super({
      code: "UNAUTHENTICATED",
      status: 401,
      publicMessage,
      message: "Unauthenticated",
    });
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(publicMessage = "אין הרשאה לבצע פעולה זו") {
    super({
      code: "FORBIDDEN",
      status: 403,
      publicMessage,
      message: "Forbidden",
    });
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(publicMessage = "הנתונים שהתקבלו אינם תקינים") {
    super({
      code: "VALIDATION",
      status: 400,
      publicMessage,
      message: "Validation failed",
    });
    this.name = "ValidationError";
  }
}

export class NotFoundError extends AppError {
  constructor(publicMessage = "המשאב המבוקש לא נמצא") {
    super({
      code: "NOT_FOUND",
      status: 404,
      publicMessage,
      message: "Not found",
    });
    this.name = "NotFoundError";
  }
}

export function toSafeClientError(error: unknown): {
  code: AppErrorCode;
  status: number;
  message: string;
} {
  if (error instanceof AppError) {
    return {
      code: error.code,
      status: error.status,
      message: error.publicMessage,
    };
  }

  return {
    code: "INTERNAL",
    status: 500,
    message: "אירעה שגיאה. נסו שוב מאוחר יותר.",
  };
}
