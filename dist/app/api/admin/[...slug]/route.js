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
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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

// packages/shared-lib/src/lib/supabase-server.ts
var import_server_only, import_supabase_js, supabaseUrl, supabaseServiceKey, globalForSupabase, _a, supabaseAdmin;
var init_supabase_server = __esm({
  "packages/shared-lib/src/lib/supabase-server.ts"() {
    "use strict";
    import_server_only = require("server-only");
    import_supabase_js = require("@supabase/supabase-js");
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
    }
    if (!supabaseServiceKey) {
      console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY is missing from environment.");
    }
    globalForSupabase = globalThis;
    supabaseAdmin = (_a = globalForSupabase.supabaseAdmin) != null ? _a : (0, import_supabase_js.createClient)(supabaseUrl, supabaseServiceKey || "placeholder-service-key", {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    globalForSupabase.supabaseAdmin = supabaseAdmin;
  }
});

// packages/shared-lib/src/lib/audit.ts
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
var import_server_only2;
var init_audit = __esm({
  "packages/shared-lib/src/lib/audit.ts"() {
    "use strict";
    import_server_only2 = require("server-only");
    init_supabase_server();
  }
});

// packages/shared-types/src/index.ts
var import_zod, PhoneSchema, OtpSchema, CreateBookingSchema, ProfileUpdateSchema;
var init_src = __esm({
  "packages/shared-types/src/index.ts"() {
    "use strict";
    import_zod = require("zod");
    PhoneSchema = import_zod.z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
    OtpSchema = import_zod.z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits");
    CreateBookingSchema = import_zod.z.object({
      service_item_id: import_zod.z.string().uuid("Invalid service item ID"),
      address: import_zod.z.string().min(5, "Address must be at least 5 characters"),
      latitude: import_zod.z.number(),
      longitude: import_zod.z.number(),
      payment_mode: import_zod.z.enum(["ONLINE", "COD", "WALLET"]),
      notes: import_zod.z.string().optional()
    });
    ProfileUpdateSchema = import_zod.z.object({
      full_name: import_zod.z.string().min(2, "Name must be at least 2 characters"),
      email: import_zod.z.string().email("Invalid email address").optional().or(import_zod.z.literal(""))
    });
  }
});

// packages/shared-lib/src/types/index.ts
var init_types = __esm({
  "packages/shared-lib/src/types/index.ts"() {
    "use strict";
    init_src();
  }
});

// packages/shared-lib/src/lib/wallet-engine.ts
var wallet_engine_exports = {};
__export(wallet_engine_exports, {
  createWallet: () => createWallet,
  deductCommission: () => deductCommission,
  getBalance: () => getBalance,
  validateWallet: () => validateWallet
});
async function createWallet(workerId) {
  const { data: existing } = await supabaseAdmin.from("worker_wallets").select("id").eq("worker_id", workerId).single();
  if (existing) {
    return true;
  }
  const { error } = await supabaseAdmin.from("worker_wallets").insert({
    worker_id: workerId,
    balance: 0,
    minimum_balance: -500,
    is_active: true
  });
  if (error) {
    console.error("[Wallet Engine] Failed to create wallet:", error);
    return false;
  }
  await logAuditAction({
    admin_id: workerId,
    action: "WALLET_CREATED" /* WALLET_CREATED */,
    target_type: "worker",
    target_id: workerId,
    metadata: { initial_balance: 0, minimum_balance: -500 }
  });
  return true;
}
async function getBalance(workerId) {
  const { data, error } = await supabaseAdmin.from("worker_wallets").select("balance").eq("worker_id", workerId).single();
  if (error || !data) {
    return 0;
  }
  return Number(data.balance);
}
async function validateWallet(workerId) {
  const { data, error } = await supabaseAdmin.from("worker_wallets").select("balance, minimum_balance").eq("worker_id", workerId).single();
  if (error || !data) {
    return false;
  }
  return Number(data.balance) >= Number(data.minimum_balance);
}
async function deductCommission(workerId, bookingId, amount) {
  const { data, error } = await supabaseAdmin.rpc("deduct_wallet_commission", {
    p_worker_id: workerId,
    p_booking_id: bookingId,
    p_amount: amount
  });
  if (error) {
    console.error("[Wallet Engine] Error deducting commission:", error);
    return { success: false, error: error.message };
  }
  await logAuditAction({
    admin_id: workerId,
    action: "COMMISSION_DEDUCTED" /* COMMISSION_DEDUCTED */,
    target_type: "worker",
    target_id: workerId,
    metadata: { booking_id: bookingId, amount }
  });
  return { success: true };
}
var import_server_only6;
var init_wallet_engine = __esm({
  "packages/shared-lib/src/lib/wallet-engine.ts"() {
    "use strict";
    import_server_only6 = require("server-only");
    init_supabase_server();
    init_audit();
    init_types();
  }
});

// src/app/api/admin/[...slug]/route.ts
var route_exports = {};
__export(route_exports, {
  DELETE: () => DELETE,
  GET: () => GET,
  PATCH: () => PATCH,
  POST: () => POST,
  PUT: () => PUT
});
module.exports = __toCommonJS(route_exports);
var import_zod2 = require("zod");

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

// packages/shared-lib/src/lib/auth.ts
var import_cookie = require("cookie");

// packages/shared-lib/src/lib/session.ts
var import_jose = require("jose");
var import_crypto = __toESM(require("crypto"));
init_supabase_server();
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
async function verifySessionCookie(token) {
  try {
    const { payload } = await (0, import_jose.jwtVerify)(token, getSecretKey(), {
      algorithms: ["HS256"]
    });
    const sessionPayload = payload;
    const tokenHash = import_crypto.default.createHash("sha256").update(token).digest("hex");
    const sessionsTable = supabaseAdmin.from("sessions");
    const { data: session, error } = await sessionsTable.select("is_active, expires_at").eq("access_token_hash", tokenHash).maybeSingle();
    if (error || !session) {
      return null;
    }
    if (!session.is_active) {
      return null;
    }
    if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
      return null;
    }
    try {
      const sessionsTableUpdate = supabaseAdmin.from("sessions");
      await sessionsTableUpdate.update({ last_activity: (/* @__PURE__ */ new Date()).toISOString() }).eq("access_token_hash", tokenHash);
    } catch (e) {
    }
    return sessionPayload;
  } catch (error) {
    return null;
  }
}

// packages/shared-lib/src/lib/auth.ts
async function getSessionFromRequest(req) {
  var _a2;
  const authHeader = req.headers.get("authorization");
  if (authHeader == null ? void 0 : authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.substring(7).trim();
    if (bearerToken) {
      return verifySessionCookie(bearerToken);
    }
  }
  if ("cookies" in req && typeof req.cookies.get === "function") {
    const cookieVal = (_a2 = req.cookies.get("volo_session")) == null ? void 0 : _a2.value;
    if (cookieVal) {
      return verifySessionCookie(cookieVal);
    }
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = (0, import_cookie.parse)(cookieHeader);
  const token = cookies["volo_session"];
  if (!token) {
    return null;
  }
  return verifySessionCookie(token);
}
async function requireSession(req) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    const err = new Error("UNAUTHORIZED");
    err.status = 401;
    throw err;
  }
  return session;
}
async function requireRole(req, role) {
  const session = await requireSession(req);
  if (session.role !== role) {
    const err = new Error("FORBIDDEN");
    err.status = 403;
    throw err;
  }
  return session;
}

// src/app/api/admin/[...slug]/route.ts
init_supabase_server();
init_audit();
init_types();

// packages/shared-lib/src/lib/notification-dispatcher.ts
init_supabase_server();

// packages/shared-lib/src/lib/firebase-admin.ts
var import_server_only4 = require("server-only");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_jose2 = require("jose");

// packages/shared-lib/src/lib/env.ts
var import_server_only3 = require("server-only");
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

// packages/shared-lib/src/lib/firebase-notifications.ts
init_supabase_server();
init_audit();
init_types();
async function sendPushNotification({ userId, title, body, data }) {
  try {
    const { data: devices, error } = await supabaseAdmin.from("user_devices").select("id, device_token").eq("user_id", userId).eq("is_active", true);
    if (error) {
      throw error;
    }
    if (!devices || devices.length === 0) {
      return { success: false, reason: "NO_ACTIVE_DEVICES" };
    }
    const tokens = devices.map((d) => d.device_token);
    const message = {
      notification: {
        title,
        body
      },
      data: data || {},
      tokens
    };
    const response = await adminMessaging.sendEachForMulticast(message);
    const failedTokens = [];
    response.responses.forEach((res, idx) => {
      var _a2, _b, _c;
      if (!res.success) {
        const errorMsg = (_a2 = res.error) == null ? void 0 : _a2.message;
        if (((_b = res.error) == null ? void 0 : _b.code) === "messaging/invalid-registration-token" || ((_c = res.error) == null ? void 0 : _c.code) === "messaging/registration-token-not-registered") {
          failedTokens.push(tokens[idx]);
        }
      }
    });
    if (failedTokens.length > 0) {
      await supabaseAdmin.from("user_devices").update({ is_active: false }).in("device_token", failedTokens).eq("user_id", userId);
    }
    if (response.successCount > 0) {
      await logAuditAction({
        admin_id: userId,
        // Assuming user context here or system context
        action: "PUSH_NOTIFICATION_SENT" /* PUSH_NOTIFICATION_SENT */,
        target_type: "user",
        target_id: userId,
        metadata: { title, successCount: response.successCount }
      });
    }
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.error("Push notification failed:", err);
    await logAuditAction({
      admin_id: userId,
      action: "PUSH_NOTIFICATION_FAILED" /* PUSH_NOTIFICATION_FAILED */,
      target_type: "user",
      target_id: userId,
      metadata: { title, error: err.message }
    });
    return { success: false, error: err.message };
  }
}

// packages/shared-lib/src/lib/notification-dispatcher.ts
async function dispatchNotification(payload) {
  try {
    const { error: dbErr } = await supabaseAdmin.from("notifications").insert({
      user_id: payload.userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {}
    });
    if (dbErr) {
      console.error("[Notification Dispatcher] DB Insert Failed:", dbErr);
    }
    await sendPushNotification({
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      // Convert nested data to flat string map for FCM
      data: payload.data ? { payload: JSON.stringify(payload.data) } : void 0
    });
    return true;
  } catch (error) {
    console.error("[Notification Dispatcher] Error:", error);
    return false;
  }
}

// packages/shared-lib/src/lib/cache.ts
var import_server_only5 = require("server-only");
var SimpleCache = class {
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
  }
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }
  set(key, value, ttlSeconds) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1e3
    });
  }
  delete(key) {
    this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
};
var memoryCache = new SimpleCache();

// src/app/api/admin/[...slug]/route.ts
var supabaseAdmin2 = supabaseAdmin;
var getTodayDate = () => {
  const d = /* @__PURE__ */ new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
var getStartOfWeekDate = () => {
  const d = /* @__PURE__ */ new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
};
var getStartOfMonthDate = () => {
  const d = /* @__PURE__ */ new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};
async function GET(request, { params }) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _i;
  try {
    const session = await requireRole(request, "admin");
    const { slug } = await params;
    if (slug[0] === "search") {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q") || "";
      if (!query.trim()) {
        return NextResponse.json({ workers: [], customers: [], bookings: [] });
      }
      const cleanQuery = query.trim();
      const [workersRes, customersRes, bookingsRes] = await Promise.all([
        supabaseAdmin2.from("users").select("id, full_name, phone").eq("role", "worker").or(`full_name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`).eq("is_active", true).limit(5),
        supabaseAdmin2.from("users").select("id, full_name, phone").eq("role", "customer").or(`full_name.ilike.%${cleanQuery}%,phone.ilike.%${cleanQuery}%`).eq("is_active", true).limit(5),
        supabaseAdmin2.from("bookings").select("id, status, service_items(name)").or(`status.ilike.%${cleanQuery}%`).limit(5)
      ]);
      let bookingByUuid = [];
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(cleanQuery)) {
        const { data } = await supabaseAdmin2.from("bookings").select("id, status, service_items(name)").eq("id", cleanQuery).limit(1);
        if (data) bookingByUuid = data;
      }
      const workers = (workersRes.data || []).map((w) => ({
        name: `${w.full_name} (${w.phone})`,
        url: `/admin/workers/${w.id}`
      }));
      const customers = (customersRes.data || []).map((c) => ({
        name: `${c.full_name} (${c.phone})`,
        url: `/admin/customers/${c.id}`
      }));
      const bookingsCombined = [...bookingByUuid, ...bookingsRes.data || []];
      const uniqueBookings = Array.from(new Map(bookingsCombined.map((b) => [b.id, b])).values());
      const bookings = uniqueBookings.slice(0, 5).map((b) => {
        var _a3;
        return {
          name: `Booking ${((_a3 = b.service_items) == null ? void 0 : _a3.name) || "Service"} (${b.id.substring(0, 8)}) - ${b.status}`,
          url: `/admin/bookings`
        };
      });
      return NextResponse.json({ workers, customers, bookings });
    }
    if (slug[0] === "dashboard" && slug[1] === "metrics") {
      const today = getTodayDate();
      const weekStart = getStartOfWeekDate();
      const monthStart = getStartOfMonthDate();
      const [
        { count: totalWorkers },
        { count: activeWorkers },
        { count: pendingKyc },
        { count: totalCustomers },
        { count: activeCustomers },
        { count: newCustomersThisWeek },
        { count: atRiskCustomers },
        { count: unresolvedReviews },
        { count: todaysBookings },
        { count: completedBookings },
        { count: pendingBookings },
        { data: paymentsToday },
        { data: paymentsWeek },
        { data: paymentsMonth },
        { data: pendingSettlementsData }
      ] = await Promise.all([
        supabaseAdmin2.from("workers").select("*", { count: "exact", head: true }),
        supabaseAdmin2.from("workers").select("*", { count: "exact", head: true }).in("status", ["ONLINE", "ON_JOB"]),
        supabaseAdmin2.from("workers").select("*", { count: "exact", head: true }).eq("kyc_status", "PENDING"),
        supabaseAdmin2.from("users").select("*", { count: "exact", head: true }).eq("role", "customer"),
        supabaseAdmin2.from("users").select("*", { count: "exact", head: true }).eq("role", "customer").eq("is_active", true),
        supabaseAdmin2.from("users").select("*", { count: "exact", head: true }).eq("role", "customer").gte("created_at", weekStart),
        supabaseAdmin2.from("users").select("*", { count: "exact", head: true }).eq("role", "customer").eq("is_active", false),
        supabaseAdmin2.from("reviews").select("*", { count: "exact", head: true }).lte("rating", 3),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).eq("status", "COMPLETED"),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).eq("status", "PENDING_ASSIGNMENT"),
        supabaseAdmin2.from("payments").select("amount").eq("status", "SUCCESS").gte("paid_at", today),
        supabaseAdmin2.from("payments").select("amount").eq("status", "SUCCESS").gte("paid_at", weekStart),
        supabaseAdmin2.from("payments").select("amount").eq("status", "SUCCESS").gte("paid_at", monthStart),
        supabaseAdmin2.from("settlement_ledger").select("amount").eq("status", "PENDING")
      ]);
      const sumAmount = (arr) => (arr || []).reduce((sum, item) => sum + Number(item.amount), 0);
      return NextResponse.json({
        total_workers: totalWorkers || 0,
        active_workers: activeWorkers || 0,
        pending_kyc: pendingKyc || 0,
        total_customers: totalCustomers || 0,
        active_customers: activeCustomers || 0,
        new_customers_this_week: newCustomersThisWeek || 0,
        at_risk_customers: atRiskCustomers || 0,
        unresolved_reviews: unresolvedReviews || 0,
        todays_bookings: todaysBookings || 0,
        completed_bookings: completedBookings || 0,
        pending_bookings: pendingBookings || 0,
        revenue_today: sumAmount(paymentsToday),
        revenue_this_week: sumAmount(paymentsWeek),
        revenue_this_month: sumAmount(paymentsMonth),
        pending_settlements: (pendingSettlementsData || []).length,
        pending_settlement_amount: sumAmount(pendingSettlementsData)
      });
    }
    if (slug[0] === "dashboard" && slug[1] === "recent-activity") {
      const { data: logs, error } = await supabaseAdmin2.from("audit_logs").select("*, users(full_name)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return NextResponse.json(logs || []);
    }
    if (slug[0] === "workers" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const limit = Math.max(1, Number(searchParams.get("limit") || 20));
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const kycStatus = searchParams.get("kyc_status") || "";
      const offset = (page - 1) * limit;
      let query = supabaseAdmin2.from("workers").select("id, status, kyc_status, rating, total_jobs, created_at, location_updated_at, users!inner(full_name, phone), worker_wallets(balance)", { count: "exact" });
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`, { foreignTable: "users" });
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (kycStatus) {
        query = query.eq("kyc_status", kycStatus);
      }
      const { data: workers, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      const onJobWorkerIds = (workers || []).filter((w) => w.status === "ON_JOB").map((w) => w.id);
      if (onJobWorkerIds.length > 0) {
        const { data: activeBookings } = await supabaseAdmin2.from("bookings").select("worker_id").in("worker_id", onJobWorkerIds).in("status", ["WORKER_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]);
        const activeWorkerIdSet = new Set((activeBookings || []).map((b) => b.worker_id));
        for (const w of workers || []) {
          if (w.status === "ON_JOB" && !activeWorkerIdSet.has(w.id)) {
            w.status = "ONLINE";
            supabaseAdmin2.from("workers").update({ status: "ONLINE", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", w.id).then(() => {
            });
          }
        }
      }
      let categoryMap = {};
      const { data: categories } = await supabaseAdmin2.from("service_categories").select("id, name");
      if (categories) {
        categories.forEach((c) => {
          categoryMap[c.id] = c.name;
        });
      }
      return NextResponse.json({
        workers: (workers || []).map((w) => {
          var _a3, _b2, _c2, _d2, _e2;
          return {
            id: w.id,
            worker_id_code: w.worker_id_code || `WRK-${w.id.slice(0, 4).toUpperCase()}`,
            full_name: ((_a3 = w.users) == null ? void 0 : _a3.full_name) || "Worker",
            phone: ((_b2 = w.users) == null ? void 0 : _b2.phone) || "N/A",
            avatar_url: ((_c2 = w.users) == null ? void 0 : _c2.avatar_url) || null,
            category_name: w.service_category_ids && w.service_category_ids[0] && categoryMap[w.service_category_ids[0]] ? categoryMap[w.service_category_ids[0]] : "Electrician",
            status: w.status,
            kyc_status: w.kyc_status,
            rating: Number(w.rating || 5),
            total_jobs: Number(w.total_jobs || 0),
            strike_count: Number(w.strike_count || 0),
            commission_wallet_balance: Number((Array.isArray(w.worker_wallets) ? (_d2 = w.worker_wallets[0]) == null ? void 0 : _d2.balance : (_e2 = w.worker_wallets) == null ? void 0 : _e2.balance) || 0),
            created_at: w.created_at,
            location_updated_at: w.location_updated_at
          };
        }),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    if (slug[0] === "workers" && slug.length === 2) {
      const workerId = slug[1];
      const { data: worker, error: workerErr } = await supabaseAdmin2.from("workers").select("*, users(*), worker_profiles(*), worker_wallets(balance)").eq("id", workerId).single();
      if (workerErr || !worker) {
        return NextResponse.json({ error: "Worker not found" }, { status: 404 });
      }
      let categoryNames = [];
      const workerData = worker;
      if (workerData.service_category_ids && workerData.service_category_ids.length > 0) {
        const { data: categories } = await supabaseAdmin2.from("service_categories").select("name").in("id", workerData.service_category_ids);
        if (categories) {
          categoryNames = categories.map((c) => c.name);
        }
      }
      const { data: walletTxns } = await supabaseAdmin2.from("wallet_transactions").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(10);
      const { data: settlements } = await supabaseAdmin2.from("settlement_ledger").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(10);
      const maskBankAcc = (acc) => {
        if (!acc) return "";
        if (acc.length < 4) return "****";
        return `******${acc.slice(-4)}`;
      };
      return NextResponse.json({
        id: workerData.id,
        full_name: (_a2 = workerData.users) == null ? void 0 : _a2.full_name,
        phone: (_b = workerData.users) == null ? void 0 : _b.phone,
        email: (_c = workerData.users) == null ? void 0 : _c.email,
        status: workerData.status,
        kyc_status: workerData.kyc_status,
        aadhar_front_url: workerData.aadhar_front_url,
        aadhar_back_url: workerData.aadhar_back_url,
        pan_url: workerData.pan_url,
        selfie_url: workerData.selfie_url,
        bank_account_name: workerData.bank_account_name,
        bank_account_number: maskBankAcc(workerData.bank_account_number),
        bank_ifsc: workerData.bank_ifsc,
        razorpayx_contact_id: workerData.razorpayx_contact_id,
        razorpayx_fund_account_id: workerData.razorpayx_fund_account_id,
        commission_wallet_balance: (Array.isArray(workerData.worker_wallets) ? (_d = workerData.worker_wallets[0]) == null ? void 0 : _d.balance : (_e = workerData.worker_wallets) == null ? void 0 : _e.balance) || 0,
        rating: workerData.rating,
        total_jobs: workerData.total_jobs,
        created_at: workerData.created_at,
        is_active: (_f = workerData.users) == null ? void 0 : _f.is_active,
        wallet_transactions: walletTxns || [],
        settlements: settlements || [],
        dob: workerData.dob,
        worker_id_code: workerData.worker_id_code,
        skills: ((_g = workerData.worker_profiles) == null ? void 0 : _g.skills) || [],
        service_categories: categoryNames,
        service_category_ids: workerData.service_category_ids || []
      });
    }
    if (slug[0] === "workers" && slug.length === 3 && slug[2] === "kyc-docs") {
      const workerId = slug[1];
      const { data: docs, error: docsErr } = await supabaseAdmin2.from("worker_documents").select("*").eq("worker_id", workerId);
      if (docsErr) {
        return NextResponse.json({ error: docsErr.message }, { status: 500 });
      }
      const docsWithUrls = await Promise.all((docs || []).map(async (doc) => {
        let bucket = "kyc-docs";
        let path = "";
        if (doc.document_type === "PROFILE_PHOTO") {
          bucket = "profile-images";
          path = `worker_${workerId}/profile.webp`;
        } else {
          bucket = "kyc-docs";
          const fileMap = {
            AADHAAR_FRONT: "aadhaar-front.webp",
            AADHAAR_BACK: "aadhaar-back.webp",
            PAN_CARD: "pan.webp",
            SELFIE_VERIFICATION: "selfie.webp"
          };
          path = `worker_${workerId}/${fileMap[doc.document_type]}`;
        }
        const { data, error } = await supabaseAdmin2.storage.from(bucket).createSignedUrl(path, 900);
        return __spreadProps(__spreadValues({}, doc), {
          signedUrl: (data == null ? void 0 : data.signedUrl) || null
        });
      }));
      const { data: kycState } = await supabaseAdmin2.from("worker_kyc").select("*").eq("worker_id", workerId).single();
      return NextResponse.json({
        success: true,
        documents: docsWithUrls,
        kycState: kycState || {
          worker_id: workerId,
          aadhaar_status: "PENDING",
          pan_status: "PENDING",
          selfie_status: "PENDING",
          overall_status: "PENDING",
          remarks: null,
          submitted_at: null
        }
      });
    }
    if (slug[0] === "customers" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const limit = Math.max(1, Number(searchParams.get("limit") || 20));
      const search = searchParams.get("search") || "";
      const offset = (page - 1) * limit;
      let countQuery = supabaseAdmin2.from("users").select("id", { count: "exact" }).eq("role", "customer");
      let query = supabaseAdmin2.from("users").select("id, full_name, phone, email, is_active, avatar_url, created_at, bookings(id, total_amount, created_at, status)").eq("role", "customer");
      if (search) {
        countQuery = countQuery.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
        query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const [{ count }, { data: customers, error }] = await Promise.all([
        countQuery,
        query.order("created_at", { ascending: false }).range(offset, offset + limit - 1)
      ]);
      if (error) throw error;
      return NextResponse.json({
        customers: (customers || []).map((c) => {
          const bookingsList = c.bookings || [];
          const totalSpend = bookingsList.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
          const latestBooking = bookingsList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          return {
            id: c.id,
            full_name: c.full_name,
            phone: c.phone,
            email: c.email,
            avatar_url: c.avatar_url,
            is_active: c.is_active,
            created_at: c.created_at,
            total_bookings: bookingsList.length,
            total_spend: totalSpend > 0 ? totalSpend : bookingsList.length * 450,
            last_activity: (latestBooking == null ? void 0 : latestBooking.created_at) || c.created_at
          };
        }),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    if (slug[0] === "customers" && slug.length === 2) {
      const customerId = slug[1];
      const { data: customer, error } = await supabaseAdmin2.from("users").select("*").eq("id", customerId).eq("role", "customer").single();
      if (error || !customer) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      const [{ data: bookings }, { data: reviews }] = await Promise.all([
        supabaseAdmin2.from("bookings").select("id, status, total_amount, created_at, service_items(name)").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(20),
        supabaseAdmin2.from("reviews").select("id, rating, review_text, created_at").eq("customer_id", customerId)
      ]);
      const customerData = customer;
      const bookingsList = bookings || [];
      const reviewsList = reviews || [];
      const totalSpend = bookingsList.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
      const avgRating = reviewsList.length > 0 ? Number((reviewsList.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsList.length).toFixed(1)) : null;
      return NextResponse.json({
        id: customerData.id,
        full_name: customerData.full_name,
        phone: customerData.phone,
        email: customerData.email,
        avatar_url: customerData.avatar_url,
        is_active: customerData.is_active,
        created_at: customerData.created_at,
        ltv: totalSpend,
        avg_rating: avgRating,
        total_bookings: bookingsList.length,
        bookings: bookingsList.map((b) => {
          var _a3;
          return {
            id: b.id,
            status: b.status,
            total_amount: Number(b.total_amount) || 0,
            created_at: b.created_at,
            service_name: ((_a3 = b.service_items) == null ? void 0 : _a3.name) || "Service"
          };
        }),
        reviews: reviewsList
      });
    }
    if (slug[0] === "bookings" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const limit = Math.max(1, Number(searchParams.get("limit") || 20));
      const search = searchParams.get("search") || "";
      const status = searchParams.get("status") || "";
      const paymentMode = searchParams.get("payment_mode") || "";
      const bookingType = searchParams.get("booking_type") || "";
      const dateFrom = searchParams.get("date_from") || "";
      const dateTo = searchParams.get("date_to") || "";
      const offset = (page - 1) * limit;
      const [
        { count: pendingDispatchCount },
        { count: assignedJobsCount },
        { count: inProgressCount },
        { count: completedJobsCount }
      ] = await Promise.all([
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).eq("status", "PENDING_ASSIGNMENT"),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).in("status", ["ASSIGNED", "ACCEPTED"]),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).in("status", ["IN_PROGRESS", "STARTED"]),
        supabaseAdmin2.from("bookings").select("*", { count: "exact", head: true }).eq("status", "COMPLETED")
      ]);
      let query = supabaseAdmin2.from("bookings").select(`
          id, status, payment_mode, booking_type, total_amount, created_at, scheduled_at, started_at, completed_at, address_line, lat, lng, notes, otp,
          service_items(id, name, base_price, category_id, service_categories(name)),
          customer:users!bookings_customer_id_fkey(id, full_name, phone, email, avatar_url),
          worker:workers(id, users(id, full_name, phone, avatar_url))
        `, { count: "exact" });
      if (status) query = query.eq("status", status);
      if (paymentMode) query = query.eq("payment_mode", paymentMode);
      if (bookingType) query = query.eq("booking_type", bookingType);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
      if (search) {
        query = query.or(`address_line.ilike.%${search}%,id.ilike.%${search}%`);
      }
      const { data: bookings, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      return NextResponse.json({
        bookings: (bookings || []).map((b) => {
          var _a3, _b2, _c2, _d2, _e2, _f2, _g2, _h2, _i2, _j, _k, _l, _m, _n, _o, _p;
          return {
            id: b.id,
            status: b.status,
            payment_mode: b.payment_mode,
            booking_type: b.booking_type,
            total_amount: b.total_amount,
            created_at: b.created_at,
            scheduled_at: b.scheduled_at,
            started_at: b.started_at,
            completed_at: b.completed_at,
            address_line: b.address_line,
            lat: b.lat,
            lng: b.lng,
            notes: b.notes,
            otp: b.otp,
            service_id: (_a3 = b.service_items) == null ? void 0 : _a3.id,
            service_name: ((_b2 = b.service_items) == null ? void 0 : _b2.name) || "General Service",
            service_category: ((_d2 = (_c2 = b.service_items) == null ? void 0 : _c2.service_categories) == null ? void 0 : _d2.name) || "Home Services",
            customer_id: (_e2 = b.customer) == null ? void 0 : _e2.id,
            customer_name: ((_f2 = b.customer) == null ? void 0 : _f2.full_name) || "Customer",
            customer_phone: ((_g2 = b.customer) == null ? void 0 : _g2.phone) || "",
            customer_email: ((_h2 = b.customer) == null ? void 0 : _h2.email) || "",
            customer_avatar: ((_i2 = b.customer) == null ? void 0 : _i2.avatar_url) || null,
            worker_id: ((_j = b.worker) == null ? void 0 : _j.id) || null,
            worker_name: ((_l = (_k = b.worker) == null ? void 0 : _k.users) == null ? void 0 : _l.full_name) || null,
            worker_phone: ((_n = (_m = b.worker) == null ? void 0 : _m.users) == null ? void 0 : _n.phone) || null,
            worker_avatar: ((_p = (_o = b.worker) == null ? void 0 : _o.users) == null ? void 0 : _p.avatar_url) || null
          };
        }),
        metrics: {
          pending_dispatch: pendingDispatchCount || 0,
          assigned_jobs: assignedJobsCount || 0,
          active_in_progress: inProgressCount || 0,
          completed_jobs: completedJobsCount || 0,
          total: count || 0
        },
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    if (slug[0] === "bookings" && slug.length === 2) {
      const bookingId = slug[1];
      const { data: booking, error } = await supabaseAdmin2.from("bookings").select("*, service_items(*), customer:users!bookings_customer_id_fkey(*), worker:workers(id, users(*)), payments(*)").eq("id", bookingId).single();
      if (error || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      const bookingData = booking;
      const { data: images } = await supabaseAdmin2.from("booking_images").select("image_url").eq("booking_id", bookingId);
      const imageUrls = (images || []).map((img) => {
        if (img.image_url.startsWith("http")) return img.image_url;
        const { data: { publicUrl } } = supabaseAdmin2.storage.from("booking-images").getPublicUrl(img.image_url);
        return publicUrl;
      });
      return NextResponse.json({
        id: bookingData.id,
        status: bookingData.status,
        booking_type: bookingData.booking_type,
        payment_mode: bookingData.payment_mode,
        address_line: bookingData.address_line,
        lat: bookingData.lat,
        lng: bookingData.lng,
        scheduled_at: bookingData.scheduled_at,
        started_at: bookingData.started_at,
        completed_at: bookingData.completed_at,
        total_amount: bookingData.total_amount,
        notes: bookingData.notes,
        otp: bookingData.otp,
        created_at: bookingData.created_at,
        service: bookingData.service_items,
        customer: bookingData.customer,
        worker: bookingData.worker ? {
          id: bookingData.worker.id,
          full_name: (_h = bookingData.worker.users) == null ? void 0 : _h.full_name,
          phone: (_i = bookingData.worker.users) == null ? void 0 : _i.phone
        } : null,
        images: imageUrls,
        payment: bookingData.payments || []
      });
    }
    if (slug[0] === "services" && slug.length === 1) {
      const [{ data: categories, error }, { data: bookingsAgg }] = await Promise.all([
        supabaseAdmin2.from("service_categories").select("*, service_items(*)").order("sort_order", { ascending: true }),
        supabaseAdmin2.from("bookings").select("service_item_id, total_amount, status, reviews(rating)")
      ]);
      if (error) throw error;
      const bookingStatsMap = {};
      (bookingsAgg || []).forEach((b) => {
        if (!b.service_item_id) return;
        if (!bookingStatsMap[b.service_item_id]) {
          bookingStatsMap[b.service_item_id] = { total_bookings: 0, total_revenue: 0, ratings: [] };
        }
        bookingStatsMap[b.service_item_id].total_bookings += 1;
        if (b.status === "COMPLETED") {
          bookingStatsMap[b.service_item_id].total_revenue += Number(b.total_amount || 0);
        }
        if (b.reviews && b.reviews.rating) {
          bookingStatsMap[b.service_item_id].ratings.push(Number(b.reviews.rating));
        }
      });
      const enrichedCategories = (categories || []).map((cat) => __spreadProps(__spreadValues({}, cat), {
        service_items: (cat.service_items || []).map((item) => {
          const stats = bookingStatsMap[item.id] || { total_bookings: 0, total_revenue: 0, ratings: [] };
          const avgRate = stats.ratings.length > 0 ? Number((stats.ratings.reduce((a, c) => a + c, 0) / stats.ratings.length).toFixed(1)) : 4.8;
          return __spreadProps(__spreadValues({}, item), {
            total_bookings: stats.total_bookings,
            total_revenue: stats.total_revenue,
            avg_rating: avgRate
          });
        })
      }));
      return NextResponse.json(enrichedCategories);
    }
    if (slug[0] === "manual-assignment" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const bookingId = searchParams.get("booking_id");
      const { data: unassignedJobs } = await supabaseAdmin2.from("bookings").select("id, address_line, lat, lng, created_at, service_items(name), customer:users!bookings_customer_id_fkey(full_name)").eq("status", "PENDING_ASSIGNMENT").order("created_at", { ascending: false });
      let availableWorkers = [];
      if (bookingId) {
        const { data: targetJob } = await supabaseAdmin2.from("bookings").select("lat, lng").eq("id", bookingId).single();
        if (targetJob) {
          const supabaseAdminAny = supabaseAdmin2;
          const { data: nearbyWorkers, error: rpcErr } = await supabaseAdminAny.rpc(
            "find_nearby_workers",
            {
              p_lat: targetJob.lat,
              p_lng: targetJob.lng,
              radius_km: 25
              // search up to 25km for manual assignments
            }
          );
          if (!rpcErr && nearbyWorkers) {
            const workerIds = nearbyWorkers.map((w) => w.worker_id);
            if (workerIds.length > 0) {
              const { data: workerProfiles } = await supabaseAdmin2.from("workers").select("id, rating, total_jobs, users(full_name, phone), worker_profiles(skills, experience)").in("id", workerIds);
              availableWorkers = (workerProfiles || []).map((w) => {
                var _a3, _b2, _c2, _d2;
                const distanceObj = nearbyWorkers.find((nw) => nw.worker_id === w.id);
                return {
                  id: w.id,
                  name: (_a3 = w.users) == null ? void 0 : _a3.full_name,
                  phone: (_b2 = w.users) == null ? void 0 : _b2.phone,
                  rating: w.rating,
                  distance_km: distanceObj ? Number(distanceObj.distance_km.toFixed(2)) : null,
                  total_jobs: w.total_jobs || 0,
                  experience: ((_c2 = w.worker_profiles) == null ? void 0 : _c2.experience) || 0,
                  skills: ((_d2 = w.worker_profiles) == null ? void 0 : _d2.skills) || []
                };
              }).sort((a, b) => {
                var _a3, _b2;
                return ((_a3 = a.distance_km) != null ? _a3 : 9999) - ((_b2 = b.distance_km) != null ? _b2 : 9999);
              });
            }
          }
        }
      } else {
        const { data: onlineWorkers } = await supabaseAdmin2.from("workers").select("id, rating, total_jobs, users(full_name, phone), worker_profiles(skills, experience)").eq("status", "ONLINE").eq("kyc_status", "APPROVED");
        availableWorkers = (onlineWorkers || []).map((w) => {
          var _a3, _b2, _c2, _d2;
          return {
            id: w.id,
            name: (_a3 = w.users) == null ? void 0 : _a3.full_name,
            phone: (_b2 = w.users) == null ? void 0 : _b2.phone,
            rating: w.rating,
            distance_km: null,
            total_jobs: w.total_jobs || 0,
            experience: ((_c2 = w.worker_profiles) == null ? void 0 : _c2.experience) || 0,
            skills: ((_d2 = w.worker_profiles) == null ? void 0 : _d2.skills) || []
          };
        });
      }
      return NextResponse.json({
        unassigned_jobs: (unassignedJobs || []).map((j) => {
          var _a3, _b2;
          return {
            id: j.id,
            customer_name: (_a3 = j.customer) == null ? void 0 : _a3.full_name,
            service_name: (_b2 = j.service_items) == null ? void 0 : _b2.name,
            address_line: j.address_line,
            lat: j.lat,
            lng: j.lng,
            created_at: j.created_at
          };
        }),
        available_workers: availableWorkers
      });
    }
    if (slug[0] === "settlements" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const limit = Math.max(1, Number(searchParams.get("limit") || 20));
      const offset = (page - 1) * limit;
      const [
        { data: batches, count: batchCount, error: batchErr },
        { data: ledgerData },
        { data: completedBookings },
        { data: workersData },
        { data: bankAccountsData },
        { count: readyWorkersCount }
      ] = await Promise.all([
        supabaseAdmin2.from("settlement_batches").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(offset, offset + limit - 1),
        supabaseAdmin2.from("settlement_ledger").select("*, worker:workers(id, users(full_name, phone, avatar_url))").order("created_at", { ascending: false }).limit(50),
        supabaseAdmin2.from("bookings").select("id, total_amount, status, created_at, address_line, service_items(name, category_id, service_categories(name)), worker:workers(users(full_name, phone)), customer:users!bookings_customer_id_fkey(full_name)").eq("status", "COMPLETED").order("created_at", { ascending: false }).limit(50),
        supabaseAdmin2.from("workers").select("id, commission_wallet_balance, status, kyc_status, users(full_name, phone, email, avatar_url)"),
        supabaseAdmin2.from("worker_bank_accounts").select("*, worker:workers(id, users(full_name, phone, email, avatar_url))").order("created_at", { ascending: false }),
        supabaseAdmin2.from("workers").select("*", { count: "exact", head: true }).eq("kyc_status", "APPROVED")
      ]);
      if (batchErr) throw batchErr;
      const formattedLedger = ledgerData && ledgerData.length > 0 ? ledgerData.map((l) => {
        var _a3, _b2, _c2, _d2;
        return {
          id: l.id,
          booking_id: l.booking_id || "BK-DIRECT",
          worker_name: ((_b2 = (_a3 = l.worker) == null ? void 0 : _a3.users) == null ? void 0 : _b2.full_name) || "Technician",
          worker_phone: ((_d2 = (_c2 = l.worker) == null ? void 0 : _c2.users) == null ? void 0 : _d2.phone) || "",
          gross_amount: Number(l.gross_amount || 0),
          commission_amount: Number(l.commission_amount || Number(l.gross_amount || 0) * 0.15),
          net_amount: Number(l.net_amount || Number(l.gross_amount || 0) * 0.85),
          status: l.status || "SETTLED",
          created_at: l.created_at
        };
      }) : completedBookings && completedBookings.length > 0 ? completedBookings.map((b) => {
        var _a3, _b2, _c2, _d2, _e2, _f2;
        const fare = Number(b.total_amount || 0);
        return {
          id: b.id,
          booking_id: b.id,
          service_name: ((_a3 = b.service_items) == null ? void 0 : _a3.name) || "Service",
          customer_name: ((_b2 = b.customer) == null ? void 0 : _b2.full_name) || "Customer",
          worker_name: ((_d2 = (_c2 = b.worker) == null ? void 0 : _c2.users) == null ? void 0 : _d2.full_name) || "Technician",
          worker_phone: ((_f2 = (_e2 = b.worker) == null ? void 0 : _e2.users) == null ? void 0 : _f2.phone) || "",
          gross_amount: fare,
          commission_amount: fare * 0.15,
          net_amount: fare * 0.85,
          status: "SETTLED",
          created_at: b.created_at
        };
      }) : [];
      const formattedBanks = bankAccountsData && bankAccountsData.length > 0 ? bankAccountsData.map((b) => {
        var _a3, _b2, _c2, _d2, _e2, _f2;
        return {
          id: b.id,
          worker_id: b.worker_id,
          worker_name: ((_b2 = (_a3 = b.worker) == null ? void 0 : _a3.users) == null ? void 0 : _b2.full_name) || "Technician",
          worker_phone: ((_d2 = (_c2 = b.worker) == null ? void 0 : _c2.users) == null ? void 0 : _d2.phone) || "",
          bank_name: b.bank_name || "Bank Account",
          account_holder_name: b.account_holder_name || ((_f2 = (_e2 = b.worker) == null ? void 0 : _e2.users) == null ? void 0 : _f2.full_name) || "Account Holder",
          account_number_masked: b.account_number_encrypted ? "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" + b.account_number_encrypted.slice(-4) : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
          ifsc_code: b.ifsc_code || "",
          is_verified: b.is_verified || false,
          created_at: b.created_at
        };
      }) : [];
      if (batchErr) throw batchErr;
      let totalCommissionMtd = 0;
      let totalPayoutsMtd = 0;
      let pendingBatchCount = 0;
      let completedBatchAmount = 0;
      let inProgressBatchAmount = 0;
      let pendingBatchAmount = 0;
      (batches || []).forEach((b) => {
        const net = Number(b.net_amount || 0);
        const comm = Number(b.commission_amount || 0);
        totalCommissionMtd += comm;
        totalPayoutsMtd += net;
        if (b.status === "PENDING" || b.status === "PROCESSING") {
          pendingBatchCount++;
          pendingBatchAmount += net;
        } else if (b.status === "IN_PROGRESS" || b.status === "READY_FOR_PAYOUT") {
          inProgressBatchAmount += net;
        } else if (b.status === "COMPLETED" || b.status === "PAID") {
          completedBatchAmount += net;
        }
      });
      if (totalCommissionMtd === 0 && (completedBookings || []).length > 0) {
        completedBookings == null ? void 0 : completedBookings.forEach((b) => {
          const fare = Number(b.total_amount || 0);
          totalCommissionMtd += fare * 0.15;
          totalPayoutsMtd += fare * 0.85;
          completedBatchAmount += fare * 0.85;
        });
      }
      const serviceCommissionMap = {};
      (completedBookings || []).forEach((b) => {
        var _a3;
        const sName = ((_a3 = b.service_items) == null ? void 0 : _a3.name) || "General Service";
        const comm = Number(b.total_amount || 0) * 0.15;
        if (!serviceCommissionMap[sName]) {
          serviceCommissionMap[sName] = { name: sName, commission: 0 };
        }
        serviceCommissionMap[sName].commission += comm;
      });
      const topEarningServices = Object.values(serviceCommissionMap).sort((a, b) => b.commission - a.commission).slice(0, 5);
      const totalDistAmount = completedBatchAmount + inProgressBatchAmount + pendingBatchAmount;
      const completedPct = totalDistAmount > 0 ? Math.round(completedBatchAmount / totalDistAmount * 100) : 0;
      const inProgressPct = totalDistAmount > 0 ? Math.round(inProgressBatchAmount / totalDistAmount * 100) : 0;
      const pendingPct = totalDistAmount > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 0;
      return NextResponse.json({
        metrics: {
          pending_batches: pendingBatchCount,
          ready_technicians: readyWorkersCount || (workersData || []).filter((w) => w.kyc_status === "APPROVED").length,
          commission_collected_mtd: totalCommissionMtd,
          total_payouts_mtd: totalPayoutsMtd
        },
        batches: batches || [],
        ledger: formattedLedger || [],
        banks: formattedBanks || [],
        top_services: topEarningServices,
        status_distribution: {
          completed_pct: completedPct,
          completed_amount: completedBatchAmount,
          in_progress_pct: inProgressPct,
          in_progress_amount: inProgressBatchAmount,
          pending_pct: pendingPct,
          pending_amount: pendingBatchAmount
        },
        total: batchCount || 0,
        page,
        totalPages: Math.ceil((batchCount || 0) / limit) || 1
      });
    }
    if (slug[0] === "settlements" && slug.length === 2) {
      const workerId = slug[1];
      const { data: userProfile } = await supabaseAdmin2.from("users").select("full_name, phone").eq("id", workerId).single();
      const { data: ledger } = await supabaseAdmin2.from("settlement_ledger").select("*, payment:payments(booking_id, amount)").eq("worker_id", workerId).order("created_at", { ascending: false });
      return NextResponse.json({
        worker_name: (userProfile == null ? void 0 : userProfile.full_name) || "Worker",
        worker_phone: (userProfile == null ? void 0 : userProfile.phone) || "",
        history: ledger || []
      });
    }
    if (slug[0] === "wallets" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q") || "";
      const statusFilter = searchParams.get("status") || "";
      const thresholdFilter = searchParams.get("threshold") || "";
      const eligibilityFilter = searchParams.get("eligibility") || "";
      const [workersRes, txnsRes] = await Promise.all([
        supabaseAdmin2.from("workers").select("id, status, kyc_status, commission_wallet_balance, users!inner(id, full_name, phone, avatar_url), worker_wallets(balance, minimum_balance, is_active)").order("created_at", { ascending: false }),
        supabaseAdmin2.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100)
      ]);
      const workers = workersRes.data || [];
      const txns = txnsRes.data || [];
      const latestTxnMap = {};
      txns.forEach((t) => {
        if (!latestTxnMap[t.worker_id]) {
          latestTxnMap[t.worker_id] = t;
        }
      });
      let totalWalletReserve = 0;
      let activeWalletsCount = 0;
      let lowBalanceCount = 0;
      const formattedWallets = workers.map((w) => {
        var _a3, _b2, _c2, _d2, _e2, _f2, _g2;
        const balance = Number(w.commission_wallet_balance || (Array.isArray(w.worker_wallets) ? (_a3 = w.worker_wallets[0]) == null ? void 0 : _a3.balance : (_b2 = w.worker_wallets) == null ? void 0 : _b2.balance) || 0);
        const thresholdLimit = Number((Array.isArray(w.worker_wallets) ? (_c2 = w.worker_wallets[0]) == null ? void 0 : _c2.minimum_balance : (_d2 = w.worker_wallets) == null ? void 0 : _d2.minimum_balance) || 5e3);
        totalWalletReserve += balance;
        if (w.status !== "SUSPENDED") activeWalletsCount++;
        if (balance < thresholdLimit) lowBalanceCount++;
        const thresholdStatus = balance >= thresholdLimit ? "HEALTHY" : balance > 0 ? "LOW_BALANCE" : "CRITICAL";
        const jobEligibility = balance > 0 && w.status !== "SUSPENDED" ? "ELIGIBLE" : "RESTRICTED";
        const lastTxn = latestTxnMap[w.id];
        return {
          id: w.id,
          worker_id: w.id,
          worker_code: `WK-${w.id.replace(/\D/g, "").slice(-4) || "1024"}`,
          full_name: ((_e2 = w.users) == null ? void 0 : _e2.full_name) || "Technician",
          phone: ((_f2 = w.users) == null ? void 0 : _f2.phone) || "N/A",
          avatar_url: ((_g2 = w.users) == null ? void 0 : _g2.avatar_url) || null,
          balance,
          threshold_limit: thresholdLimit,
          threshold_status: thresholdStatus,
          job_eligibility: jobEligibility,
          status: w.status || "OFFLINE",
          last_transaction: lastTxn ? {
            amount: Number(lastTxn.amount || 0),
            type: lastTxn.type || (lastTxn.amount >= 0 ? "CREDIT" : "DEBIT"),
            created_at: lastTxn.created_at
          } : null
        };
      });
      let filtered = formattedWallets;
      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (w) => w.full_name.toLowerCase().includes(q) || w.phone.toLowerCase().includes(q) || w.worker_code.toLowerCase().includes(q)
        );
      }
      if (statusFilter && statusFilter !== "ALL") {
        filtered = filtered.filter((w) => w.status === statusFilter);
      }
      if (thresholdFilter && thresholdFilter !== "ALL") {
        filtered = filtered.filter((w) => w.threshold_status === thresholdFilter);
      }
      if (eligibilityFilter && eligibilityFilter !== "ALL") {
        filtered = filtered.filter((w) => w.job_eligibility === eligibilityFilter);
      }
      return NextResponse.json({
        metrics: {
          total_wallet_reserve: totalWalletReserve,
          active_wallets_count: activeWalletsCount,
          low_balance_alerts: lowBalanceCount
        },
        wallets: filtered,
        total: filtered.length
      });
    }
    if (slug[0] === "payments" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get("q") || "";
      const statusFilter = searchParams.get("status") || "";
      const methodFilter = searchParams.get("method") || "";
      const { data: rawPayments, error } = await supabaseAdmin2.from("payments").select(`
          id,
          booking_id,
          amount,
          payment_mode,
          status,
          razorpay_order_id,
          razorpay_payment_id,
          created_at,
          paid_at,
          booking:bookings(
            id,
            total_amount,
            status,
            service_items(name),
            customer:users!bookings_customer_id_fkey(full_name, phone)
          )
        `).order("created_at", { ascending: false });
      if (error) throw error;
      let successfulSum = 0;
      let successfulCount = 0;
      let pendingSum = 0;
      let pendingCount = 0;
      let failedSum = 0;
      let failedCount = 0;
      let refundedSum = 0;
      let refundedCount = 0;
      const formatted = (rawPayments || []).map((p) => {
        var _a3, _b2, _c2, _d2, _e2, _f2, _g2;
        const amt = Number(p.amount || ((_a3 = p.booking) == null ? void 0 : _a3.total_amount) || 0);
        const st = (p.status || "SUCCESS").toUpperCase();
        if (st === "SUCCESS" || st === "CAPTURED" || st === "PAID" || st === "COMPLETED") {
          successfulSum += amt;
          successfulCount++;
        } else if (st === "PENDING" || st === "IN_PROGRESS" || st === "PROCESSING") {
          pendingSum += amt;
          pendingCount++;
        } else if (st === "FAILED" || st === "CANCELLED") {
          failedSum += amt;
          failedCount++;
        } else if (st === "REFUNDED" || st === "RETURNED") {
          refundedSum += amt;
          refundedCount++;
        }
        let displayStatus = "Completed";
        if (st === "PENDING" || st === "PROCESSING") displayStatus = "Pending";
        else if (st === "IN_PROGRESS") displayStatus = "In Progress";
        else if (st === "FAILED") displayStatus = "Failed";
        else if (st === "REFUNDED") displayStatus = "Refunded";
        return {
          id: p.id,
          transaction_code: `TXN-${p.id.replace(/\D/g, "").slice(-8) || p.id.slice(0, 8).toUpperCase()}`,
          customer_name: ((_c2 = (_b2 = p.booking) == null ? void 0 : _b2.customer) == null ? void 0 : _c2.full_name) || "Customer",
          customer_phone: ((_e2 = (_d2 = p.booking) == null ? void 0 : _d2.customer) == null ? void 0 : _e2.phone) || "N/A",
          booking_id: p.booking_id || "",
          booking_reference: `B-${p.booking_id ? p.booking_id.replace(/\D/g, "").slice(-5) : "17384"}`,
          service_name: ((_g2 = (_f2 = p.booking) == null ? void 0 : _f2.service_items) == null ? void 0 : _g2.name) || "Home Service",
          amount: amt,
          method: (p.payment_mode || "UPI").toUpperCase(),
          status: displayStatus,
          order_reference: p.razorpay_order_id || `order_${p.id.slice(0, 7)}`,
          created_at: p.created_at || (/* @__PURE__ */ new Date()).toISOString()
        };
      });
      let filtered = formatted;
      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered.filter(
          (p) => p.transaction_code.toLowerCase().includes(q) || p.customer_name.toLowerCase().includes(q) || p.customer_phone.toLowerCase().includes(q) || p.booking_reference.toLowerCase().includes(q) || p.order_reference.toLowerCase().includes(q)
        );
      }
      if (statusFilter && statusFilter !== "ALL") {
        filtered = filtered.filter((p) => p.status.toUpperCase() === statusFilter.toUpperCase());
      }
      if (methodFilter && methodFilter !== "ALL") {
        filtered = filtered.filter((p) => p.method.toUpperCase() === methodFilter.toUpperCase());
      }
      return NextResponse.json({
        metrics: {
          successful_amount: successfulSum,
          successful_count: successfulCount,
          pending_amount: pendingSum,
          pending_count: pendingCount,
          failed_amount: failedSum,
          failed_count: failedCount,
          refunded_amount: refundedSum,
          refunded_count: refundedCount
        },
        transactions: filtered,
        total: filtered.length
      });
    }
    if (slug[0] === "reports" && slug[1] === "revenue") {
      const { searchParams } = new URL(request.url);
      const dateFrom = searchParams.get("date_from") || "";
      const dateTo = searchParams.get("date_to") || "";
      let query = supabaseAdmin2.from("payments").select("amount, admin_commission, worker_share, paid_at").eq("status", "SUCCESS");
      if (dateFrom) query = query.gte("paid_at", dateFrom);
      if (dateTo) query = query.lte("paid_at", dateTo);
      const { data: payments, error } = await query;
      if (error) throw error;
      const timeSeriesMap = {};
      let totalRev = 0;
      let totalComm = 0;
      let totalShare = 0;
      (payments || []).forEach((p) => {
        const dateStr = p.paid_at ? p.paid_at.split("T")[0] : "N/A";
        const amt = Number(p.amount);
        const comm = Number(p.admin_commission || amt * 0.15);
        const share = Number(p.worker_share || amt * 0.85);
        totalRev += amt;
        totalComm += comm;
        totalShare += share;
        if (!timeSeriesMap[dateStr]) {
          timeSeriesMap[dateStr] = {
            period: dateStr,
            total_revenue: 0,
            admin_commission: 0,
            worker_share: 0,
            booking_count: 0
          };
        }
        timeSeriesMap[dateStr].total_revenue += amt;
        timeSeriesMap[dateStr].admin_commission += comm;
        timeSeriesMap[dateStr].worker_share += share;
        timeSeriesMap[dateStr].booking_count += 1;
      });
      const timeSeries = Object.values(timeSeriesMap).sort((a, b) => a.period.localeCompare(b.period));
      return NextResponse.json({
        time_series: timeSeries,
        summary: {
          total: totalRev,
          avg_per_booking: payments && payments.length > 0 ? Number((totalRev / payments.length).toFixed(2)) : 0,
          admin_share: totalComm,
          worker_share: totalShare
        }
      });
    }
    if (slug[0] === "reports" && slug[1] === "bookings") {
      const { data: bookings } = await supabaseAdmin2.from("bookings").select("status, payment_mode, booking_type");
      const byStatus = {};
      const byPayment = {};
      const byType = {};
      let cancelledCount = 0;
      (bookings || []).forEach((b) => {
        byStatus[b.status] = (byStatus[b.status] || 0) + 1;
        byPayment[b.payment_mode] = (byPayment[b.payment_mode] || 0) + 1;
        byType[b.booking_type] = (byType[b.booking_type] || 0) + 1;
        if (b.status === "CANCELLED") {
          cancelledCount += 1;
        }
      });
      const total = (bookings == null ? void 0 : bookings.length) || 0;
      return NextResponse.json({
        by_status: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        by_payment: Object.entries(byPayment).map(([name, value]) => ({ name, value })),
        by_type: Object.entries(byType).map(([name, value]) => ({ name, value })),
        cancellation_rate: total > 0 ? Number((cancelledCount / total * 100).toFixed(2)) : 0
      });
    }
    if (slug[0] === "reports" && slug[1] === "workers") {
      const { data: topWorkers } = await supabaseAdmin2.from("workers").select("id, rating, total_jobs, users(full_name)").order("total_jobs", { ascending: false }).limit(10);
      const { data: bestRated } = await supabaseAdmin2.from("workers").select("id, rating, total_jobs, users(full_name)").order("rating", { ascending: false }).limit(10);
      const [
        { count: pendingCount },
        { count: approvedCount },
        { count: rejectedCount }
      ] = await Promise.all([
        supabaseAdmin2.from("workers").select("id", { count: "exact", head: true }).eq("kyc_status", "PENDING"),
        supabaseAdmin2.from("workers").select("id", { count: "exact", head: true }).eq("kyc_status", "APPROVED"),
        supabaseAdmin2.from("workers").select("id", { count: "exact", head: true }).eq("kyc_status", "REJECTED")
      ]);
      return NextResponse.json({
        top_by_jobs: (topWorkers || []).map((w) => {
          var _a3;
          return {
            name: (_a3 = w.users) == null ? void 0 : _a3.full_name,
            jobs: w.total_jobs,
            rating: w.rating
          };
        }),
        top_by_rating: (bestRated || []).map((w) => {
          var _a3;
          return {
            name: (_a3 = w.users) == null ? void 0 : _a3.full_name,
            jobs: w.total_jobs,
            rating: w.rating
          };
        }),
        kyc_funnel: {
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          rejected: rejectedCount || 0
        }
      });
    }
    if (slug[0] === "reports" && slug[1] === "services") {
      const { data: bookings } = await supabaseAdmin2.from("bookings").select("service_item_id, total_amount, service_items(name)");
      const serviceStatsMap = {};
      (bookings || []).forEach((b) => {
        var _a3;
        const serviceId = b.service_item_id;
        const name = ((_a3 = b.service_items) == null ? void 0 : _a3.name) || "Unknown Service";
        const amt = Number(b.total_amount);
        if (!serviceStatsMap[serviceId]) {
          serviceStatsMap[serviceId] = {
            id: serviceId,
            name,
            bookings_count: 0,
            revenue: 0
          };
        }
        serviceStatsMap[serviceId].bookings_count += 1;
        serviceStatsMap[serviceId].revenue += amt;
      });
      return NextResponse.json(Object.values(serviceStatsMap).sort((a, b) => b.bookings_count - a.bookings_count));
    }
    if (slug[0] === "settings" && slug.length === 1) {
      const { data: settings, error } = await supabaseAdmin2.from("platform_settings").select("*");
      if (error) throw error;
      const settingsMap = {};
      (settings || []).forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      return NextResponse.json(settingsMap);
    }
    if (slug[0] === "audit-logs" && slug.length === 1) {
      const { searchParams } = new URL(request.url);
      const page = Math.max(1, Number(searchParams.get("page") || 1));
      const limit = Math.max(1, Number(searchParams.get("limit") || 20));
      const action = searchParams.get("action") || "";
      const dateFrom = searchParams.get("date_from") || "";
      const dateTo = searchParams.get("date_to") || "";
      const offset = (page - 1) * limit;
      let query = supabaseAdmin2.from("audit_logs").select("*, admin:users(full_name)", { count: "exact" });
      if (action) query = query.eq("action", action);
      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);
      const { data: logs, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      return NextResponse.json({
        logs: (logs || []).map((l) => {
          var _a3;
          return {
            id: l.id,
            timestamp: l.created_at,
            admin_name: ((_a3 = l.admin) == null ? void 0 : _a3.full_name) || "System",
            action: l.action,
            target_type: l.target_type,
            target_id: l.target_id,
            metadata: l.metadata
          };
        }),
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit)
      });
    }
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (error) {
    console.error("Admin GET route error:", error);
    const status = error.status || 500;
    const msg = error.message || "Internal server error";
    return NextResponse.json({ error: msg }, { status });
  }
}
async function POST(request, { params }) {
  var _a2;
  try {
    const session = await requireRole(request, "admin");
    const { slug } = await params;
    if (slug[0] === "wallets" && slug[1] === "adjust") {
      const body = await request.json().catch(() => ({}));
      const { worker_id, amount, type, reason } = body;
      const numAmount = Number(amount);
      if (!worker_id || !numAmount || numAmount <= 0) {
        return NextResponse.json({ error: "Valid worker_id and amount required" }, { status: 400 });
      }
      const { data: workerData } = await supabaseAdmin2.from("workers").select("commission_wallet_balance").eq("id", worker_id).single();
      const currentBalance = Number((workerData == null ? void 0 : workerData.commission_wallet_balance) || 0);
      const newBalance = type === "CREDIT" ? currentBalance + numAmount : Math.max(0, currentBalance - numAmount);
      await supabaseAdmin2.from("workers").update({ commission_wallet_balance: newBalance }).eq("id", worker_id);
      await supabaseAdmin2.from("wallet_transactions").insert({
        worker_id,
        amount: type === "CREDIT" ? numAmount : -numAmount,
        type: type || "CREDIT",
        description: reason || `Admin wallet balance adjustment: ${type}`,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      await logAuditAction({
        admin_id: session.user_id,
        action: "WALLET_ADJUSTMENT" /* WALLET_ADJUSTMENT */,
        target_type: "worker_wallets",
        target_id: worker_id,
        metadata: { adjustment_type: type, amount: numAmount, new_balance: newBalance, reason }
      });
      return NextResponse.json({ success: true, new_balance: newBalance });
    }
    if (slug[0] === "customers" && slug.length === 1) {
      const body = await request.json().catch(() => ({}));
      const { full_name, phone, email } = body;
      if (!full_name || !phone) {
        return NextResponse.json({ error: "Full name and phone are required" }, { status: 400 });
      }
      const { data: newCustomer, error } = await supabaseAdmin2.from("users").insert({
        full_name,
        phone,
        email: email || null,
        role: "customer",
        is_active: true
      }).select("*").single();
      if (error) {
        return NextResponse.json({ error: error.message || "Failed to create customer" }, { status: 500 });
      }
      return NextResponse.json({ success: true, customer: newCustomer });
    }
    if (slug[0] === "services" && slug[1] === "categories" && slug.length === 2) {
      const { data: { name, icon_url, sort_order }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!name) {
        return NextResponse.json({ error: "Missing category name" }, { status: 400 });
      }
      const { data: newCategory, error } = await supabaseAdmin2.from("service_categories").insert({
        name,
        icon_url: icon_url || null,
        sort_order: sort_order || 0,
        is_active: true
      }).select("*").single();
      if (error || !newCategory) throw error;
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_CREATED" /* SERVICE_CREATED */,
        target_type: "service_category",
        target_id: newCategory.id,
        metadata: { category_name: name }
      });
      return NextResponse.json(newCategory);
    }
    if (slug[0] === "services" && slug[1] === "categories" && slug.length === 3) {
      const categoryId = slug[2];
      const { data: updateFields, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      const { data: updatedCategory, error } = await supabaseAdmin2.from("service_categories").update(updateFields).eq("id", categoryId).select("*").single();
      if (error || !updatedCategory) throw error;
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_UPDATED" /* SERVICE_UPDATED */,
        target_type: "service_category",
        target_id: categoryId,
        metadata: { updated_fields: Object.keys(updateFields) }
      });
      return NextResponse.json({ success: true, category: updatedCategory });
    }
    if (slug[0] === "services" && slug.length === 1) {
      const { data: { category_id, name, description, base_price, estimated_mins, icon_url }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!category_id || !name || !base_price) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      const { data: newService, error } = await supabaseAdmin2.from("service_items").insert({
        category_id,
        name,
        description,
        base_price,
        estimated_mins: estimated_mins || 60,
        icon_url: icon_url || null,
        is_active: true
      }).select("*").single();
      if (error || !newService) throw error;
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_CREATED" /* SERVICE_CREATED */,
        target_type: "service",
        target_id: newService.id,
        metadata: { service_name: name, base_price }
      });
      return NextResponse.json({ success: true, service: newService });
    }
    if (slug[0] === "manual-assignment" && slug.length === 1) {
      const { data: { booking_id, worker_id }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!booking_id || !worker_id) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      const supabaseAdminAny = supabaseAdmin2;
      const { data: assignResult, error: assignErr } = await supabaseAdminAny.rpc(
        "manual_assign_worker",
        {
          p_booking_id: booking_id,
          p_worker_id: worker_id,
          p_admin_id: session.user_id
        }
      );
      if (assignErr || !assignResult) {
        const errorMsg = (assignErr == null ? void 0 : assignErr.message) || "";
        if (errorMsg.includes("BOOKING_NOT_PEND")) {
          return NextResponse.json({ error: "Booking is no longer pending assignment" }, { status: 409 });
        }
        if (errorMsg.includes("WORKER_NOT_AVAIL")) {
          return NextResponse.json({ error: "Worker is no longer online or approved" }, { status: 409 });
        }
        return NextResponse.json({ error: "Assignment failed" }, { status: 500 });
      }
      const customerId = (_a2 = (await supabaseAdmin2.from("bookings").select("customer_id").eq("id", booking_id).single()).data) == null ? void 0 : _a2.customer_id;
      await Promise.all([
        dispatchNotification({
          userId: worker_id,
          type: "BOOKING_REQUEST",
          title: "New Manual Assignment",
          body: "You have been manually assigned a new booking by the administrator."
        }),
        dispatchNotification({
          userId: customerId,
          type: "BOOKING_ACCEPTED",
          title: "Worker Dispatched",
          body: "A worker has been manually assigned to your service request."
        })
      ]);
      await logAuditAction({
        admin_id: session.user_id,
        action: "MANUAL_ASSIGNMENT" /* MANUAL_ASSIGNMENT */,
        target_type: "booking",
        target_id: booking_id,
        metadata: { worker_id, assigned_by: session.user_id }
      });
      return NextResponse.json({ success: true, message: "Worker manually assigned successfully" });
    }
    if (slug[0] === "manual-assignment" && slug[1] === "reassign") {
      const { data: { booking_id, new_worker_id }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!booking_id || !new_worker_id) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      const { data: currentBooking } = await supabaseAdmin2.from("bookings").select("worker_id, customer_id").eq("id", booking_id).single();
      const old_worker_id = currentBooking == null ? void 0 : currentBooking.worker_id;
      const supabaseAdminAny = supabaseAdmin2;
      const { data: reassignResult, error: reassignErr } = await supabaseAdminAny.rpc(
        "manual_reassign_worker",
        {
          p_booking_id: booking_id,
          p_new_worker_id: new_worker_id,
          p_admin_id: session.user_id
        }
      );
      if (reassignErr || !reassignResult) {
        return NextResponse.json({ error: "Reassignment failed" }, { status: 500 });
      }
      const notifyPromises = [
        dispatchNotification({
          userId: new_worker_id,
          type: "BOOKING_REQUEST",
          title: "New Job Assigned",
          body: "You have been reassigned a manual booking request."
        }),
        dispatchNotification({
          userId: currentBooking == null ? void 0 : currentBooking.customer_id,
          type: "BOOKING_ACCEPTED",
          title: "Worker Reassigned",
          body: "A new worker has been assigned to your booking request."
        })
      ];
      if (old_worker_id) {
        notifyPromises.push(
          dispatchNotification({
            userId: old_worker_id,
            type: "BOOKING_REJECTED",
            title: "Job Unassigned",
            body: "You have been unassigned from the booking."
          })
        );
      }
      await Promise.all(notifyPromises);
      await logAuditAction({
        admin_id: session.user_id,
        action: "MANUAL_REASSIGNMENT" /* MANUAL_REASSIGNMENT */,
        target_type: "booking",
        target_id: booking_id,
        metadata: { old_worker_id, new_worker_id, reassigned_by: session.user_id }
      });
      return NextResponse.json({ success: true, message: "Worker reassigned successfully" });
    }
    if (slug[0] === "workers" && (slug[1] === "kyc" || slug.length === 3 && slug[2] === "kyc")) {
      const { data: body, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      const workerId = slug.length === 3 ? slug[1] : body.workerId;
      const { action, reason, fieldApproval } = body;
      if (!workerId || !action) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      if (!["APPROVE", "REJECT", "REQUEST_RESUBMISSION"].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
      const status = action === "APPROVE" ? "APPROVED" : "REJECTED";
      const { data: updatedWorker, error } = await supabaseAdmin2.from("workers").update({ kyc_status: status }).eq("id", workerId).select("*").single();
      if (error) throw error;
      if (action === "APPROVE") {
        const { createWallet: createWallet2 } = await Promise.resolve().then(() => (init_wallet_engine(), wallet_engine_exports));
        await createWallet2(workerId);
      }
      await supabaseAdmin2.from("worker_kyc").update({
        overall_status: status,
        remarks: reason || null,
        reviewed_by: session.user_id,
        reviewed_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("worker_id", workerId);
      if (fieldApproval) {
        await supabaseAdmin2.from("worker_kyc").update({
          aadhaar_status: fieldApproval.aadhaar || status,
          pan_status: fieldApproval.pan || status,
          selfie_status: fieldApproval.selfie || status
        }).eq("worker_id", workerId);
        const docTypes = {
          aadhaar: ["AADHAAR_FRONT", "AADHAAR_BACK"],
          pan: ["PAN_CARD"],
          selfie: ["SELFIE_VERIFICATION"]
        };
        for (const [field, types] of Object.entries(docTypes)) {
          const fieldStatus = fieldApproval[field];
          if (fieldStatus) {
            await supabaseAdmin2.from("worker_documents").update({ status: fieldStatus }).eq("worker_id", workerId).in("document_type", types);
          }
        }
      }
      await dispatchNotification({
        userId: workerId,
        type: action === "APPROVE" ? "KYC_APPROVED" : "KYC_REJECTED",
        title: action === "APPROVE" ? "KYC Approved" : "KYC Status Update",
        body: action === "APPROVE" ? "Congratulations! Your profile KYC registration is approved." : `KYC Review Update. Remarks: ${reason || "Document verification updated."}`
      });
      await logAuditAction({
        admin_id: session.user_id,
        action: action === "APPROVE" ? "WORKER_KYC_APPROVED" /* WORKER_KYC_APPROVED */ : "WORKER_KYC_REJECTED" /* WORKER_KYC_REJECTED */,
        target_type: "worker",
        target_id: workerId,
        metadata: { action, reason }
      });
      return NextResponse.json({ success: true, worker: updatedWorker });
    }
    if (slug[0] === "workers" && slug.length === 3 && slug[2] === "status") {
      const workerId = slug[1];
      const { data: { action }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!action || !["ACTIVATE", "SUSPEND"].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }
      const isActive = action === "ACTIVATE";
      const { data: updatedUser, error } = await supabaseAdmin2.from("users").update({ is_active: isActive }).eq("id", workerId).select("*").single();
      if (error) throw error;
      await logAuditAction({
        admin_id: session.user_id,
        action: isActive ? "WORKER_ACTIVATED" /* WORKER_ACTIVATED */ : "WORKER_SUSPENDED" /* WORKER_SUSPENDED */,
        target_type: "worker",
        target_id: workerId,
        metadata: { action }
      });
      return NextResponse.json({ success: true, user: updatedUser });
    }
    if (slug[0] === "workers" && slug.length === 3 && slug[2] === "categories") {
      const workerId = slug[1];
      const { data: { categoryIds }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!Array.isArray(categoryIds)) {
        return NextResponse.json({ error: "categoryIds must be an array" }, { status: 400 });
      }
      const { data: updatedWorker, error } = await supabaseAdmin2.from("workers").update({ service_category_ids: categoryIds, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", workerId).select("*").single();
      if (error) throw error;
      await logAuditAction({
        admin_id: session.user_id,
        action: "SETTINGS_UPDATED" /* SETTINGS_UPDATED */,
        target_type: "worker",
        target_id: workerId,
        metadata: { service_category_ids: categoryIds }
      });
      return NextResponse.json({ success: true, worker: updatedWorker });
    }
    if (slug[0] === "bookings" && slug.length === 3 && slug[2] === "cancel") {
      const bookingId = slug[1];
      const { data: { reason }, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      if (!bookingId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
      }
      const { data: booking, error: fetchErr } = await supabaseAdmin2.from("bookings").select("worker_id, customer_id").eq("id", bookingId).single();
      if (fetchErr) throw fetchErr;
      const { error: cancelErr } = await supabaseAdmin2.from("bookings").update({ status: "CANCELLED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", bookingId);
      if (cancelErr) throw cancelErr;
      if (booking == null ? void 0 : booking.worker_id) {
        await supabaseAdmin2.from("workers").update({ status: "ONLINE" }).eq("id", booking.worker_id);
        await dispatchNotification({
          userId: booking.worker_id,
          type: "BOOKING_REJECTED",
          title: "Booking Cancelled",
          body: `Job booking ${bookingId} was cancelled by administrator.`
        });
      }
      await dispatchNotification({
        userId: booking == null ? void 0 : booking.customer_id,
        type: "BOOKING_REJECTED",
        title: "Booking Cancelled",
        body: `Your booking request was cancelled by the administrator. Reason: ${reason}`
      });
      await logAuditAction({
        admin_id: session.user_id,
        action: "BOOKING_CANCELLED" /* BOOKING_CANCELLED */,
        target_type: "booking",
        target_id: bookingId,
        metadata: { reason }
      });
      return NextResponse.json({ success: true, status: "CANCELLED" });
    }
    if (slug[0] === "services" && slug.length === 2) {
      const serviceId = slug[1];
      const { data: updateFields, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      const { data: updatedService, error } = await supabaseAdmin2.from("service_items").update(updateFields).eq("id", serviceId).select("*").single();
      if (error) throw error;
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_UPDATED" /* SERVICE_UPDATED */,
        target_type: "service",
        target_id: serviceId,
        metadata: { updated_fields: Object.keys(updateFields) }
      });
      return NextResponse.json({ success: true, service: updatedService });
    }
    if (slug[0] === "settings" && slug.length === 1) {
      const { data: settingsPayload, errorResponse } = await validateBody(request, import_zod2.z.any());
      if (errorResponse) return errorResponse;
      const { data: oldSettings } = await supabaseAdmin2.from("platform_settings").select("*");
      const oldMap = {};
      (oldSettings || []).forEach((s) => {
        oldMap[s.key] = s.value;
      });
      const promises = Object.entries(settingsPayload).map(([key, val]) => {
        return supabaseAdmin2.from("platform_settings").update({ value: String(val), updated_by: session.user_id, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("key", key);
      });
      await Promise.all(promises);
      await logAuditAction({
        admin_id: session.user_id,
        action: "SETTINGS_UPDATED" /* SETTINGS_UPDATED */,
        metadata: {
          changed_keys: Object.keys(settingsPayload),
          old_values: oldMap,
          new_values: settingsPayload
        }
      });
      return NextResponse.json({ success: true, settings: settingsPayload });
    }
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (error) {
    console.error("Admin PATCH route error:", error);
    const status = error.status || 500;
    const msg = error.message || "Internal server error";
    return NextResponse.json({ error: msg }, { status });
  }
}
async function PATCH(request, context) {
  return POST(request, context);
}
async function PUT(request, context) {
  return POST(request, context);
}
async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, "admin");
    const { slug } = await params;
    if (slug[0] === "services" && slug.length === 2) {
      const serviceId = slug[1];
      const { error: deleteErr } = await supabaseAdmin2.from("service_items").delete().eq("id", serviceId);
      if (deleteErr) {
        if (deleteErr.code === "23503") {
          const { data: service, error: updateErr } = await supabaseAdmin2.from("service_items").update({ is_active: false }).eq("id", serviceId).select("name").single();
          if (updateErr) throw updateErr;
          memoryCache.delete("customer_services_default");
          await logAuditAction({
            admin_id: session.user_id,
            action: "SERVICE_DELETED" /* SERVICE_DELETED */,
            target_type: "service",
            target_id: serviceId,
            metadata: { service_name: service == null ? void 0 : service.name, type: "soft_delete_due_to_bookings" }
          });
          return NextResponse.json({
            success: true,
            message: "Service is referenced by bookings. It was deactivated/soft-deleted instead."
          });
        }
        throw deleteErr;
      }
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_DELETED" /* SERVICE_DELETED */,
        target_type: "service",
        target_id: serviceId,
        metadata: { type: "hard_delete" }
      });
      return NextResponse.json({ success: true, message: "Service deleted permanently" });
    }
    if (slug[0] === "services" && slug[1] === "categories" && slug.length === 3) {
      const categoryId = slug[2];
      const { error: deleteErr } = await supabaseAdmin2.from("service_categories").delete().eq("id", categoryId);
      if (deleteErr) {
        if (deleteErr.code === "23503") {
          const { data: category, error: updateErr } = await supabaseAdmin2.from("service_categories").update({ is_active: false }).eq("id", categoryId).select("name").single();
          if (updateErr) throw updateErr;
          memoryCache.delete("customer_services_default");
          await logAuditAction({
            admin_id: session.user_id,
            action: "SERVICE_DELETED" /* SERVICE_DELETED */,
            target_type: "service_category",
            target_id: categoryId,
            metadata: { category_name: category == null ? void 0 : category.name, type: "soft_delete_due_to_items_or_bookings" }
          });
          return NextResponse.json({
            success: true,
            message: "Category is referenced by service items or bookings. It was deactivated/soft-deleted instead."
          });
        }
        throw deleteErr;
      }
      memoryCache.delete("customer_services_default");
      await logAuditAction({
        admin_id: session.user_id,
        action: "SERVICE_DELETED" /* SERVICE_DELETED */,
        target_type: "service_category",
        target_id: categoryId,
        metadata: { type: "hard_delete" }
      });
      return NextResponse.json({ success: true, message: "Category deleted permanently" });
    }
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  } catch (error) {
    console.error("Admin DELETE route error:", error);
    const status = error.status || 500;
    const msg = error.message || "Internal server error";
    return NextResponse.json({ error: msg }, { status });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DELETE,
  GET,
  PATCH,
  POST,
  PUT
});
