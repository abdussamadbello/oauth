import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { DecodedToken } from "@/providers/token/token.service";
import AuthService from "@modules/auth/auth.service";
import { Request } from "express";
import { Strategy } from "passport-strategy";
import { Reflector } from "@nestjs/core";

class AuthStrategy extends Strategy {
  name = "jwt"
}

@Injectable()
class JwtStrategy extends PassportStrategy(AuthStrategy) {
  constructor (
    private readonly authService: AuthService, 
    private readonly reflector: Reflector,
  ) {
    super()
  }

  async authenticate(req: Request): Promise<void> {
    const token = this.extractTokenFromHeader(req);
    // const { uuid, key } = this.extractApiCredentialsFromRequest(req);

    if (token) {
      try {
        const decoded: DecodedToken = this.authService.verifyToken(token);

        const { email, slug, sub: id } = decoded
  
        const data = await this.authService.validateUser({ email, id, slug }, "local");

        if (!data.user) return this.fail("Unauthorized request", 401)

        const scopes = this.fetchUserScopes(data.user.id);
  
        return this.success({ ...data, user: { ...data.user, scopes }, type: "user" });
      } catch (error) {
        return this.fail("Invalid token", 401)
      }
    // } else if (uuid && key) {
    //   try {
    //     const apikey = await this.apikeyService.validateApiKey(uuid, key);

    //     if (!apikey) return this.fail("Invalid credentials", 401);

    //     if (apikey.expiresIn && apikey.expiresIn < new Date()) return this.fail("Api key expired", 401);

    //     if (apikey.deletedAt) return this.fail("Api key disabled", 401)

    //     return this.success({ ...apikey.user, scopes: apikey.scopes, type: "api" })
    //   } catch (error) {
    //     return this.fail("Invalid credentials", 401)
    //   }
    // }
    }

    return this.fail("Unauthorized", 401)
  }

  extractTokenFromHeader = (req: Request): string => req.headers.authorization?.replace("Bearer ", "");

  extractApiCredentialsFromRequest = (req: Request): { uuid: string, key: string } => {
    const uuid = req.headers["x-api-id"] as string;
    const key = req.headers["x-api-key"] as string;

    return { uuid, key };
  }

  fetchUserScopes = async (id: number): Promise<string[]> => {
    const userRoles = await this.authService.getUserRoles(id)

    let scopes: string[] = [];

    userRoles.forEach(userRole => {
      const scopeArray = userRole.role.scopes.split(":::");

      scopes = [...scopes, ...scopeArray];
    })

    return scopes;
  }
}

export default JwtStrategy;
