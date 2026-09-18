import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SignInRequest } from "@adlc/contracts";
import { Public } from "./public.decorator.js";
import { CurrentRequestContext, type RequestContext } from "./request-context.js";
import { AuthService } from "./auth.service.js";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "../http/session-cookie.js";

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post("sign-in")
  @HttpCode(204)
  async signIn(
    @Body() body: SignInRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const token = await this.auth.signIn(body);
    void reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  }

  @Post("sign-out")
  @HttpCode(204)
  async signOut(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    const token =
      request.cookies?.[SESSION_COOKIE_NAME] ??
      request.headers.cookie
        ?.split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`))
        ?.slice(SESSION_COOKIE_NAME.length + 1);
    if (!token) {
      throw new UnauthorizedException("Authentication required.");
    }
    await this.auth.signOut(token);
    void reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
  }

  @Get("me")
  me(@CurrentRequestContext() context: RequestContext) {
    return this.auth.currentIdentity(context.actorId, context.workspaceId);
  }
}
