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

// src/app/api/worker/kyc/route.ts
var route_exports = {};
__export(route_exports, {
  GET: () => GET,
  POST: () => POST
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

// packages/shared-lib/src/lib/storage-setup.ts
async function ensureBucketsExist() {
  const buckets = ["kyc-docs", "profile-images", "service-images", "booking-images", "invoices"];
  for (const bucket of buckets) {
    const isPublic = ["service-images", "profile-images", "booking-images"].includes(bucket);
    try {
      const { data: bucketData, error: getError } = await supabaseAdmin.storage.getBucket(bucket);
      if (getError || !bucketData) {
        console.log(`Bucket "${bucket}" not found, creating it...`);
        const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
          public: isPublic,
          fileSizeLimit: 1048576 * 5,
          // 5MB limit
          allowedMimeTypes: bucket === "invoices" ? ["application/pdf"] : ["image/webp", "image/png", "image/jpeg"]
        });
        if (createError) {
          console.error(`Failed to create bucket "${bucket}":`, createError.message);
        } else {
          console.log(`Successfully created bucket: "${bucket}"`);
        }
      }
    } catch (err) {
      console.error(`Error verifying bucket "${bucket}":`, err.message || err);
    }
  }
}

// src/app/api/worker/kyc/route.ts
async function GET(request) {
  const cacheHeaders = { "Cache-Control": "no-store, max-age=0, must-revalidate" };
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    await ensureBucketsExist();
    const { data: documents, error: docsErr } = await supabaseAdmin.from("worker_documents").select("*").eq("worker_id", workerId);
    if (docsErr) throw docsErr;
    const docsWithUrls = await Promise.all((documents || []).map(async (doc) => {
      let bucket = "kyc-docs";
      let path = "";
      if (doc.document_type === "PROFILE_PHOTO") {
        bucket = "profile-images";
        path = `worker_${workerId}/profile.webp`;
      } else {
        bucket = "kyc-docs";
        const fileMap = {
          AADHAAR_FRONT: "aadhaar-front.webp",
          AADHAAR_BACK: "aadhaar-back.webp",
          PAN_CARD: "pan.webp",
          SELFIE_VERIFICATION: "selfie.webp"
        };
        path = `worker_${workerId}/${fileMap[doc.document_type]}`;
      }
      const { data } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
      return __spreadProps(__spreadValues({}, doc), {
        signedUrl: (data == null ? void 0 : data.signedUrl) || null
      });
    }));
    const { data: kycState, error: kycErr } = await supabaseAdmin.from("worker_kyc").select("*").eq("worker_id", workerId).single();
    if (kycErr && kycErr.code !== "PGRST116") throw kycErr;
    const { data: userDetails } = await supabaseAdmin.from("users").select("full_name").eq("id", workerId).single();
    const { data: workerData, error: workerErr } = await supabaseAdmin.from("workers").select("bank_account_name, bank_account_number, bank_ifsc, dob, worker_id_code").eq("id", workerId).single();
    if (workerErr) throw workerErr;
    const { data: profile } = await supabaseAdmin.from("worker_profiles").select("skills").eq("worker_id", workerId).maybeSingle();
    const { data: categories } = await supabaseAdmin.from("service_categories").select("id, name").eq("is_active", true);
    return NextResponse.json({
      success: true,
      documents: docsWithUrls,
      kycState: kycState || {
        worker_id: workerId,
        aadhaar_status: "PENDING",
        pan_status: "PENDING",
        selfie_status: "PENDING",
        overall_status: "PENDING",
        remarks: null,
        submitted_at: null
      },
      skills: (profile == null ? void 0 : profile.skills) || [],
      categories: categories || [],
      bankDetails: workerData ? __spreadProps(__spreadValues({}, workerData), {
        full_name: (userDetails == null ? void 0 : userDetails.full_name) || ""
      }) : null
    }, { headers: cacheHeaders });
  } catch (error) {
    console.error("Error fetching KYC documents:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500, headers: cacheHeaders }
    );
  }
}
async function POST(request) {
  try {
    const session = await requireRole(request, "worker");
    const workerId = session.user_id;
    await ensureBucketsExist();
    const { data: kycState } = await supabaseAdmin.from("worker_kyc").select("overall_status").eq("worker_id", workerId).single();
    if ((kycState == null ? void 0 : kycState.overall_status) === "APPROVED") {
      return NextResponse.json(
        { error: "KYC application is already approved and locked." },
        { status: 400 }
      );
    }
    const { data: body, errorResponse } = await validateBody(request, import_zod.z.any());
    if (errorResponse) return errorResponse;
    const { document_type, file_url, file_size, mime_type, bankDetails } = body;
    if (bankDetails) {
      const { bank_account_name, bank_account_number, bank_ifsc, full_name, dob, skills } = bankDetails;
      const updateData = {
        bank_account_name,
        bank_account_number,
        bank_ifsc
      };
      if (dob) {
        updateData.dob = dob;
      }
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
      const { error: updateBankErr } = await supabaseAdmin.from("workers").update(updateData).eq("id", workerId);
      if (updateBankErr) throw updateBankErr;
      if (full_name) {
        const { error: updateUserErr } = await supabaseAdmin.from("users").update({ full_name }).eq("id", workerId);
        if (updateUserErr) throw updateUserErr;
      }
      if (Array.isArray(skills)) {
        const { data: existingProfile } = await supabaseAdmin.from("worker_profiles").select("id").eq("worker_id", workerId).maybeSingle();
        if (existingProfile) {
          const { error: profileUpdateErr } = await supabaseAdmin.from("worker_profiles").update({ skills, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("worker_id", workerId);
          if (profileUpdateErr) throw profileUpdateErr;
        } else {
          const { error: profileInsertErr } = await supabaseAdmin.from("worker_profiles").insert({
            worker_id: workerId,
            skills,
            city: "Bangalore",
            state: "Karnataka"
          });
          if (profileInsertErr) throw profileInsertErr;
        }
        try {
          await supabaseAdmin.rpc("sync_worker_categories_by_skills", { p_worker_id: workerId });
        } catch (err) {
          console.error("[KYC API] Failed to invoke sync_worker_categories_by_skills:", err);
        }
      }
      return NextResponse.json({ success: true, message: "Bank and personal details updated." });
    }
    if (!document_type || !file_url || !file_size) {
      return NextResponse.json({ error: "Missing document parameters" }, { status: 400 });
    }
    const validTypes = ["AADHAAR_FRONT", "AADHAAR_BACK", "PAN_CARD", "PROFILE_PHOTO", "SELFIE_VERIFICATION"];
    if (!validTypes.includes(document_type)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }
    const { error: docUpsertErr } = await supabaseAdmin.from("worker_documents").upsert({
      worker_id: workerId,
      document_type,
      file_url,
      file_size,
      mime_type: mime_type || "image/webp",
      status: "PENDING",
      uploaded_at: (/* @__PURE__ */ new Date()).toISOString()
    }, {
      onConflict: "worker_id,document_type"
    });
    if (docUpsertErr) throw docUpsertErr;
    let syncData = {};
    if (document_type === "AADHAAR_FRONT") syncData.aadhar_front_url = file_url;
    if (document_type === "AADHAAR_BACK") syncData.aadhar_back_url = file_url;
    if (document_type === "PAN_CARD") syncData.pan_url = file_url;
    if (document_type === "SELFIE_VERIFICATION") syncData.selfie_url = file_url;
    if (Object.keys(syncData).length > 0) {
      const { error: syncErr } = await supabaseAdmin.from("workers").update(syncData).eq("id", workerId);
      if (syncErr) throw syncErr;
    }
    let kycStatusUpdate = {};
    if (document_type === "AADHAAR_FRONT" || document_type === "AADHAAR_BACK") {
      kycStatusUpdate.aadhaar_status = "PENDING";
    }
    if (document_type === "PAN_CARD") {
      kycStatusUpdate.pan_status = "PENDING";
    }
    if (document_type === "SELFIE_VERIFICATION") {
      kycStatusUpdate.selfie_status = "PENDING";
    }
    const { data: currentDocs } = await supabaseAdmin.from("worker_documents").select("document_type").eq("worker_id", workerId);
    const uploadedTypes = (currentDocs == null ? void 0 : currentDocs.map((d) => d.document_type)) || [];
    const hasAllDocs = validTypes.every((type) => uploadedTypes.includes(type) || type === document_type);
    if (hasAllDocs) {
      kycStatusUpdate.overall_status = "PENDING";
      kycStatusUpdate.submitted_at = (/* @__PURE__ */ new Date()).toISOString();
      kycStatusUpdate.remarks = null;
    }
    if (Object.keys(kycStatusUpdate).length > 0) {
      const { error: kycUpdateErr } = await supabaseAdmin.from("worker_kyc").update(kycStatusUpdate).eq("worker_id", workerId);
      if (kycUpdateErr) throw kycUpdateErr;
    }
    return NextResponse.json({
      success: true,
      message: "Document uploaded successfully.",
      overallStatus: hasAllDocs ? "PENDING" : "INCOMPLETE"
    });
  } catch (error) {
    console.error("Error uploading KYC document:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: error.status || 500 }
    );
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET,
  POST
});
