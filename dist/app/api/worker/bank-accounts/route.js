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

// src/app/api/worker/bank-accounts/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST
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

// packages/shared-lib/src/lib/settlement-engine.ts
var import_server_only7 = require("server-only");

// packages/shared-lib/src/lib/payouts/payout-service.ts
var import_server_only5 = require("server-only");

// packages/shared-lib/src/lib/payouts/payout-errors.ts
var ProviderNotConfiguredError = class extends Error {
  constructor(providerName) {
    super(`Provider ${providerName} is not configured or enabled.`);
    this.name = "ProviderNotConfiguredError";
  }
};

// packages/shared-lib/src/lib/payouts/payout-provider.ts
var DefaultPayoutProvider = class {
  isMockMode() {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
    return !keyId || !keySecret || !accountNumber || keyId === "" || keySecret === "" || accountNumber === "";
  }
  async createContact(workerId, name, email, phone) {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Creating contact for worker: ${workerId}`);
      return `cont_mock_${Math.random().toString(36).substring(2, 10)}`;
    }
    throw new ProviderNotConfiguredError("DEFAULT_RAZORPAYX");
  }
  async createFundAccount(contactId, bankAccountDetails) {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Creating fund account for contact: ${contactId}`);
      return `fa_mock_${Math.random().toString(36).substring(2, 10)}`;
    }
    throw new ProviderNotConfiguredError("DEFAULT_RAZORPAYX");
  }
  async createPayout(fundAccountId, amount, referenceId) {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Creating payout of ${amount} for fund account: ${fundAccountId}`);
      return {
        providerPayoutId: `pout_mock_${Math.random().toString(36).substring(2, 10)}`,
        status: "processing"
      };
    }
    throw new ProviderNotConfiguredError("DEFAULT_RAZORPAYX");
  }
  async fetchPayoutStatus(providerPayoutId) {
    if (this.isMockMode()) {
      console.log(`[Mock Payout Provider] Fetching status for payout: ${providerPayoutId}`);
      return {
        status: "processed",
        utr: `utr_mock_${Math.random().toString(36).substring(2, 10)}`,
        failureReason: null
      };
    }
    throw new ProviderNotConfiguredError("DEFAULT_RAZORPAYX");
  }
  async verifyBankAccount(bankAccountDetails) {
    if (this.isMockMode()) {
      console.log("[Mock Payout Provider] Verifying bank account (always returns true in mock mode)");
      return true;
    }
    throw new ProviderNotConfiguredError("DEFAULT_RAZORPAYX");
  }
};

// packages/shared-lib/src/lib/payouts/payout-service.ts
var PayoutService = class {
  /**
   * Called when an admin marks a Settlement Batch as READY_FOR_PAYOUT
   */
  static async queuePayoutsForBatch(batchId, adminId) {
    const { data: settlements, error: fetchErr } = await supabaseAdmin.from("settlement_ledger").select("id, worker_id, net_amount").eq("settlement_batch_id", batchId);
    if (fetchErr) throw fetchErr;
    if (!settlements || settlements.length === 0) return { success: true, count: 0 };
    let createdCount = 0;
    for (const settlement of settlements) {
      if (Number(settlement.net_amount) <= 0) continue;
      const { data: payout, error: insertErr } = await supabaseAdmin.from("payouts").insert({
        worker_id: settlement.worker_id,
        settlement_batch_id: batchId,
        settlement_ledger_id: settlement.id,
        amount: settlement.net_amount,
        status: "READY_FOR_PAYOUT" /* READY_FOR_PAYOUT */
      }).select("id").single();
      if (!insertErr && payout) {
        createdCount++;
        await logAuditAction({
          admin_id: adminId,
          action: "PAYOUT_CREATED",
          target_type: "payouts",
          target_id: payout.id,
          metadata: { amount: settlement.net_amount }
        });
      }
    }
    return { success: true, count: createdCount };
  }
  /**
   * Future method to execute queued payouts
   */
  static async executePendingPayouts() {
    const { data: config } = await supabaseAdmin.from("payout_provider_configs").select("enabled").eq("provider_name", "RAZORPAYX").single();
    if (!config || !config.enabled) {
      console.warn("Payout provider is disabled. Execution aborted.");
      return;
    }
  }
};
PayoutService.provider = new DefaultPayoutProvider();

// packages/shared-lib/src/lib/crypto.ts
var import_server_only6 = require("server-only");
var import_crypto2 = __toESM(require("crypto"));
var encryptionKeyBuffer = null;
function getEncryptionKey() {
  if (encryptionKeyBuffer) return encryptionKeyBuffer;
  const key = process.env.BANK_ENCRYPTION_KEY;
  if (!key) {
    const msg = "Fatal: BANK_ENCRYPTION_KEY is required for banking operations.";
    console.error(`[Crypto Engine] ${msg}`);
    throw new Error(msg);
  }
  if (key.length < 32 || key.includes("placeholder")) {
    const msg = "Fatal: BANK_ENCRYPTION_KEY must be at least 32 characters long and valid.";
    console.error(`[Crypto Engine] ${msg}`);
    throw new Error(msg);
  }
  encryptionKeyBuffer = Buffer.from(key.padEnd(32, "0").slice(0, 32));
  return encryptionKeyBuffer;
}
function encryptData(text) {
  const iv = import_crypto2.default.randomBytes(16);
  const keyBuffer = getEncryptionKey();
  const cipher = import_crypto2.default.createCipheriv("aes-256-cbc", keyBuffer, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}
function decryptData(text) {
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift(), "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const keyBuffer = getEncryptionKey();
  const decipher = import_crypto2.default.createDecipheriv("aes-256-cbc", keyBuffer, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// packages/shared-lib/src/lib/settlement-engine.ts
function encryptBankAccount(text) {
  return encryptData(text);
}
function decryptBankAccount(text) {
  return decryptData(text);
}

// src/app/api/worker/bank-accounts/route.ts
async function GET(request) {
  try {
    const session = await requireRole(request, "worker");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data, error } = await supabaseAdmin.from("worker_bank_accounts").select("*").eq("worker_id", session.user_id).single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data) return NextResponse.json({ account: null });
    let decrypted = "";
    try {
      decrypted = decryptBankAccount(data.account_number_encrypted);
    } catch (e) {
      decrypted = "";
    }
    return NextResponse.json({
      account: __spreadProps(__spreadValues({}, data), {
        account_number_decrypted: decrypted
      })
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
async function POST(request) {
  try {
    const session = await requireRole(request, "worker");
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: body, errorResponse } = await validateBody(request, import_zod2.z.any());
    if (errorResponse) return errorResponse;
    const { account_holder_name, bank_name, account_number, ifsc_code } = body;
    if (!account_holder_name || !bank_name || !account_number || !ifsc_code) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    const encrypted = encryptBankAccount(account_number);
    const lastFour = account_number.slice(-4);
    const { data: existing } = await supabaseAdmin.from("worker_bank_accounts").select("id").eq("worker_id", session.user_id).single();
    const isUpdate = !!existing;
    const payload = {
      worker_id: session.user_id,
      account_holder_name,
      bank_name,
      account_number_encrypted: encrypted,
      account_last_four: lastFour,
      ifsc_code,
      is_verified: false,
      // reset verification on update
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    let result;
    if (isUpdate) {
      result = await supabaseAdmin.from("worker_bank_accounts").update(payload).eq("worker_id", session.user_id).select().single();
    } else {
      result = await supabaseAdmin.from("worker_bank_accounts").insert(payload).select().single();
    }
    if (result.error) throw result.error;
    await logAuditAction({
      admin_id: session.user_id,
      // technically worker_id but we use admin_id for the actor
      action: isUpdate ? "BANK_ACCOUNT_UPDATED" /* BANK_ACCOUNT_UPDATED */ : "BANK_ACCOUNT_ADDED" /* BANK_ACCOUNT_ADDED */,
      target_type: "worker_bank_accounts",
      target_id: result.data.id,
      metadata: { is_verified: false }
    });
    const { data: admins } = await supabaseAdmin.from("users").select("id").eq("role", "admin");
    if (admins) {
      for (const admin of admins) {
        await dispatchNotification({
          userId: admin.id,
          type: "MANUAL_ASSIGNMENT_CREATED",
          // Reusing enum or custom
          title: "Bank Verification Pending",
          body: `A worker has updated their bank details and requires verification.`
        });
      }
    }
    return NextResponse.json({ success: true, account: result.data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
