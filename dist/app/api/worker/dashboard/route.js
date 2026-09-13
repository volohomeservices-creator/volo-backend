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

// src/app/api/worker/dashboard/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  dynamic: () => dynamic
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

// packages/shared-lib/src/lib/notification-dispatcher.ts
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

// src/app/api/worker/dashboard/route.ts
var dynamic = "force-dynamic";
async function GET(request) {
  var _a2, _b;
  try {
    const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
    let session;
    try {
      session = await requireRole(request, "worker");
    } catch (err) {
      if (err.status === 401) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      throw err;
    }
    const workerId = session.user_id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
    const [
      workerRes,
      walletRes,
      profileRes,
      recentBookingsRes,
      totalCompletedRes,
      notificationsRes,
      liveLocRes
    ] = await Promise.all([
      supabaseAdmin.from("workers").select("status, kyc_status, current_lat, current_lng").eq("id", workerId).single(),
      supabaseAdmin.from("worker_wallets").select("balance").eq("worker_id", workerId).maybeSingle(),
      supabaseAdmin.from("worker_profiles").select("address, city, state, skills, experience, languages, bio").eq("worker_id", workerId).maybeSingle(),
      // Fetch only recent/active bookings for the dashboard instead of all-time history
      supabaseAdmin.from("bookings").select("id, status, scheduled_at, created_at, completed_at, total_amount").eq("worker_id", workerId).gte("created_at", thirtyDaysAgo),
      // Use a count query for all-time stats
      supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).eq("worker_id", workerId).eq("status", "COMPLETED"),
      supabaseAdmin.from("notifications").select("id, user_id, title, body, created_at, is_read, data").eq("user_id", workerId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("worker_live_locations").select("latitude, longitude").eq("worker_id", workerId).maybeSingle()
    ]);
    if (workerRes.error || !workerRes.data) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404, headers: cacheHeaders });
    }
    const [rejectionsRes, broadcastingRes] = await Promise.all([
      supabaseAdmin.from("worker_job_rejections").select("booking_id").eq("worker_id", workerId),
      supabaseAdmin.from("bookings").select(`
        id, status, total_amount, lat, lng, address_line, scheduled_at, created_at,
        service_items(name),
        customer:users!bookings_customer_id_fkey(full_name),
        assignment_queue!inner(status, group_workers, group_expires_at)
      `).eq("status", "PENDING_ASSIGNMENT").eq("assignment_queue.status", "BROADCASTING")
    ]);
    const worker = workerRes.data;
    const profile = profileRes.data || {};
    const bookings = recentBookingsRes.data || [];
    const totalCompletedCount = totalCompletedRes.count || 0;
    const notificationsRaw = notificationsRes.data || [];
    const filteredNotifications = await filterRealNotifications(notificationsRaw, workerId);
    const notifications = filteredNotifications.slice(0, 5);
    const { data: user } = await supabaseAdmin.from("users").select("full_name, email, avatar_url").eq("id", workerId).single();
    let completedFields = 0;
    const totalFields = 10;
    if (user == null ? void 0 : user.full_name) completedFields++;
    if (user == null ? void 0 : user.email) completedFields++;
    if (user == null ? void 0 : user.avatar_url) completedFields++;
    if (profile.address) completedFields++;
    if (profile.city) completedFields++;
    if (profile.state) completedFields++;
    if (profile.skills && profile.skills.length > 0) completedFields++;
    if (profile.experience !== void 0 && profile.experience !== null) completedFields++;
    if (profile.languages && profile.languages.length > 0) completedFields++;
    if (profile.bio) completedFields++;
    const profileCompletion = Math.round(completedFields / totalFields * 100);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayJobs = bookings.filter((b) => {
      var _a3, _b2;
      return ((_a3 = b.created_at) == null ? void 0 : _a3.startsWith(today)) || ((_b2 = b.scheduled_at) == null ? void 0 : _b2.startsWith(today));
    });
    const pendingJobs = bookings.filter((b) => b.status === "PENDING_ASSIGNMENT" || b.status === "WORKER_ASSIGNED");
    const upcomingJobs = bookings.filter((b) => b.status === "WORKER_ACCEPTED" && b.scheduled_at && new Date(b.scheduled_at) > /* @__PURE__ */ new Date());
    const completedTodayBookings = bookings.filter((b) => {
      var _a3, _b2;
      return b.status === "COMPLETED" && (((_a3 = b.completed_at) == null ? void 0 : _a3.startsWith(today)) || ((_b2 = b.created_at) == null ? void 0 : _b2.startsWith(today)));
    });
    const completed_today = completedTodayBookings.length;
    const today_earnings = completedTodayBookings.reduce((sum, b) => sum + Number(b.total_amount || 0) * 0.85, 0);
    const { data: activeJob } = await supabaseAdmin.from("bookings").select("id, status, address_line, lat, lng, scheduled_at, service_items(name)").eq("worker_id", workerId).in("status", ["WORKER_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    const formattedActiveJob = activeJob ? {
      id: activeJob.id,
      status: activeJob.status,
      address_line: activeJob.address_line,
      lat: activeJob.lat,
      lng: activeJob.lng,
      scheduled_at: activeJob.scheduled_at,
      service_name: ((_a2 = activeJob.service_items) == null ? void 0 : _a2.name) || "Home Service"
    } : null;
    const liveLoc = liveLocRes.data;
    const current_lat = liveLoc ? Number(liveLoc.latitude) : worker.current_lat;
    const current_lng = liveLoc ? Number(liveLoc.longitude) : worker.current_lng;
    const rejectedBookingIds = new Set((rejectionsRes.data || []).map((r) => r.booking_id));
    const eligibleBroadcastBookings = (broadcastingRes.data || []).filter((b) => {
      var _a3;
      if (rejectedBookingIds.has(b.id)) return false;
      const groupWorkers = ((_a3 = b.assignment_queue) == null ? void 0 : _a3.group_workers) || [];
      const isInGroup = groupWorkers.some((gw) => gw.worker_id === workerId);
      return isInGroup;
    });
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    const broadcastJobs = eligibleBroadcastBookings.map((b) => {
      var _a3, _b2, _c;
      let distance = 0;
      if (current_lat !== null && current_lng !== null && b.lat !== null && b.lng !== null) {
        distance = Number(calculateDistance(current_lat, current_lng, b.lat, b.lng).toFixed(1));
      }
      return {
        id: b.id,
        service_name: ((_a3 = b.service_items) == null ? void 0 : _a3.name) || "Home Service",
        customer_first_name: ((_b2 = b.customer) == null ? void 0 : _b2.full_name) ? b.customer.full_name.split(" ")[0] : "Client",
        locality: b.address_line ? b.address_line.split(",")[0] : "Nearby",
        distance_km: distance,
        scheduled_at: b.scheduled_at || b.created_at,
        estimated_earnings: Number((b.total_amount * 0.85).toFixed(2)),
        status: b.status,
        expiresAt: (_c = b.assignment_queue) == null ? void 0 : _c.group_expires_at
      };
    }).sort((a, b) => a.distance_km - b.distance_km);
    return NextResponse.json({
      profileCompletion,
      currentStatus: worker.status,
      kycStatus: worker.kyc_status,
      todayJobsCount: todayJobs.length,
      completedJobsCount: totalCompletedCount,
      pendingJobsCount: pendingJobs.length,
      upcomingJobs: upcomingJobs.slice(0, 5),
      commissionWalletBalance: Number(((_b = walletRes.data) == null ? void 0 : _b.balance) || 0),
      recentNotifications: notifications,
      activeJob: formattedActiveJob,
      broadcastJobs,
      stats: {
        today_earnings: Math.round(today_earnings),
        completed_today,
        rating: 4.8
      }
    }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Error fetching worker dashboard stats:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500, headers: { "Cache-Control": "no-store, max-age=0, must-revalidate" } }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  dynamic
});
