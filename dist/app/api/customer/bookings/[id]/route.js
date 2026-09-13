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

// src/app/api/customer/bookings/[id]/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  PATCH: () => PATCH
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

// src/app/api/customer/bookings/[id]/route.ts
async function GET(request, { params }) {
  try {
    const session = await requireRole(request, "customer");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const customerId = session.user_id;
    const { id } = await params;
    const { data: booking, error: bookingErr } = await supabaseAdmin.from("bookings").select(`
        id, customer_id, worker_id, service_item_id, booking_type, payment_mode, status, 
        address_line, lat, lng, scheduled_at, started_at, completed_at, total_amount, notes, otp, created_at, updated_at,
        service_items(id, category_id, name, description, base_price, estimated_mins, icon_url, is_active, service_categories(name)),
        workers(id, rating, total_jobs, current_lat, current_lng, status, users(full_name, avatar_url, phone))
      `).eq("id", id).single();
    if (bookingErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.customer_id !== customerId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    const { data: images } = await supabaseAdmin.from("booking_images").select("image_url").eq("booking_id", id);
    const imageUrls = (images || []).map((img) => {
      if (img.image_url.startsWith("http")) return img.image_url;
      const { data: { publicUrl } } = supabaseAdmin.storage.from("booking-images").getPublicUrl(img.image_url);
      return publicUrl;
    });
    const { data: routeSnapshot } = await supabaseAdmin.from("booking_route_snapshots").select("distance_km, eta_minutes").eq("booking_id", id).order("captured_at", { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({
      booking,
      images: imageUrls,
      routeSnapshot: routeSnapshot || null
    });
  } catch (error) {
    console.error("Error fetching booking details:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
async function PATCH(request, { params }) {
  try {
    const session = await requireRole(request, "customer");
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const customerId = session.user_id;
    const { id } = await params;
    const { data: body, errorResponse } = await validateBody(request, import_zod.z.any());
    if (errorResponse) return errorResponse;
    const { data: booking, error: fetchErr } = await supabaseAdmin.from("bookings").select("customer_id, status, created_at, total_amount, payment_mode").eq("id", id).single();
    if (fetchErr || !booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.customer_id !== customerId) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }
    const updates = {};
    let shouldRefund = false;
    let refundAmount = 0;
    if (body.status === "CANCELLED") {
      if (booking.status === "COMPLETED" || booking.status === "CANCELLED") {
        return NextResponse.json({ error: "Cannot cancel completed or already cancelled bookings." }, { status: 400 });
      }
      const createdAtTime = new Date(booking.created_at).getTime();
      const elapsedMs = Date.now() - createdAtTime;
      const bufferMs = 2 * 60 * 1e3;
      if (elapsedMs > bufferMs) {
        return NextResponse.json({
          error: "Cancellation buffer expired. Bookings can only be cancelled within 2 minutes of placement."
        }, { status: 400 });
      }
      updates.status = "CANCELLED";
      if (booking.payment_mode === "ONLINE") {
        shouldRefund = true;
        refundAmount = Number(booking.total_amount);
      }
    }
    if (body.scheduled_at) {
      updates.scheduled_at = body.scheduled_at;
    }
    const { data: updated, error: updateErr } = await supabaseAdmin.from("bookings").update(__spreadProps(__spreadValues({}, updates), { updated_at: (/* @__PURE__ */ new Date()).toISOString() })).eq("id", id).select().single();
    if (updateErr) throw updateErr;
    if (shouldRefund && refundAmount > 0) {
      const { data: existingWallet } = await supabaseAdmin.from("customer_wallets").select("id, balance").eq("customer_id", customerId).maybeSingle();
      if (existingWallet) {
        await supabaseAdmin.from("customer_wallets").update({ balance: Number(existingWallet.balance) + refundAmount, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", existingWallet.id);
      } else {
        await supabaseAdmin.from("customer_wallets").insert({ customer_id: customerId, balance: refundAmount });
      }
      try {
        await supabaseAdmin.from("customer_wallet_transactions").insert({
          customer_id: customerId,
          amount: refundAmount,
          type: "REFUND",
          description: `Refund for cancelled booking #${id.substring(0, 8).toUpperCase()}`
        });
      } catch (err) {
        console.error("Failed to log refund transaction:", err);
      }
    }
    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error("Error updating booking:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  PATCH
});
