import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common"
import type { Response } from "express"

export class NotFoundError extends Error {
  constructor(
    readonly resource: string,
    readonly resourceId: number,
  ) {
    super(`${resource} ${resourceId} not found`)
  }
}

@Catch(NotFoundError)
export class NotFoundFilter implements ExceptionFilter {
  catch(error: NotFoundError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    response.status(404).json({ detail: error.message })
  }
}
