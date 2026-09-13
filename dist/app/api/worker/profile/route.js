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

// src/app/api/worker/profile/route.ts
var route_exports = {};
__export(route_exports, {
  DELETE: () => DELETE,
  GET: () => GET,
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

// src/app/api/worker/profile/route.ts
function getCompletionPercentage(user, profile) {
  let completedFields = 0;
  const totalFields = 10;
  if (user == null ? void 0 : user.full_name) completedFields++;
  if (user == null ? void 0 : user.email) completedFields++;
  if (user == null ? void 0 : user.avatar_url) completedFields++;
  if (profile == null ? void 0 : profile.address) completedFields++;
  if (profile == null ? void 0 : profile.city) completedFields++;
  if (profile == null ? void 0 : profile.state) completedFields++;
  if ((profile == null ? void 0 : profile.skills) && profile.skills.length > 0) completedFields++;
  if ((profile == null ? void 0 : profile.experience) !== void 0 && (profile == null ? void 0 : profile.experience) !== null) completedFields++;
  if ((profile == null ? void 0 : profile.languages) && profile.languages.length > 0) completedFields++;
  if (profile == null ? void 0 : profile.bio) completedFields++;
  return Math.round(completedFields / totalFields * 100);
}
async function GET(request) {
  const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    const { data: user, error: userErr } = await supabaseAdmin.from("users").select("full_name, phone, email, avatar_url").eq("id", workerId).single();
    if (userErr || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers: cacheHeaders });
    }
    const { data: worker } = await supabaseAdmin.from("workers").select("dob, worker_id_code, kyc_status").eq("id", workerId).single();
    let { data: profile } = await supabaseAdmin.from("worker_profiles").select("*").eq("worker_id", workerId).maybeSingle();
    if (!profile) {
      const { data: newProfile } = await supabaseAdmin.from("worker_profiles").insert({ worker_id: workerId, city: "Bangalore", state: "Karnataka" }).select().single();
      profile = newProfile || {};
    }
    return NextResponse.json({
      full_name: user.full_name,
      phone: user.phone,
      email: user.email,
      avatar_url: user.avatar_url,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      skills: profile.skills || [],
      experience: profile.experience || 0,
      languages: profile.languages || [],
      bio: profile.bio || "",
      profileCompletion: getCompletionPercentage(user, profile),
      dob: (worker == null ? void 0 : worker.dob) || "",
      worker_id_code: (worker == null ? void 0 : worker.worker_id_code) || "",
      kyc_status: (worker == null ? void 0 : worker.kyc_status) || "PENDING"
    }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Error fetching worker profile:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}
async function PATCH(request) {
  var _a2;
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    const validation = await validateBody(request, workerProfileUpdateSchema);
    if (!validation.success) return validation.errorResponse;
    const body = validation.data;
    const {
      full_name,
      email,
      avatar_url,
      address,
      city,
      state,
      skills,
      experience,
      languages,
      bio,
      dob
    } = body;
    const { error: userErr } = await supabaseAdmin.from("users").update(__spreadProps(__spreadValues({
      full_name,
      email
    }, avatar_url !== void 0 && { avatar_url }), {
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    })).eq("id", workerId);
    if (userErr) {
      if (userErr.code === "23505" || ((_a2 = userErr.message) == null ? void 0 : _a2.includes("users_email_key"))) {
        return NextResponse.json({ error: "This email address is already registered to another account." }, { status: 409 });
      }
      throw userErr;
    }
    if (dob || full_name) {
      const updateData = {};
      if (dob) updateData.dob = dob;
      const { data: currentWorker } = await supabaseAdmin.from("workers").select("worker_id_code").eq("id", workerId).single();
      if (!(currentWorker == null ? void 0 : currentWorker.worker_id_code) && full_name && dob) {
        let attempts = 0;
        let isUnique = false;
        const specialChars = ["@", "#", "$", "%", "&", "*", "!"];
        const digits = "0123456789";
        while (!isUnique && attempts < 100) {
          let firstName = "VOLO";
          const parts = full_name.trim().split(/\s+/);
          if (parts[0]) {
            firstName = parts[0].toUpperCase().replace(/[^A-Z]/g, "");
          }
          firstName = (firstName + "XXXX").slice(0, 4);
          let dobYear = "1995";
          const dobParts = dob.split("-");
          if (dobParts[0] && dobParts[0].length === 4) {
            dobYear = dobParts[0];
          }
          const char1 = specialChars[Math.floor(Math.random() * specialChars.length)];
          const char2 = digits[Math.floor(Math.random() * digits.length)];
          const candidateCode = `${firstName}${dobYear}${char1}${char2}`;
          const { data: existing } = await supabaseAdmin.from("workers").select("id").eq("worker_id_code", candidateCode).maybeSingle();
          if (!existing) {
            updateData.worker_id_code = candidateCode;
            isUnique = true;
          }
          attempts++;
        }
      }
      if (Object.keys(updateData).length > 0) {
        const { error: workerErr } = await supabaseAdmin.from("workers").update(updateData).eq("id", workerId);
        if (workerErr) throw workerErr;
      }
    }
    const targetCity = city || "Bangalore";
    const targetState = state || "Karnataka";
    const { error: profileErr } = await supabaseAdmin.from("worker_profiles").upsert({
      worker_id: workerId,
      address,
      city: targetCity,
      state: targetState,
      skills: skills || [],
      experience: Number(experience || 0),
      languages: languages || [],
      bio,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (profileErr) throw profileErr;
    try {
      const fullAddress = `${address || ""}, ${targetCity}, ${targetState}`;
      const geocodeResult = await geocodeAddress(fullAddress, targetCity, targetState);
      let resolvedLat = null;
      let resolvedLng = null;
      if (geocodeResult) {
        resolvedLat = geocodeResult.lat;
        resolvedLng = geocodeResult.lng;
      }
      if (resolvedLat !== null && resolvedLng !== null) {
        await supabaseAdmin.from("workers").update({
          current_lat: resolvedLat,
          current_lng: resolvedLng
        }).eq("id", workerId);
      }
    } catch (geoErr) {
      console.error("Error auto-geocoding address on profile patch:", geoErr);
    }
    const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", workerId).single();
    const { data: profile } = await supabaseAdmin.from("worker_profiles").select("*").eq("worker_id", workerId).single();
    return NextResponse.json({
      success: true,
      profileCompletion: getCompletionPercentage(user, profile)
    });
  } catch (error) {
    console.error("Error updating worker profile:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
async function geocodeAddress(address, city, state) {
  const queryNominatim = async (q) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
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
  };
  let coords = await queryNominatim(address);
  if (coords) return coords;
  if (city && state) {
    coords = await queryNominatim(`${city}, ${state}`);
    if (coords) return coords;
  }
  if (city) {
    coords = await queryNominatim(city);
    if (coords) return coords;
  }
  if (state) {
    coords = await queryNominatim(state);
    if (coords) return coords;
  }
  return null;
}
async function DELETE(request) {
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    const { error } = await supabaseAdmin.from("users").update({ is_active: false }).eq("id", workerId);
    if (error) throw error;
    return NextResponse.json({ success: true, message: "Account deactivated." });
  } catch (error) {
    console.error("Error deactivating worker account:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DELETE,
  GET,
  PATCH
});
