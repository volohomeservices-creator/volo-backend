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
var import_server_only3, REQUIRED_ENV_VARS, PLACEHOLDERS, validated;
var init_env = __esm({
  "packages/shared-lib/src/lib/env.ts"() {
    "use strict";
    import_server_only3 = require("server-only");
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
var import_server_only4, import_app, import_auth, import_messaging, import_jose2, projectId, clientEmail, privateKey, getAdminAuth, getAdminMessaging, adminAuth, adminMessaging;
var init_firebase_admin = __esm({
  "packages/shared-lib/src/lib/firebase-admin.ts"() {
    "use strict";
    import_server_only4 = require("server-only");
    import_app = require("firebase-admin/app");
    import_auth = require("firebase-admin/auth");
    import_messaging = require("firebase-admin/messaging");
    import_jose2 = require("jose");
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

// packages/shared-types/src/index.ts
var import_zod2, PhoneSchema, OtpSchema, CreateBookingSchema, ProfileUpdateSchema;
var init_src = __esm({
  "packages/shared-types/src/index.ts"() {
    "use strict";
    import_zod2 = require("zod");
    PhoneSchema = import_zod2.z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
    OtpSchema = import_zod2.z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits");
    CreateBookingSchema = import_zod2.z.object({
      service_item_id: import_zod2.z.string().uuid("Invalid service item ID"),
      address: import_zod2.z.string().min(5, "Address must be at least 5 characters"),
      latitude: import_zod2.z.number(),
      longitude: import_zod2.z.number(),
      payment_mode: import_zod2.z.enum(["ONLINE", "COD", "WALLET"]),
      notes: import_zod2.z.string().optional()
    });
    ProfileUpdateSchema = import_zod2.z.object({
      full_name: import_zod2.z.string().min(2, "Name must be at least 2 characters"),
      email: import_zod2.z.string().email("Invalid email address").optional().or(import_zod2.z.literal(""))
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
var init_notification_dispatcher = __esm({
  "packages/shared-lib/src/lib/notification-dispatcher.ts"() {
    "use strict";
    init_supabase_server();
    init_firebase_notifications();
  }
});

// src/app/api/customer/bookings/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});
module.exports = __toCommonJS(route_exports);

// packages/shared-lib/src/lib/schemas.ts
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
var PHONE_REGEX = /^\+91\d{10}$/;
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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

// packages/shared-lib/src/lib/schemas.ts
var pinLoginSchema = import_zod.z.object({
  phone: import_zod.z.string().regex(PHONE_REGEX, "Invalid Indian phone number format (+91XXXXXXXXXX)"),
  pin: import_zod.z.string().length(4, "PIN must be 4 digits").regex(/^\d+$/, "PIN must be numeric"),
  recaptchaToken: import_zod.z.string().optional().nullable()
});
var preCheckSchema = import_zod.z.object({
  phone: import_zod.z.string().regex(PHONE_REGEX, "Invalid Indian phone number format (+91XXXXXXXXXX)"),
  deviceToken: import_zod.z.string().optional().nullable(),
  recaptchaToken: import_zod.z.string().optional().nullable()
});
var setPinSchema = import_zod.z.object({
  pin: import_zod.z.string().length(4, "PIN must be 4 digits").regex(/^\d+$/, "PIN must be numeric")
});
var adminLoginSchema = import_zod.z.object({
  email: import_zod.z.string().email(),
  password: import_zod.z.string().min(8)
});
var customerProfileUpdateSchema = import_zod.z.object({
  full_name: import_zod.z.string().min(2).max(100).optional(),
  email: import_zod.z.string().email().optional(),
  address: import_zod.z.string().max(255).optional(),
  avatar_url: import_zod.z.string().url().or(import_zod.z.string().length(0)).optional(),
  city: import_zod.z.string().max(100).optional(),
  state: import_zod.z.string().max(100).optional(),
  pincode: import_zod.z.string().max(20).optional()
}).strict();
var customerAddressSchema = import_zod.z.object({
  label: import_zod.z.string().min(1).max(50).optional(),
  address: import_zod.z.string().min(5).max(255),
  city: import_zod.z.string().min(2).max(100),
  state: import_zod.z.string().min(2).max(100),
  pincode: import_zod.z.string().min(4).max(20),
  latitude: import_zod.z.number().min(-90).max(90).optional(),
  longitude: import_zod.z.number().min(-180).max(180).optional(),
  is_default: import_zod.z.boolean().optional(),
  place_id: import_zod.z.string().optional(),
  formatted_address: import_zod.z.string().optional()
}).strict();
var workerProfileUpdateSchema = import_zod.z.object({
  full_name: import_zod.z.string().max(100).optional(),
  email: import_zod.z.string().email().optional(),
  avatar_url: import_zod.z.string().url().or(import_zod.z.string().length(0)).optional(),
  dob: import_zod.z.string().optional(),
  address: import_zod.z.string().max(255).optional(),
  city: import_zod.z.string().max(100).optional(),
  state: import_zod.z.string().max(100).optional(),
  pincode: import_zod.z.string().max(20).optional(),
  skills: import_zod.z.array(import_zod.z.string()).optional(),
  experience: import_zod.z.number().min(0).max(50).optional(),
  languages: import_zod.z.array(import_zod.z.string()).optional(),
  bio: import_zod.z.string().max(1e3).optional()
}).strict();
var workerLocationUpdateSchema = import_zod.z.object({
  latitude: import_zod.z.number().min(-90).max(90),
  longitude: import_zod.z.number().min(-180).max(180),
  heading: import_zod.z.number().min(0).max(360).optional(),
  accuracy: import_zod.z.number().optional(),
  speed: import_zod.z.number().optional(),
  deviceType: import_zod.z.string().optional()
}).strict();
var bookingCreateSchema = import_zod.z.object({
  service_item_id: import_zod.z.string().min(1, "service_item_id is required"),
  address_id: import_zod.z.string().optional().nullable(),
  address: import_zod.z.string().optional().nullable(),
  latitude: import_zod.z.number().or(import_zod.z.string().transform(Number)).optional().nullable(),
  longitude: import_zod.z.number().or(import_zod.z.string().transform(Number)).optional().nullable(),
  images: import_zod.z.array(import_zod.z.string()).optional().nullable(),
  scheduled_at: import_zod.z.string().optional().nullable(),
  notes: import_zod.z.string().max(500).optional().nullable(),
  promo_code: import_zod.z.string().max(50).optional().nullable(),
  payment_mode: import_zod.z.string().optional().default("COD")
});
var bookingStatusUpdateSchema = import_zod.z.object({
  status: import_zod.z.string().min(1, "status is required"),
  reason: import_zod.z.string().max(500).optional().nullable(),
  otp: import_zod.z.string().optional().nullable(),
  imageUrl: import_zod.z.string().optional().nullable()
});
var sosTriggerSchema = import_zod.z.object({
  booking_id: import_zod.z.string().regex(UUID_REGEX).optional(),
  lat: import_zod.z.number().min(-90).max(90).optional(),
  lng: import_zod.z.number().min(-180).max(180).optional()
}).strict();

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

// src/app/api/customer/bookings/route.ts
init_supabase_server();

// packages/shared-lib/src/lib/assignment-engine.ts
var import_server_only5 = require("server-only");
init_supabase_server();
init_audit();
init_notification_dispatcher();
init_types();
var cachedSystemAdminId = null;
async function getSystemAdminId() {
  if (cachedSystemAdminId) return cachedSystemAdminId;
  if (process.env.SYSTEM_USER_ID) {
    cachedSystemAdminId = process.env.SYSTEM_USER_ID;
    return cachedSystemAdminId;
  }
  const { data } = await supabaseAdmin.from("users").select("id").eq("role", "admin").order("created_at", { ascending: true }).limit(1).single();
  if (data && data.id) {
    cachedSystemAdminId = data.id;
    return cachedSystemAdminId;
  }
  return "system-admin-fallback";
}
async function startAssignment(bookingId) {
  var _a2;
  console.log(`[Assignment Engine] Starting assignment for booking ${bookingId}`);
  const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select(`
      id,
      status,
      lat,
      lng,
      payment_mode,
      service_item_id,
      service_items (
        category_id
      )
    `).eq("id", bookingId).single();
  if (bookingErr || !booking) {
    throw new Error(`Booking ${bookingId} not found`);
  }
  if (booking.status !== "PENDING_ASSIGNMENT") {
    throw new Error(`Booking ${bookingId} is in status ${booking.status}, cannot start auto-assignment`);
  }
  const categoryId = ((_a2 = booking.service_items) == null ? void 0 : _a2.category_id) || null;
  const { data: radiusData } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "search_radius_km").single();
  const radiusKm = radiusData ? parseFloat(radiusData.value) : 10;
  const { data: workers, error: rpcErr } = await supabaseAdmin.rpc(
    "find_nearby_eligible_workers",
    {
      p_lat: booking.lat,
      p_lng: booking.lng,
      p_radius_km: radiusKm,
      p_service_category_id: categoryId,
      p_booking_id: bookingId,
      p_payment_mode: booking.payment_mode
    }
  );
  if (rpcErr) {
    console.error("[Assignment Engine] Error finding nearby workers:", rpcErr);
    throw rpcErr;
  }
  const typedWorkers = workers || [];
  if (typedWorkers.length === 0) {
    console.log(`[Assignment Engine] No eligible workers found for booking ${bookingId}`);
    await supabaseAdmin.from("bookings").update({
      status: "MANUAL_ASSIGNMENT_REQUIRED",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", bookingId);
    const { data: admins } = await supabaseAdmin.from("users").select("id").eq("role", "admin");
    if (admins && admins.length > 0) {
      const adminUserIds = admins.map((a) => a.id);
      await dispatchBulkNotifications({
        userIds: adminUserIds,
        type: "LOW_WALLET_BALANCE",
        title: "Manual Assignment Required",
        body: `No eligible workers found nearby for booking ${bookingId}. Manual assignment is required.`,
        data: { booking_id: bookingId }
      });
    }
    await logAuditAction({
      admin_id: await getSystemAdminId(),
      action: "ASSIGNMENT_MANUAL_REQUIRED" /* ASSIGNMENT_MANUAL_REQUIRED */,
      target_type: "booking",
      target_id: bookingId,
      metadata: { booking_id: bookingId, reason: "NO_WORKERS_FOUND" }
    });
    return "NO_WORKERS";
  }
  const group1 = typedWorkers;
  const expiresAt = new Date(Date.now() + 18e4).toISOString();
  const { data: queue, error: queueErr } = await supabaseAdmin.from("assignment_queue").upsert({
    booking_id: bookingId,
    current_group: 1,
    group_workers: group1,
    all_notified_workers: group1.map((w) => w.worker_id),
    status: "BROADCASTING",
    attempts: 1,
    group_expires_at: expiresAt,
    started_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }, { onConflict: "booking_id" }).select("id").single();
  if (queueErr || !queue) {
    console.error("[Assignment Engine] Error inserting to queue:", queueErr);
    throw new Error("Failed to create assignment queue entry");
  }
  await broadcastToGroup(bookingId, group1);
  await logAuditAction({
    admin_id: await getSystemAdminId(),
    action: "ASSIGNMENT_STARTED" /* ASSIGNMENT_STARTED */,
    target_type: "booking",
    target_id: bookingId,
    metadata: {
      booking_id: bookingId,
      queue_id: queue.id,
      workers_found_count: typedWorkers.length,
      group1_count: group1.length
    }
  });
  return queue.id;
}
async function broadcastToGroup(bookingId, workers) {
  if (workers.length === 0) return;
  console.log(`[Assignment Engine] Broadcasting booking ${bookingId} to ${workers.length} workers`);
  const workerIds = workers.map((w) => w.worker_id);
  const success = await dispatchBulkNotifications({
    userIds: workerIds,
    type: "BOOKING_REQUEST",
    title: "New job request",
    body: "A new job is available near you.",
    data: { booking_id: bookingId }
  });
  if (!success) {
    console.error("[Assignment Engine] Failed to dispatch broadcast notifications");
  }
  await logAuditAction({
    admin_id: await getSystemAdminId(),
    action: "ASSIGNMENT_BROADCAST" /* ASSIGNMENT_BROADCAST */,
    target_type: "booking",
    target_id: bookingId,
    metadata: {
      booking_id: bookingId,
      worker_count: workers.length,
      worker_ids: workers.map((w) => w.worker_id)
    }
  });
}

// src/app/api/customer/bookings/route.ts
init_notification_dispatcher();

// packages/shared-lib/src/lib/payment-service.ts
var import_server_only9 = require("server-only");
init_supabase_server();
init_audit();

// packages/shared-lib/src/lib/mock-payment-provider.ts
var import_server_only6 = require("server-only");
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
var import_server_only7 = require("server-only");
init_supabase_server();

// packages/shared-lib/src/lib/wallet-engine.ts
var import_server_only8 = require("server-only");
init_supabase_server();
init_audit();
init_types();

// packages/shared-lib/src/lib/payment-service.ts
init_types();
async function createOnlinePayment(bookingId, customerId, amount) {
  try {
    const order = await paymentProvider.createOrder({
      amount: amount * 100,
      // typically in subunits (paise)
      receiptId: bookingId
    });
    const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 10)}`;
    const mockSignature = `sign_mock_${Math.random().toString(36).substring(2, 10)}`;
    const { data: payment, error: paymentErr } = await supabaseAdmin.from("payments").insert({
      booking_id: bookingId,
      customer_id: customerId,
      payment_mode: "ONLINE",
      status: "SUCCESS",
      // Immediately marking as SUCCESS for mock flow
      amount,
      razorpay_order_id: order.id,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: mockSignature,
      paid_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select("id").single();
    if (paymentErr || !payment) {
      throw paymentErr || new Error("Failed to create payment record");
    }
    await supabaseAdmin.from("payment_attempts").insert({
      payment_id: payment.id,
      status: "CAPTURED",
      response: { mock: true, order_id: order.id, payment_id: mockPaymentId }
    });
    await logAuditAction({
      admin_id: customerId,
      action: "PAYMENT_CAPTURED" /* PAYMENT_CAPTURED */,
      target_type: "payment",
      target_id: payment.id,
      metadata: { booking_id: bookingId, amount }
    });
    return { success: true };
  } catch (error) {
    console.error("[Payment Service] Error creating online payment:", error);
    return { success: false, error: error.message };
  }
}

// src/app/api/customer/bookings/route.ts
var dynamic = "force-dynamic";
async function GET(request) {
  try {
    const session = await requireRole(request, "customer");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const customerId = session.user_id;
    const { data: bookings, error } = await supabaseAdmin.from("bookings").select("*, service_items(name, description, base_price, estimated_mins), workers(users(full_name, phone))").eq("customer_id", customerId).not("status", "in", '("COMPLETED","CANCELLED")').order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ bookings: bookings || [] });
  } catch (error) {
    console.error("Error fetching customer active bookings:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
async function POST(request) {
  try {
    const session = await requireRole(request, "customer");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const customerId = session.user_id;
    const validation = await validateBody(request, bookingCreateSchema);
    if (!validation.success) {
      console.error("[Customer Bookings POST] Validation error:", validation.errorResponse);
      return validation.errorResponse;
    }
    const body = validation.data;
    const {
      service_item_id,
      address,
      latitude,
      longitude,
      scheduled_at,
      notes,
      payment_mode,
      // Extract payment_mode
      promo_code,
      // Extract optional promo code string
      images
      // array of storage paths in 'booking-images' bucket
    } = body;
    if (!service_item_id || !address || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 });
    }
    const { data: item, error: itemErr } = await supabaseAdmin.from("service_items").select("*").eq("id", service_item_id).single();
    if (itemErr || !item) {
      return NextResponse.json({ error: "Service item not found." }, { status: 404 });
    }
    const basePrice = Number(item.base_price);
    const serviceFee = basePrice * 0.1;
    const tax = basePrice * 0.05;
    const totalAmount = basePrice + serviceFee + tax;
    let discountAmount = 0;
    let promo = null;
    if (promo_code) {
      const { data: promoRow, error: promoErr } = await supabaseAdmin.from("promo_codes").select("*").eq("code", promo_code.trim().toUpperCase()).eq("active", true).single();
      if (promoErr || !promoRow) {
        return NextResponse.json({ error: "Invalid or expired promo code." }, { status: 400 });
      }
      promo = promoRow;
      if (promo.expires_at && new Date(promo.expires_at) < /* @__PURE__ */ new Date()) {
        return NextResponse.json({ error: "This promo code has expired." }, { status: 400 });
      }
      if (promo.valid_from && new Date(promo.valid_from) > /* @__PURE__ */ new Date()) {
        return NextResponse.json({ error: "This promo code is not active yet." }, { status: 400 });
      }
      if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
        return NextResponse.json({ error: "This promo code has reached its usage limit." }, { status: 400 });
      }
      if (promo.applicable_role !== "all" && promo.applicable_role !== session.role) {
        return NextResponse.json({ error: "This promo code is not applicable for your account type." }, { status: 400 });
      }
      const { data: existingUsage } = await supabaseAdmin.from("promo_code_usages").select("id").eq("promo_code_id", promo.id).eq("user_id", customerId).single();
      if (existingUsage) {
        return NextResponse.json({ error: "You have already used this promo code." }, { status: 400 });
      }
      if (promo.min_order_amount && totalAmount < Number(promo.min_order_amount)) {
        return NextResponse.json({
          error: `Minimum order amount of \u20B9${promo.min_order_amount} required for this code.`
        }, { status: 400 });
      }
      if (promo.discount_type === "FLAT") {
        discountAmount = Math.min(Number(promo.discount_value), totalAmount);
      } else {
        discountAmount = totalAmount * Number(promo.discount_value) / 100;
        if (promo.max_discount_amount) {
          discountAmount = Math.min(discountAmount, Number(promo.max_discount_amount));
        }
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
    }
    const finalTotalAmount = Math.max(0, totalAmount - discountAmount);
    let wallet = null;
    if (payment_mode === "WALLET") {
      const { data: walletRow, error: walletErr } = await supabaseAdmin.from("customer_wallets").select("*").eq("customer_id", customerId).maybeSingle();
      if (walletErr || !walletRow) {
        return NextResponse.json({ error: "Volo Wallet not found." }, { status: 400 });
      }
      if (Number(walletRow.balance) < finalTotalAmount) {
        return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 400 });
      }
      wallet = walletRow;
    }
    const otp = Math.floor(1e3 + Math.random() * 9e3).toString();
    const bookingType = scheduled_at ? "SCHEDULED" : "INSTANT";
    const finalPaymentMode = payment_mode === "ONLINE" || payment_mode === "WALLET" ? "ONLINE" : "COD";
    let lat = Number(latitude);
    let lng = Number(longitude);
    if (lat === 12.9716 && lng === 77.5946) {
      const geocodeResult = await geocodeAddress(address);
      if (geocodeResult) {
        lat = geocodeResult.lat;
        lng = geocodeResult.lng;
      }
    }
    const { data: booking, error: insertErr } = await supabaseAdmin.from("bookings").insert({
      customer_id: customerId,
      service_item_id,
      booking_type: bookingType,
      payment_mode: finalPaymentMode,
      status: "PENDING_ASSIGNMENT",
      address_line: address,
      lat,
      lng,
      scheduled_at: scheduled_at ? new Date(scheduled_at).toISOString() : null,
      total_amount: finalTotalAmount,
      notes: notes || "",
      otp
    }).select("*").single();
    if (insertErr) throw insertErr;
    if (payment_mode === "WALLET" && wallet) {
      const newBalance = Number(wallet.balance) - finalTotalAmount;
      const { error: deductErr } = await supabaseAdmin.from("customer_wallets").update({ balance: newBalance, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("customer_id", customerId);
      if (deductErr) {
        console.error("Wallet deduction error:", deductErr);
        throw new Error("Failed to complete wallet transaction deduction.");
      }
      const { error: txnErr } = await supabaseAdmin.from("customer_wallet_transactions").insert({
        customer_id: customerId,
        amount: finalTotalAmount,
        type: "PAYMENT",
        description: `Payment for booking #${booking.id.substring(0, 8).toUpperCase()}`
      });
      if (txnErr) {
        console.error("Failed to insert customer wallet transaction log:", txnErr);
      }
      const { data: payment, error: paymentErr } = await supabaseAdmin.from("payments").insert({
        booking_id: booking.id,
        customer_id: customerId,
        payment_mode: "ONLINE",
        status: "SUCCESS",
        amount: finalTotalAmount,
        razorpay_order_id: "wallet_pay",
        razorpay_payment_id: `wallet_tx_${Math.random().toString(36).substring(2, 10)}`,
        paid_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select("id").single();
      if (paymentErr) {
        console.error("Failed to create payment record for wallet pay:", paymentErr);
      } else {
        await supabaseAdmin.from("payment_attempts").insert({
          payment_id: payment.id,
          status: "CAPTURED",
          response: { wallet: true, amount: finalTotalAmount }
        });
      }
    }
    if (payment_mode === "ONLINE") {
      const paymentResult = await createOnlinePayment(booking.id, customerId, finalTotalAmount);
      if (!paymentResult.success) {
        console.error("Failed to create mock online payment:", paymentResult.error);
      }
    }
    if (promo) {
      const { error: usageErr } = await supabaseAdmin.from("promo_code_usages").insert({
        promo_code_id: promo.id,
        user_id: customerId,
        booking_id: booking.id,
        discount_applied: discountAmount
      });
      if (usageErr) {
        console.error("Warning: Failed to insert promo code usage row:", usageErr.message);
      }
      const { error: promoUpdateErr } = await supabaseAdmin.from("promo_codes").update({ used_count: promo.used_count + 1 }).eq("id", promo.id);
      if (promoUpdateErr) {
        console.error("Warning: Failed to increment promo code used count:", promoUpdateErr.message);
      }
    }
    if (images && Array.isArray(images) && images.length > 0) {
      const imageRows = images.map((imgUrl) => ({
        booking_id: booking.id,
        image_url: imgUrl
      }));
      const { error: imgErr } = await supabaseAdmin.from("booking_images").insert(imageRows);
      if (imgErr) {
        console.error("Warning: Failed to insert booking images mapping:", imgErr.message);
      }
    }
    await dispatchNotification({
      userId: customerId,
      type: "BOOKING_CREATED",
      title: "Booking Confirmed",
      body: `Your service request for ${item.name} is successfully registered.`
    });
    startAssignment(booking.id).catch((err) => {
      console.error("Assignment start failed:", err);
    });
    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      message: "Booking created successfully."
    });
  } catch (error) {
    console.error("Error creating booking:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "VoloHomeServices/1.0 (contact@volo.com)"
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lon = parseFloat(data[0].lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lng: lon };
      }
    }
  } catch (error) {
    console.error("Nominatim geocoding error:", error);
  }
  return null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST,
  dynamic
});
