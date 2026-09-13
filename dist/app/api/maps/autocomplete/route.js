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

// src/app/api/maps/autocomplete/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET
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
async function getAutocompleteSuggestions(input) {
  return mapsService.getProvider().getAutocomplete(input);
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

// src/app/api/maps/autocomplete/route.ts
async function GET(request) {
  try {
    await requireSession(request);
    const { searchParams } = new URL(request.url);
    const input = searchParams.get("input") || "";
    if (!input) {
      return NextResponse.json({ predictions: [] });
    }
    const predictions = await getAutocompleteSuggestions(input);
    return NextResponse.json({ predictions });
  } catch (error) {
    console.error("Autocomplete API route error:", error);
    const status = error.status || 500;
    const message = status === 500 ? "Internal server error" : error.message;
    return NextResponse.json({ error: message }, { status });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET
});
