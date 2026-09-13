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

// src/app/api/auth/mobile-refresh/route.ts
var route_exports = {};
__export(route_exports, {
  POST: () => POST
});
module.exports = __toCommonJS(route_exports);
var import_zod = require("zod");

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

// packages/shared-lib/src/lib/zod-validator.ts
function validationErrorResponse(error) {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      details: error.flatten().fieldErrors
    },
    { status: 400 }
  );
}
async function validateBody(request, schema) {
  try {
    const rawBody = await request.json();
    const result = schema.safeParse(rawBody);
    if (!result.success) {
      return { success: false, data: null, errorResponse: validationErrorResponse(result.error) };
    }
    return { success: true, data: result.data, errorResponse: null };
  } catch (err) {
    return {
      success: false,
      data: null,
      errorResponse: NextResponse.json({ success: false, error: "Malformed JSON payload" }, { status: 400 })
    };
  }
}

// src/app/api/auth/mobile-refresh/route.ts
var import_crypto2 = __toESM(require("crypto"));

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
async function createSession(payload, authMethod, req, deviceId) {
  const role = payload.role || "customer";
  const config = SESSION_CONFIG[role] || SESSION_CONFIG.customer;
  const accessToken = await new import_jose.SignJWT({
    firebase_uid: payload.firebase_uid,
    role: payload.role,
    user_id: payload.user_id
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${config.accessTokenTTL}s`).sign(getSecretKey());
  const refreshToken = import_crypto.default.randomBytes(32).toString("hex");
  const accessTokenHash = import_crypto.default.createHash("sha256").update(accessToken).digest("hex");
  const refreshTokenHash = import_crypto.default.createHash("sha256").update(refreshToken).digest("hex");
  let ipAddress = "127.0.0.1";
  let userAgent = "Unknown";
  if (req) {
    ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
    if (ipAddress.includes(",")) {
      ipAddress = ipAddress.split(",")[0].trim();
    }
    userAgent = req.headers.get("user-agent") || "Unknown";
  }
  const expiresAt = new Date(Date.now() + config.refreshTokenTTL * 1e3);
  const sessionsTable = supabaseAdmin.from("sessions");
  const { error } = await sessionsTable.insert({
    user_id: payload.user_id,
    access_token_hash: accessTokenHash,
    refresh_token_hash: refreshTokenHash,
    device_id: deviceId || null,
    ip_address: ipAddress,
    user_agent: userAgent,
    auth_method: authMethod,
    is_active: true,
    expires_at: expiresAt.toISOString(),
    last_activity: (/* @__PURE__ */ new Date()).toISOString(),
    refresh_count: 0
  });
  if (error) {
    console.error("[Session Manager] Error creating session in database:", error);
    throw new Error("Failed to create session");
  }
  return {
    accessToken,
    refreshToken,
    accessTokenTTL: config.accessTokenTTL,
    refreshTokenTTL: config.refreshTokenTTL
  };
}

// src/app/api/auth/mobile-refresh/route.ts
async function POST(request) {
  const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  try {
    const { data: body, errorResponse } = await validateBody(request, import_zod.z.any());
    if (errorResponse) return errorResponse;
    const { refreshToken } = body;
    if (!refreshToken || typeof refreshToken !== "string") {
      return NextResponse.json(
        { error: "Missing refreshToken in request body" },
        { status: 400, headers: cacheHeaders }
      );
    }
    const refreshTokenHash = import_crypto2.default.createHash("sha256").update(refreshToken).digest("hex");
    const { data: session, error: sessionError } = await supabaseAdmin.from("sessions").select("id, user_id, expires_at, auth_method, refresh_count, device_id").eq("refresh_token_hash", refreshTokenHash).eq("is_active", true).maybeSingle();
    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Invalid or expired refresh token. Please log in again." },
        { status: 401, headers: cacheHeaders }
      );
    }
    if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
      await supabaseAdmin.from("sessions").update({ is_active: false }).eq("id", session.id);
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401, headers: cacheHeaders }
      );
    }
    const { data: user, error: userError } = await supabaseAdmin.from("users").select("id, role, is_active, is_suspended, phone, firebase_uid").eq("id", session.user_id).maybeSingle();
    if (userError || !user || !user.is_active || user.is_suspended) {
      await supabaseAdmin.from("sessions").update({ is_active: false }).eq("id", session.id);
      return NextResponse.json(
        { error: "Account suspended or not found." },
        { status: 403, headers: cacheHeaders }
      );
    }
    const maxRefreshes = user.role === "worker" ? 300 : 500;
    if (session.refresh_count >= maxRefreshes) {
      await supabaseAdmin.from("sessions").update({ is_active: false }).eq("id", session.id);
      return NextResponse.json(
        { error: "Session refresh limit reached. Please log in again." },
        { status: 401, headers: cacheHeaders }
      );
    }
    const newSession = await createSession(
      {
        firebase_uid: user.firebase_uid,
        role: user.role,
        user_id: user.id
      },
      session.auth_method,
      request,
      session.device_id
    );
    await supabaseAdmin.from("sessions").update({ is_active: false }).eq("id", session.id);
    return NextResponse.json(
      {
        token: newSession.accessToken,
        refreshToken: newSession.refreshToken
      },
      { headers: cacheHeaders }
    );
  } catch (err) {
    console.error("[Mobile Refresh] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: cacheHeaders }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
