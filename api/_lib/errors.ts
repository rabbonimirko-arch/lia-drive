export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'api_error',
    public readonly details?: unknown,
  ) {
    super(message);
  }
}
