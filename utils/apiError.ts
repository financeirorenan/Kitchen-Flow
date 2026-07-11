export class ApiError extends Error {
  constructor(
    public override message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function sendError(res: any, error: any) {
  const status = error instanceof ApiError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Erro interno no servidor";
  const code = error instanceof ApiError ? error.code : "server/internal-error";

  return res.status(status).json({
    success: false,
    error: {
      message,
      code,
      status,
      timestamp: new Date().toISOString(),
    },
  });
}
