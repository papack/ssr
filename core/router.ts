import { createServer, type Server } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";

export type Context<Ctx> = {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
} & Ctx;

type CacheEntry = {
  value: string;
  expires: number;
};

type Route<Ctx> = {
  parts: string[];
  contentType: string;
  ttl?: number;
  cache?: Map<string, CacheEntry>;
  handler: (ctx: Context<Ctx>) => string | Promise<string>;
};

type RouteOptions = {
  path: string;
  ttl?: number;
};

export class Router<Ctx extends object> {
  private server: Server;
  private routes: Route<Ctx>[] = [];
  private ctx: Ctx;

  private notFoundHandler?: (ctx: Context<Ctx>) => string | Promise<string>;
  private errorHandler?: (
    ctx: Context<Ctx>,
    err: unknown
  ) => string | Promise<string>;

  constructor(ctx: Ctx) {
    this.ctx = ctx;

    this.server = createServer(async (req, res) => {
      try {
        if (req.method !== "GET") {
          res.statusCode = 405;
          res.end("METHOD_NOT_ALLOWED");
          return;
        }

        const rawUrl = req.url ?? "/";
        const url = new URL(rawUrl, "http://localhost");
        const pathParts = this.splitPath(url.pathname);

        for (const route of this.routes) {
          if (route.parts.length !== pathParts.length) continue;

          const params: Record<string, string> = {};
          let match = true;

          for (let i = 0; i < route.parts.length; i++) {
            const routePart = route.parts[i];
            const pathPart = pathParts[i];

            if (!routePart || !pathPart) {
              match = false;
              break;
            }

            if (routePart.startsWith(":")) {
              params[routePart.slice(1)] = pathPart;
            } else if (routePart !== pathPart) {
              match = false;
              break;
            }
          }

          if (!match) continue;

          const cacheKey =
            url.pathname +
            "?" +
            Object.entries(params)
              .map(([k, v]) => `${k}=${v}`)
              .join("&");

          if (route.ttl && route.cache) {
            const hit = route.cache.get(cacheKey);
            if (hit && hit.expires > Date.now()) {
              res.statusCode = 200;
              res.setHeader("content-type", route.contentType);
              res.end(hit.value);
              return;
            }
          }

          const ctx: Context<Ctx> = {
            req,
            res,
            params,
            ...this.ctx,
          };

          let body = await route.handler(ctx);

          if (route.contentType.startsWith("text/html")) {
            body = "<!DOCTYPE html>" + body;
          }

          if (route.ttl && route.cache) {
            route.cache.set(cacheKey, {
              value: body,
              expires: Date.now() + route.ttl,
            });
          }

          res.statusCode = 200;
          res.setHeader("content-type", route.contentType);
          res.end(body);
          return;
        }

        if (this.notFoundHandler) {
          const ctx: Context<Ctx> = {
            req,
            res,
            params: {},
            ...this.ctx,
          };

          const html = await this.notFoundHandler(ctx);
          res.statusCode = 404;
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.end(html);
          return;
        }

        res.statusCode = 404;
        res.end("NOT_FOUND");
      } catch (err) {
        await this.handleError(err, req, res);
      }
    });
  }

  private async handleError(
    err: unknown,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    if (this.errorHandler) {
      const ctx: Context<Ctx> = {
        req,
        res,
        params: {},
        ...this.ctx,
      };

      const html = await this.errorHandler(ctx, err);
      res.statusCode = 500;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(html);
      return;
    }

    res.statusCode = 500;
    res.setHeader("content-type", "text/plain");
    res.end("INTERNAL_ERROR");
  }

  html(
    opts: RouteOptions,
    handler: (ctx: Context<Ctx>) => string | Promise<string>
  ) {
    this.addRoute(opts.path, "text/html; charset=utf-8", handler, opts.ttl);
  }

  css(
    opts: RouteOptions,
    handler: (ctx: Context<Ctx>) => string | Promise<string>
  ) {
    this.addRoute(opts.path, "text/css; charset=utf-8", handler, opts.ttl);
  }

  js(
    opts: RouteOptions,
    handler: (ctx: Context<Ctx>) => string | Promise<string>
  ) {
    this.addRoute(
      opts.path,
      "application/javascript; charset=utf-8",
      handler,
      opts.ttl
    );
  }

  notFound(handler: (ctx: Context<Ctx>) => string | Promise<string>) {
    this.notFoundHandler = handler;
  }

  error(
    handler: (ctx: Context<Ctx>, err: unknown) => string | Promise<string>
  ) {
    this.errorHandler = handler;
  }

  listen(port: number, cb?: () => void) {
    this.server.listen(port, cb);
  }

  private addRoute(
    path: string,
    contentType: string,
    handler: (ctx: Context<Ctx>) => string | Promise<string>,
    ttl?: number
  ) {
    const parts = this.splitPath(path);

    this.routes.push({
      parts,
      contentType,
      handler,
      ttl,
      cache: ttl ? new Map() : undefined,
    });
  }

  private splitPath(path: string): string[] {
    return path.split("/").filter(Boolean);
  }
}
