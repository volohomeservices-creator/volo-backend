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

// src/app/api/admin/manual-assign/route.ts
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

// packages/shared-lib/src/lib/worker-ranking.ts
var import_server_only2 = require("server-only");
async function getManualAssignmentCandidates(bookingId) {
  var _a2;
  try {
    const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select("lat, lng, service_item_id, payment_mode, service_items(category_id)").eq("id", bookingId).single();
    if (bookingErr || !booking) {
      console.error(`[Ranking Engine] Booking ${bookingId} not found:`, bookingErr);
      return [];
    }
    const categoryId = ((_a2 = booking.service_items) == null ? void 0 : _a2.category_id) || null;
    const { data: radiusData } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "search_radius_km").single();
    const radiusKm = radiusData ? parseFloat(radiusData.value) : 25;
    let { data: nearbyWorkers, error: rpcErr } = await supabaseAdmin.rpc(
      "find_nearby_eligible_workers",
      {
        p_lat: booking.lat,
        p_lng: booking.lng,
        p_radius_km: radiusKm,
        p_service_category_id: categoryId,
        p_booking_id: bookingId,
        p_payment_mode: "ONLINE"
        // Manual assignment overrides COD wallet balance check
      }
    );
    if (rpcErr) {
      console.error(`[Ranking Engine] Error calling find_nearby_eligible_workers for booking ${bookingId}:`, rpcErr);
    }
    if ((rpcErr || !nearbyWorkers || nearbyWorkers.length === 0) && categoryId) {
      console.log(`[Ranking Engine] No specific category workers found near booking ${bookingId}. Falling back to any category...`);
      const fallbackResult = await supabaseAdmin.rpc(
        "find_nearby_eligible_workers",
        {
          p_lat: booking.lat,
          p_lng: booking.lng,
          p_radius_km: radiusKm,
          p_service_category_id: null,
          p_booking_id: bookingId,
          p_payment_mode: "ONLINE"
          // Manual assignment overrides COD wallet balance check
        }
      );
      if (fallbackResult.error) {
        console.error(`[Ranking Engine] Fallback find_nearby_eligible_workers error:`, fallbackResult.error);
      } else if (fallbackResult.data) {
        nearbyWorkers = fallbackResult.data;
      }
    }
    if (!nearbyWorkers || nearbyWorkers.length === 0) {
      console.log(`[Ranking Engine] No eligible workers found near booking ${bookingId}`);
      return [];
    }
    const workerIds = nearbyWorkers.map((nw) => nw.worker_id);
    const { data: workerProfiles, error: fetchErr } = await supabaseAdmin.from("workers").select(`
        id,
        rating,
        total_jobs,
        status,
        kyc_status,
        commission_wallet_balance,
        users!inner (
          full_name,
          phone,
          is_active
        ),
        worker_availability (
          working_days,
          start_time,
          end_time,
          vacation_mode,
          unavailable_dates
        )
      `).in("id", workerIds);
    if (fetchErr || !workerProfiles) {
      console.error("[Ranking Engine] Error fetching worker profiles:", fetchErr);
      return [];
    }
    const { data: assignmentHistory, error: historyErr } = await supabaseAdmin.from("manual_assignment_history").select("worker_id, status").in("worker_id", workerIds);
    if (historyErr) {
      console.error("[Ranking Engine] Error fetching assignment history:", historyErr);
    }
    const candidates = workerProfiles.map((w) => {
      var _a3, _b;
      const distanceObj = nearbyWorkers.find((nw) => nw.worker_id === w.id);
      const distance = distanceObj ? distanceObj.distance_km : radiusKm;
      const workerHistory = (assignmentHistory || []).filter((h) => h.worker_id === w.id);
      const totalOffers = workerHistory.length;
      const acceptedOffers = workerHistory.filter((h) => h.status === "ACCEPTED").length;
      const acceptanceRate = totalOffers > 0 ? acceptedOffers / totalOffers : 1;
      const distScore = Math.max(0, Math.min(100, (1 - distance / radiusKm) * 100));
      const ratingScore = Math.max(0, Math.min(100, Number(w.rating || 0) / 5 * 100));
      const jobsScore = Math.max(0, Math.min(100, Number(w.total_jobs || 0) / 50 * 100));
      const acceptanceScore = acceptanceRate * 100;
      const totalScore = distScore * 0.4 + ratingScore * 0.3 + jobsScore * 0.2 + acceptanceScore * 0.1;
      return {
        workerId: w.id,
        name: ((_a3 = w.users) == null ? void 0 : _a3.full_name) || "Service Professional",
        phone: ((_b = w.users) == null ? void 0 : _b.phone) || "",
        score: Number(totalScore.toFixed(1)),
        distance: Number(distance.toFixed(2)),
        rating: Number(w.rating || 0),
        jobs: w.total_jobs || 0,
        acceptanceRate: Number((acceptanceRate * 100).toFixed(0)),
        status: w.status,
        kycStatus: w.kyc_status,
        availability: w.worker_availability ? {
          working_days: w.worker_availability.working_days || [],
          start_time: w.worker_availability.start_time || "09:00:00",
          end_time: w.worker_availability.end_time || "18:00:00",
          vacation_mode: !!w.worker_availability.vacation_mode,
          unavailable_dates: w.worker_availability.unavailable_dates || []
        } : null
      };
    });
    return candidates.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("[Ranking Engine] Exception during candidate ranking:", error);
    return [];
  }
}

// packages/shared-lib/src/lib/manual-assignment.ts
var import_server_only6 = require("server-only");

// packages/shared-lib/src/lib/audit.ts
var import_server_only3 = require("server-only");
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

// packages/shared-lib/src/lib/firebase-admin.ts
var import_server_only5 = require("server-only");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_jose2 = require("jose");

// packages/shared-lib/src/lib/env.ts
var import_server_only4 = require("server-only");
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

// packages/shared-lib/src/lib/manual-assignment.ts
async function createManualAssignmentOffer(bookingId, workerId, adminId, notes) {
  var _a2;
  const { data: worker, error: workerErr } = await supabaseAdmin.from("workers").select("status, kyc_status, users!inner(is_active)").eq("id", workerId).single();
  if (workerErr || !worker) {
    throw new Error("Worker not found");
  }
  const workerUsers = worker.users;
  const isWorkerActive = Array.isArray(workerUsers) ? (_a2 = workerUsers[0]) == null ? void 0 : _a2.is_active : workerUsers == null ? void 0 : workerUsers.is_active;
  if (!isWorkerActive) {
    throw new Error("Worker is suspended or inactive");
  }
  if (worker.kyc_status !== "APPROVED") {
    throw new Error("Worker KYC is not approved");
  }
  if (worker.status === "ON_JOB") {
    throw new Error("Worker is currently busy on another job");
  }
  if (worker.status !== "ONLINE") {
    throw new Error("Worker is not online");
  }
  const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select("status").eq("id", bookingId).single();
  if (bookingErr || !booking) {
    throw new Error("Booking not found");
  }
  if (booking.status !== "MANUAL_ASSIGNMENT_REQUIRED" && booking.status !== "PENDING_ASSIGNMENT") {
    throw new Error(`Booking cannot be manually assigned in status ${booking.status}`);
  }
  const { data: activeOffers } = await supabaseAdmin.from("manual_assignment_history").select("id, worker_id").eq("booking_id", bookingId).eq("status", "ASSIGNED");
  if (activeOffers && activeOffers.length > 0) {
    for (const activeOffer of activeOffers) {
      await supabaseAdmin.from("manual_assignment_history").update({ status: "REASSIGNED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", activeOffer.id);
      await dispatchNotification({
        userId: activeOffer.worker_id,
        type: "MANUAL_ASSIGNMENT_REASSIGNED",
        title: "Offer Reassigned",
        body: "A direct job offer sent to you has been reassigned to another provider.",
        data: { booking_id: bookingId, offer_id: activeOffer.id }
      });
      await logAuditAction({
        admin_id: adminId,
        action: "MANUAL_ASSIGNMENT_REASSIGNED" /* MANUAL_ASSIGNMENT_REASSIGNED */,
        target_type: "booking",
        target_id: bookingId,
        metadata: { offer_id: activeOffer.id, worker_id: activeOffer.worker_id }
      });
    }
  }
  const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  const { data: offer, error: insertErr } = await supabaseAdmin.from("manual_assignment_history").insert({
    booking_id: bookingId,
    worker_id: workerId,
    assigned_by: adminId,
    status: "ASSIGNED",
    notes: notes || null,
    expires_at: expiresAt
  }).select("id").single();
  if (insertErr || !offer) {
    console.error("[Manual Assignment] Offer insertion failed:", insertErr);
    throw new Error("Failed to create manual assignment offer");
  }
  await dispatchNotification({
    userId: workerId,
    type: "MANUAL_ASSIGNMENT_CREATED",
    title: "New Manual Job Offer",
    body: `You have received a direct job offer from the admin. Notes: ${notes || "None"}`,
    data: { booking_id: bookingId, offer_id: offer.id }
  });
  await logAuditAction({
    admin_id: adminId,
    action: "MANUAL_ASSIGNMENT_CREATED" /* MANUAL_ASSIGNMENT_CREATED */,
    target_type: "booking",
    target_id: bookingId,
    metadata: { offer_id: offer.id, worker_id: workerId, notes }
  });
  return offer.id;
}

// src/app/api/admin/manual-assign/route.ts
var supabaseAdmin2 = supabaseAdmin;
async function GET(request) {
  try {
    const session = await requireRole(request, "admin");
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const { data: allHistory, error: allErr } = await supabaseAdmin2.from("manual_assignment_history").select(`
        id,
        booking_id,
        worker_id,
        assigned_by,
        status,
        notes,
        expires_at,
        created_at,
        updated_at,
        workers (
          users (
            full_name,
            phone
          )
        ),
        assigned_by_user:users!manual_assignment_history_assigned_by_fkey (
          full_name
        )
      `).order("created_at", { ascending: false });
    if (allErr) {
      console.error("[Manual Assign API] Error fetching all history:", allErr);
    }
    const historyItems = allHistory || [];
    const totalOffers = historyItems.length;
    const acceptedOffers = historyItems.filter((h) => h.status === "ACCEPTED").length;
    const rejectedOffers = historyItems.filter((h) => h.status === "REJECTED").length;
    const expiredOffersCount = historyItems.filter((h) => h.status === "EXPIRED").length;
    const reassignedOffers = historyItems.filter((h) => h.status === "REASSIGNED").length;
    const rateDivisor = totalOffers - reassignedOffers;
    const successRate = rateDivisor > 0 ? Math.round(acceptedOffers / rateDivisor * 100) : 0;
    const respondedOffers = historyItems.filter((h) => ["ACCEPTED", "REJECTED", "EXPIRED"].includes(h.status));
    let averageResponseTimeMins = 0;
    if (respondedOffers.length > 0) {
      const totalDiffMs = respondedOffers.reduce((acc, curr) => {
        const diff = new Date(curr.updated_at).getTime() - new Date(curr.created_at).getTime();
        return acc + Math.max(0, diff);
      }, 0);
      averageResponseTimeMins = Number((totalDiffMs / respondedOffers.length / 6e4).toFixed(1));
    }
    const metrics = {
      total: totalOffers,
      accepted: acceptedOffers,
      rejected: rejectedOffers,
      expired: expiredOffersCount,
      reassigned: reassignedOffers,
      successRate,
      averageResponseTimeMins
    };
    const expiredOffers = historyItems.filter((h) => h.status === "EXPIRED").map((h) => {
      var _a2, _b, _c, _d, _e;
      return {
        id: h.id,
        bookingId: h.booking_id,
        workerName: ((_b = (_a2 = h.workers) == null ? void 0 : _a2.users) == null ? void 0 : _b.full_name) || "Worker",
        workerPhone: ((_d = (_c = h.workers) == null ? void 0 : _c.users) == null ? void 0 : _d.phone) || "",
        assignedByName: ((_e = h.assigned_by_user) == null ? void 0 : _e.full_name) || "Admin",
        expiredAt: h.expires_at || h.updated_at,
        notes: h.notes
      };
    });
    if (!bookingId) {
      return NextResponse.json({
        success: true,
        metrics,
        expiredOffers
      });
    }
    const { data: queue } = await supabaseAdmin2.from("assignment_queue").select("status, attempts, current_group, started_at, created_at").eq("booking_id", bookingId).single();
    const { data: rejections } = await supabaseAdmin2.from("worker_job_rejections").select("worker_id, reason").eq("booking_id", bookingId);
    const specificHistory = historyItems.filter((h) => h.booking_id === bookingId).map((h) => {
      var _a2, _b, _c, _d;
      const rej = (rejections || []).find((r) => r.worker_id === h.worker_id);
      return {
        id: h.id,
        workerId: h.worker_id,
        workerName: ((_b = (_a2 = h.workers) == null ? void 0 : _a2.users) == null ? void 0 : _b.full_name) || "Worker",
        workerPhone: ((_d = (_c = h.workers) == null ? void 0 : _c.users) == null ? void 0 : _d.phone) || "",
        status: h.status,
        notes: h.notes,
        rejectionReason: rej ? rej.reason : null,
        expires_at: h.expires_at,
        created_at: h.created_at
      };
    });
    const candidates = await getManualAssignmentCandidates(bookingId);
    return NextResponse.json({
      success: true,
      queueStatus: (queue == null ? void 0 : queue.status) || "NOT_STARTED",
      attempts: (queue == null ? void 0 : queue.attempts) || 0,
      history: specificHistory,
      candidates,
      metrics
    });
  } catch (error) {
    console.error("[Manual Assign GET API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
async function POST(request) {
  try {
    const session = await requireRole(request, "admin");
    const { data: body, errorResponse } = await validateBody(request, import_zod2.z.any());
    if (errorResponse) return errorResponse;
    const { bookingId, workerId, notes } = body;
    if (!bookingId || !workerId) {
      return NextResponse.json({ error: "Missing required parameters bookingId or workerId" }, { status: 400 });
    }
    const offerId = await createManualAssignmentOffer(
      bookingId,
      workerId,
      session.user_id,
      notes
    );
    return NextResponse.json({
      success: true,
      offerId,
      message: "Manual assignment offer dispatched successfully"
    });
  } catch (error) {
    console.error("[Manual Assign POST API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
