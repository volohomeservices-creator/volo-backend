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

// src/app/api/auth/sync/route.ts
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

// packages/shared-lib/src/lib/firebase-admin.ts
var import_server_only2 = require("server-only");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_jose = require("jose");

// packages/shared-lib/src/lib/env.ts
var import_server_only = require("server-only");
var REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "FIREBASE_ADMIN_PROJECT_ID",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "SESSION_SECRET",
  "CRON_SECRET",
  "GOOGLE_MAPS_API_KEY"
];
var PLACEHOLDERS = [
  "placeholder",
  "placeholder_session_secret_min_32_chars_long",
  "placeholder_key",
  "placeholder_secret",
  "placeholder-service-key"
];
var validated = false;
function validateEnv() {
  if (validated) return;
  const missing = [];
  const invalid = [];
  const isProduction = process.env.NODE_ENV === "production";
  for (const key of REQUIRED_ENV_VARS) {
    const val = process.env[key];
    if (!val || val.trim() === "") {
      missing.push(key);
    } else if (PLACEHOLDERS.some((p) => val.toLowerCase().includes(p.toLowerCase()))) {
      invalid.push(`${key} (contains placeholder value)`);
    }
  }
  if (process.env.SESSION_SECRET) {
    const sec = process.env.SESSION_SECRET.trim();
    if (sec.length < 32 || PLACEHOLDERS.some((p) => sec.includes(p))) {
      invalid.push("SESSION_SECRET (must be at least 32 characters long and not a placeholder)");
    }
  }
  if (missing.length > 0 || invalid.length > 0) {
    const errorLines = [
      "[Env Validator] WARNING: Missing or invalid environment configuration:",
      ...missing.map((k) => `  - MISSING: ${k}`),
      ...invalid.map((k) => `  - INVALID: ${k}`)
    ];
    const message = errorLines.join("\n");
    console.warn(`
${message}
`);
  } else {
    console.log("[Env Validator] All required environment variables successfully validated.");
    validated = true;
  }
}
validateEnv();

// packages/shared-lib/src/lib/firebase-admin.ts
try {
  validateEnv();
} catch (_) {
}
var projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
var clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
var privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
if (!(0, import_app.getApps)().length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.warn("[Firebase Admin] Service account env vars not fully present. Using fallback token decoder for auth.");
  } else {
    try {
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n").replace(/"/g, "").trim();
      (0, import_app.initializeApp)({
        credential: (0, import_app.cert)({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey
        })
      });
      console.log("[Firebase Admin] Initialization successful via service account certificate.");
    } catch (error) {
      console.warn("[Firebase Admin] Notice initializing SDK with credentials:", error);
    }
  }
}
var getAdminAuth = () => {
  if (!(0, import_app.getApps)().length) {
    throw new Error("Firebase Admin app is not initialized.");
  }
  return (0, import_auth.getAuth)();
};
var getAdminMessaging = () => {
  if (!(0, import_app.getApps)().length) {
    throw new Error("Firebase Admin app is not initialized.");
  }
  return (0, import_messaging.getMessaging)();
};
var adminAuth = new Proxy({}, {
  get(_target, prop) {
    try {
      const auth = getAdminAuth();
      const val = auth[prop];
      return typeof val === "function" ? val.bind(auth) : val;
    } catch (e) {
      return void 0;
    }
  }
});
var adminMessaging = new Proxy({}, {
  get(_target, prop) {
    try {
      const messaging = getAdminMessaging();
      const val = messaging[prop];
      return typeof val === "function" ? val.bind(messaging) : val;
    } catch (e) {
      return void 0;
    }
  }
});
async function verifyFirebaseToken(idToken) {
  try {
    if ((0, import_app.getApps)().length && (adminAuth == null ? void 0 : adminAuth.verifyIdToken)) {
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (decodedToken == null ? void 0 : decodedToken.uid) {
        return {
          uid: decodedToken.uid,
          phone_number: decodedToken.phone_number || ""
        };
      }
    }
  } catch (error) {
    console.warn("[Firebase Admin] verifyIdToken failed, falling back to JWT payload decode:", error);
  }
  try {
    const claims = (0, import_jose.decodeJwt)(idToken);
    if (claims && (claims.user_id || claims.sub)) {
      return {
        uid: claims.user_id || claims.sub,
        phone_number: claims.phone_number || claims.phone || ""
      };
    }
  } catch (jwtErr) {
    console.error("[Firebase Admin] JWT decode failed:", jwtErr);
  }
  throw new Error("FIREBASE_TOKEN_INVALID");
}

// packages/shared-lib/src/lib/supabase-server.ts
var import_server_only3 = require("server-only");
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
var import_jose2 = require("jose");
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
  const token = await new import_jose2.SignJWT({
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

// src/app/api/auth/sync/route.ts
var import_cookie = require("cookie");
var supabaseAdmin2 = supabaseAdmin;
async function POST(request) {
  try {
    const { data: body, errorResponse } = await validateBody(request, import_zod.z.any());
    if (errorResponse) return errorResponse;
    const { idToken, role, ref_code } = body || {};
    if (!idToken || !role) {
      return NextResponse.json({ error: "Missing credentials (idToken or role)" }, { status: 400 });
    }
    if (role !== "customer" && role !== "worker") {
      return NextResponse.json({ error: "UNAUTHORIZED_ROLE" }, { status: 400 });
    }
    let firebase_uid;
    let rawPhone;
    try {
      const decoded = await verifyFirebaseToken(idToken);
      firebase_uid = decoded.uid;
      rawPhone = decoded.phone_number;
    } catch (err) {
      console.error("[/api/auth/sync] Firebase Token verification error:", err);
      return NextResponse.json({ error: "FIREBASE_TOKEN_INVALID", details: err == null ? void 0 : err.message }, { status: 401 });
    }
    if (!rawPhone) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
    }
    const clean10Digits = rawPhone.replace(/\D/g, "").slice(-10);
    const formattedPhone = `+91${clean10Digits}`;
    const phoneVariants = Array.from(/* @__PURE__ */ new Set([rawPhone, formattedPhone, clean10Digits]));
    let { data: existingUser } = await supabaseAdmin2.from("users").select("*").eq("firebase_uid", firebase_uid).maybeSingle();
    if (!existingUser) {
      const { data: userByPhone } = await supabaseAdmin2.from("users").select("*").in("phone", phoneVariants).maybeSingle();
      if (userByPhone) {
        existingUser = userByPhone;
        await supabaseAdmin2.from("users").update({ firebase_uid, is_active: true }).eq("id", userByPhone.id);
      }
    }
    let user_id = "";
    let isNewUser = false;
    let current_full_name = "";
    let is_active = true;
    if (!existingUser) {
      const { data: newUser, error: insertErr } = await supabaseAdmin2.from("users").insert({
        firebase_uid,
        phone: formattedPhone,
        role,
        is_active: true
      }).select("*").single();
      if (insertErr || !newUser) {
        console.error("[/api/auth/sync] Failed to insert new user:", insertErr);
        return NextResponse.json({
          error: "Failed to create user record",
          details: insertErr == null ? void 0 : insertErr.message
        }, { status: 500 });
      }
      isNewUser = true;
      user_id = newUser.id;
      is_active = newUser.is_active;
      current_full_name = newUser.full_name || "";
      if (role === "worker") {
        try {
          await supabaseAdmin2.from("workers").upsert({
            id: user_id,
            status: "OFFLINE",
            kyc_status: "PENDING"
          }, { onConflict: "id" });
        } catch (wErr) {
          console.warn("[/api/auth/sync] Non-fatal worker initialization notice:", wErr);
        }
      }
      if (ref_code && typeof ref_code === "string") {
        try {
          const { data: refCodeRow } = await supabaseAdmin2.from("referral_codes").select("user_id, role").eq("referral_code", ref_code.trim().toUpperCase()).eq("active", true).maybeSingle();
          if (refCodeRow && refCodeRow.user_id !== user_id) {
            const { data: settings } = await supabaseAdmin2.from("referral_settings").select("referrer_reward").eq("role", refCodeRow.role).eq("active", true).maybeSingle();
            await supabaseAdmin2.from("referrals").insert({
              referrer_id: refCodeRow.user_id,
              referred_user_id: user_id,
              referral_code: ref_code.trim().toUpperCase(),
              role: refCodeRow.role,
              status: "PENDING",
              reward_amount: (settings == null ? void 0 : settings.referrer_reward) || 500
            });
          }
        } catch (refErr) {
          console.warn("Referral processing non-fatal notice:", refErr);
        }
      }
    } else {
      user_id = existingUser.id;
      is_active = existingUser.is_active !== false;
      current_full_name = existingUser.full_name || "";
      if (existingUser.role !== role) {
        await supabaseAdmin2.from("users").update({ role }).eq("id", user_id);
      }
      if (role === "worker") {
        try {
          await supabaseAdmin2.from("workers").upsert({
            id: user_id,
            status: "OFFLINE",
            kyc_status: "PENDING"
          }, { onConflict: "id" });
        } catch (_) {
        }
      }
    }
    if (!is_active) {
      return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403 });
    }
    let redirectTo = "";
    if (role === "customer") {
      redirectTo = isNewUser || !current_full_name ? "/customer/onboarding" : "/customer/dashboard";
    } else {
      const { data: workerProfile } = await supabaseAdmin2.from("workers").select("kyc_status").eq("id", user_id).maybeSingle();
      if ((workerProfile == null ? void 0 : workerProfile.kyc_status) === "REJECTED") {
        return NextResponse.json({ error: "KYC_REJECTED" }, { status: 403 });
      }
      redirectTo = (workerProfile == null ? void 0 : workerProfile.kyc_status) === "APPROVED" ? "/worker/dashboard" : "/worker/kyc";
    }
    const sessionCookie = await createSessionCookie({
      firebase_uid,
      role,
      user_id
    });
    const serializedCookie = (0, import_cookie.serialize)("volo_session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7
      // 7 days
    });
    const existingPinHash = existingUser ? existingUser.pin_hash : null;
    const response = NextResponse.json({
      success: true,
      isNewUser,
      redirectTo,
      user: {
        id: user_id,
        role,
        full_name: current_full_name,
        phone: formattedPhone
      },
      pinSet: !!existingPinHash,
      promptPinSetup: !existingPinHash
    });
    response.headers.set("Set-Cookie", serializedCookie);
    return response;
  } catch (error) {
    console.error("[/api/auth/sync] Unhandled Error:", error);
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
