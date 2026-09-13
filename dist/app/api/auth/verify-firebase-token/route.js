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

// src/app/api/auth/verify-firebase-token/route.ts
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

// src/app/api/auth/verify-firebase-token/route.ts
var import_crypto2 = __toESM(require("crypto"));

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
async function createSession(payload, authMethod, req, deviceId) {
  const role = payload.role || "customer";
  const config = SESSION_CONFIG[role] || SESSION_CONFIG.customer;
  const accessToken = await new import_jose2.SignJWT({
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
async function logAuthEvent(userId, phone, eventType, authMethod, req, deviceId, metadata = {}) {
  try {
    let ipAddress = "127.0.0.1";
    let userAgent = "Unknown";
    if (req) {
      ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
      if (ipAddress.includes(",")) {
        ipAddress = ipAddress.split(",")[0].trim();
      }
      userAgent = req.headers.get("user-agent") || "Unknown";
    }
    const authLogsTable = supabaseAdmin.from("auth_logs");
    await authLogsTable.insert({
      user_id: userId,
      phone,
      event_type: eventType,
      auth_method: authMethod,
      ip_address: ipAddress,
      user_agent: userAgent,
      device_id: deviceId || null,
      metadata
    });
  } catch (err) {
    console.error("Error logging auth event:", err);
  }
}

// src/app/api/auth/verify-firebase-token/route.ts
async function POST(request) {
  const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  try {
    const { data: { idToken, role, ref_code, deviceFingerprint, deviceName }, errorResponse } = await validateBody(request, import_zod.z.any());
    if (errorResponse) return errorResponse;
    if (!idToken || !role) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400, headers: cacheHeaders });
    }
    if (role !== "customer" && role !== "worker") {
      return NextResponse.json({ error: "UNAUTHORIZED_ROLE" }, { status: 400, headers: cacheHeaders });
    }
    let firebase_uid;
    let phone;
    try {
      const decoded = await verifyFirebaseToken(idToken);
      firebase_uid = decoded.uid;
      phone = decoded.phone_number;
    } catch (err) {
      return NextResponse.json({ error: "FIREBASE_TOKEN_INVALID" }, { status: 401, headers: cacheHeaders });
    }
    if (!phone) {
      return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400, headers: cacheHeaders });
    }
    const formattedPhone = phone.startsWith("+91") ? phone : `+91${phone}`;
    const { data: existingUser, error: fetchErr } = await supabaseAdmin.from("users").select("*").eq("phone", formattedPhone).maybeSingle();
    let user_id = "";
    let isNewUser = false;
    let current_full_name = "";
    let is_active = true;
    let is_suspended = false;
    let existing_pin_hash = null;
    if (!existingUser) {
      isNewUser = true;
      const { data: newUser, error: insertErr } = await supabaseAdmin.from("users").insert({
        firebase_uid,
        phone: formattedPhone,
        role,
        phone_verified: true,
        is_active: true,
        is_suspended: false,
        last_login_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select("*").single();
      if (insertErr || !newUser) {
        console.error("[Verify Token] Failed to create user:", insertErr);
        return NextResponse.json({ error: "Failed to create user record" }, { status: 500, headers: cacheHeaders });
      }
      user_id = newUser.id;
      is_active = newUser.is_active;
      if (role === "worker") {
        const { error: workerErr } = await supabaseAdmin.from("workers").insert({
          id: user_id,
          status: "OFFLINE",
          kyc_status: "PENDING"
        });
        if (workerErr) {
          console.error("[Verify Token] Failed to initialize worker profile:", workerErr);
          return NextResponse.json({ error: "Failed to initialize worker profile" }, { status: 500, headers: cacheHeaders });
        }
      }
      if (ref_code && typeof ref_code === "string") {
        try {
          const { data: refCodeRow } = await supabaseAdmin.from("referral_codes").select("user_id, role").eq("referral_code", ref_code.trim().toUpperCase()).eq("active", true).maybeSingle();
          if (refCodeRow && refCodeRow.user_id !== user_id) {
            const { data: settings } = await supabaseAdmin.from("referral_settings").select("referrer_reward").eq("role", refCodeRow.role).eq("active", true).maybeSingle();
            await supabaseAdmin.from("referrals").insert({
              referrer_id: refCodeRow.user_id,
              referred_user_id: user_id,
              referral_code: ref_code.trim().toUpperCase(),
              role: refCodeRow.role,
              status: "PENDING",
              reward_amount: (settings == null ? void 0 : settings.referrer_reward) || 500
            });
          }
        } catch (refErr) {
          console.warn("Referral processing failed (non-fatal):", refErr);
        }
      }
    } else {
      user_id = existingUser.id;
      is_active = existingUser.is_active;
      is_suspended = existingUser.is_suspended || false;
      current_full_name = existingUser.full_name || "";
      existing_pin_hash = existingUser.pin_hash;
      if (existingUser.role !== role) {
        return NextResponse.json({ error: "UNAUTHORIZED_ROLE" }, { status: 403, headers: cacheHeaders });
      }
    }
    if (!is_active || is_suspended) {
      return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403, headers: cacheHeaders });
    }
    const deviceToken = import_crypto2.default.randomUUID();
    const deviceTokenHash = import_crypto2.default.createHash("sha256").update(deviceToken).digest("hex");
    let devices = null;
    let devFetchErr = null;
    if (!existingUser) {
      const { data, error } = await supabaseAdmin.from("trusted_devices").select("id").eq("user_id", user_id).eq("is_active", true).order("last_used_at", { ascending: true });
      devices = data;
      devFetchErr = error;
    } else {
      const updatePromise = supabaseAdmin.from("users").update({
        firebase_uid,
        phone_verified: true,
        last_login_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", user_id);
      const devicesFetchPromise = supabaseAdmin.from("trusted_devices").select("id").eq("user_id", user_id).eq("is_active", true).order("last_used_at", { ascending: true });
      const [_, fetchRes] = await Promise.all([updatePromise, devicesFetchPromise]);
      devices = fetchRes.data;
      devFetchErr = fetchRes.error;
    }
    if (!devFetchErr && devices && devices.length >= 3) {
      const deactivateCount = devices.length - 2;
      const deviceIdsToDeactivate = devices.slice(0, deactivateCount).map((d) => d.id);
      await supabaseAdmin.from("trusted_devices").update({ is_active: false }).in("id", deviceIdsToDeactivate);
    }
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const { data: newDevice } = await supabaseAdmin.from("trusted_devices").insert({
      user_id,
      device_token_hash: deviceTokenHash,
      device_fingerprint: deviceFingerprint || null,
      device_name: deviceName || "Unknown Device",
      ip_address: clientIp,
      is_active: true
    }).select("id").single();
    const session = await createSession(
      { firebase_uid, role, user_id },
      "firebase_otp",
      request,
      newDevice == null ? void 0 : newDevice.id
    );
    let redirectTo = "";
    if (role === "customer") {
      redirectTo = isNewUser || !current_full_name ? "/customer/onboarding" : "/customer/dashboard";
    } else {
      const { data: workerProfile } = await supabaseAdmin.from("workers").select("kyc_status").eq("id", user_id).maybeSingle();
      if ((workerProfile == null ? void 0 : workerProfile.kyc_status) === "REJECTED") {
        return NextResponse.json({ error: "KYC_REJECTED" }, { status: 403, headers: cacheHeaders });
      }
      redirectTo = (workerProfile == null ? void 0 : workerProfile.kyc_status) === "APPROVED" ? "/worker/dashboard" : "/worker/kyc";
    }
    Promise.all([
      logAuthEvent(user_id, formattedPhone, "otp_verified", "firebase_otp", request, newDevice == null ? void 0 : newDevice.id),
      logAuthEvent(user_id, formattedPhone, "device_registered", "firebase_otp", request, newDevice == null ? void 0 : newDevice.id)
    ]).catch((err) => {
      console.error("[Verify Token] Failed logging auth events (non-fatal):", err);
    });
    const response = NextResponse.json({
      success: true,
      isNewUser,
      redirectTo,
      token: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        id: user_id,
        role,
        full_name: current_full_name,
        phone: formattedPhone
      },
      deviceToken,
      pinSet: !!existing_pin_hash,
      promptPinSetup: !existing_pin_hash
    }, { headers: cacheHeaders });
    response.cookies.set("volo_session", session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: session.accessTokenTTL
    });
    response.cookies.set("volo_refresh", session.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/auth/refresh",
      maxAge: session.refreshTokenTTL
    });
    return response;
  } catch (error) {
    console.error("[Verify Token] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: cacheHeaders });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
