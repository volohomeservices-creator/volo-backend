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
var import_server_only4;
var init_audit = __esm({
  "packages/shared-lib/src/lib/audit.ts"() {
    "use strict";
    import_server_only4 = require("server-only");
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

// packages/shared-lib/src/lib/env.ts
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
var import_server_only8, REQUIRED_ENV_VARS, PLACEHOLDERS, validated;
var init_env = __esm({
  "packages/shared-lib/src/lib/env.ts"() {
    "use strict";
    import_server_only8 = require("server-only");
    REQUIRED_ENV_VARS = [
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
    PLACEHOLDERS = [
      "placeholder",
      "placeholder_session_secret_min_32_chars_long",
      "placeholder_key",
      "placeholder_secret",
      "placeholder-service-key"
    ];
    validated = false;
    validateEnv();
  }
});

// packages/shared-lib/src/lib/firebase-admin.ts
var import_server_only9, import_app, import_auth, import_messaging, import_jose, projectId, clientEmail, privateKey, getAdminAuth, getAdminMessaging, adminAuth, adminMessaging;
var init_firebase_admin = __esm({
  "packages/shared-lib/src/lib/firebase-admin.ts"() {
    "use strict";
    import_server_only9 = require("server-only");
    import_app = require("firebase-admin/app");
    import_auth = require("firebase-admin/auth");
    import_messaging = require("firebase-admin/messaging");
    import_jose = require("jose");
    init_env();
    try {
      validateEnv();
    } catch (_) {
    }
    projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
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
    getAdminAuth = () => {
      if (!(0, import_app.getApps)().length) {
        throw new Error("Firebase Admin app is not initialized.");
      }
      return (0, import_auth.getAuth)();
    };
    getAdminMessaging = () => {
      if (!(0, import_app.getApps)().length) {
        throw new Error("Firebase Admin app is not initialized.");
      }
      return (0, import_messaging.getMessaging)();
    };
    adminAuth = new Proxy({}, {
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
    adminMessaging = new Proxy({}, {
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
async function sendBulkNotifications({ userIds, title, body, data }) {
  try {
    if (userIds.length === 0) return { success: true, successCount: 0 };
    const { data: devices, error } = await supabaseAdmin.from("user_devices").select("id, user_id, device_token").in("user_id", userIds).eq("is_active", true);
    if (error || !devices || devices.length === 0) {
      return { success: false, reason: "NO_ACTIVE_DEVICES" };
    }
    const tokens = devices.map((d) => d.device_token);
    const message = {
      notification: { title, body },
      data: data || {},
      tokens
    };
    const response = await adminMessaging.sendEachForMulticast(message);
    const invalidDeviceIds = [];
    response.responses.forEach((res, idx) => {
      var _a2, _b;
      if (!res.success) {
        if (((_a2 = res.error) == null ? void 0 : _a2.code) === "messaging/invalid-registration-token" || ((_b = res.error) == null ? void 0 : _b.code) === "messaging/registration-token-not-registered") {
          invalidDeviceIds.push(devices[idx].id);
        }
      }
    });
    if (invalidDeviceIds.length > 0) {
      await supabaseAdmin.from("user_devices").update({ is_active: false }).in("id", invalidDeviceIds);
    }
    return { success: true, successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.error("Bulk push notification failed:", err);
    return { success: false, error: err.message };
  }
}
var init_firebase_notifications = __esm({
  "packages/shared-lib/src/lib/firebase-notifications.ts"() {
    "use strict";
    init_firebase_admin();
    init_supabase_server();
    init_audit();
    init_types();
  }
});

// packages/shared-lib/src/lib/notification-dispatcher.ts
var notification_dispatcher_exports = {};
__export(notification_dispatcher_exports, {
  dispatchBulkNotifications: () => dispatchBulkNotifications,
  dispatchNotification: () => dispatchNotification,
  filterRealNotifications: () => filterRealNotifications
});
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
async function dispatchBulkNotifications(payload) {
  try {
    if (payload.userIds.length === 0) return true;
    const inserts = payload.userIds.map((userId) => ({
      user_id: userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data || {}
    }));
    const { error: dbErr } = await supabaseAdmin.from("notifications").insert(inserts);
    if (dbErr) {
      console.error("[Notification Dispatcher] Bulk DB Insert Failed:", dbErr);
      throw new Error(`Database insert failed: ${dbErr.message}`);
    }
    await sendBulkNotifications({
      userIds: payload.userIds,
      title: payload.title,
      body: payload.body,
      data: payload.data ? { payload: JSON.stringify(payload.data) } : void 0
    });
    return true;
  } catch (error) {
    console.error("[Notification Dispatcher] Bulk Error:", error);
    return false;
  }
}
async function filterRealNotifications(notifications, workerId) {
  if (!notifications || notifications.length === 0) return [];
  const bookingIds = notifications.map((n) => {
    var _a2;
    return (_a2 = n.data) == null ? void 0 : _a2.booking_id;
  }).filter((id) => typeof id === "string");
  if (bookingIds.length === 0) return notifications;
  const { data: bookings } = await supabaseAdmin.from("bookings").select("id, status").in("id", bookingIds);
  const bookingStatusMap = new Map((bookings == null ? void 0 : bookings.map((b) => [b.id, b.status])) || []);
  const { data: rejections } = await supabaseAdmin.from("worker_job_rejections").select("booking_id").eq("worker_id", workerId).in("booking_id", bookingIds);
  const rejectedBookingIds = new Set((rejections == null ? void 0 : rejections.map((r) => r.booking_id)) || []);
  return notifications.filter((n) => {
    var _a2;
    const bookingId = (_a2 = n.data) == null ? void 0 : _a2.booking_id;
    if (!bookingId) return true;
    const status = bookingStatusMap.get(bookingId);
    if (!status) return false;
    if (n.type === "BOOKING_REQUEST" || n.type === "MANUAL_ASSIGNMENT_CREATED") {
      if (status !== "PENDING_ASSIGNMENT" && status !== "MANUAL_ASSIGNMENT_REQUIRED") {
        return false;
      }
      if (rejectedBookingIds.has(bookingId)) {
        return false;
      }
    }
    return true;
  });
}
var init_notification_dispatcher = __esm({
  "packages/shared-lib/src/lib/notification-dispatcher.ts"() {
    "use strict";
    init_supabase_server();
    init_firebase_notifications();
  }
});

// src/app/api/webhooks/razorpay/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
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

// src/app/api/webhooks/razorpay/route.ts
var import_crypto = __toESM(require("crypto"));

// packages/shared-lib/src/lib/logger.ts
var import_server_only3 = require("server-only");

// packages/shared-lib/src/lib/monitor.ts
var import_server_only2 = require("server-only");
init_supabase_server();
async function trackEvent(event) {
  try {
    await supabaseAdmin.from("security_events").insert({
      user_id: event.user_id || null,
      event_type: event.event_type,
      severity: event.severity,
      details: __spreadProps(__spreadValues({}, event.details), {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        memory_usage: process.memoryUsage(),
        uptime: process.uptime()
      })
    });
  } catch (err) {
    console.error("[Monitor Engine] Failed to record event:", err);
  }
}

// packages/shared-lib/src/lib/logger.ts
var StructuredLogger = class {
  constructor() {
    this.level = "INFO" /* INFO */;
    if (process.env.NODE_ENV === "development") {
      this.level = "DEBUG" /* DEBUG */;
    }
  }
  shouldLog(current) {
    const priority = {
      ["DEBUG" /* DEBUG */]: 0,
      ["INFO" /* INFO */]: 1,
      ["WARN" /* WARN */]: 2,
      ["ERROR" /* ERROR */]: 3,
      ["FATAL" /* FATAL */]: 4
    };
    return priority[current] >= priority[this.level];
  }
  formatMessage(level, message, meta) {
    const payload = {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      message,
      meta: meta || null,
      env: process.env.NODE_ENV || "production"
    };
    return JSON.stringify(payload);
  }
  debug(message, meta) {
    if (this.shouldLog("DEBUG" /* DEBUG */)) {
      console.log(this.formatMessage("DEBUG" /* DEBUG */, message, meta));
    }
  }
  info(message, meta) {
    if (this.shouldLog("INFO" /* INFO */)) {
      console.info(this.formatMessage("INFO" /* INFO */, message, meta));
    }
  }
  warn(message, meta) {
    if (this.shouldLog("WARN" /* WARN */)) {
      const payload = this.formatMessage("WARN" /* WARN */, message, meta);
      console.warn(payload);
      trackEvent({
        event_type: "operational_warning",
        severity: "medium",
        details: __spreadValues({ message }, meta)
      }).catch(() => {
      });
      if (process.env.LOG_DRAIN_URL) {
        fetch(process.env.LOG_DRAIN_URL, {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" }
        }).catch(() => {
        });
      }
    }
  }
  error(message, error, meta) {
    if (this.shouldLog("ERROR" /* ERROR */)) {
      const errorMeta = error instanceof Error ? __spreadValues({
        name: error.name,
        message: error.message,
        stack: error.stack
      }, meta) : __spreadValues({ error }, meta);
      const payload = this.formatMessage("ERROR" /* ERROR */, message, errorMeta);
      console.error(payload);
      trackEvent({
        event_type: "operational_error",
        severity: "high",
        details: { message, error: errorMeta }
      }).catch(() => {
      });
      if (process.env.LOG_DRAIN_URL) {
        fetch(process.env.LOG_DRAIN_URL, {
          method: "POST",
          body: payload,
          headers: { "Content-Type": "application/json" }
        }).catch(() => {
        });
      }
    }
  }
  fatal(message, error, meta) {
    if (this.shouldLog("FATAL" /* FATAL */)) {
      const errorMeta = error instanceof Error ? __spreadValues({
        name: error.name,
        message: error.message,
        stack: error.stack
      }, meta) : __spreadValues({ error }, meta);
      console.error(this.formatMessage("FATAL" /* FATAL */, message, errorMeta));
      trackEvent({
        event_type: "operational_fatal",
        severity: "critical",
        details: { message, error: errorMeta }
      }).catch(() => {
      });
    }
  }
};
var logger = new StructuredLogger();
if (typeof process !== "undefined") {
  process.on("uncaughtException", (err) => {
    logger.fatal("CRITICAL: Uncaught Exception detected in Node process", err);
    if (process.env.NODE_ENV === "production") {
      setTimeout(() => process.exit(1), 500);
    }
  });
  process.on("unhandledRejection", (reason, promise) => {
    logger.error("CRITICAL: Unhandled Rejection detected in Node process", {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : void 0
    });
  });
}

// src/app/api/webhooks/razorpay/route.ts
init_supabase_server();

// packages/shared-lib/src/lib/payment-service.ts
var import_server_only10 = require("server-only");
init_supabase_server();
init_audit();

// packages/shared-lib/src/lib/mock-payment-provider.ts
var import_server_only5 = require("server-only");
var MockPaymentProvider = class {
  async createOrder(request) {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const orderId = `order_mock_${randomSuffix}`;
    return {
      id: orderId,
      amount: request.amount,
      currency: request.currency || "INR",
      status: "created"
    };
  }
  async verifyPayment(request) {
    return !!request.signature;
  }
  async refundPayment(request) {
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    return {
      id: `rfnd_mock_${randomSuffix}`,
      status: "processed"
    };
  }
};
var paymentProvider = new MockPaymentProvider();

// packages/shared-lib/src/lib/commission-engine.ts
var import_server_only6 = require("server-only");
init_supabase_server();
async function calculateCommission(bookingAmount, serviceCategoryId) {
  let commissionPercent = 15;
  if (serviceCategoryId) {
    const { data: rule } = await supabaseAdmin.from("commission_rules").select("commission_percent").eq("service_category_id", serviceCategoryId).eq("is_active", true).single();
    if (rule && rule.commission_percent) {
      commissionPercent = Number(rule.commission_percent);
      const commissionAmount2 = bookingAmount * commissionPercent / 100;
      return Number(commissionAmount2.toFixed(2));
    }
  }
  try {
    const { data: setting } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "commission_rate").single();
    if (setting && setting.value) {
      const parsed = parseFloat(setting.value);
      if (!isNaN(parsed) && parsed >= 0) {
        commissionPercent = parsed;
      }
    }
  } catch (_) {
  }
  const commissionAmount = bookingAmount * commissionPercent / 100;
  return Number(commissionAmount.toFixed(2));
}

// packages/shared-lib/src/lib/wallet-engine.ts
var import_server_only7 = require("server-only");
init_supabase_server();
init_audit();
init_types();
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

// packages/shared-lib/src/lib/payment-service.ts
init_types();
async function finalizeBookingFinancials(bookingId) {
  var _a2, _b;
  try {
    const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select("id, customer_id, worker_id, total_amount, payment_mode, service_items(category_id)").eq("id", bookingId).single();
    if (bookingErr || !booking || !booking.worker_id) {
      throw bookingErr || new Error("Booking or Worker not found");
    }
    const categoryId = ((_a2 = booking.service_items) == null ? void 0 : _a2.category_id) || null;
    const amount = Number(booking.total_amount);
    const commissionAmount = await calculateCommission(amount, categoryId);
    const workerShare = amount - commissionAmount;
    if (booking.payment_mode === "COD") {
      const deductResult = await deductCommission(booking.worker_id, booking.id, commissionAmount);
      if (!deductResult.success) {
        throw new Error(`Failed to deduct commission: ${deductResult.error}`);
      }
      await supabaseAdmin.from("payments").insert({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        // Corrected customer ID
        payment_mode: "COD",
        status: "SUCCESS",
        amount,
        admin_commission: commissionAmount,
        worker_share: workerShare,
        paid_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      await supabaseAdmin.from("settlement_ledger").insert({
        worker_id: booking.worker_id,
        booking_id: booking.id,
        gross_amount: amount,
        commission_amount: commissionAmount,
        net_amount: 0,
        // No platform payout needed
        status: "PENDING"
      });
    } else if (booking.payment_mode === "ONLINE") {
      await supabaseAdmin.from("payments").update({
        admin_commission: commissionAmount,
        worker_share: workerShare,
        status: "SUCCESS"
      }).eq("booking_id", booking.id);
      await supabaseAdmin.from("settlement_ledger").insert({
        worker_id: booking.worker_id,
        booking_id: booking.id,
        gross_amount: amount,
        commission_amount: commissionAmount,
        net_amount: workerShare,
        status: "PENDING"
      });
    }
    await supabaseAdmin.from("invoices").update({ status: "PAID" }).eq("booking_id", booking.id);
    if (booking.customer_id) {
      try {
        const { data: referral } = await supabaseAdmin.from("referrals").select("id, referrer_id, reward_amount, status, role").eq("referred_user_id", booking.customer_id).eq("status", "PENDING").maybeSingle();
        if (referral) {
          const { data: settings } = await supabaseAdmin.from("referral_settings").select("min_bookings_to_qualify").eq("role", referral.role || "customer").eq("active", true).maybeSingle();
          const minBookings = (_b = settings == null ? void 0 : settings.min_bookings_to_qualify) != null ? _b : 1;
          const { count, error: countErr } = await supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", booking.customer_id).eq("status", "COMPLETED");
          if (!countErr && count !== null && count >= minBookings) {
            const { error: qualErr } = await supabaseAdmin.from("referrals").update({ status: "QUALIFIED" }).eq("id", referral.id);
            if (qualErr) {
              console.error("Failed to update referral to QUALIFIED:", qualErr);
            } else {
              const { dispatchNotification: dispatchNotification2 } = await Promise.resolve().then(() => (init_notification_dispatcher(), notification_dispatcher_exports));
              await dispatchNotification2({
                userId: referral.referrer_id,
                type: "REFERRAL_QUALIFIED",
                title: "\u{1F389} Referral Qualified!",
                body: `Your friend has completed the required service(s)! Your reward of \u20B9${referral.reward_amount || 500} is qualified and pending admin processing.`
              });
            }
          }
        }
      } catch (refErr) {
        console.error("[Payment Service] Automatic referral check failed (non-fatal):", refErr);
      }
    }
    return true;
  } catch (error) {
    console.error("[Payment Service] Finalize booking failed:", error);
    return false;
  }
}

// src/app/api/webhooks/razorpay/route.ts
async function POST(request) {
  var _a2, _b;
  try {
    const body = await request.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
    }
    const signature = request.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.includes("placeholder")) {
      logger.error("[Razorpay Webhook] Verification failed: RAZORPAY_WEBHOOK_SECRET is not configured or contains placeholders.");
      return NextResponse.json({ error: "Webhook secret misconfiguration" }, { status: 500 });
    }
    if (!signature) {
      logger.warn("[Razorpay Webhook] Missing x-razorpay-signature header.");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }
    const expectedSignature = import_crypto.default.createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (expectedSignature !== signature) {
      logger.warn("[Razorpay Webhook] Cryptographic signature mismatch. Rejecting webhook event.");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    logger.info("[Razorpay Webhook] Event verified and received successfully", { event: payload == null ? void 0 : payload.event });
    if ((payload == null ? void 0 : payload.event) === "payment.captured" || (payload == null ? void 0 : payload.event) === "order.paid") {
      const paymentEntity = (_b = (_a2 = payload.payload) == null ? void 0 : _a2.payment) == null ? void 0 : _b.entity;
      if (paymentEntity && paymentEntity.order_id) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const { data: updatedPayment, error: updateError } = await supabaseAdmin.from("payments").update({
          status: "SUCCESS",
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        }).eq("razorpay_order_id", orderId).neq("status", "SUCCESS").select("id, booking_id").single();
        if (updateError && updateError.code === "PGRST116") {
          logger.info("[Razorpay Webhook] Payment already processed or not found, exiting idempotently.", { orderId });
          return NextResponse.json({ received: true, note: "Already processed or invalid" }, { status: 200 });
        }
        if (updateError || !updatedPayment) {
          logger.error("[Razorpay Webhook] Database update failed:", updateError);
          return NextResponse.json({ error: "Database transaction failed" }, { status: 500 });
        }
        await finalizeBookingFinancials(updatedPayment.booking_id);
      }
    }
    return NextResponse.json({ received: true, event: payload == null ? void 0 : payload.event }, { status: 200 });
  } catch (error) {
    logger.error("[Razorpay Webhook] Processing exception:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
async function GET() {
  return NextResponse.json({ status: "Razorpay webhook API active" });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
