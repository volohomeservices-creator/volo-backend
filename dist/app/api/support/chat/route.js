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

// src/app/api/support/chat/route.ts
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

// packages/shared-lib/src/lib/firebase-admin.ts
var import_server_only3 = require("server-only");
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
var import_messaging = require("firebase-admin/messaging");
var import_jose2 = require("jose");

// packages/shared-lib/src/lib/env.ts
var import_server_only2 = require("server-only");
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

// packages/shared-lib/src/lib/audit.ts
var import_server_only4 = require("server-only");
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

// src/app/api/support/chat/route.ts
var supabaseAdmin2 = supabaseAdmin;
async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({
        threads: [],
        active_booking: null,
        active_sos: []
      });
    }
    if (session.role === "admin") {
      const { data: disputes, error: dispErr } = await supabaseAdmin2.from("disputes").select("id, booking_id, reported_by_id, type, description, status, resolution_notes, created_at, updated_at").order("created_at", { ascending: false });
      if (dispErr) {
        console.warn("Disputes query warning:", dispErr.message);
      }
      const safeDisputes = disputes || [];
      const reporterIds = Array.from(new Set(safeDisputes.map((d) => d.reported_by_id).filter(Boolean)));
      const bookingIds = Array.from(new Set(safeDisputes.map((d) => d.booking_id).filter((id) => id && id !== "00000000-0000-0000-0000-000000000000")));
      const userMap = {};
      const bookingMap = {};
      if (reporterIds.length > 0) {
        const { data: users } = await supabaseAdmin2.from("users").select("id, full_name, phone, role").in("id", reporterIds);
        (users || []).forEach((u) => {
          userMap[u.id] = u;
        });
      }
      if (bookingIds.length > 0) {
        const { data: bookings } = await supabaseAdmin2.from("bookings").select("id, status, total_amount, address, scheduled_date, worker_id, customer_id").in("id", bookingIds);
        (bookings || []).forEach((b) => {
          bookingMap[b.id] = b;
        });
      }
      const populatedThreads = safeDisputes.map((d) => __spreadProps(__spreadValues({}, d), {
        reporter: userMap[d.reported_by_id] || { full_name: "Customer / User", phone: "", role: "customer" },
        booking: bookingMap[d.booking_id] || null
      }));
      const { data: activeSos } = await supabaseAdmin2.from("sos_alerts").select("id, user_id, booking_id, created_at, status").eq("status", "ACTIVE");
      return NextResponse.json({
        threads: populatedThreads,
        active_sos: activeSos || []
      });
    }
    const { data: myDisputes } = await supabaseAdmin2.from("disputes").select("id, booking_id, type, description, status, resolution_notes, created_at, updated_at").eq("reported_by_id", session.user_id).order("created_at", { ascending: false });
    const { data: activeBooking } = await supabaseAdmin2.from("bookings").select("id, status, total_amount, scheduled_date").or(`customer_id.eq.${session.user_id},worker_id.eq.${session.user_id}`).in("status", ["PENDING", "ACCEPTED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({
      threads: myDisputes || [],
      active_booking: activeBooking || null
    });
  } catch (error) {
    console.error("Error fetching support chat:", error);
    return NextResponse.json({
      threads: [],
      active_booking: null,
      active_sos: []
    });
  }
}
async function POST(request) {
  try {
    const session = await getSessionFromRequest(request);
    const body = await request.json();
    const { booking_id, message, type = "OTHER", dispute_id, action } = body;
    if (!session) {
      let botResponse2 = "Thank you for reaching out to VOLO! Please log in to connect with a live specialist, track your bookings, or manage services.";
      const lower2 = (message || "").toLowerCase();
      if (lower2.includes("service") || lower2.includes("clean") || lower2.includes("ac") || lower2.includes("price")) {
        botResponse2 = "We offer verified master technicians for AC servicing, deep home cleaning, plumbing, and appliance repair with 30-day warranty.";
      } else if (lower2.includes("sos") || lower2.includes("emergency")) {
        botResponse2 = "\u{1F6A8} EMERGENCY HOTLINE: For urgent assistance, please call our 24/7 priority dispatch line at 1800-VOLO-HELP.";
      }
      return NextResponse.json({
        success: true,
        bot_response: botResponse2
      });
    }
    if (session.role === "admin" && dispute_id) {
      if (action === "RESOLVE") {
        await supabaseAdmin2.from("disputes").update({
          status: "RESOLVED",
          resolution_notes: message || "Resolved by Administrator.",
          resolved_at: (/* @__PURE__ */ new Date()).toISOString(),
          assigned_admin_id: session.user_id
        }).eq("id", dispute_id);
        return NextResponse.json({ success: true, status: "RESOLVED" });
      }
      const { data: dispute } = await supabaseAdmin2.from("disputes").select("reported_by_id, booking_id").eq("id", dispute_id).single();
      if (dispute == null ? void 0 : dispute.reported_by_id) {
        try {
          await dispatchNotification({
            userId: dispute.reported_by_id,
            type: "ADMIN_BROADCAST",
            title: "\u{1F4AC} Support Specialist Reply",
            body: message
          });
        } catch (_) {
        }
        await supabaseAdmin2.from("disputes").update({
          status: "IN_PROGRESS",
          resolution_notes: message,
          assigned_admin_id: session.user_id
        }).eq("id", dispute_id);
      }
      return NextResponse.json({ success: true, message: "Reply dispatched to user" });
    }
    if (type === "EMERGENCY_SOS") {
      try {
        await supabaseAdmin2.from("sos_alerts").insert({
          user_id: session.user_id,
          booking_id: booking_id || null,
          status: "ACTIVE"
        });
      } catch (_) {
      }
      try {
        await supabaseAdmin2.from("disputes").insert({
          booking_id: booking_id || "00000000-0000-0000-0000-000000000000",
          reported_by_id: session.user_id,
          type: "UNPROFESSIONAL_CONDUCT",
          description: `\u{1F6A8} [EMERGENCY SOS ALERT]: ${message}`,
          status: "OPEN"
        });
      } catch (_) {
      }
      return NextResponse.json({
        success: true,
        bot_response: "\u{1F6A8} EMERGENCY ALERT RECEIVED: Our Priority Incident Response team and emergency dispatchers have been alerted with your location and booking reference."
      });
    }
    let validBookingId = booking_id;
    if (!validBookingId) {
      const { data: latestBooking } = await supabaseAdmin2.from("bookings").select("id").or(`customer_id.eq.${session.user_id},worker_id.eq.${session.user_id}`).order("created_at", { ascending: false }).limit(1).maybeSingle();
      validBookingId = latestBooking == null ? void 0 : latestBooking.id;
    }
    if (validBookingId) {
      try {
        await supabaseAdmin2.from("disputes").insert({
          booking_id: validBookingId,
          reported_by_id: session.user_id,
          type: type === "PAYMENT_ISSUE" ? "PAYMENT_ISSUE" : "OTHER",
          description: message,
          status: "OPEN"
        });
      } catch (_) {
      }
    }
    let botResponse = "Thank you for reaching out. A VOLO Support Specialist has received your request and will assist you shortly.";
    const lower = (message || "").toLowerCase();
    if (lower.includes("where") || lower.includes("technician") || lower.includes("late") || lower.includes("delay")) {
      botResponse = "\u{1F4CD} We are tracking your technician. If your technician is delayed, you can check live GPS in your Bookings tab or request instant reassignment.";
    } else if (lower.includes("refund") || lower.includes("payment") || lower.includes("money") || lower.includes("charge")) {
      botResponse = "\u{1F4B3} All transactions are protected under the VOLO Escrow Guarantee. If a service is cancelled, refunds are automatically credited to your wallet/bank within 2-4 hours.";
    } else if (lower.includes("cancel") || lower.includes("reschedule")) {
      botResponse = "\u{1F4C5} You can reschedule or cancel directly from your Booking Details screen free of charge before the technician arrives.";
    }
    return NextResponse.json({
      success: true,
      bot_response: botResponse
    });
  } catch (error) {
    console.error("Error in support chat POST:", error);
    return NextResponse.json({
      success: true,
      bot_response: "Thank you for your message. A VOLO Specialist is reviewing your request."
    });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
