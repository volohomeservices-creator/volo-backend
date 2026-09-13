/**
 * Zero-overhead Next.js Server Shim for Pure Node.js / Express Environment.
 * Implements NextResponse and NextRequest using Node.js standard Web APIs (Request, Response, Headers, URL).
 */

export class NextResponse extends Response {
  public cookies: {
    set: (name: string, value: string, options?: any) => void;
    delete: (name: string) => void;
    get: (name: string) => { name: string; value: string } | undefined;
  };

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    const self = this;
    this.cookies = {
      set: (name: string, value: string, options: any = {}) => {
        let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        if (options.maxAge !== undefined) cookieStr += `; Max-Age=${options.maxAge}`;
        if (options.expires) cookieStr += `; Expires=${new Date(options.expires).toUTCString()}`;
        if (options.path) cookieStr += `; Path=${options.path}`;
        else cookieStr += '; Path=/';
        if (options.domain) cookieStr += `; Domain=${options.domain}`;
        if (options.secure) cookieStr += '; Secure';
        if (options.httpOnly) cookieStr += '; HttpOnly';
        if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
        self.headers.append('Set-Cookie', cookieStr);
      },
      delete: (name: string) => {
        self.headers.append(
          'Set-Cookie',
          `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
        );
      },
      get: (_name: string) => {
        return undefined;
      },
    };
  }

  static json(data: any, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const body = JSON.stringify(data);
    return new NextResponse(body, {
      ...init,
      headers,
    });
  }

  static redirect(url: string | URL, init?: number | ResponseInit): NextResponse {
    const status = typeof init === 'number' ? init : init?.status || 307;
    const headers = new Headers(typeof init === 'object' ? init?.headers : undefined);
    headers.set('Location', typeof url === 'string' ? url : url.toString());
    return new NextResponse(null, {
      status,
      headers,
    });
  }

  static next(init?: ResponseInit): NextResponse {
    return new NextResponse(null, {
      status: 200,
      ...init,
    });
  }

  static rewrite(destination: string | URL, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set('x-middleware-rewrite', typeof destination === 'string' ? destination : destination.toString());
    return new NextResponse(null, {
      status: 200,
      ...init,
      headers,
    });
  }
}

export class NextRequest extends Request {
  public nextUrl: URL;
  public cookies: {
    get: (name: string) => { name: string; value: string } | undefined;
    getAll: () => { name: string; value: string }[];
    has: (name: string) => boolean;
  };

  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init);
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    this.nextUrl = new URL(urlStr);

    const cookieHeader = this.headers.get('cookie') || '';
    const parsedCookies = parseCookieHeader(cookieHeader);

    this.cookies = {
      get: (name: string) => {
        const val = parsedCookies[name];
        return val !== undefined ? { name, value: val } : undefined;
      },
      getAll: () => Object.entries(parsedCookies).map(([name, value]) => ({ name, value })),
      has: (name: string) => name in parsedCookies,
    };
  }
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    const key = pair.slice(0, idx).trim();
    const val = pair.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}
