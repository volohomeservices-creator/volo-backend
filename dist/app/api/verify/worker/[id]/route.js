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

// src/app/api/verify/worker/[id]/route.ts
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

// src/app/api/verify/worker/[id]/route.ts
async function GET(request, { params }) {
  var _a2, _b, _c;
  try {
    const { id } = await params;
    const { data: worker, error: workerErr } = await supabaseAdmin.from("workers").select("*, users(*), worker_profiles(*)").or(`worker_id_code.eq.${id},id.eq.${id}`).single();
    if (workerErr || !worker) {
      return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    }
    let categoryNames = [];
    if (worker.service_category_ids && worker.service_category_ids.length > 0) {
      const { data: categories } = await supabaseAdmin.from("service_categories").select("name").in("id", worker.service_category_ids);
      if (categories) {
        categoryNames = categories.map((c) => c.name);
      }
    }
    const { data: signData } = await supabaseAdmin.storage.from("profile-images").createSignedUrl(`worker_${worker.id}/profile.webp`, 3600);
    let photoUrl = (signData == null ? void 0 : signData.signedUrl) || null;
    if (!photoUrl) {
      const { data: selfieData } = await supabaseAdmin.storage.from("kyc-docs").createSignedUrl(`worker_${worker.id}/selfie.webp`, 3600);
      photoUrl = (selfieData == null ? void 0 : selfieData.signedUrl) || null;
    }
    const maskPhone = (phone) => {
      if (!phone) return "N/A";
      if (phone.length <= 4) return "******";
      return `${phone.slice(0, 5)}*****${phone.slice(-3)}`;
    };
    return NextResponse.json({
      success: true,
      worker: {
        id: worker.id,
        full_name: ((_a2 = worker.users) == null ? void 0 : _a2.full_name) || "Service Professional",
        phone: maskPhone((_b = worker.users) == null ? void 0 : _b.phone),
        rating: worker.rating || 5,
        total_jobs: worker.total_jobs || 0,
        worker_id_code: worker.worker_id_code || worker.id.slice(0, 8),
        skills: ((_c = worker.worker_profiles) == null ? void 0 : _c.skills) || [],
        service_categories: categoryNames,
        photoUrl,
        created_at: worker.created_at,
        kyc_status: worker.kyc_status
      }
    });
  } catch (error) {
    console.error("Error fetching public worker verification data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET
});
