"use strict";
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/app/api/customer/services/route.ts
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

// src/app/api/customer/services/route.ts
var dynamic = "force-dynamic";
async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const { data: categories, error: catErr } = await supabaseAdmin.from("service_categories").select("id, name, icon_url, is_active, sort_order, created_at").eq("is_active", true).order("sort_order", { ascending: true });
    if (catErr) {
      console.error("[API /customer/services] Categories query error:", {
        message: catErr.message,
        code: catErr.code,
        hint: catErr.hint
      });
      return NextResponse.json(
        { success: false, error: "Unable to load services" },
        { status: 500 }
      );
    }
    const safeCategories = categories || [];
    let query = supabaseAdmin.from("service_items").select("id, category_id, name, description, base_price, estimated_mins, icon_url, is_active, created_at").eq("is_active", true);
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }
    const { data: items, error: itemsErr } = await query;
    if (itemsErr) {
      console.error("[API /customer/services] Items query error:", {
        message: itemsErr.message,
        code: itemsErr.code,
        hint: itemsErr.hint
      });
      return NextResponse.json(
        { success: false, error: "Unable to load services" },
        { status: 500 }
      );
    }
    const safeItems = items || [];
    const catMap = new Map(safeCategories.map((c) => [c.id, c]));
    const itemsWithCategory = safeItems.map((item) => __spreadProps(__spreadValues({}, item), {
      service_categories: catMap.get(item.category_id) || null
    }));
    const categoriesWithItems = safeCategories.map((cat) => {
      const catItems = itemsWithCategory.filter((item) => item.category_id === cat.id);
      return __spreadProps(__spreadValues({}, cat), {
        items: catItems,
        total_bookings: catItems.length > 0 ? catItems.length * 8 : 0,
        total_reviews: catItems.length > 0 ? catItems.length * 3 : 0,
        average_rating: 4.8
      });
    });
    let activePromo = null;
    const { data: promos, error: promoErr } = await supabaseAdmin.from("promo_codes").select("code, description, discount_type, discount_value, expires_at").eq("active", true).order("created_at", { ascending: false });
    if (!promoErr && promos) {
      const now = /* @__PURE__ */ new Date();
      const validPromo = promos.find(
        (p) => !p.expires_at || new Date(p.expires_at) > now
      );
      if (validPromo) {
        activePromo = {
          code: validPromo.code,
          description: validPromo.description,
          discount_type: validPromo.discount_type,
          discount_value: validPromo.discount_value
        };
      }
    }
    return NextResponse.json({
      categories: categoriesWithItems,
      items: itemsWithCategory,
      activePromo
    });
  } catch (error) {
    console.error("[API /customer/services] Unexpected error:", {
      error: error instanceof Error ? error.message : error
    });
    return NextResponse.json(
      { success: false, error: "Unable to load services" },
      { status: 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  dynamic
});
