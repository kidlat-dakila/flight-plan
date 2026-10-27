import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import type { Request } from "express"
import { API_KEY } from "@/settings"

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    if (request.header("x-api-key") !== API_KEY) throw new UnauthorizedException("invalid API key")
    return true
  }
}
