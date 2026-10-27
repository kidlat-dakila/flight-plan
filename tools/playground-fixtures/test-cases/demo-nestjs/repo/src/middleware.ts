import { Injectable, Logger, NestMiddleware } from "@nestjs/common"
import type { NextFunction, Request, Response } from "express"

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger("pokedex")

  use(request: Request, response: Response, next: NextFunction) {
    const started = performance.now()
    response.on("finish", () => {
      const elapsedMs = performance.now() - started
      this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${elapsedMs.toFixed(1)}ms`)
    })
    next()
  }
}
