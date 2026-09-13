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

// src/app/api/worker/location/route.ts
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

// packages/shared-lib/src/lib/haversine.ts
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return d;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// packages/shared-lib/src/lib/maps/google-maps-provider.ts
var import_axios = __toESM(require("axios"));
var GoogleMapsProvider = class {
  getApiKey() {
    const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    if (!key) {
      console.warn("[GoogleMapsProvider] Warning: GOOGLE_MAPS_API_KEY is not configured in environment variables.");
    }
    return key;
  }
  async geocode(address) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      const response = await import_axios.default.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          address,
          key: apiKey
        }
      });
      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id
        };
      }
      console.error("[GoogleMapsProvider] Geocode API error:", response.data.status, response.data.error_message || "");
      return null;
    } catch (error) {
      console.error("[GoogleMapsProvider] Geocode exception:", error.message || error);
      return null;
    }
  }
  async reverseGeocode(lat, lng) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      const response = await import_axios.default.get("https://maps.googleapis.com/maps/api/geocode/json", {
        params: {
          latlng: `${lat},${lng}`,
          key: apiKey
        }
      });
      if (response.data.status === "OK" && response.data.results.length > 0) {
        const result = response.data.results[0];
        return {
          lat,
          lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id
        };
      }
      console.error("[GoogleMapsProvider] Reverse Geocode API error:", response.data.status, response.data.error_message || "");
      return null;
    } catch (error) {
      console.error("[GoogleMapsProvider] Reverse Geocode exception:", error.message || error);
      return null;
    }
  }
  async getDirections(origin, destination) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      const response = await import_axios.default.get("https://maps.googleapis.com/maps/api/directions/json", {
        params: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode: "driving",
          key: apiKey
        }
      });
      if (response.data.status === "OK" && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const leg = route.legs[0];
        return {
          distanceKm: Number((leg.distance.value / 1e3).toFixed(2)),
          durationMin: Math.ceil(leg.duration.value / 60),
          polylinePath: route.overview_polyline.points
        };
      }
      console.error("[GoogleMapsProvider] Directions API error:", response.data.status, response.data.error_message || "");
      return null;
    } catch (error) {
      console.error("[GoogleMapsProvider] Directions exception:", error.message || error);
      return null;
    }
  }
  async getAutocomplete(input, sessionToken) {
    const apiKey = this.getApiKey();
    if (!apiKey) return [];
    try {
      const response = await import_axios.default.get("https://maps.googleapis.com/maps/api/place/autocomplete/json", {
        params: __spreadValues({
          input,
          key: apiKey
        }, sessionToken ? { sessiontoken: sessionToken } : {})
      });
      if (response.data.status === "OK") {
        return response.data.predictions.map((p) => {
          var _a2, _b;
          return {
            placeId: p.place_id,
            description: p.description,
            mainText: ((_a2 = p.structured_formatting) == null ? void 0 : _a2.main_text) || "",
            secondaryText: ((_b = p.structured_formatting) == null ? void 0 : _b.secondary_text) || ""
          };
        });
      }
      console.error("[GoogleMapsProvider] Autocomplete API error:", response.data.status, response.data.error_message || "");
      return [];
    } catch (error) {
      console.error("[GoogleMapsProvider] Autocomplete exception:", error.message || error);
      return [];
    }
  }
  async getPlaceDetails(placeId, sessionToken) {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;
    try {
      const response = await import_axios.default.get("https://maps.googleapis.com/maps/api/place/details/json", {
        params: __spreadValues({
          place_id: placeId,
          fields: "geometry,formatted_address,place_id",
          key: apiKey
        }, sessionToken ? { sessiontoken: sessionToken } : {})
      });
      if (response.data.status === "OK" && response.data.result) {
        const result = response.data.result;
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          formattedAddress: result.formatted_address,
          placeId: result.place_id
        };
      }
      console.error("[GoogleMapsProvider] Place Details API error:", response.data.status, response.data.error_message || "");
      return null;
    } catch (error) {
      console.error("[GoogleMapsProvider] Place Details exception:", error.message || error);
      return null;
    }
  }
};

// packages/shared-lib/src/lib/maps/maps-service.ts
var MapsService = class {
  constructor() {
    this.provider = new GoogleMapsProvider();
  }
  getProvider() {
    return this.provider;
  }
};
var mapsService = new MapsService();

// packages/shared-lib/src/lib/maps/directions-service.ts
async function getDirections(origin, destination) {
  return mapsService.getProvider().getDirections(origin, destination);
}

// packages/shared-lib/src/lib/maps/eta-service.ts
async function calculateBookingEta(bookingId, workerLat, workerLng, customerLat, customerLng) {
  try {
    const now = /* @__PURE__ */ new Date();
    const haversineDistance = getDistance(workerLat, workerLng, customerLat, customerLng);
    const { data: lastSnapshot, error: snapErr } = await supabaseAdmin.from("booking_route_snapshots").select("*").eq("booking_id", bookingId).order("captured_at", { ascending: false }).limit(1).maybeSingle();
    if (lastSnapshot) {
      const elapsedMs = now.getTime() - new Date(lastSnapshot.captured_at).getTime();
      const elapsedMinutes = elapsedMs / (1e3 * 60);
      const distanceMovedKm = getDistance(
        workerLat,
        workerLng,
        Number(lastSnapshot.worker_lat),
        Number(lastSnapshot.worker_lng)
      );
      if (distanceMovedKm <= 0.2 && elapsedMinutes < 5) {
        return {
          distanceKm: Number(lastSnapshot.distance_km),
          durationMin: Number(lastSnapshot.eta_minutes),
          source: "cache"
        };
      }
    }
    let distanceKm = 0;
    let durationMin = 0;
    let source = "haversine";
    if (haversineDistance <= 3) {
      console.log(`[EtaService] Worker is close (${haversineDistance.toFixed(2)} km). Querying Google Directions API...`);
      const route = await getDirections(
        { lat: workerLat, lng: workerLng },
        { lat: customerLat, lng: customerLng }
      );
      if (route) {
        distanceKm = route.distanceKm;
        durationMin = route.durationMin;
        source = "google";
      } else {
        distanceKm = haversineDistance;
        durationMin = Math.ceil(distanceKm / 25 * 60);
        source = "haversine";
      }
    } else {
      distanceKm = haversineDistance;
      durationMin = Math.ceil(distanceKm / 25 * 60);
      source = "haversine";
    }
    distanceKm = Number(distanceKm.toFixed(2));
    await supabaseAdmin.from("booking_route_snapshots").insert({
      booking_id: bookingId,
      distance_km: distanceKm,
      eta_minutes: durationMin,
      worker_lat: workerLat,
      worker_lng: workerLng,
      captured_at: now.toISOString()
    });
    return {
      distanceKm,
      durationMin,
      source
    };
  } catch (error) {
    console.error("[EtaService] Error calculating booking ETA:", error);
    const distanceKm = getDistance(workerLat, workerLng, customerLat, customerLng);
    const durationMin = Math.ceil(distanceKm / 25 * 60);
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      durationMin,
      source: "haversine"
    };
  }
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
var import_zod2 = require("zod");
var PhoneSchema = import_zod2.z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");
var OtpSchema = import_zod2.z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must contain only digits");
var CreateBookingSchema = import_zod2.z.object({
  service_item_id: import_zod2.z.string().uuid("Invalid service item ID"),
  address: import_zod2.z.string().min(5, "Address must be at least 5 characters"),
  latitude: import_zod2.z.number(),
  longitude: import_zod2.z.number(),
  payment_mode: import_zod2.z.enum(["ONLINE", "COD", "WALLET"]),
  notes: import_zod2.z.string().optional()
});
var ProfileUpdateSchema = import_zod2.z.object({
  full_name: import_zod2.z.string().min(2, "Name must be at least 2 characters"),
  email: import_zod2.z.string().email("Invalid email address").optional().or(import_zod2.z.literal(""))
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

// packages/shared-lib/src/lib/maps/geofence-service.ts
async function checkBookingGeofences(bookingId, workerId, workerLat, workerLng, workerSpeed, customerLat, customerLng) {
  try {
    const distanceKm = getDistance(workerLat, workerLng, customerLat, customerLng);
    if (distanceKm <= 0.5) {
      const { data: existingNotif, error: notifErr } = await supabaseAdmin.from("notifications").select("id").eq("user_id", await getCustomerUserId(bookingId)).eq("type", "WORKER_NEARBY").contains("data", { booking_id: bookingId }).limit(1).maybeSingle();
      if (!existingNotif && !notifErr) {
        const customerUserId = await getCustomerUserId(bookingId);
        if (customerUserId) {
          await dispatchNotification({
            userId: customerUserId,
            type: "WORKER_NEARBY",
            title: "Technician is nearby!",
            body: "Your technician is less than 500 meters away and will arrive shortly.",
            data: { booking_id: bookingId, worker_id: workerId }
          });
        }
      }
    }
    if (distanceKm <= 0.1 && workerSpeed < 5) {
      const { data: existingEvent, error: eventErr } = await supabaseAdmin.from("booking_tracking_events").select("id").eq("booking_id", bookingId).eq("event_type", "ARRIVED").limit(1).maybeSingle();
      if (!existingEvent && !eventErr) {
        const { data: history, error: historyErr } = await supabaseAdmin.from("worker_location_history").select("latitude, longitude, speed, created_at").eq("worker_id", workerId).gte("created_at", new Date(Date.now() - 75 * 1e3).toISOString()).order("created_at", { ascending: true });
        if (!historyErr && history && history.length > 1) {
          const oldestRecord = history[0];
          const newestRecord = history[history.length - 1];
          const timeSpanSec = (new Date(newestRecord.created_at).getTime() - new Date(oldestRecord.created_at).getTime()) / 1e3;
          if (timeSpanSec >= 60) {
            let allSatisfied = true;
            for (const record of history) {
              const recDist = getDistance(
                Number(record.latitude),
                Number(record.longitude),
                customerLat,
                customerLng
              );
              const recSpeed = Number(record.speed || 0);
              if (recDist > 0.1 || recSpeed >= 5) {
                allSatisfied = false;
                break;
              }
            }
            if (allSatisfied) {
              await supabaseAdmin.from("booking_tracking_events").insert({
                booking_id: bookingId,
                worker_id: workerId,
                latitude: workerLat,
                longitude: workerLng,
                event_type: "ARRIVED"
              });
              const customerUserId = await getCustomerUserId(bookingId);
              if (customerUserId) {
                await dispatchNotification({
                  userId: customerUserId,
                  type: "WORKER_ARRIVED",
                  title: "Technician Arrived",
                  body: "Your technician has arrived at your location. Please share the OTP code to start the service.",
                  data: { booking_id: bookingId, worker_id: workerId }
                });
              }
              await logAuditAction({
                admin_id: workerId,
                // worker acts as the target admin/agent logging this
                action: "WORKER_ARRIVED" /* WORKER_ARRIVED */,
                target_type: "booking",
                target_id: bookingId,
                metadata: { distance_km: distanceKm, speed: workerSpeed }
              });
              console.log(`[Geofence] Worker ${workerId} arrived at booking ${bookingId}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[GeofenceService] Error checking geofences:", error);
  }
}
async function getCustomerUserId(bookingId) {
  try {
    const { data, error } = await supabaseAdmin.from("bookings").select("customer_id").eq("id", bookingId).single();
    if (error || !data) return null;
    return data.customer_id;
  } catch (e) {
    return null;
  }
}

// packages/shared-lib/src/lib/tracking/location-service.ts
async function processWorkerLocationUpdate(payload) {
  const { workerId, latitude, longitude, accuracy, speed, heading, deviceType } = payload;
  try {
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error("Invalid coordinates range.");
    }
    const { data: worker, error: workerErr } = await supabaseAdmin.from("workers").select("status").eq("id", workerId).single();
    if (workerErr || !worker) {
      throw new Error("Worker not found.");
    }
    if (worker.status === "OFFLINE" || worker.status === "VACATION") {
      return { success: false };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const { error: liveErr } = await supabaseAdmin.from("worker_live_locations").upsert(
      {
        worker_id: workerId,
        latitude,
        longitude,
        accuracy: accuracy || null,
        speed: speed || null,
        heading: heading || null,
        device_type: deviceType,
        updated_at: now
      },
      { onConflict: "worker_id" }
    );
    if (liveErr) {
      throw liveErr;
    }
    const { error: histErr } = await supabaseAdmin.from("worker_location_history").insert({
      worker_id: workerId,
      latitude,
      longitude,
      accuracy: accuracy || null,
      speed: speed || null,
      heading: heading || null,
      created_at: now
    });
    if (histErr) {
      console.error("[LocationService] History logging failed:", histErr.message);
    }
    const { data: activeBooking, error: bookingErr } = await supabaseAdmin.from("bookings").select("id, lat, lng, status").eq("worker_id", workerId).in("status", ["WORKER_ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS"]).order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (bookingErr) {
      console.error("[LocationService] Error searching active bookings:", bookingErr);
    }
    if (activeBooking) {
      const speedVal = speed || 0;
      const { data: latestSnapshot } = await supabaseAdmin.from("booking_route_snapshots").select("captured_at, worker_lat, worker_lng").eq("booking_id", activeBooking.id).order("captured_at", { ascending: false }).limit(1).maybeSingle();
      let shouldUpdateEta = true;
      if (latestSnapshot) {
        const lastTime = new Date(latestSnapshot.captured_at).getTime();
        const timeElapsedMs = Date.now() - lastTime;
        const latDiff = latitude - Number(latestSnapshot.worker_lat);
        const lngDiff = longitude - Number(latestSnapshot.worker_lng);
        const displacementMeters = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111e3;
        if (timeElapsedMs < 180 * 1e3 && displacementMeters < 200) {
          shouldUpdateEta = false;
        }
      }
      if (shouldUpdateEta) {
        await calculateBookingEta(
          activeBooking.id,
          latitude,
          longitude,
          Number(activeBooking.lat),
          Number(activeBooking.lng)
        );
      }
      await checkBookingGeofences(
        activeBooking.id,
        workerId,
        latitude,
        longitude,
        speedVal,
        Number(activeBooking.lat),
        Number(activeBooking.lng)
      );
      return { success: true, activeBookingId: activeBooking.id };
    }
    return { success: true };
  } catch (error) {
    console.error("[LocationService] Location update processing exception:", error.message || error);
    return { success: false };
  }
}

// src/app/api/worker/location/route.ts
async function POST(request) {
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    const validation = await validateBody(request, workerLocationUpdateSchema);
    if (!validation.success) return validation.errorResponse;
    const body = validation.data;
    const { latitude, longitude, accuracy, speed, heading, deviceType } = body;
    if (latitude === void 0 || longitude === void 0) {
      return NextResponse.json({ error: "latitude and longitude are required" }, { status: 400 });
    }
    const result = await processWorkerLocationUpdate({
      workerId,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== void 0 ? Number(accuracy) : void 0,
      speed: speed !== void 0 ? Number(speed) : void 0,
      heading: heading !== void 0 ? Number(heading) : void 0,
      deviceType: deviceType || "WEB"
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[WorkerLocationAPI] Error processing location update:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  POST
});
