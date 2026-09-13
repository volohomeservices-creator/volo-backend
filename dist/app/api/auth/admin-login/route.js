"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app/api/auth/admin-login/route.ts
var route_exports = {};
__export(route_exports, {
  POST: () => POST
});
module.exports = __toCommonJS(route_exports);

// src/shims/next-server.ts
var NextResponse = class _NextResponse extends Response {
  constructor(body, init) {
    super(body, init);
    const self = this;
    this.cookies = {
      set: (name, value, options = {}) => {
        let cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        if (options.maxAge !== void 0) cookieStr += `; Max-Age=${options.maxAge}`;
        if (options.expires) cookieStr += `; Expires=${new Date(options.expires).toUTCString()}`;
        if (options.path) cookieStr += `; Path=${options.path}`;
        else cookieStr += "; Path=/";
        if (options.domain) cookieStr += `; Domain=${options.domain}`;
        if (options.secure) cookieStr += "; Secure";
        if (options.httpOnly) cookieStr += "; HttpOnly";
        if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
        self.headers.append("Set-Cookie", cookieStr);
      },
      delete: (name) => {
        self.headers.append(
          "Set-Cookie",
          `${encodeURIComponent(name)}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
        );
      },
      get: (_name) => {
        return void 0;
      }
    };
  }
  static json(data, init) {
    const headers = new Headers(init == null ? void 0 : init.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const body = JSON.stringify(data);
    return new _NextResponse(body, __spreadProps(__spreadValues({}, init), {
      headers
    }));
  }
  static redirect(url, init) {
    const status = typeof init === "number" ? init : (init == null ? void 0 : init.status) || 307;
    const headers = new Headers(typeof init === "object" ? init == null ? void 0 : init.headers : void 0);
    headers.set("Location", typeof url === "string" ? url : url.toString());
    return new _NextResponse(null, {
      status,
      headers
    });
  }
  static next(init) {
    return new _NextResponse(null, __spreadValues({
      status: 200
    }, init));
  }
  static rewrite(destination, init) {
    const headers = new Headers(init == null ? void 0 : init.headers);
    headers.set("x-middleware-rewrite", typeof destination === "string" ? destination : destination.toString());
    return new _NextResponse(null, __spreadProps(__spreadValues({
      status: 200
    }, init), {
      headers
    }));
  }
};

// packages/shared-lib/src/lib/supabase-server.ts
var import_server_only = require("server-only");
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
var supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}
if (!supabaseServiceKey) {
  console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY is missing from environment.");
}
var globalForSupabase = globalThis;
var _a;
var supabaseAdmin = (_a = globalForSupabase.supabaseAdmin) != null ? _a : (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey || "placeholder-service-key", {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
globalForSupabase.supabaseAdmin = supabaseAdmin;

// packages/shared-lib/src/lib/session.ts
var import_jose = require("jose");
var import_crypto = __toESM(require("crypto"));
var getSecretKey = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.warn("[Session Security] Warning: SESSION_SECRET is missing from environment variables. Using fallback secret.");
    return new TextEncoder().encode("dev_session_secret_fallback_must_be_32_chars_long");
  }
  if (secret.length < 32 || secret.includes("placeholder")) {
    console.warn("[Session Security] Warning: SESSION_SECRET must be at least 32 characters long and not contain placeholders. Using fallback secret.");
    return new TextEncoder().encode("dev_session_secret_fallback_must_be_32_chars_long");
  }
  return new TextEncoder().encode(secret.trim());
};
var SESSION_CONFIG = {
  customer: {
    accessTokenTTL: 180 * 24 * 60 * 60,
    // 180 days
    refreshTokenTTL: 180 * 24 * 60 * 60
    // 180 days
  },
  worker: {
    accessTokenTTL: 90 * 24 * 60 * 60,
    // 90 days
    refreshTokenTTL: 90 * 24 * 60 * 60
    // 90 days
  },
  admin: {
    accessTokenTTL: 7 * 24 * 60 * 60,
    // 7 days
    refreshTokenTTL: 7 * 24 * 60 * 60
    // 7 days
  }
};
async function createSessionCookie(payload) {
  const token = await new import_jose.SignJWT({
    firebase_uid: payload.firebase_uid,
    role: payload.role,
    user_id: payload.user_id
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(getSecretKey());
  try {
    const tokenHash = import_crypto.default.createHash("sha256").update(token).digest("hex");
    const refreshToken = import_crypto.default.randomBytes(32).toString("hex");
    const refreshTokenHash = import_crypto.default.createHash("sha256").update(refreshToken).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3);
    const sessionsTable = supabaseAdmin.from("sessions");
    await sessionsTable.insert({
      user_id: payload.user_id,
      access_token_hash: tokenHash,
      refresh_token_hash: refreshTokenHash,
      device_id: null,
      ip_address: "127.0.0.1",
      user_agent: "Legacy Session Admin",
      auth_method: "legacy_cookie",
      is_active: true,
      expires_at: expiresAt.toISOString()
    });
  } catch (err) {
    console.error("Failed to log legacy session cookie in DB:", err);
  }
  return token;
}

// src/app/api/auth/admin-login/route.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_cookie = require("cookie");

// packages/shared-lib/src/lib/audit.ts
var import_server_only2 = require("server-only");
async function logAuditAction({
  admin_id,
  action,
  target_type,
  target_id,
  metadata,
  ip_address
}) {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      admin_id,
      action,
      target_type: target_type || null,
      target_id: target_id || null,
      metadata: metadata || null,
      ip_address: ip_address || null
    });
    if (error) {
      console.error("Failed to write audit log:", error);
    }
  } catch (error) {
    console.error("Exception writing audit log:", error);
  }
}

// packages/shared-types/src/index.ts
var import_zod = require("zod");
var PhoneSchema = import_zod.z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
var OtpSchema = import_zod.z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits");
var CreateBookingSchema = import_zod.z.object({
  service_item_id: import_zod.z.string().uuid("Invalid service item ID"),
  address: import_zod.z.string().min(5, "Address must be at least 5 characters"),
  latitude: import_zod.z.number(),
  longitude: import_zod.z.number(),
  payment_mode: import_zod.z.enum(["ONLINE", "COD", "WALLET"]),
  notes: import_zod.z.string().optional()
});
var ProfileUpdateSchema = import_zod.z.object({
  full_name: import_zod.z.string().min(2, "Name must be at least 2 characters"),
  email: import_zod.z.string().email("Invalid email address").optional().or(import_zod.z.literal(""))
});

// src/app/api/auth/admin-login/route.ts
var import_zod2 = require("zod");
var loginSchema = import_zod2.z.object({
  email: import_zod2.z.string().email(),
  password: import_zod2.z.string().min(1)
});
async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid or missing JSON payload" }, { status: 400 });
    }
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    const { email, password } = parseResult.data;
    const { data: user, error: fetchErr } = await supabaseAdmin.from("users").select("*").eq("email", email.trim().toLowerCase()).eq("role", "admin").maybeSingle();
    if (fetchErr) {
      console.error("[Admin Login DB Error]:", fetchErr);
      return NextResponse.json({ error: "UNAUTHORIZED_ROLE" }, { status: 401 });
    }
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED_ROLE" }, { status: 401 });
    }
    if (!user.is_active) {
      return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
    }
    if (!user.password_hash) {
      return NextResponse.json({ error: "ADMIN_WRONG_CREDS" }, { status: 401 });
    }
    const match = await import_bcryptjs.default.compare(password, user.password_hash);
    if (!match) {
      return NextResponse.json({ error: "ADMIN_WRONG_CREDS" }, { status: 401 });
    }
    const sessionCookie = await createSessionCookie({
      firebase_uid: user.firebase_uid || null,
      role: "admin",
      user_id: user.id
    });
    const serializedCookie = (0, import_cookie.serialize)("volo_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
      // 7 days
    });
    try {
      await logAuditAction({
        admin_id: user.id,
        action: "ADMIN_LOGIN" /* ADMIN_LOGIN */,
        target_type: "user",
        target_id: user.id,
        metadata: { email: user.email }
      });
    } catch (auditErr) {
      console.error("[Admin Login Audit Warning]:", auditErr);
    }
    const response = NextResponse.json({
      success: true,
      redirectTo: "/admin/dashboard"
    });
    response.headers.set("Set-Cookie", serializedCookie);
    return response;
  } catch (error) {
    console.error("[Admin Login Server Exception]:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: (error == null ? void 0 : error.message) || String(error)
    }, { status: 500 });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
