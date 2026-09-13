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

// packages/shared-lib/src/lib/mock-payment-provider.ts
var import_server_only6, MockPaymentProvider, paymentProvider;
var init_mock_payment_provider = __esm({
  "packages/shared-lib/src/lib/mock-payment-provider.ts"() {
    "use strict";
    import_server_only6 = require("server-only");
    MockPaymentProvider = class {
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
    paymentProvider = new MockPaymentProvider();
  }
});

// packages/shared-lib/src/lib/commission-engine.ts
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
var import_server_only7;
var init_commission_engine = __esm({
  "packages/shared-lib/src/lib/commission-engine.ts"() {
    "use strict";
    import_server_only7 = require("server-only");
    init_supabase_server();
  }
});

// packages/shared-lib/src/lib/wallet-engine.ts
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
var import_server_only8;
var init_wallet_engine = __esm({
  "packages/shared-lib/src/lib/wallet-engine.ts"() {
    "use strict";
    import_server_only8 = require("server-only");
    init_supabase_server();
    init_audit();
    init_types();
  }
});

// packages/shared-lib/src/lib/payment-service.ts
var payment_service_exports = {};
__export(payment_service_exports, {
  createOnlinePayment: () => createOnlinePayment,
  finalizeBookingFinancials: () => finalizeBookingFinancials
});
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
var import_server_only9;
var init_payment_service = __esm({
  "packages/shared-lib/src/lib/payment-service.ts"() {
    "use strict";
    import_server_only9 = require("server-only");
    init_supabase_server();
    init_audit();
    init_mock_payment_provider();
    init_commission_engine();
    init_wallet_engine();
    init_types();
  }
});

// src/app/api/worker/jobs/[id]/status/route.ts
var route_exports = {};
__export(route_exports, {
  PATCH: () => PATCH
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

// src/app/api/worker/jobs/[id]/status/route.ts
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
async function advanceAssignment(queueId) {
  var _a2;
  console.log(`[Assignment Engine] Attempting to advance queue ${queueId}`);
  const { data: lockResult, error: lockErr } = await supabaseAdmin.rpc(
    "advance_assignment_queue",
    { p_queue_id: queueId }
  );
  if (lockErr) {
    console.error("[Assignment Engine] Error calling advance RPC:", lockErr);
    return "ERROR";
  }
  if (lockResult === "SKIPPED") {
    console.log(`[Assignment Engine] Queue ${queueId} skipped: another process holds lock`);
    return "SKIPPED";
  }
  if (lockResult === "NOT_BROADCASTING") {
    console.log(`[Assignment Engine] Queue ${queueId} skipped: state is not BROADCASTING`);
    return "NOT_BROADCASTING";
  }
  const { data: queue, error: queueErr } = await supabaseAdmin.from("assignment_queue").select("*").eq("id", queueId).single();
  if (queueErr || !queue) {
    console.error("[Assignment Engine] Failed to fetch queue after locking:", queueErr);
    return "ERROR";
  }
  const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select("status, lat, lng, payment_mode, service_items(category_id)").eq("id", queue.booking_id).single();
  if (bookingErr || !booking) {
    console.error("[Assignment Engine] Failed to fetch booking:", bookingErr);
    await supabaseAdmin.from("assignment_queue").update({ status: "FAILED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", queueId);
    return "BOOKING_NOT_FOUND";
  }
  if (booking.status !== "PENDING_ASSIGNMENT") {
    console.log(`[Assignment Engine] Booking ${queue.booking_id} status is ${booking.status}. Marking queue ASSIGNED.`);
    await supabaseAdmin.from("assignment_queue").update({ status: "ASSIGNED", assigned_at: (/* @__PURE__ */ new Date()).toISOString(), updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", queueId);
    return "ALREADY_ASSIGNED";
  }
  if (queue.current_group < 3) {
    const nextGroup = queue.current_group + 1;
    const { data: radiusData } = await supabaseAdmin.from("platform_settings").select("value").eq("key", "search_radius_km").single();
    const radiusKm = radiusData ? parseFloat(radiusData.value) : 10;
    const categoryId = ((_a2 = booking.service_items) == null ? void 0 : _a2.category_id) || null;
    const { data: workers } = await supabaseAdmin.rpc(
      "find_nearby_eligible_workers",
      {
        p_lat: booking.lat,
        p_lng: booking.lng,
        p_radius_km: radiusKm,
        p_service_category_id: categoryId,
        p_booking_id: queue.booking_id,
        p_payment_mode: booking.payment_mode
      }
    );
    const typedWorkers = workers || [];
    const notifiedSet = new Set(queue.all_notified_workers || []);
    let checkGroup = nextGroup;
    let checkGroupWorkers = [];
    while (checkGroup <= 3) {
      let rawGroupWorkers = typedWorkers;
      checkGroupWorkers = rawGroupWorkers.filter((w) => !notifiedSet.has(w.worker_id));
      if (checkGroupWorkers.length > 0) {
        break;
      }
      checkGroup++;
    }
    if (checkGroup <= 3 && checkGroupWorkers.length > 0) {
      const newAllNotified = [...queue.all_notified_workers || [], ...checkGroupWorkers.map((w) => w.worker_id)];
      const expiresAt = new Date(Date.now() + 18e4).toISOString();
      await supabaseAdmin.from("assignment_queue").update({
        current_group: checkGroup,
        group_workers: checkGroupWorkers,
        all_notified_workers: newAllNotified,
        status: "BROADCASTING",
        attempts: queue.attempts + 1,
        group_expires_at: expiresAt,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", queueId);
      await broadcastToGroup(queue.booking_id, checkGroupWorkers);
      return "ADVANCED";
    }
  }
  console.log(`[Assignment Engine] All groups exhausted for booking ${queue.booking_id}. Reverting to manual assignment.`);
  await supabaseAdmin.from("assignment_queue").update({
    status: "FAILED",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", queueId);
  await supabaseAdmin.from("bookings").update({
    status: "MANUAL_ASSIGNMENT_REQUIRED",
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", queue.booking_id);
  const { data: admins } = await supabaseAdmin.from("users").select("id").eq("role", "admin");
  if (admins && admins.length > 0) {
    const adminUserIds = admins.map((a) => a.id);
    await dispatchBulkNotifications({
      userIds: adminUserIds,
      type: "LOW_WALLET_BALANCE",
      title: "Manual Assignment Required",
      body: `Auto assignment failed for booking ${queue.booking_id}. Manual intervention is required.`,
      data: { booking_id: queue.booking_id }
    });
  }
  await logAuditAction({
    admin_id: await getSystemAdminId(),
    action: "ASSIGNMENT_MANUAL_REQUIRED" /* ASSIGNMENT_MANUAL_REQUIRED */,
    target_type: "booking",
    target_id: queue.booking_id,
    metadata: { booking_id: queue.booking_id }
  });
  return "MANUAL_REQUIRED";
}
async function acceptBooking(bookingId, workerId, queueId) {
  console.log(`[Assignment Engine] Worker ${workerId} accepting booking ${bookingId}`);
  const { data: accepted, error: acceptErr } = await supabaseAdmin.rpc(
    "auto_accept_booking",
    {
      p_booking_id: bookingId,
      p_worker_id: workerId
    }
  );
  if (acceptErr || !accepted) {
    console.log(`[Assignment Engine] Accept failed for booking ${bookingId} by worker ${workerId}:`, acceptErr == null ? void 0 : acceptErr.message);
    return false;
  }
  await supabaseAdmin.from("assignment_queue").update({
    status: "ASSIGNED",
    assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", queueId);
  const { data: queue } = await supabaseAdmin.from("assignment_queue").select("all_notified_workers").eq("id", queueId).single();
  if (queue && queue.all_notified_workers) {
    const otherWorkers = queue.all_notified_workers.filter((id) => id !== workerId);
    if (otherWorkers.length > 0) {
      const rejections = otherWorkers.map((wId) => ({
        booking_id: bookingId,
        worker_id: wId,
        reason: "JOB_TAKEN"
      }));
      await supabaseAdmin.from("worker_job_rejections").upsert(rejections, { onConflict: "booking_id,worker_id" });
    }
  }
  await logAuditAction({
    admin_id: await getSystemAdminId(),
    action: "ASSIGNMENT_ACCEPTED" /* ASSIGNMENT_ACCEPTED */,
    target_type: "booking",
    target_id: bookingId,
    metadata: { booking_id: bookingId, worker_id: workerId }
  });
  return true;
}
async function rejectBooking(bookingId, workerId, reason) {
  console.log(`[Assignment Engine] Worker ${workerId} rejecting booking ${bookingId}`);
  await supabaseAdmin.from("worker_job_rejections").upsert({
    booking_id: bookingId,
    worker_id: workerId,
    reason: reason || null
  }, { onConflict: "booking_id,worker_id" });
  const { count: explicitRejectionsCount } = await supabaseAdmin.from("worker_job_rejections").select("*", { count: "exact", head: true }).eq("worker_id", workerId).neq("reason", "JOB_TAKEN");
  if (explicitRejectionsCount !== null && explicitRejectionsCount > 5) {
    const { data: worker } = await supabaseAdmin.from("workers").select("status").eq("id", workerId).single();
    if (worker && worker.status !== "ON_JOB") {
      console.log(`[Assignment Engine] Worker ${workerId} has explicitly rejected ${explicitRejectionsCount} orders. Automatically suspending account.`);
      await supabaseAdmin.from("users").update({ is_suspended: true, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", workerId);
      await supabaseAdmin.from("workers").update({ status: "SUSPENDED", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", workerId);
      await dispatchNotification({
        userId: workerId,
        type: "LOW_WALLET_BALANCE",
        title: "Account Suspended",
        body: "Your account is suspended due to excessive booking rejections. Contact Super Admin to release."
      }).catch((err) => console.error("Failed to notify worker of suspension:", err));
      await logAuditAction({
        admin_id: await getSystemAdminId(),
        action: "WORKER_SUSPENDED" /* WORKER_SUSPENDED */,
        target_type: "worker",
        target_id: workerId,
        metadata: {
          worker_id: workerId,
          reason: "AUTO_SUSPEND_EXCESSIVE_REJECTIONS",
          rejection_count: explicitRejectionsCount
        }
      });
    }
  }
  const { data: queue } = await supabaseAdmin.from("assignment_queue").select("*").eq("booking_id", bookingId).eq("status", "BROADCASTING").single();
  if (queue) {
    const groupWorkerIds = (queue.group_workers || []).map((w) => w.worker_id);
    if (groupWorkerIds.length > 0) {
      const { count } = await supabaseAdmin.from("worker_job_rejections").select("*", { count: "exact", head: true }).eq("booking_id", bookingId).in("worker_id", groupWorkerIds);
      if (count === groupWorkerIds.length) {
        console.log(`[Assignment Engine] All workers in current group rejected booking ${bookingId}. Advancing queue immediately.`);
        advanceAssignment(queue.id).catch((err) => {
          console.error("[Assignment Engine] Immediate advance failed:", err);
        });
      }
    }
  }
  await logAuditAction({
    admin_id: await getSystemAdminId(),
    action: "ASSIGNMENT_REJECTED" /* ASSIGNMENT_REJECTED */,
    target_type: "booking",
    target_id: bookingId,
    metadata: { booking_id: bookingId, worker_id: workerId, reason }
  });
}

// src/app/api/worker/jobs/[id]/status/route.ts
init_audit();
init_types();
init_notification_dispatcher();
async function PATCH(request, { params }) {
  var _a2;
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    const { id } = await params;
    const validation = await validateBody(request, bookingStatusUpdateSchema);
    if (!validation.success) {
      console.error("[Worker Job Status PATCH] Validation failed:", validation.errorResponse);
      return validation.errorResponse;
    }
    const body = validation.data;
    const { status, imageUrl } = body;
    const { data: booking, error: fetchErr } = await supabaseAdmin.from("bookings").select("*").eq("id", id).single();
    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (status === "REJECTED") {
      const reason = body.reason;
      await rejectBooking(id, workerId, reason || void 0);
      return NextResponse.json({ success: true });
    }
    if (status === "ACCEPTED") {
      if (booking.status === "WORKER_ASSIGNED" && booking.worker_id === workerId) {
        const { error: bookingUpdateErr2 } = await supabaseAdmin.from("bookings").update({
          status: "WORKER_ACCEPTED",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", id);
        if (bookingUpdateErr2) throw bookingUpdateErr2;
        const { data: queue2 } = await supabaseAdmin.from("assignment_queue").select("id, all_notified_workers").eq("booking_id", id).single();
        if (queue2) {
          await supabaseAdmin.from("assignment_queue").update({
            status: "ASSIGNED",
            assigned_at: (/* @__PURE__ */ new Date()).toISOString(),
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          }).eq("id", queue2.id);
          if (queue2.all_notified_workers) {
            const otherWorkers = queue2.all_notified_workers.filter((wId) => wId !== workerId);
            if (otherWorkers.length > 0) {
              const rejections = otherWorkers.map((wId) => ({
                booking_id: id,
                worker_id: wId,
                reason: "JOB_TAKEN"
              }));
              await supabaseAdmin.from("worker_job_rejections").upsert(rejections, { onConflict: "booking_id,worker_id" });
            }
          }
        }
        await dispatchNotification({
          userId: booking.customer_id,
          type: "BOOKING_ACCEPTED",
          title: "Worker assigned",
          body: "A worker has been assigned to your booking.",
          data: { booking_id: id, worker_id: workerId }
        });
        await logAuditAction({
          admin_id: workerId,
          action: "ASSIGNMENT_ACCEPTED" /* ASSIGNMENT_ACCEPTED */,
          target_type: "booking",
          target_id: id,
          metadata: { booking_id: id, worker_id: workerId, manual: true }
        });
        return NextResponse.json({ success: true });
      }
      const { data: queue } = await supabaseAdmin.from("assignment_queue").select("id, all_notified_workers, status").eq("booking_id", id).single();
      if (!queue || queue.status === "ASSIGNED") {
        return NextResponse.json(
          { error: "JOB_ALREADY_TAKEN" },
          { status: 409 }
        );
      }
      const wasNotified = (_a2 = queue.all_notified_workers) == null ? void 0 : _a2.includes(workerId);
      if (!wasNotified) {
        return NextResponse.json(
          { error: "NOT_IN_BROADCAST_GROUP" },
          { status: 403 }
        );
      }
      const accepted = await acceptBooking(id, workerId, queue.id);
      if (!accepted) {
        return NextResponse.json(
          { error: "JOB_ALREADY_TAKEN" },
          { status: 409 }
        );
      }
      await dispatchNotification({
        userId: booking.customer_id,
        type: "BOOKING_ACCEPTED",
        title: "Worker assigned",
        body: "A worker has been assigned to your booking.",
        data: { booking_id: id, worker_id: workerId }
      });
      return NextResponse.json({ success: true });
    }
    if (booking.status !== "PENDING_ASSIGNMENT" && booking.worker_id !== workerId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    const currentStatus = booking.status;
    let targetBookingStatus = "";
    let targetWorkerStatus = "";
    if (status === "ON_THE_WAY") {
      if (currentStatus !== "WORKER_ACCEPTED") {
        return NextResponse.json({ error: "Cannot start journey yet." }, { status: 400 });
      }
      targetBookingStatus = "ON_THE_WAY";
    } else if (status === "ARRIVED") {
      if (currentStatus !== "ON_THE_WAY") {
        return NextResponse.json({ error: "Cannot mark arrived yet." }, { status: 400 });
      }
      targetBookingStatus = "ARRIVED";
    } else if (status === "COMPLETED") {
      if (currentStatus !== "IN_PROGRESS") {
        return NextResponse.json({ error: "Cannot complete work before it has started." }, { status: 400 });
      }
      targetBookingStatus = "COMPLETED";
      targetWorkerStatus = "ONLINE";
    } else {
      return NextResponse.json({ error: "Invalid status update request." }, { status: 400 });
    }
    const updateData = {
      status: targetBookingStatus,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (status === "COMPLETED") {
      updateData.completed_at = (/* @__PURE__ */ new Date()).toISOString();
    }
    const { error: bookingUpdateErr } = await supabaseAdmin.from("bookings").update(updateData).eq("id", id);
    if (bookingUpdateErr) throw bookingUpdateErr;
    if (status === "COMPLETED" && imageUrl) {
      const { error: imgErr } = await supabaseAdmin.from("booking_images").insert({
        booking_id: id,
        image_url: imageUrl
      });
      if (imgErr) {
        console.error("Failed to save completion image:", imgErr);
      }
    }
    if (targetWorkerStatus) {
      const { error: workerUpdateErr } = await supabaseAdmin.from("workers").update({
        status: targetWorkerStatus,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", workerId);
      if (workerUpdateErr) throw workerUpdateErr;
    }
    let notificationTitle = "";
    let notificationBody = "";
    if (status === "ON_THE_WAY") {
      notificationTitle = "Technician En Route";
      notificationBody = "Your technician is on the way to your location.";
    } else if (status === "ARRIVED") {
      notificationTitle = "Technician Arrived";
      notificationBody = "Your technician has arrived. Share your OTP to begin the service.";
    } else if (status === "COMPLETED") {
      notificationTitle = "Service Request Completed";
      notificationBody = "Your home service booking has been marked completed. Thank you!";
    }
    await dispatchNotification({
      userId: booking.customer_id,
      type: status === "COMPLETED" ? "JOB_COMPLETED" : "WORKER_ARRIVING",
      title: notificationTitle,
      body: notificationBody
    });
    if (status === "COMPLETED") {
      const { finalizeBookingFinancials: finalizeBookingFinancials2 } = await Promise.resolve().then(() => (init_payment_service(), payment_service_exports));
      const financialsSuccess = await finalizeBookingFinancials2(id);
      if (!financialsSuccess) {
        console.error(`Failed to finalize financials for booking ${id}`);
      }
    }
    return NextResponse.json({ success: true, status: targetBookingStatus });
  } catch (error) {
    console.error("Error updating job status:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PATCH
});
