export class HandlerError extends Error {
  constructor(
    public statusCode: number,
    public body: { error: string }
  ) {
    super(`[${statusCode}] ${body.error}`)
  }
}
