import type { Request as ExpressReq, Response as ExpressRes, NextFunction } from 'express';
import { NextRequest } from '../shims/next-server';

interface ExtendedExpressRequest extends ExpressReq {
  rawBody?: Buffer | string;
}

/**
 * Converts an Express Request into a NextRequest (Web Standard Request)
 * ensuring body parsing, raw body preservation (for HMAC webhook verification),
 * cookies, headers, and query strings are fully preserved.
 */
export function createWebRequest(req: ExtendedExpressRequest): NextRequest {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:5000';
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.set(key, value);
      }
    }
  }

  const method = req.method.toUpperCase();
  const hasBody = !['GET', 'HEAD'].includes(method);

  let body: BodyInit | undefined = undefined;
  if (hasBody) {
    if (req.rawBody) {
      body = req.rawBody;
    } else if (req.body) {
      if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
        body = req.body;
      } else if (Object.keys(req.body).length > 0) {
        body = JSON.stringify(req.body);
      }
    }
  }

  const init: RequestInit & { duplex?: string } = {
    method,
    headers,
    body,
    duplex: 'half',
  };

  return new NextRequest(fullUrl, init);
}

/**
 * Pipes a standard Web Response / NextResponse back into an Express Response.
 */
export async function sendWebResponse(webRes: Response, res: ExpressRes): Promise<void> {
  res.status(webRes.status);

  webRes.headers.forEach((value, key) => {
    // Prevent setting duplicate or conflicting content-length if gzip/transfer-encoding is used
    if (key.toLowerCase() !== 'content-length') {
      res.setHeader(key, value);
    }
  });

  const arrayBuffer = await webRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
}

/**
 * Creates an Express route handler wrapping a standard Next.js route module.
 */
export function adaptRoute(routeModule: any) {
  return async (req: ExtendedExpressRequest, res: ExpressRes, next: NextFunction) => {
    const method = req.method.toUpperCase();
    const handler = routeModule[method];

    if (!handler || typeof handler !== 'function') {
      if (method === 'OPTIONS') {
        // Collect supported methods
        const supported = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'].filter(
          (m) => typeof routeModule[m] === 'function'
        );
        res.setHeader('Allow', supported.join(', '));
        return res.status(204).end();
      }
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }

    try {
      const webReq = createWebRequest(req);
      
      // Match Next.js context parameter where params can be accessed as either:
      // context.params.id  OR  (await context.params).id
      const context = {
        params: Object.assign(Promise.resolve({ ...req.params }), { ...req.params }),
      };

      const webRes: Response = await handler(webReq, context);
      await sendWebResponse(webRes, res);
    } catch (err: any) {
      console.error(`[API Error] ${method} ${req.originalUrl}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
      } else {
        next(err);
      }
    }
  };
}
