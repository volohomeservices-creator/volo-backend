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

// src/app/api/auth/pre-check/route.ts
var route_exports = {};
__export(route_exports, {
  POST: () => POST
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

// src/app/api/auth/pre-check/route.ts
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

// packages/shared-lib/src/lib/recaptcha-server.ts
async function verifyRecaptchaToken(token, action = "LOGIN") {
  var _a2, _b, _c, _d;
  if (!token) {
    return { success: false, reason: "Missing reCAPTCHA token" };
  }
  const isBypassAllowed = process.env.ALLOW_RECAPTCHA_BYPASS === "true";
  const isNotProduction = process.env.NODE_ENV !== "production";
  if (isBypassAllowed && isNotProduction) {
    console.warn(`[reCAPTCHA Server] WARNING: reCAPTCHA verification bypassed in development mode.`);
    return { success: true, score: 1 };
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "volohome-16448";
  const apiKey = process.env.RECAPTCHA_SERVER_API_KEY;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "6Ld_ASgtAAAAAP5S1xWBhboAdhtZs0XT5dGVshQA";
  if (!apiKey) {
    console.error("[reCAPTCHA Server] GCP Server API key (RECAPTCHA_SERVER_API_KEY) is not defined in environment variables.");
    return { success: false, reason: "Server configuration error" };
  }
  try {
    const url = `https://recaptchaenterprise.googleapis.com/v1/projects/${projectId}/assessments?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: {
          token,
          siteKey,
          expectedAction: action
        }
      })
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[reCAPTCHA Server] Google API error:", response.status, errorBody);
      return { success: false, reason: "Verification service error" };
    }
    const data = await response.json();
    if (!((_a2 = data.tokenProperties) == null ? void 0 : _a2.valid)) {
      const invalidReason = ((_b = data.tokenProperties) == null ? void 0 : _b.invalidReason) || "Token validation failed";
      console.warn("[reCAPTCHA Server] Token is invalid:", invalidReason);
      return { success: false, reason: invalidReason };
    }
    if (data.tokenProperties.action !== action) {
      console.warn(`[reCAPTCHA Server] Action mismatch: expected "${action}", got "${data.tokenProperties.action}"`);
      return { success: false, reason: "Action mismatch" };
    }
    const score = (_d = (_c = data.riskAnalysis) == null ? void 0 : _c.score) != null ? _d : 0;
    console.log(`[reCAPTCHA Server] Assessment successful. Score: ${score}`);
    const minRequiredScore = 0.4;
    if (score < minRequiredScore) {
      return { success: false, score, reason: "Assessment risk check failed" };
    }
    return { success: true, score };
  } catch (err) {
    console.error("[reCAPTCHA Server] Exception during verification:", err);
    return { success: false, reason: "Internal connection failure" };
  }
}

// src/app/api/auth/pre-check/route.ts
async function POST(request) {
  const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  try {
    const validation = await validateBody(request, preCheckSchema);
    if (!validation.success) {
      console.error("[Pre-Check] Validation failed:", validation.errorResponse);
      return validation.errorResponse;
    }
    const { phone, deviceToken, recaptchaToken } = validation.data;
    const recaptchaResult = await verifyRecaptchaToken(recaptchaToken || void 0, "LOGIN");
    if (!recaptchaResult.success) {
      console.error("[Pre-Check] reCAPTCHA failed:", recaptchaResult.reason);
      return NextResponse.json(
        { error: `Verification failed. Please try again. Reason: ${recaptchaResult.reason}` },
        { status: 400, headers: cacheHeaders }
      );
    }
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400, headers: cacheHeaders });
    }
    const clean10Digits = phone.replace(/\D/g, "").slice(-10);
    const formattedPhone = `+91${clean10Digits}`;
    const phoneVariants = Array.from(/* @__PURE__ */ new Set([phone, formattedPhone, clean10Digits]));
    const { data: user, error } = await supabaseAdmin.from("users").select("id, email, is_active, is_suspended, pin_hash").in("phone", phoneVariants).maybeSingle();
    if (error) {
      console.error("[Pre-Check] DB error querying user:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: cacheHeaders });
    }
    if (!user) {
      return NextResponse.json({
        authMethod: "otp_required",
        isRegistered: false,
        hasEmail: false
      }, { headers: cacheHeaders });
    }
    if (!user.is_active || user.is_suspended) {
      return NextResponse.json({ error: "ACCOUNT_BLOCKED" }, { status: 403, headers: cacheHeaders });
    }
    const hasEmail = !!user.email;
    if (user.pin_hash) {
      return NextResponse.json({
        authMethod: "pin_required",
        isRegistered: true,
        hasEmail
      }, { headers: cacheHeaders });
    }
    if (deviceToken) {
      const deviceTokenHash = import_crypto.default.createHash("sha256").update(deviceToken).digest("hex");
      const { data: device, error: deviceError } = await supabaseAdmin.from("trusted_devices").select("id, is_active").eq("user_id", user.id).eq("device_token_hash", deviceTokenHash).eq("is_active", true).maybeSingle();
      if (!deviceError && device && device.is_active) {
        return NextResponse.json({
          authMethod: "trusted_device",
          isRegistered: true,
          hasEmail
        }, { headers: cacheHeaders });
      }
    }
    return NextResponse.json({
      authMethod: "otp_required",
      isRegistered: true,
      hasEmail
    }, { headers: cacheHeaders });
  } catch (err) {
    console.error("[Pre-Check] Unhandled exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: cacheHeaders });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
