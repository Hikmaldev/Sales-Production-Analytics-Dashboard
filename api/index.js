var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/errors.ts
var HttpError;
var init_errors = __esm({
  "server/errors.ts"() {
    "use strict";
    HttpError = class extends Error {
      status;
      details;
      constructor(status, message, details) {
        super(message);
        this.name = "HttpError";
        this.status = status;
        this.details = details;
      }
    };
  }
});

// server/middleware/error.ts
import multer from "multer";
function notFoundHandler(_req, res) {
  res.status(404).json({ error: { message: "Endpoint not found." } });
}
function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: { message: error.message, details: error.details }
    });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        message: error.code === "LIMIT_FILE_SIZE" ? "The file is too large (max 4 MB)." : "The upload failed. Please try again."
      }
    });
    return;
  }
  if (error instanceof SyntaxError && "status" in error && error.status === 400) {
    res.status(400).json({ error: { message: "Invalid JSON body." } });
    return;
  }
  console.error(error);
  res.status(500).json({
    error: { message: "Something went wrong. Please try again." }
  });
}
var init_error = __esm({
  "server/middleware/error.ts"() {
    "use strict";
    init_errors();
  }
});

// generated/prisma/enums.ts
var init_enums = __esm({
  "generated/prisma/enums.ts"() {
    "use strict";
  }
});

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("node:buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}
var config;
var init_class = __esm({
  "generated/prisma/internal/class.ts"() {
    "use strict";
    config = {
      "previewFeatures": [],
      "clientVersion": "7.10.0",
      "engineVersion": "0edf323efd1d98336f3f0a68684b56f689b900d3",
      "activeProvider": "postgresql",
      "inlineSchema": `// Prisma schema \u2014 Sales / Production Analytics Dashboard
//
// Sources:
// - PRD \xA710.3 (simplified data model)
// - PRD \xA711.1 (entities, fields, types, required fields)
// - PRD \xA711.2 (relations and delete rules)
//
// Prisma v7 layout: the datasource URL is configured in prisma.config.ts,
// not in this file. Connection URL comes from the DATABASE_URL env var.

generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// --- Enums ---------------------------------------------------------------
// Lowercase values match the PRD data spec:
// enum(viewer, admin), enum(pdf, excel), enum(success, failed).

enum UserRole {
  viewer
  admin
}

enum ExportFormat {
  pdf
  excel
}

enum ExportStatus {
  success
  failed
}

// --- Users ---------------------------------------------------------------

model User {
  id           BigInt    @id @default(autoincrement())
  name         String    @db.VarChar(150)
  email        String    @unique @db.VarChar(150)
  passwordHash String    @map("password_hash") @db.VarChar(255)
  role         UserRole  @default(viewer)
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")
  lastLoginAt  DateTime? @map("last_login_at")

  exportLogs ExportLog[]
  syncRuns   SyncRun[]   @relation("SyncRunTriggeredBy")

  @@map("users")
}

// --- Master data ---------------------------------------------------------
// Delete rule (PRD \xA711.2): branches, categories, and products with
// historical records are never hard-deleted; deactivate (isActive = false)
// instead so historical charts stay intact.

model Branch {
  id       BigInt  @id @default(autoincrement())
  name     String  @db.VarChar(150)
  region   String? @db.VarChar(100)
  isActive Boolean @default(true) @map("is_active")

  salesRecords SalesRecord[]

  @@map("branches")
}

model ProductCategory {
  id       BigInt  @id @default(autoincrement())
  name     String  @db.VarChar(150)
  isActive Boolean @default(true) @map("is_active")

  products Product[]

  @@map("product_categories")
}

model Product {
  id         BigInt  @id @default(autoincrement())
  name       String  @db.VarChar(150)
  categoryId BigInt  @map("category_id")
  isActive   Boolean @default(true) @map("is_active")

  // Restrict: a category still referenced by products cannot be deleted.
  category     ProductCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  salesRecords SalesRecord[]

  @@index([categoryId])
  @@map("products")
}

// --- Transactional data --------------------------------------------------

// Named sales_records for this deployment; PRD \xA711.1 allows the same shape
// to be named production_records in a pure production context.
model SalesRecord {
  id          BigInt   @id @default(autoincrement())
  branchId    BigInt   @map("branch_id")
  productId   BigInt   @map("product_id")
  quantity    Decimal  @db.Decimal(12, 2)
  value       Decimal? @db.Decimal(14, 2)
  recordDate  DateTime @map("record_date") @db.Date
  source      String?  @db.VarChar(50)
  // Import idempotency: rows imported from files/connectors carry the source
  // system's reference. A second import of the same rows is skipped.
  externalRef String?  @unique @map("external_ref") @db.VarChar(100)
  createdAt   DateTime @default(now()) @map("created_at")

  // Restrict: a branch/product with historical records cannot be deleted.
  branch  Branch  @relation(fields: [branchId], references: [id], onDelete: Restrict)
  product Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  // Indexes for dashboard aggregation queries (PRD \xA79.1).
  @@index([recordDate])
  @@index([branchId, recordDate])
  @@index([productId, recordDate])
  @@map("sales_records")
}

// --- Export logging ------------------------------------------------------

model ExportLog {
  id             BigInt       @id @default(autoincrement())
  userId         BigInt       @map("user_id")
  format         ExportFormat
  filterSnapshot Json         @map("filter_snapshot")
  status         ExportStatus
  createdAt      DateTime     @default(now()) @map("created_at")

  // Restrict: export history stays traceable even if the user is deactivated.
  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([userId, createdAt])
  @@map("export_logs")
}

// --- Data sync runs ------------------------------------------------------
// Records every "Refresh sync" trigger from Admin: Data Sources, so the
// history table and the status indicator read real data. Also the source of
// the "last synced at" timestamp.

enum SyncRunStatus {
  running
  success
  failed
}

model SyncRun {
  id                BigInt        @id @default(autoincrement())
  status            SyncRunStatus
  source            String        @db.VarChar(50)
  recordCount       Int           @default(0) @map("record_count")
  message           String?       @db.VarChar(500)
  startedAt         DateTime      @default(now()) @map("started_at")
  finishedAt        DateTime?     @map("finished_at")
  triggeredByUserId BigInt?       @map("triggered_by_user_id")

  // Restrict: sync history stays traceable even if the user is deactivated.
  triggeredBy User? @relation("SyncRunTriggeredBy", fields: [triggeredByUserId], references: [id], onDelete: Restrict)

  @@index([startedAt])
  @@map("sync_runs")
}
`,
      "runtimeDataModel": {
        "models": {},
        "enums": {},
        "types": {}
      },
      "parameterizationSchema": {
        "strings": [],
        "graph": ""
      }
    };
    config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String","dbName":"password_hash"},{"name":"role","kind":"enum","type":"UserRole"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"updatedAt","kind":"scalar","type":"DateTime","dbName":"updated_at"},{"name":"lastLoginAt","kind":"scalar","type":"DateTime","dbName":"last_login_at"},{"name":"exportLogs","kind":"object","type":"ExportLog","relationName":"ExportLogToUser"},{"name":"syncRuns","kind":"object","type":"SyncRun","relationName":"SyncRunTriggeredBy"}],"dbName":"users","schema":null},"Branch":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"name","kind":"scalar","type":"String"},{"name":"region","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"salesRecords","kind":"object","type":"SalesRecord","relationName":"BranchToSalesRecord"}],"dbName":"branches","schema":null},"ProductCategory":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"name","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"products","kind":"object","type":"Product","relationName":"ProductToProductCategory"}],"dbName":"product_categories","schema":null},"Product":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"name","kind":"scalar","type":"String"},{"name":"categoryId","kind":"scalar","type":"BigInt","dbName":"category_id"},{"name":"isActive","kind":"scalar","type":"Boolean","dbName":"is_active"},{"name":"category","kind":"object","type":"ProductCategory","relationName":"ProductToProductCategory"},{"name":"salesRecords","kind":"object","type":"SalesRecord","relationName":"ProductToSalesRecord"}],"dbName":"products","schema":null},"SalesRecord":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"branchId","kind":"scalar","type":"BigInt","dbName":"branch_id"},{"name":"productId","kind":"scalar","type":"BigInt","dbName":"product_id"},{"name":"quantity","kind":"scalar","type":"Decimal"},{"name":"value","kind":"scalar","type":"Decimal"},{"name":"recordDate","kind":"scalar","type":"DateTime","dbName":"record_date"},{"name":"source","kind":"scalar","type":"String"},{"name":"externalRef","kind":"scalar","type":"String","dbName":"external_ref"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"branch","kind":"object","type":"Branch","relationName":"BranchToSalesRecord"},{"name":"product","kind":"object","type":"Product","relationName":"ProductToSalesRecord"}],"dbName":"sales_records","schema":null},"ExportLog":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"userId","kind":"scalar","type":"BigInt","dbName":"user_id"},{"name":"format","kind":"enum","type":"ExportFormat"},{"name":"filterSnapshot","kind":"scalar","type":"Json","dbName":"filter_snapshot"},{"name":"status","kind":"enum","type":"ExportStatus"},{"name":"createdAt","kind":"scalar","type":"DateTime","dbName":"created_at"},{"name":"user","kind":"object","type":"User","relationName":"ExportLogToUser"}],"dbName":"export_logs","schema":null},"SyncRun":{"fields":[{"name":"id","kind":"scalar","type":"BigInt"},{"name":"status","kind":"enum","type":"SyncRunStatus"},{"name":"source","kind":"scalar","type":"String"},{"name":"recordCount","kind":"scalar","type":"Int","dbName":"record_count"},{"name":"message","kind":"scalar","type":"String"},{"name":"startedAt","kind":"scalar","type":"DateTime","dbName":"started_at"},{"name":"finishedAt","kind":"scalar","type":"DateTime","dbName":"finished_at"},{"name":"triggeredByUserId","kind":"scalar","type":"BigInt","dbName":"triggered_by_user_id"},{"name":"triggeredBy","kind":"object","type":"User","relationName":"SyncRunTriggeredBy"}],"dbName":"sync_runs","schema":null}},"enums":{},"types":{}}');
    config.parameterizationSchema = {
      strings: JSON.parse('["where","orderBy","cursor","user","exportLogs","triggeredBy","syncRuns","_count","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_avg","_sum","_min","_max","User.groupBy","User.aggregate","branch","products","category","salesRecords","product","Branch.findUnique","Branch.findUniqueOrThrow","Branch.findFirst","Branch.findFirstOrThrow","Branch.findMany","Branch.createOne","Branch.createMany","Branch.createManyAndReturn","Branch.updateOne","Branch.updateMany","Branch.updateManyAndReturn","Branch.upsertOne","Branch.deleteOne","Branch.deleteMany","Branch.groupBy","Branch.aggregate","ProductCategory.findUnique","ProductCategory.findUniqueOrThrow","ProductCategory.findFirst","ProductCategory.findFirstOrThrow","ProductCategory.findMany","ProductCategory.createOne","ProductCategory.createMany","ProductCategory.createManyAndReturn","ProductCategory.updateOne","ProductCategory.updateMany","ProductCategory.updateManyAndReturn","ProductCategory.upsertOne","ProductCategory.deleteOne","ProductCategory.deleteMany","ProductCategory.groupBy","ProductCategory.aggregate","Product.findUnique","Product.findUniqueOrThrow","Product.findFirst","Product.findFirstOrThrow","Product.findMany","Product.createOne","Product.createMany","Product.createManyAndReturn","Product.updateOne","Product.updateMany","Product.updateManyAndReturn","Product.upsertOne","Product.deleteOne","Product.deleteMany","Product.groupBy","Product.aggregate","SalesRecord.findUnique","SalesRecord.findUniqueOrThrow","SalesRecord.findFirst","SalesRecord.findFirstOrThrow","SalesRecord.findMany","SalesRecord.createOne","SalesRecord.createMany","SalesRecord.createManyAndReturn","SalesRecord.updateOne","SalesRecord.updateMany","SalesRecord.updateManyAndReturn","SalesRecord.upsertOne","SalesRecord.deleteOne","SalesRecord.deleteMany","SalesRecord.groupBy","SalesRecord.aggregate","ExportLog.findUnique","ExportLog.findUniqueOrThrow","ExportLog.findFirst","ExportLog.findFirstOrThrow","ExportLog.findMany","ExportLog.createOne","ExportLog.createMany","ExportLog.createManyAndReturn","ExportLog.updateOne","ExportLog.updateMany","ExportLog.updateManyAndReturn","ExportLog.upsertOne","ExportLog.deleteOne","ExportLog.deleteMany","ExportLog.groupBy","ExportLog.aggregate","SyncRun.findUnique","SyncRun.findUniqueOrThrow","SyncRun.findFirst","SyncRun.findFirstOrThrow","SyncRun.findMany","SyncRun.createOne","SyncRun.createMany","SyncRun.createManyAndReturn","SyncRun.updateOne","SyncRun.updateMany","SyncRun.updateManyAndReturn","SyncRun.upsertOne","SyncRun.deleteOne","SyncRun.deleteMany","SyncRun.groupBy","SyncRun.aggregate","AND","OR","NOT","id","SyncRunStatus","status","source","recordCount","message","startedAt","finishedAt","triggeredByUserId","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","userId","ExportFormat","format","filterSnapshot","ExportStatus","createdAt","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","branchId","productId","quantity","value","recordDate","externalRef","name","categoryId","isActive","every","some","none","region","email","passwordHash","UserRole","role","updatedAt","lastLoginAt","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
      graph: "tgNLcA4EAACGAgAgBgAAhwIAIIUBAACDAgAwhgEAAAsAEIcBAACDAgAwiAEEAAAAAaEBQAD8AQAhrgEBAPABACGwASAA8QEAIbUBAQAAAAG2AQEA8AEAIbgBAACEArgBIrkBQAD8AQAhugFAAIUCACEBAAAAAQAgCgMAAJECACCFAQAAjQIAMIYBAAADABCHAQAAjQIAMIgBBADvAQAhigEAAJACoQEinAEEAO8BACGeAQAAjgKeASKfAQAAjwIAIKEBQAD8AQAhAQMAAJgDACAKAwAAkQIAIIUBAACNAgAwhgEAAAMAEIcBAACNAgAwiAEEAAAAAYoBAACQAqEBIpwBBADvAQAhngEAAI4CngEinwEAAI8CACChAUAA_AEAIQMAAAADACABAAAEADACAAAFACAMBQAAjAIAIIUBAACIAgAwhgEAAAcAEIcBAACIAgAwiAEEAO8BACGKAQAAiQKKASKLAQEA8AEAIYwBAgCKAgAhjQEBAPUBACGOAUAA_AEAIY8BQACFAgAhkAEEAIsCACEEBQAAmAMAII0BAACSAgAgjwEAAJICACCQAQAAkgIAIAwFAACMAgAghQEAAIgCADCGAQAABwAQhwEAAIgCADCIAQQAAAABigEAAIkCigEiiwEBAPABACGMAQIAigIAIY0BAQD1AQAhjgFAAPwBACGPAUAAhQIAIZABBACLAgAhAwAAAAcAIAEAAAgAMAIAAAkAIA4EAACGAgAgBgAAhwIAIIUBAACDAgAwhgEAAAsAEIcBAACDAgAwiAEEAO8BACGhAUAA_AEAIa4BAQDwAQAhsAEgAPEBACG1AQEA8AEAIbYBAQDwAQAhuAEAAIQCuAEiuQFAAPwBACG6AUAAhQIAIQEAAAALACABAAAAAwAgAQAAAAcAIAEAAAABACADBAAAlgMAIAYAAJcDACC6AQAAkgIAIAMAAAALACABAAAQADACAAABACADAAAACwAgAQAAEAAwAgAAAQAgAwAAAAsAIAEAABAAMAIAAAEAIAsEAACUAwAgBgAAlQMAIIgBBAAAAAGhAUAAAAABrgEBAAAAAbABIAAAAAG1AQEAAAABtgEBAAAAAbgBAAAAuAECuQFAAAAAAboBQAAAAAEBDQAAFAAgCYgBBAAAAAGhAUAAAAABrgEBAAAAAbABIAAAAAG1AQEAAAABtgEBAAAAAbgBAAAAuAECuQFAAAAAAboBQAAAAAEBDQAAFgAwAQ0AABYAMAsEAAD6AgAgBgAA-wIAIIgBBACYAgAhoQFAAJ0CACGuAQEAmgIAIbABIAC7AgAhtQEBAJoCACG2AQEAmgIAIbgBAAD5ArgBIrkBQACdAgAhugFAAJ4CACECAAAAAQAgDQAAGQAgCYgBBACYAgAhoQFAAJ0CACGuAQEAmgIAIbABIAC7AgAhtQEBAJoCACG2AQEAmgIAIbgBAAD5ArgBIrkBQACdAgAhugFAAJ4CACECAAAACwAgDQAAGwAgAgAAAAsAIA0AABsAIAMAAAABACAUAAAUACAVAAAZACABAAAAAQAgAQAAAAsAIAYHAAD0AgAgGgAA9QIAIBsAAPgCACAcAAD3AgAgHQAA9gIAILoBAACSAgAgDIUBAAD_AQAwhgEAACIAEIcBAAD_AQAwiAEEAL4BACGhAUAAwwEAIa4BAQDAAQAhsAEgAOoBACG1AQEAwAEAIbYBAQDAAQAhuAEAAIACuAEiuQFAAMMBACG6AUAAxAEAIQMAAAALACABAAAhADAZAAAiACADAAAACwAgAQAAEAAwAgAAAQAgCCMAAPYBACCFAQAA9AEAMIYBAAA0ABCHAQAA9AEAMIgBBAAAAAGuAQEA8AEAIbABIADxAQAhtAEBAPUBACEBAAAAJQAgDiAAAP0BACAkAAD-AQAghQEAAPkBADCGAQAAJwAQhwEAAPkBADCIAQQA7wEAIYsBAQD1AQAhoQFAAPwBACGoAQQA7wEAIakBBADvAQAhqgEQAPoBACGrARAA-wEAIawBQAD8AQAhrQEBAPUBACEFIAAA8gIAICQAAPMCACCLAQAAkgIAIKsBAACSAgAgrQEAAJICACAOIAAA_QEAICQAAP4BACCFAQAA-QEAMIYBAAAnABCHAQAA-QEAMIgBBAAAAAGLAQEA9QEAIaEBQAD8AQAhqAEEAO8BACGpAQQA7wEAIaoBEAD6AQAhqwEQAPsBACGsAUAA_AEAIa0BAQAAAAEDAAAAJwAgAQAAKAAwAgAAKQAgCSIAAPgBACAjAAD2AQAghQEAAPcBADCGAQAAKwAQhwEAAPcBADCIAQQA7wEAIa4BAQDwAQAhrwEEAO8BACGwASAA8QEAIQIiAADxAgAgIwAA8AIAIAkiAAD4AQAgIwAA9gEAIIUBAAD3AQAwhgEAACsAEIcBAAD3AQAwiAEEAAAAAa4BAQDwAQAhrwEEAO8BACGwASAA8QEAIQMAAAArACABAAAsADACAAAtACABAAAAKwAgAwAAACcAIAEAACgAMAIAACkAIAEAAAAnACABAAAAJwAgAQAAACUAIAgjAAD2AQAghQEAAPQBADCGAQAANAAQhwEAAPQBADCIAQQA7wEAIa4BAQDwAQAhsAEgAPEBACG0AQEA9QEAIQIjAADwAgAgtAEAAJICACADAAAANAAgAQAANQAwAgAAJQAgAwAAADQAIAEAADUAMAIAACUAIAMAAAA0ACABAAA1ADACAAAlACAFIwAA7wIAIIgBBAAAAAGuAQEAAAABsAEgAAAAAbQBAQAAAAEBDQAAOQAgBIgBBAAAAAGuAQEAAAABsAEgAAAAAbQBAQAAAAEBDQAAOwAwAQ0AADsAMAUjAADlAgAgiAEEAJgCACGuAQEAmgIAIbABIAC7AgAhtAEBAJwCACECAAAAJQAgDQAAPgAgBIgBBACYAgAhrgEBAJoCACGwASAAuwIAIbQBAQCcAgAhAgAAADQAIA0AAEAAIAIAAAA0ACANAABAACADAAAAJQAgFAAAOQAgFQAAPgAgAQAAACUAIAEAAAA0ACAGBwAA4AIAIBoAAOECACAbAADkAgAgHAAA4wIAIB0AAOICACC0AQAAkgIAIAeFAQAA8wEAMIYBAABHABCHAQAA8wEAMIgBBAC-AQAhrgEBAMABACGwASAA6gEAIbQBAQDCAQAhAwAAADQAIAEAAEYAMBkAAEcAIAMAAAA0ACABAAA1ADACAAAlACAHIQAA8gEAIIUBAADuAQAwhgEAAE0AEIcBAADuAQAwiAEEAAAAAa4BAQDwAQAhsAEgAPEBACEBAAAASgAgAQAAAEoAIAchAADyAQAghQEAAO4BADCGAQAATQAQhwEAAO4BADCIAQQA7wEAIa4BAQDwAQAhsAEgAPEBACEBIQAA3wIAIAMAAABNACABAABOADACAABKACADAAAATQAgAQAATgAwAgAASgAgAwAAAE0AIAEAAE4AMAIAAEoAIAQhAADeAgAgiAEEAAAAAa4BAQAAAAGwASAAAAABAQ0AAFIAIAOIAQQAAAABrgEBAAAAAbABIAAAAAEBDQAAVAAwAQ0AAFQAMAQhAADRAgAgiAEEAJgCACGuAQEAmgIAIbABIAC7AgAhAgAAAEoAIA0AAFcAIAOIAQQAmAIAIa4BAQCaAgAhsAEgALsCACECAAAATQAgDQAAWQAgAgAAAE0AIA0AAFkAIAMAAABKACAUAABSACAVAABXACABAAAASgAgAQAAAE0AIAUHAADMAgAgGgAAzQIAIBsAANACACAcAADPAgAgHQAAzgIAIAaFAQAA7QEAMIYBAABgABCHAQAA7QEAMIgBBAC-AQAhrgEBAMABACGwASAA6gEAIQMAAABNACABAABfADAZAABgACADAAAATQAgAQAATgAwAgAASgAgAQAAAC0AIAEAAAAtACADAAAAKwAgAQAALAAwAgAALQAgAwAAACsAIAEAACwAMAIAAC0AIAMAAAArACABAAAsADACAAAtACAGIgAAygIAICMAAMsCACCIAQQAAAABrgEBAAAAAa8BBAAAAAGwASAAAAABAQ0AAGgAIASIAQQAAAABrgEBAAAAAa8BBAAAAAGwASAAAAABAQ0AAGoAMAENAABqADAGIgAAvAIAICMAAL0CACCIAQQAmAIAIa4BAQCaAgAhrwEEAJgCACGwASAAuwIAIQIAAAAtACANAABtACAEiAEEAJgCACGuAQEAmgIAIa8BBACYAgAhsAEgALsCACECAAAAKwAgDQAAbwAgAgAAACsAIA0AAG8AIAMAAAAtACAUAABoACAVAABtACABAAAALQAgAQAAACsAIAUHAAC2AgAgGgAAtwIAIBsAALoCACAcAAC5AgAgHQAAuAIAIAeFAQAA6QEAMIYBAAB2ABCHAQAA6QEAMIgBBAC-AQAhrgEBAMABACGvAQQAvgEAIbABIADqAQAhAwAAACsAIAEAAHUAMBkAAHYAIAMAAAArACABAAAsADACAAAtACABAAAAKQAgAQAAACkAIAMAAAAnACABAAAoADACAAApACADAAAAJwAgAQAAKAAwAgAAKQAgAwAAACcAIAEAACgAMAIAACkAIAsgAAC0AgAgJAAAtQIAIIgBBAAAAAGLAQEAAAABoQFAAAAAAagBBAAAAAGpAQQAAAABqgEQAAAAAasBEAAAAAGsAUAAAAABrQEBAAAAAQENAAB-ACAJiAEEAAAAAYsBAQAAAAGhAUAAAAABqAEEAAAAAakBBAAAAAGqARAAAAABqwEQAAAAAawBQAAAAAGtAQEAAAABAQ0AAIABADABDQAAgAEAMAsgAACyAgAgJAAAswIAIIgBBACYAgAhiwEBAJwCACGhAUAAnQIAIagBBACYAgAhqQEEAJgCACGqARAAsAIAIasBEACxAgAhrAFAAJ0CACGtAQEAnAIAIQIAAAApACANAACDAQAgCYgBBACYAgAhiwEBAJwCACGhAUAAnQIAIagBBACYAgAhqQEEAJgCACGqARAAsAIAIasBEACxAgAhrAFAAJ0CACGtAQEAnAIAIQIAAAAnACANAACFAQAgAgAAACcAIA0AAIUBACADAAAAKQAgFAAAfgAgFQAAgwEAIAEAAAApACABAAAAJwAgCAcAAKsCACAaAACsAgAgGwAArwIAIBwAAK4CACAdAACtAgAgiwEAAJICACCrAQAAkgIAIK0BAACSAgAgDIUBAADiAQAwhgEAAIwBABCHAQAA4gEAMIgBBAC-AQAhiwEBAMIBACGhAUAAwwEAIagBBAC-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_QEAICQAAP4BACCFAQAA-QEAMIYBAAAnABCHAQAA-QEAMIgBBADvAQAhiwEBAPUBACGhAUAA_AEAIagBBADvAQAhqQEEAO8BACGqARAA-gEAIasBEAD7AQAhrAFAAPwBACGtAQEA9QEAIQiRARAAAAABkgEQAAAABJMBEAAAAASUARAAAAABlQEQAAAAAZYBEAAAAAGXARAAAAABmAEQAOgBACEIkQEQAAAAAZIBEAAAAAWTARAAAAAFlAEQAAAAAZUBEAAAAAGWARAAAAABlwEQAAAAAZgBEADmAQAhCJEBQAAAAAGSAUAAAAAEkwFAAAAABJQBQAAAAAGVAUAAAAABlgFAAAAAAZcBQAAAAAGYAUAAzgEAIQojAAD2AQAghQEAAPQBADCGAQAANAAQhwEAAPQBADCIAQQA7wEAIa4BAQDwAQAhsAEgAPEBACG0AQEA9QEAIbsBAAA0ACC8AQAANAAgCyIAAPgBACAjAAD2AQAghQEAAPcBADCGAQAAKwAQhwEAAPcBADCIAQQA7wEAIa4BAQDwAQAhrwEEAO8BACGwASAA8QEAIbsBAAArACC8AQAAKwAgDIUBAAD_AQAwhgEAACIAEIcBAAD_AQAwiAEEAL4BACGhAUAAwwEAIa4BAQDAAQAhsAEgAOoBACG1AQEAwAEAIbYBAQDAAQAhuAEAAIACuAEiuQFAAMMBACG6AUAAxAEAIQcHAADNAQAgHAAAggIAIB0AAIICACCRAQAAALgBApIBAAAAuAEIkwEAAAC4AQiYAQAAgQK4ASIHBwAAzQEAIBwAAIICACAdAACCAgAgkQEAAAC4AQKSAQAAALgBCJMBAAAAuAEImAEAAIECuAEiBJEBAAAAuAECkgEAAAC4AQiTAQAAALgBCJgBAACCArgBIg4EAACGAgAgBgAAhwIAIIUBAACDAgAwhgEAAAsAEIcBAACDAgAwiAEEAO8BACGhAUAA_AEAIa4BAQDwAQAhsAEgAPEBACG1AQEA8AEAIbYBAQDwAQAhuAEAAIQCuAEiuQFAAPwBACG6AUAAhQIAIQSRAQAAALgBApIBAAAAuAEIkwEAAAC4AQiYAQAAggK4ASIIkQFAAAAAAZIBQAAAAAWTAUAAAAAFlAFAAAAAAZUBQAAAAAGWAUAAAAABlwFAAAAAAZgBQADLAQAhA7EBAAADACCyAQAAAwAgswEAAAMAIAOxAQAABwAgsgEAAAcAILMBAAAHACAMBQAAjAIAIIUBAACIAgAwhgEAAAcAEIcBAACIAgAwiAEEAO8BACGKAQAAiQKKASKLAQEA8AEAIYwBAgCKAgAhjQEBAPUBACGOAUAA_AEAIY8BQACFAgAhkAEEAIsCACEEkQEAAACKAQKSAQAAAIoBCJMBAAAAigEImAEAANYBigEiCJEBAgAAAAGSAQIAAAAEkwECAAAABJQBAgAAAAGVAQIAAAABlgECAAAAAZcBAgAAAAGYAQIAzQEAIQiRAQQAAAABkgEEAAAABZMBBAAAAAWUAQQAAAABlQEEAAAAAZYBBAAAAAGXAQQAAAABmAEEAMkBACEQBAAAhgIAIAYAAIcCACCFAQAAgwIAMIYBAAALABCHAQAAgwIAMIgBBADvAQAhoQFAAPwBACGuAQEA8AEAIbABIADxAQAhtQEBAPABACG2AQEA8AEAIbgBAACEArgBIrkBQAD8AQAhugFAAIUCACG7AQAACwAgvAEAAAsAIAoDAACRAgAghQEAAI0CADCGAQAAAwAQhwEAAI0CADCIAQQA7wEAIYoBAACQAqEBIpwBBADvAQAhngEAAI4CngEinwEAAI8CACChAUAA_AEAIQSRAQAAAJ4BApIBAAAAngEIkwEAAACeAQiYAQAA4QGeASIMkQGAAAAAAZQBgAAAAAGVAYAAAAABlgGAAAAAAZcBgAAAAAGYAYAAAAABogEBAAAAAaMBAQAAAAGkAQEAAAABpQGAAAAAAaYBgAAAAAGnAYAAAAABBJEBAAAAoQECkgEAAAChAQiTAQAAAKEBCJgBAADeAaEBIhAEAACGAgAgBgAAhwIAIIUBAACDAgAwhgEAAAsAEIcBAACDAgAwiAEEAO8BACGhAUAA_AEAIa4BAQDwAQAhsAEgAPEBACG1AQEA8AEAIbYBAQDwAQAhuAEAAIQCuAEiuQFAAPwBACG6AUAAhQIAIbsBAAALACC8AQAACwAgAAAAAAAABcABBAAAAAHGAQQAAAABxwEEAAAAAcgBBAAAAAHJAQQAAAABAcABAAAAigECAcABAQAAAAEFwAECAAAAAcYBAgAAAAHHAQIAAAAByAECAAAAAckBAgAAAAEBwAEBAAAAAQHAAUAAAAABAcABQAAAAAEFwAEEAAAAAcYBBAAAAAHHAQQAAAAByAEEAAAAAckBBAAAAAEHFAAAsgMAIBUAALUDACC9AQAAswMAIL4BAAC0AwAgwQEAAAsAIMIBAAALACDDAQAAAQAgAxQAALIDACC9AQAAswMAIMMBAAABACAAAAAAAAHAAQAAAJ4BAgHAAQAAAKEBAgUUAACtAwAgFQAAsAMAIL0BAACuAwAgvgEAAK8DACDDAQAAAQAgAxQAAK0DACC9AQAArgMAIMMBAAABACAAAAAAAAXAARAAAAABxgEQAAAAAccBEAAAAAHIARAAAAAByQEQAAAAAQXAARAAAAABxgEQAAAAAccBEAAAAAHIARAAAAAByQEQAAAAAQUUAAClAwAgFQAAqwMAIL0BAACmAwAgvgEAAKoDACDDAQAAJQAgBRQAAKMDACAVAACoAwAgvQEAAKQDACC-AQAApwMAIMMBAAAtACADFAAApQMAIL0BAACmAwAgwwEAACUAIAMUAACjAwAgvQEAAKQDACDDAQAALQAgAAAAAAABwAEgAAAAAQUUAACdAwAgFQAAoQMAIL0BAACeAwAgvgEAAKADACDDAQAASgAgCxQAAL4CADAVAADDAgAwvQEAAL8CADC-AQAAwAIAML8BAADBAgAgwAEAAMICADDBAQAAwgIAMMIBAADCAgAwwwEAAMICADDEAQAAxAIAMMUBAADFAgAwCSAAALQCACCIAQQAAAABiwEBAAAAAaEBQAAAAAGoAQQAAAABqgEQAAAAAasBEAAAAAGsAUAAAAABrQEBAAAAAQIAAAApACAUAADJAgAgAwAAACkAIBQAAMkCACAVAADIAgAgAQ0AAJ8DADAOIAAA_QEAICQAAP4BACCFAQAA-QEAMIYBAAAnABCHAQAA-QEAMIgBBAAAAAGLAQEA9QEAIaEBQAD8AQAhqAEEAO8BACGpAQQA7wEAIaoBEAD6AQAhqwEQAPsBACGsAUAA_AEAIa0BAQAAAAECAAAAKQAgDQAAyAIAIAIAAADGAgAgDQAAxwIAIAyFAQAAxQIAMIYBAADGAgAQhwEAAMUCADCIAQQA7wEAIYsBAQD1AQAhoQFAAPwBACGoAQQA7wEAIakBBADvAQAhqgEQAPoBACGrARAA-wEAIawBQAD8AQAhrQEBAPUBACEMhQEAAMUCADCGAQAAxgIAEIcBAADFAgAwiAEEAO8BACGLAQEA9QEAIaEBQAD8AQAhqAEEAO8BACGpAQQA7wEAIaoBEAD6AQAhqwEQAPsBACGsAUAA_AEAIa0BAQD1AQAhCIgBBACYAgAhiwEBAJwCACGhAUAAnQIAIagBBACYAgAhqgEQALACACGrARAAsQIAIawBQACdAgAhrQEBAJwCACEJIAAAsgIAIIgBBACYAgAhiwEBAJwCACGhAUAAnQIAIagBBACYAgAhqgEQALACACGrARAAsQIAIawBQACdAgAhrQEBAJwCACEJIAAAtAIAIIgBBAAAAAGLAQEAAAABoQFAAAAAAagBBAAAAAGqARAAAAABqwEQAAAAAawBQAAAAAGtAQEAAAABAxQAAJ0DACC9AQAAngMAIMMBAABKACAEFAAAvgIAML0BAAC_AgAwvwEAAMECACDDAQAAwgIAMAAAAAAACxQAANICADAVAADXAgAwvQEAANMCADC-AQAA1AIAML8BAADVAgAgwAEAANYCADDBAQAA1gIAMMIBAADWAgAwwwEAANYCADDEAQAA2AIAMMUBAADZAgAwBCMAAMsCACCIAQQAAAABrgEBAAAAAbABIAAAAAECAAAALQAgFAAA3QIAIAMAAAAtACAUAADdAgAgFQAA3AIAIAENAACcAwAwCSIAAPgBACAjAAD2AQAghQEAAPcBADCGAQAAKwAQhwEAAPcBADCIAQQAAAABrgEBAPABACGvAQQA7wEAIbABIADxAQAhAgAAAC0AIA0AANwCACACAAAA2gIAIA0AANsCACAHhQEAANkCADCGAQAA2gIAEIcBAADZAgAwiAEEAO8BACGuAQEA8AEAIa8BBADvAQAhsAEgAPEBACEHhQEAANkCADCGAQAA2gIAEIcBAADZAgAwiAEEAO8BACGuAQEA8AEAIa8BBADvAQAhsAEgAPEBACEDiAEEAJgCACGuAQEAmgIAIbABIAC7AgAhBCMAAL0CACCIAQQAmAIAIa4BAQCaAgAhsAEgALsCACEEIwAAywIAIIgBBAAAAAGuAQEAAAABsAEgAAAAAQQUAADSAgAwvQEAANMCADC_AQAA1QIAIMMBAADWAgAwAAAAAAAACxQAAOYCADAVAADqAgAwvQEAAOcCADC-AQAA6AIAML8BAADpAgAgwAEAAMICADDBAQAAwgIAMMIBAADCAgAwwwEAAMICADDEAQAA6wIAMMUBAADFAgAwCSQAALUCACCIAQQAAAABiwEBAAAAAaEBQAAAAAGpAQQAAAABqgEQAAAAAasBEAAAAAGsAUAAAAABrQEBAAAAAQIAAAApACAUAADuAgAgAwAAACkAIBQAAO4CACAVAADtAgAgAQ0AAJsDADACAAAAKQAgDQAA7QIAIAIAAADGAgAgDQAA7AIAIAiIAQQAmAIAIYsBAQCcAgAhoQFAAJ0CACGpAQQAmAIAIaoBEACwAgAhqwEQALECACGsAUAAnQIAIa0BAQCcAgAhCSQAALMCACCIAQQAmAIAIYsBAQCcAgAhoQFAAJ0CACGpAQQAmAIAIaoBEACwAgAhqwEQALECACGsAUAAnQIAIa0BAQCcAgAhCSQAALUCACCIAQQAAAABiwEBAAAAAaEBQAAAAAGpAQQAAAABqgEQAAAAAasBEAAAAAGsAUAAAAABrQEBAAAAAQQUAADmAgAwvQEAAOcCADC_AQAA6QIAIMMBAADCAgAwAAEhAADfAgAgAiMAAPACACC0AQAAkgIAIAIiAADxAgAgIwAA8AIAIAAAAAAAAcABAAAAuAECCxQAAIgDADAVAACNAwAwvQEAAIkDADC-AQAAigMAML8BAACLAwAgwAEAAIwDADDBAQAAjAMAMMIBAACMAwAwwwEAAIwDADDEAQAAjgMAMMUBAACPAwAwCxQAAPwCADAVAACBAwAwvQEAAP0CADC-AQAA_gIAML8BAAD_AgAgwAEAAIADADDBAQAAgAMAMMIBAACAAwAwwwEAAIADADDEAQAAggMAMMUBAACDAwAwB4gBBAAAAAGKAQAAAIoBAosBAQAAAAGMAQIAAAABjQEBAAAAAY4BQAAAAAGPAUAAAAABAgAAAAkAIBQAAIcDACADAAAACQAgFAAAhwMAIBUAAIYDACABDQAAmgMAMAwFAACMAgAghQEAAIgCADCGAQAABwAQhwEAAIgCADCIAQQAAAABigEAAIkCigEiiwEBAPABACGMAQIAigIAIY0BAQD1AQAhjgFAAPwBACGPAUAAhQIAIZABBACLAgAhAgAAAAkAIA0AAIYDACACAAAAhAMAIA0AAIUDACALhQEAAIMDADCGAQAAhAMAEIcBAACDAwAwiAEEAO8BACGKAQAAiQKKASKLAQEA8AEAIYwBAgCKAgAhjQEBAPUBACGOAUAA_AEAIY8BQACFAgAhkAEEAIsCACELhQEAAIMDADCGAQAAhAMAEIcBAACDAwAwiAEEAO8BACGKAQAAiQKKASKLAQEA8AEAIYwBAgCKAgAhjQEBAPUBACGOAUAA_AEAIY8BQACFAgAhkAEEAIsCACEHiAEEAJgCACGKAQAAmQKKASKLAQEAmgIAIYwBAgCbAgAhjQEBAJwCACGOAUAAnQIAIY8BQACeAgAhB4gBBACYAgAhigEAAJkCigEiiwEBAJoCACGMAQIAmwIAIY0BAQCcAgAhjgFAAJ0CACGPAUAAngIAIQeIAQQAAAABigEAAACKAQKLAQEAAAABjAECAAAAAY0BAQAAAAGOAUAAAAABjwFAAAAAAQWIAQQAAAABigEAAAChAQKeAQAAAJ4BAp8BgAAAAAGhAUAAAAABAgAAAAUAIBQAAJMDACADAAAABQAgFAAAkwMAIBUAAJIDACABDQAAmQMAMAoDAACRAgAghQEAAI0CADCGAQAAAwAQhwEAAI0CADCIAQQAAAABigEAAJACoQEinAEEAO8BACGeAQAAjgKeASKfAQAAjwIAIKEBQAD8AQAhAgAAAAUAIA0AAJIDACACAAAAkAMAIA0AAJEDACAJhQEAAI8DADCGAQAAkAMAEIcBAACPAwAwiAEEAO8BACGKAQAAkAKhASKcAQQA7wEAIZ4BAACOAp4BIp8BAACPAgAgoQFAAPwBACEJhQEAAI8DADCGAQAAkAMAEIcBAACPAwAwiAEEAO8BACGKAQAAkAKhASKcAQQA7wEAIZ4BAACOAp4BIp8BAACPAgAgoQFAAPwBACEFiAEEAJgCACGKAQAAqAKhASKeAQAApwKeASKfAYAAAAABoQFAAJ0CACEFiAEEAJgCACGKAQAAqAKhASKeAQAApwKeASKfAYAAAAABoQFAAJ0CACEFiAEEAAAAAYoBAAAAoQECngEAAACeAQKfAYAAAAABoQFAAAAAAQQUAACIAwAwvQEAAIkDADC_AQAAiwMAIMMBAACMAwAwBBQAAPwCADC9AQAA_QIAML8BAAD_AgAgwwEAAIADADAAAAMEAACWAwAgBgAAlwMAILoBAACSAgAgBYgBBAAAAAGKAQAAAKEBAp4BAAAAngECnwGAAAAAAaEBQAAAAAEHiAEEAAAAAYoBAAAAigECiwEBAAAAAYwBAgAAAAGNAQEAAAABjgFAAAAAAY8BQAAAAAEIiAEEAAAAAYsBAQAAAAGhAUAAAAABqQEEAAAAAaoBEAAAAAGrARAAAAABrAFAAAAAAa0BAQAAAAEDiAEEAAAAAa4BAQAAAAGwASAAAAABA4gBBAAAAAGuAQEAAAABsAEgAAAAAQIAAABKACAUAACdAwAgCIgBBAAAAAGLAQEAAAABoQFAAAAAAagBBAAAAAGqARAAAAABqwEQAAAAAawBQAAAAAGtAQEAAAABAwAAAE0AIBQAAJ0DACAVAACiAwAgBQAAAE0AIA0AAKIDACCIAQQAmAIAIa4BAQCaAgAhsAEgALsCACEDiAEEAJgCACGuAQEAmgIAIbABIAC7AgAhBSIAAMoCACCIAQQAAAABrgEBAAAAAa8BBAAAAAGwASAAAAABAgAAAC0AIBQAAKMDACAEiAEEAAAAAa4BAQAAAAGwASAAAAABtAEBAAAAAQIAAAAlACAUAAClAwAgAwAAACsAIBQAAKMDACAVAACpAwAgBwAAACsAIA0AAKkDACAiAAC8AgAgiAEEAJgCACGuAQEAmgIAIa8BBACYAgAhsAEgALsCACEFIgAAvAIAIIgBBACYAgAhrgEBAJoCACGvAQQAmAIAIbABIAC7AgAhAwAAADQAIBQAAKUDACAVAACsAwAgBgAAADQAIA0AAKwDACCIAQQAmAIAIa4BAQCaAgAhsAEgALsCACG0AQEAnAIAIQSIAQQAmAIAIa4BAQCaAgAhsAEgALsCACG0AQEAnAIAIQoGAACVAwAgiAEEAAAAAaEBQAAAAAGuAQEAAAABsAEgAAAAAbUBAQAAAAG2AQEAAAABuAEAAAC4AQK5AUAAAAABugFAAAAAAQIAAAABACAUAACtAwAgAwAAAAsAIBQAAK0DACAVAACxAwAgDAAAAAsAIAYAAPsCACANAACxAwAgiAEEAJgCACGhAUAAnQIAIa4BAQCaAgAhsAEgALsCACG1AQEAmgIAIbYBAQCaAgAhuAEAAPkCuAEiuQFAAJ0CACG6AUAAngIAIQoGAAD7AgAgiAEEAJgCACGhAUAAnQIAIa4BAQCaAgAhsAEgALsCACG1AQEAmgIAIbYBAQCaAgAhuAEAAPkCuAEiuQFAAJ0CACG6AUAAngIAIQoEAACUAwAgiAEEAAAAAaEBQAAAAAGuAQEAAAABsAEgAAAAAbUBAQAAAAG2AQEAAAABuAEAAAC4AQK5AUAAAAABugFAAAAAAQIAAAABACAUAACyAwAgAwAAAAsAIBQAALIDACAVAAC2AwAgDAAAAAsAIAQAAPoCACANAAC2AwAgiAEEAJgCACGhAUAAnQIAIa4BAQCaAgAhsAEgALsCACG1AQEAmgIAIbYBAQCaAgAhuAEAAPkCuAEiuQFAAJ0CACG6AUAAngIAIQoEAAD6AgAgiAEEAJgCACGhAUAAnQIAIa4BAQCaAgAhsAEgALsCACG1AQEAmgIAIbYBAQCaAgAhuAEAAPkCuAEiuQFAAJ0CACG6AUAAngIAIQMEBgIGCgMHAAQBAwABAQUMAQIEDQAGDgAAAAAFBwAJGgAKGwALHAAMHQANAAAAAAAFBwAJGgAKGwALHAAMHQANAgcAFSMqEAIgAA8kABEDBwAUIgASIzAQAgcAEyEuEQEhLwABIzEAASMyAAAABQcAGRoAGhsAGxwAHB0AHQAAAAAABQcAGRoAGhsAGxwAHB0AHQAABQcAIhoAIxsAJBwAJR0AJgAAAAAABQcAIhoAIxsAJBwAJR0AJgEiABIBIgASBQcAKxoALBsALRwALh0ALwAAAAAABQcAKxoALBsALRwALh0ALwIgAA8kABECIAAPJAARBQcANBoANRsANhwANx0AOAAAAAAABQcANBoANRsANhwANx0AOAEDAAEBAwABBQcAPRoAPhsAPxwAQB0AQQAAAAAABQcAPRoAPhsAPxwAQB0AQQEFrwEBAQW1AQEFBwBGGgBHGwBIHABJHQBKAAAAAAAFBwBGGgBHGwBIHABJHQBKCAIBCQ8BChEBCxIBDBMBDhUBDxcFEBgGERoBEhwFEx0HFh4BFx8BGCAFHiMIHyQOJSYPJjMPJzYPKDcPKTgPKjoPKzwFLD0WLT8PLkEFL0IXMEMPMUQPMkUFM0gYNEkeNUsSNkwSN08SOFASOVESOlMSO1UFPFYfPVgSPloFP1sgQFwSQV0SQl4FQ2EhRGInRWMRRmQRR2URSGYRSWcRSmkRS2sFTGwoTW4RTnAFT3EpUHIRUXMRUnQFU3cqVHgwVXkQVnoQV3sQWHwQWX0QWn8QW4EBBVyCATFdhAEQXoYBBV-HATJgiAEQYYkBEGKKAQVjjQEzZI4BOWWPAQJmkAECZ5EBAmiSAQJpkwECapUBAmuXAQVsmAE6bZoBAm6cAQVvnQE7cJ4BAnGfAQJyoAEFc6MBPHSkAUJ1pQEDdqYBA3enAQN4qAEDeakBA3qrAQN7rQEFfK4BQ32xAQN-swEFf7QBRIABtgEDgQG3AQOCAbgBBYMBuwFFhAG8AUs"
    };
    config.compilerWasm = {
      getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
      getQueryCompilerWasmModule: async () => {
        const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
        return await decodeBase64AsWasm(wasm);
      },
      importName: "./query_compiler_fast_bg.js"
    };
  }
});

// generated/prisma/internal/prismaNamespace.ts
var prismaNamespace_exports = {};
__export(prismaNamespace_exports, {
  AnyNull: () => AnyNull2,
  BranchScalarFieldEnum: () => BranchScalarFieldEnum,
  DbNull: () => DbNull2,
  Decimal: () => Decimal2,
  ExportLogScalarFieldEnum: () => ExportLogScalarFieldEnum,
  JsonNull: () => JsonNull2,
  JsonNullValueFilter: () => JsonNullValueFilter,
  JsonNullValueInput: () => JsonNullValueInput,
  ModelName: () => ModelName,
  NullTypes: () => NullTypes2,
  NullsOrder: () => NullsOrder,
  PrismaClientInitializationError: () => PrismaClientInitializationError2,
  PrismaClientKnownRequestError: () => PrismaClientKnownRequestError2,
  PrismaClientRustPanicError: () => PrismaClientRustPanicError2,
  PrismaClientUnknownRequestError: () => PrismaClientUnknownRequestError2,
  PrismaClientValidationError: () => PrismaClientValidationError2,
  ProductCategoryScalarFieldEnum: () => ProductCategoryScalarFieldEnum,
  ProductScalarFieldEnum: () => ProductScalarFieldEnum,
  QueryMode: () => QueryMode,
  SalesRecordScalarFieldEnum: () => SalesRecordScalarFieldEnum,
  SortOrder: () => SortOrder,
  Sql: () => Sql2,
  SyncRunScalarFieldEnum: () => SyncRunScalarFieldEnum,
  TransactionIsolationLevel: () => TransactionIsolationLevel,
  UserScalarFieldEnum: () => UserScalarFieldEnum,
  defineExtension: () => defineExtension,
  empty: () => empty2,
  getExtensionContext: () => getExtensionContext,
  join: () => join2,
  prismaVersion: () => prismaVersion,
  raw: () => raw2,
  sql: () => sql
});
import * as runtime2 from "@prisma/client/runtime/client";
var PrismaClientKnownRequestError2, PrismaClientUnknownRequestError2, PrismaClientRustPanicError2, PrismaClientInitializationError2, PrismaClientValidationError2, sql, empty2, join2, raw2, Sql2, Decimal2, getExtensionContext, prismaVersion, NullTypes2, DbNull2, JsonNull2, AnyNull2, ModelName, TransactionIsolationLevel, UserScalarFieldEnum, BranchScalarFieldEnum, ProductCategoryScalarFieldEnum, ProductScalarFieldEnum, SalesRecordScalarFieldEnum, ExportLogScalarFieldEnum, SyncRunScalarFieldEnum, SortOrder, JsonNullValueInput, QueryMode, NullsOrder, JsonNullValueFilter, defineExtension;
var init_prismaNamespace = __esm({
  "generated/prisma/internal/prismaNamespace.ts"() {
    "use strict";
    init_class();
    PrismaClientKnownRequestError2 = runtime2.PrismaClientKnownRequestError;
    PrismaClientUnknownRequestError2 = runtime2.PrismaClientUnknownRequestError;
    PrismaClientRustPanicError2 = runtime2.PrismaClientRustPanicError;
    PrismaClientInitializationError2 = runtime2.PrismaClientInitializationError;
    PrismaClientValidationError2 = runtime2.PrismaClientValidationError;
    sql = runtime2.sqltag;
    empty2 = runtime2.empty;
    join2 = runtime2.join;
    raw2 = runtime2.raw;
    Sql2 = runtime2.Sql;
    Decimal2 = runtime2.Decimal;
    getExtensionContext = runtime2.Extensions.getExtensionContext;
    prismaVersion = {
      client: "7.10.0",
      engine: "0edf323efd1d98336f3f0a68684b56f689b900d3"
    };
    NullTypes2 = {
      DbNull: runtime2.NullTypes.DbNull,
      JsonNull: runtime2.NullTypes.JsonNull,
      AnyNull: runtime2.NullTypes.AnyNull
    };
    DbNull2 = runtime2.DbNull;
    JsonNull2 = runtime2.JsonNull;
    AnyNull2 = runtime2.AnyNull;
    ModelName = {
      User: "User",
      Branch: "Branch",
      ProductCategory: "ProductCategory",
      Product: "Product",
      SalesRecord: "SalesRecord",
      ExportLog: "ExportLog",
      SyncRun: "SyncRun"
    };
    TransactionIsolationLevel = runtime2.makeStrictEnum({
      ReadUncommitted: "ReadUncommitted",
      ReadCommitted: "ReadCommitted",
      RepeatableRead: "RepeatableRead",
      Serializable: "Serializable"
    });
    UserScalarFieldEnum = {
      id: "id",
      name: "name",
      email: "email",
      passwordHash: "passwordHash",
      role: "role",
      isActive: "isActive",
      createdAt: "createdAt",
      updatedAt: "updatedAt",
      lastLoginAt: "lastLoginAt"
    };
    BranchScalarFieldEnum = {
      id: "id",
      name: "name",
      region: "region",
      isActive: "isActive"
    };
    ProductCategoryScalarFieldEnum = {
      id: "id",
      name: "name",
      isActive: "isActive"
    };
    ProductScalarFieldEnum = {
      id: "id",
      name: "name",
      categoryId: "categoryId",
      isActive: "isActive"
    };
    SalesRecordScalarFieldEnum = {
      id: "id",
      branchId: "branchId",
      productId: "productId",
      quantity: "quantity",
      value: "value",
      recordDate: "recordDate",
      source: "source",
      externalRef: "externalRef",
      createdAt: "createdAt"
    };
    ExportLogScalarFieldEnum = {
      id: "id",
      userId: "userId",
      format: "format",
      filterSnapshot: "filterSnapshot",
      status: "status",
      createdAt: "createdAt"
    };
    SyncRunScalarFieldEnum = {
      id: "id",
      status: "status",
      source: "source",
      recordCount: "recordCount",
      message: "message",
      startedAt: "startedAt",
      finishedAt: "finishedAt",
      triggeredByUserId: "triggeredByUserId"
    };
    SortOrder = {
      asc: "asc",
      desc: "desc"
    };
    JsonNullValueInput = {
      JsonNull: JsonNull2
    };
    QueryMode = {
      default: "default",
      insensitive: "insensitive"
    };
    NullsOrder = {
      first: "first",
      last: "last"
    };
    JsonNullValueFilter = {
      DbNull: DbNull2,
      JsonNull: JsonNull2,
      AnyNull: AnyNull2
    };
    defineExtension = runtime2.Extensions.defineExtension;
  }
});

// generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import "@prisma/client/runtime/client";
var PrismaClient;
var init_client = __esm({
  "generated/prisma/client.ts"() {
    "use strict";
    init_enums();
    init_class();
    init_prismaNamespace();
    init_enums();
    init_enums();
    globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
    PrismaClient = getPrismaClientClass();
  }
});

// server/config.ts
import "dotenv/config";
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
var config2;
var init_config = __esm({
  "server/config.ts"() {
    "use strict";
    config2 = {
      port: Number(process.env.PORT ?? 3001),
      jwtSecret: required("JWT_SECRET"),
      jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
      databaseUrl: required("DATABASE_URL")
    };
  }
});

// server/db.ts
import { PrismaPg } from "@prisma/adapter-pg";
var adapter, prisma;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_client();
    init_config();
    adapter = new PrismaPg({ connectionString: config2.databaseUrl });
    prisma = new PrismaClient({ adapter });
  }
});

// server/services/sync.service.ts
async function getSyncStatus() {
  const [running, latest, lastSuccess] = await Promise.all([
    prisma.syncRun.findFirst({ where: { status: "running" } }),
    prisma.syncRun.findFirst({ orderBy: { startedAt: "desc" } }),
    prisma.syncRun.findFirst({
      where: { status: "success", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" }
    })
  ]);
  const status = running ? "syncing" : latest?.status === "failed" ? "failed" : "idle";
  return {
    status,
    lastSyncedAt: lastSuccess?.finishedAt?.toISOString() ?? null
  };
}
async function listSyncRuns(limit = 20) {
  const runs = await prisma.syncRun.findMany({
    orderBy: { startedAt: "desc" },
    take: limit
  });
  return runs.map(toSyncRunItem);
}
async function triggerSync(userId) {
  const running = await prisma.syncRun.findFirst({
    where: { status: "running" }
  });
  if (running) {
    throw new HttpError(409, "A sync is already running.");
  }
  const run = await prisma.syncRun.create({
    data: { status: "running", source: "manual", triggeredByUserId: userId }
  });
  await runSyncJob(run.id);
  return { status: "syncing", startedAt: run.startedAt.toISOString() };
}
async function runSyncJob(runId) {
  try {
    const lastSuccess = await prisma.syncRun.findFirst({
      where: { status: "success", finishedAt: { not: null } },
      orderBy: { finishedAt: "desc" }
    });
    const newRecords = await prisma.salesRecord.count({
      where: lastSuccess?.finishedAt ? { createdAt: { gt: lastSuccess.finishedAt } } : void 0
    });
    await prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: "success",
        finishedAt: /* @__PURE__ */ new Date(),
        recordCount: newRecords,
        message: newRecords > 0 ? `Detected ${newRecords} new records since the last sync.` : "No new records since the last sync."
      }
    });
  } catch (error) {
    console.error("Sync job failed:", error);
    await prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: "failed",
        finishedAt: /* @__PURE__ */ new Date(),
        message: "The sync job failed. Check the server logs and try again."
      }
    }).catch(() => void 0);
  }
}
function toSyncRunItem(run) {
  return {
    id: Number(run.id),
    status: run.status,
    source: run.source,
    recordCount: run.recordCount,
    message: run.message,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt ? run.finishedAt.toISOString() : null,
    durationSeconds: run.finishedAt ? Math.max(
      0,
      Math.round(
        (run.finishedAt.getTime() - run.startedAt.getTime()) / 1e3
      )
    ) : null
  };
}
var init_sync_service = __esm({
  "server/services/sync.service.ts"() {
    "use strict";
    init_db();
    init_errors();
  }
});

// server/controllers/sync.controller.ts
async function getStatus(_req, res) {
  res.json(await getSyncStatus());
}
async function listRuns(_req, res) {
  res.json(await listSyncRuns());
}
async function trigger(req, res) {
  const result = await triggerSync(req.authUser.id);
  res.status(202).json(result);
}
var init_sync_controller = __esm({
  "server/controllers/sync.controller.ts"() {
    "use strict";
    init_sync_service();
  }
});

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
async function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentication required.");
  }
  const token = header.slice("Bearer ".length);
  let subject;
  try {
    const payload = jwt.verify(token, config2.jwtSecret);
    if (typeof payload === "string" || !payload.sub) {
      throw new Error("Missing subject.");
    }
    subject = BigInt(String(payload.sub));
  } catch {
    throw new HttpError(401, SESSION_ERROR);
  }
  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "This account is no longer active.");
  }
  req.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  next();
}
function requireAdmin(req, _res, next) {
  if (req.authUser?.role !== "admin") {
    throw new HttpError(403, "Administrator access is required.");
  }
  next();
}
var SESSION_ERROR;
var init_auth = __esm({
  "server/middleware/auth.ts"() {
    "use strict";
    init_config();
    init_db();
    init_errors();
    SESSION_ERROR = "Your session has expired. Please log in again.";
  }
});

// server/routes/admin.routes.ts
import { Router } from "express";
var adminRoutes;
var init_admin_routes = __esm({
  "server/routes/admin.routes.ts"() {
    "use strict";
    init_sync_controller();
    init_auth();
    adminRoutes = Router();
    adminRoutes.use(requireAuth, requireAdmin);
    adminRoutes.get("/sync-status", getStatus);
    adminRoutes.get("/sync-runs", listRuns);
    adminRoutes.post("/sync-trigger", trigger);
  }
});

// src/shared/schemas/enums.ts
import * as z from "zod";
var userRoleSchema, exportFormatSchema, exportStatusSchema;
var init_enums2 = __esm({
  "src/shared/schemas/enums.ts"() {
    "use strict";
    userRoleSchema = z.enum(["viewer", "admin"]);
    exportFormatSchema = z.enum(["pdf", "excel"]);
    exportStatusSchema = z.enum(["success", "failed"]);
  }
});

// src/shared/schemas/entities.ts
import * as z2 from "zod";
var idSchema, idParamSchema, userSchema, branchSchema, productCategorySchema, productSchema, salesRecordSchema, filterSnapshotSchema, exportLogSchema;
var init_entities = __esm({
  "src/shared/schemas/entities.ts"() {
    "use strict";
    init_enums2();
    idSchema = z2.number().int().positive();
    idParamSchema = z2.coerce.number().int().positive();
    userSchema = z2.object({
      id: idSchema,
      name: z2.string().min(1).max(150),
      email: z2.email(),
      role: userRoleSchema,
      isActive: z2.boolean(),
      createdAt: z2.iso.datetime(),
      updatedAt: z2.iso.datetime(),
      lastLoginAt: z2.iso.datetime().nullable()
    });
    branchSchema = z2.object({
      id: idSchema,
      name: z2.string().min(1).max(150),
      region: z2.string().max(100).nullable(),
      isActive: z2.boolean()
    });
    productCategorySchema = z2.object({
      id: idSchema,
      name: z2.string().min(1).max(150),
      isActive: z2.boolean()
    });
    productSchema = z2.object({
      id: idSchema,
      name: z2.string().min(1).max(150),
      categoryId: idSchema,
      isActive: z2.boolean()
    });
    salesRecordSchema = z2.object({
      id: idSchema,
      branchId: idSchema,
      productId: idSchema,
      quantity: z2.number().nonnegative(),
      value: z2.number().nonnegative().nullable(),
      recordDate: z2.iso.date(),
      source: z2.string().max(50).nullable(),
      externalRef: z2.string().max(100).nullable(),
      createdAt: z2.iso.datetime()
    });
    filterSnapshotSchema = z2.object({
      start: z2.iso.date(),
      end: z2.iso.date(),
      branches: z2.array(idSchema),
      categories: z2.array(idSchema)
    });
    exportLogSchema = z2.object({
      id: idSchema,
      userId: idSchema,
      format: exportFormatSchema,
      filterSnapshot: filterSnapshotSchema,
      status: exportStatusSchema,
      createdAt: z2.iso.datetime()
    });
  }
});

// src/shared/schemas/requests.ts
import * as z3 from "zod";
var normalizedEmail, loginRequestSchema, createUserRequestSchema, updateBranchRequestSchema, updateCategoryRequestSchema, createBranchRequestSchema, createCategoryRequestSchema, exportRequestSchema;
var init_requests = __esm({
  "src/shared/schemas/requests.ts"() {
    "use strict";
    init_entities();
    init_enums2();
    normalizedEmail = z3.preprocess(
      (value) => typeof value === "string" ? value.trim().toLowerCase() : value,
      z3.email()
    );
    loginRequestSchema = z3.object({
      email: normalizedEmail,
      password: z3.string().min(1)
    });
    createUserRequestSchema = z3.object({
      name: z3.string().min(1).max(150),
      email: normalizedEmail,
      role: userRoleSchema.default("viewer"),
      password: z3.string().min(8).max(72)
    });
    updateBranchRequestSchema = z3.object({
      isActive: z3.boolean()
    });
    updateCategoryRequestSchema = z3.object({
      isActive: z3.boolean()
    });
    createBranchRequestSchema = z3.object({
      name: z3.string().min(1).max(150),
      region: z3.string().max(100).nullish()
    });
    createCategoryRequestSchema = z3.object({
      name: z3.string().min(1).max(150)
    });
    exportRequestSchema = z3.object({
      filters: filterSnapshotSchema
    });
  }
});

// server/http/validation.ts
function parseBody(schema, data) {
  return parseWith(schema, data, "Invalid request data.");
}
function parseQuery(schema, data) {
  return parseWith(schema, data, "Invalid query parameters.");
}
function parseIdParam(value) {
  const result = idParamSchema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, "Invalid id parameter.");
  }
  return result.data;
}
function parseWith(schema, data, message) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message
    }));
    throw new HttpError(400, message, details);
  }
  return result.data;
}
var init_validation = __esm({
  "server/http/validation.ts"() {
    "use strict";
    init_entities();
    init_errors();
  }
});

// server/auth/tokens.ts
import jwt2 from "jsonwebtoken";
function createSessionToken(userId, role) {
  return jwt2.sign({ sub: String(userId), role }, config2.jwtSecret, {
    expiresIn: config2.jwtExpiresIn
  });
}
var init_tokens = __esm({
  "server/auth/tokens.ts"() {
    "use strict";
    init_config();
  }
});

// server/services/auth.service.ts
import { compare } from "bcryptjs";
async function login(email3, password) {
  const user = await prisma.user.findUnique({
    where: { email: email3.trim().toLowerCase() }
  });
  if (!user || !user.isActive) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }
  const passwordMatches = await compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: /* @__PURE__ */ new Date() }
  });
  return {
    token: createSessionToken(user.id, user.role),
    user: toSessionUser(user)
  };
}
async function getSessionUser(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "This account is no longer active.");
  }
  return toSessionUser(user);
}
function toSessionUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role
  };
}
var INVALID_CREDENTIALS;
var init_auth_service = __esm({
  "server/services/auth.service.ts"() {
    "use strict";
    init_tokens();
    init_db();
    init_errors();
    INVALID_CREDENTIALS = "Invalid email or password.";
  }
});

// server/controllers/auth.controller.ts
async function login2(req, res) {
  const credentials = parseBody(loginRequestSchema, req.body);
  const result = await login(
    credentials.email,
    credentials.password
  );
  res.json(result);
}
async function me(req, res) {
  const user = await getSessionUser(req.authUser.id);
  res.json(user);
}
async function logout(_req, res) {
  res.status(204).end();
}
var init_auth_controller = __esm({
  "server/controllers/auth.controller.ts"() {
    "use strict";
    init_requests();
    init_validation();
    init_auth_service();
  }
});

// server/routes/auth.routes.ts
import { Router as Router2 } from "express";
var authRoutes;
var init_auth_routes = __esm({
  "server/routes/auth.routes.ts"() {
    "use strict";
    init_auth_controller();
    init_auth();
    authRoutes = Router2();
    authRoutes.post("/login", login2);
    authRoutes.get("/me", requireAuth, me);
    authRoutes.post("/logout", requireAuth, logout);
  }
});

// server/services/branches.service.ts
async function listBranches(options = {}) {
  const branches = await prisma.branch.findMany({
    where: options.activeOnly ? { isActive: true } : void 0,
    include: { _count: { select: { salesRecords: true } } },
    orderBy: { name: "asc" }
  });
  return branches.map(toBranchListItem);
}
async function createBranch(input) {
  const name = input.name.trim();
  const existing = await prisma.branch.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });
  if (existing) {
    throw new HttpError(409, "A branch with this name already exists.");
  }
  const created = await prisma.branch.create({
    data: { name, region: input.region?.trim() || null }
  });
  return { ...toBranch(created), recordCount: 0 };
}
async function updateBranchActive(id, isActive) {
  const existing = await prisma.branch.findUnique({ where: { id: BigInt(id) } });
  if (!existing) {
    throw new HttpError(404, "Branch not found.");
  }
  const updated = await prisma.branch.update({
    where: { id: existing.id },
    data: { isActive },
    include: { _count: { select: { salesRecords: true } } }
  });
  return toBranchListItem(updated);
}
function toBranch(branch) {
  return {
    id: Number(branch.id),
    name: branch.name,
    region: branch.region,
    isActive: branch.isActive
  };
}
function toBranchListItem(branch) {
  return { ...toBranch(branch), recordCount: branch._count.salesRecords };
}
var init_branches_service = __esm({
  "server/services/branches.service.ts"() {
    "use strict";
    init_db();
    init_errors();
  }
});

// server/controllers/branches.controller.ts
async function list(req, res) {
  const activeOnly = req.query.active === "true";
  res.json(await listBranches({ activeOnly }));
}
async function create(req, res) {
  const input = parseBody(createBranchRequestSchema, req.body);
  res.status(201).json(await createBranch(input));
}
async function update(req, res) {
  const id = parseIdParam(req.params.id);
  const input = parseBody(updateBranchRequestSchema, req.body);
  res.json(await updateBranchActive(id, input.isActive));
}
var init_branches_controller = __esm({
  "server/controllers/branches.controller.ts"() {
    "use strict";
    init_requests();
    init_validation();
    init_branches_service();
  }
});

// server/routes/branches.routes.ts
import { Router as Router3 } from "express";
var branchRoutes;
var init_branches_routes = __esm({
  "server/routes/branches.routes.ts"() {
    "use strict";
    init_branches_controller();
    init_auth();
    branchRoutes = Router3();
    branchRoutes.use(requireAuth);
    branchRoutes.get("/", list);
    branchRoutes.post("/", requireAdmin, create);
    branchRoutes.patch("/:id", requireAdmin, update);
  }
});

// server/services/categories.service.ts
async function listCategories(options = {}) {
  const categories = await prisma.productCategory.findMany({
    where: options.activeOnly ? { isActive: true } : void 0,
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" }
  });
  const counts = await prisma.$queryRaw(prismaNamespace_exports.sql`
    SELECT p.category_id::int AS category_id, COUNT(sr.id)::int AS record_count
    FROM products p
    LEFT JOIN sales_records sr ON sr.product_id = p.id
    GROUP BY p.category_id
  `);
  const recordCountById = new Map(
    counts.map((row) => [row.category_id, row.record_count])
  );
  return categories.map((category) => ({
    id: Number(category.id),
    name: category.name,
    isActive: category.isActive,
    productCount: category._count.products,
    recordCount: recordCountById.get(Number(category.id)) ?? 0
  }));
}
async function createCategory(input) {
  const name = input.name.trim();
  const existing = await prisma.productCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } }
  });
  if (existing) {
    throw new HttpError(409, "A category with this name already exists.");
  }
  const created = await prisma.productCategory.create({ data: { name } });
  return {
    id: Number(created.id),
    name: created.name,
    isActive: created.isActive,
    productCount: 0,
    recordCount: 0
  };
}
async function updateCategoryActive(id, isActive) {
  const existing = await prisma.productCategory.findUnique({
    where: { id: BigInt(id) }
  });
  if (!existing) {
    throw new HttpError(404, "Category not found.");
  }
  const updated = await prisma.productCategory.update({
    where: { id: existing.id },
    data: { isActive },
    include: { _count: { select: { products: true } } }
  });
  const counts = await prisma.$queryRaw(
    prismaNamespace_exports.sql`
      SELECT COUNT(sr.id)::int AS record_count
      FROM sales_records sr
      JOIN products p ON p.id = sr.product_id
      WHERE p.category_id = ${id}
    `
  );
  return {
    id: Number(updated.id),
    name: updated.name,
    isActive: updated.isActive,
    productCount: updated._count.products,
    recordCount: counts[0]?.record_count ?? 0
  };
}
var init_categories_service = __esm({
  "server/services/categories.service.ts"() {
    "use strict";
    init_client();
    init_db();
    init_errors();
  }
});

// server/controllers/categories.controller.ts
async function list2(req, res) {
  const activeOnly = req.query.active === "true";
  res.json(await listCategories({ activeOnly }));
}
async function create2(req, res) {
  const input = parseBody(createCategoryRequestSchema, req.body);
  res.status(201).json(await createCategory(input));
}
async function update2(req, res) {
  const id = parseIdParam(req.params.id);
  const input = parseBody(updateCategoryRequestSchema, req.body);
  res.json(await updateCategoryActive(id, input.isActive));
}
var init_categories_controller = __esm({
  "server/controllers/categories.controller.ts"() {
    "use strict";
    init_requests();
    init_validation();
    init_categories_service();
  }
});

// server/routes/categories.routes.ts
import { Router as Router4 } from "express";
var categoryRoutes;
var init_categories_routes = __esm({
  "server/routes/categories.routes.ts"() {
    "use strict";
    init_categories_controller();
    init_auth();
    categoryRoutes = Router4();
    categoryRoutes.use(requireAuth);
    categoryRoutes.get("/", list2);
    categoryRoutes.post("/", requireAdmin, create2);
    categoryRoutes.patch("/:id", requireAdmin, update2);
  }
});

// src/shared/schemas/dashboard.ts
import * as z4 from "zod";
var multiIdParam, trendQuerySchema, summaryQuerySchema, branchComparisonQuerySchema, categoryComparisonQuerySchema;
var init_dashboard = __esm({
  "src/shared/schemas/dashboard.ts"() {
    "use strict";
    multiIdParam = z4.preprocess(
      (raw3) => {
        if (raw3 === void 0 || raw3 === null || raw3 === "") return void 0;
        return Array.isArray(raw3) ? raw3 : String(raw3).split(",");
      },
      z4.array(z4.coerce.number().int().positive()).optional()
    );
    trendQuerySchema = z4.object({
      start: z4.iso.date(),
      end: z4.iso.date(),
      branch: multiIdParam,
      category: multiIdParam
    }).refine((q) => q.start <= q.end, {
      message: "start must be on or before end",
      path: ["end"]
    });
    summaryQuerySchema = z4.object({
      start: z4.iso.date(),
      end: z4.iso.date(),
      branch: multiIdParam,
      category: multiIdParam
    }).refine((q) => q.start <= q.end, {
      message: "start must be on or before end",
      path: ["end"]
    });
    branchComparisonQuerySchema = z4.object({
      start: z4.iso.date(),
      end: z4.iso.date(),
      category: multiIdParam
    }).refine((q) => q.start <= q.end, {
      message: "start must be on or before end",
      path: ["end"]
    });
    categoryComparisonQuerySchema = z4.object({
      start: z4.iso.date(),
      end: z4.iso.date(),
      branch: multiIdParam
    }).refine((q) => q.start <= q.end, {
      message: "start must be on or before end",
      path: ["end"]
    });
  }
});

// server/services/dashboard.service.ts
function toUtcDate(value) {
  return /* @__PURE__ */ new Date(`${value}T00:00:00.000Z`);
}
function addDays(value, days) {
  return new Date(toUtcDate(value).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}
function inclusiveDays(start, end) {
  return Math.round(
    (toUtcDate(end).getTime() - toUtcDate(start).getTime()) / MS_PER_DAY
  ) + 1;
}
function round(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
function percentChange(current, previous) {
  if (previous <= 0) return null;
  return round((current - previous) / previous * 100, 1);
}
function filterConditions(filters, options = {}) {
  const { includeBranch = true, includeCategory = true } = options;
  const conditions = [
    prismaNamespace_exports.sql`sr.record_date >= ${filters.start}::date`,
    prismaNamespace_exports.sql`sr.record_date <= ${filters.end}::date`
  ];
  if (includeBranch && filters.branchIds.length > 0) {
    conditions.push(
      prismaNamespace_exports.sql`sr.branch_id IN (${prismaNamespace_exports.join(filters.branchIds)})`
    );
  }
  if (includeCategory && filters.categoryIds.length > 0) {
    conditions.push(
      prismaNamespace_exports.sql`p.category_id IN (${prismaNamespace_exports.join(filters.categoryIds)})`
    );
  }
  return prismaNamespace_exports.join(conditions, " AND ");
}
async function queryTotals(filters, range) {
  const rows = await prisma.$queryRaw(prismaNamespace_exports.sql`
    SELECT
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units,
      COUNT(*)::int AS record_count
    FROM sales_records sr
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions({ ...filters, start: range.start, end: range.end })}
  `);
  return rows[0] ?? { total_sales: 0, total_units: 0, record_count: 0 };
}
async function getSummary(filters) {
  const current = await queryTotals(filters, {
    start: filters.start,
    end: filters.end
  });
  if (current.record_count === 0) return null;
  const days = Math.max(inclusiveDays(filters.start, filters.end), 1);
  const previousEnd = addDays(filters.start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  const previous = await queryTotals(filters, {
    start: previousStart,
    end: previousEnd
  });
  return {
    totalSales: round(current.total_sales, 2),
    totalUnits: round(current.total_units, 2),
    avgDailySales: round(current.total_sales / days, 2),
    change: {
      salesPct: percentChange(current.total_sales, previous.total_sales),
      unitsPct: percentChange(current.total_units, previous.total_units)
    },
    dataAsOf: await getDataAsOf()
  };
}
async function getDataAsOf() {
  const lastSync = await prisma.syncRun.findFirst({
    where: { status: "success", finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" }
  });
  if (lastSync?.finishedAt) return lastSync.finishedAt.toISOString();
  const latestRecord = await prisma.salesRecord.aggregate({
    _max: { createdAt: true }
  });
  return (latestRecord._max.createdAt ?? /* @__PURE__ */ new Date()).toISOString();
}
async function getTrend(filters) {
  const days = inclusiveDays(filters.start, filters.end);
  const granularity = days <= 31 ? "day" : days <= 120 ? "week" : "month";
  const rows = await prisma.$queryRaw(prismaNamespace_exports.sql`
    SELECT
      b.id::int AS branch_id,
      b.name AS branch_name,
      to_char(date_trunc(${granularity}::text, sr.record_date), 'YYYY-MM-DD') AS bucket,
      COALESCE(SUM(sr.value), 0)::float8 AS total_value
    FROM sales_records sr
    JOIN branches b ON b.id = sr.branch_id
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions(filters)}
    GROUP BY 1, 2, 3
    ORDER BY 2 ASC, 3 ASC
  `);
  const seriesById = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const series = seriesById.get(row.branch_id) ?? {
      branchId: row.branch_id,
      branchName: row.branch_name,
      points: []
    };
    series.points.push({ date: row.bucket, value: round(row.total_value, 2) });
    seriesById.set(row.branch_id, series);
  }
  const buckets = buildBuckets(filters.start, filters.end, granularity);
  for (const series of seriesById.values()) {
    const values = new Map(
      series.points.map((point) => [point.date, point.value])
    );
    series.points = buckets.map((date) => ({
      date,
      value: values.get(date) ?? 0
    }));
  }
  return { granularity, series: [...seriesById.values()] };
}
function buildBuckets(start, end, granularity) {
  const buckets = [];
  const last = bucketStart(end, granularity);
  let cursor = bucketStart(start, granularity);
  while (cursor.getTime() <= last.getTime()) {
    buckets.push(cursor.toISOString().slice(0, 10));
    cursor = nextBucket(cursor, granularity);
  }
  return buckets;
}
function bucketStart(value, granularity) {
  const date = toUtcDate(value);
  if (granularity === "day") return date;
  if (granularity === "month") {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  }
  const offsetToMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - offsetToMonday * MS_PER_DAY);
}
function nextBucket(date, granularity) {
  if (granularity === "day") return new Date(date.getTime() + MS_PER_DAY);
  if (granularity === "week") return new Date(date.getTime() + 7 * MS_PER_DAY);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}
async function getBranchComparison(filters) {
  const rows = await prisma.$queryRaw(prismaNamespace_exports.sql`
    SELECT
      b.id::int AS id,
      b.name AS name,
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units
    FROM sales_records sr
    JOIN branches b ON b.id = sr.branch_id
    JOIN products p ON p.id = sr.product_id
    WHERE ${filterConditions(filters, { includeBranch: false })}
    GROUP BY 1, 2
    ORDER BY 3 DESC, 2 ASC
  `);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      totalSales: round(row.total_sales, 2),
      totalUnits: round(row.total_units, 2)
    }))
  };
}
async function getCategoryComparison(filters) {
  const rows = await prisma.$queryRaw(prismaNamespace_exports.sql`
    SELECT
      c.id::int AS id,
      c.name AS name,
      COALESCE(SUM(sr.value), 0)::float8 AS total_sales,
      COALESCE(SUM(sr.quantity), 0)::float8 AS total_units
    FROM sales_records sr
    JOIN products p ON p.id = sr.product_id
    JOIN product_categories c ON c.id = p.category_id
    WHERE ${filterConditions(filters, { includeCategory: false })}
    GROUP BY 1, 2
    ORDER BY 3 DESC, 2 ASC
  `);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      totalSales: round(row.total_sales, 2),
      totalUnits: round(row.total_units, 2)
    }))
  };
}
var MS_PER_DAY;
var init_dashboard_service = __esm({
  "server/services/dashboard.service.ts"() {
    "use strict";
    init_client();
    init_db();
    MS_PER_DAY = 864e5;
  }
});

// server/controllers/dashboard.controller.ts
async function getSummary2(req, res) {
  const query = parseQuery(summaryQuerySchema, req.query);
  res.json(await getSummary(toFilters(query)));
}
async function getTrend2(req, res) {
  const query = parseQuery(trendQuerySchema, req.query);
  res.json(await getTrend(toFilters(query)));
}
async function getBranchComparison2(req, res) {
  const query = parseQuery(branchComparisonQuerySchema, req.query);
  res.json(await getBranchComparison(toFilters(query)));
}
async function getCategoryComparison2(req, res) {
  const query = parseQuery(categoryComparisonQuerySchema, req.query);
  res.json(await getCategoryComparison(toFilters(query)));
}
function toFilters(query) {
  return {
    start: query.start,
    end: query.end,
    branchIds: query.branch ?? [],
    categoryIds: query.category ?? []
  };
}
var init_dashboard_controller = __esm({
  "server/controllers/dashboard.controller.ts"() {
    "use strict";
    init_dashboard();
    init_validation();
    init_dashboard_service();
  }
});

// server/routes/dashboard.routes.ts
import { Router as Router5 } from "express";
var dashboardRoutes;
var init_dashboard_routes = __esm({
  "server/routes/dashboard.routes.ts"() {
    "use strict";
    init_dashboard_controller();
    init_auth();
    dashboardRoutes = Router5();
    dashboardRoutes.use(requireAuth);
    dashboardRoutes.get("/summary", getSummary2);
    dashboardRoutes.get("/trend", getTrend2);
    dashboardRoutes.get("/branch-comparison", getBranchComparison2);
    dashboardRoutes.get("/category-comparison", getCategoryComparison2);
  }
});

// server/services/export-excel.service.ts
import ExcelJS from "exceljs";
async function renderExcelReport(payload) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sales / Production Analytics Dashboard";
  workbook.created = payload.generatedAt;
  addSummarySheet(workbook, payload);
  addTrendSheet(workbook, payload);
  addComparisonSheet(
    workbook,
    "Branch comparison",
    "Branch",
    payload.branchComparison.items
  );
  addComparisonSheet(
    workbook,
    "Category comparison",
    "Category",
    payload.categoryComparison.items
  );
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
function addSummarySheet(workbook, payload) {
  const sheet = workbook.addWorksheet("Summary");
  sheet.columns = [
    { header: "Item", key: "item", width: 38 },
    { header: "Value", key: "value", width: 34 }
  ];
  const rows = [
    ["Period", `${payload.filters.start} to ${payload.filters.end}`],
    ["Branches", payload.filterLabels.branches],
    ["Categories", payload.filterLabels.categories],
    ["Generated at", payload.generatedAt.toISOString()],
    ["Exported by", payload.exportedBy]
  ];
  if (payload.summary) {
    rows.push(
      ["Data as of", payload.summary.dataAsOf],
      ["Total sales", payload.summary.totalSales],
      ["Total units", payload.summary.totalUnits],
      ["Average daily sales", payload.summary.avgDailySales],
      [
        "Sales change vs previous period (%)",
        payload.summary.change.salesPct ?? "n/a"
      ],
      [
        "Units change vs previous period (%)",
        payload.summary.change.unitsPct ?? "n/a"
      ]
    );
  } else {
    rows.push(["Data", "No data for the selected filters."]);
  }
  rows.forEach(([item, value]) => sheet.addRow({ item, value }));
  styleSheet(sheet);
}
function addTrendSheet(workbook, payload) {
  const sheet = workbook.addWorksheet("Sales trend");
  const seriesNames = payload.trend.series.map((series) => series.branchName);
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    ...seriesNames.map((name, index) => ({
      header: name,
      key: `series_${index}`,
      width: 18
    }))
  ];
  const buckets = [
    ...new Set(
      payload.trend.series.flatMap(
        (series) => series.points.map((point) => point.date)
      )
    )
  ].sort();
  buckets.forEach((bucket) => {
    const row = { date: bucket };
    payload.trend.series.forEach((series, index) => {
      const point = series.points.find((entry) => entry.date === bucket);
      row[`series_${index}`] = point ? point.value : 0;
    });
    sheet.addRow(row);
  });
  if (buckets.length === 0) {
    sheet.addRow({ date: "No data for the selected filters." });
  }
  styleSheet(sheet);
  sheet.getColumn(1).numFmt = "@";
  for (let index = 2; index <= seriesNames.length + 1; index += 1) {
    sheet.getColumn(index).numFmt = "#,##0.00";
  }
}
function addComparisonSheet(workbook, sheetName, labelHeader, items) {
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = [
    { header: labelHeader, key: "name", width: 28 },
    { header: "Sales value", key: "sales", width: 18 },
    { header: "Units", key: "units", width: 14 }
  ];
  items.forEach(
    (item) => sheet.addRow({ name: item.name, sales: item.totalSales, units: item.totalUnits })
  );
  if (items.length === 0) {
    sheet.addRow({ name: "No data for the selected filters." });
  }
  styleSheet(sheet);
  sheet.getColumn(2).numFmt = "#,##0.00";
  sheet.getColumn(3).numFmt = "#,##0.00";
}
function styleSheet(sheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" }
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFDEE1E6" } }
    };
  });
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}
var init_export_excel_service = __esm({
  "server/services/export-excel.service.ts"() {
    "use strict";
  }
});

// src/shared/design-colors.ts
function seriesColor(index) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}
function buildEntityColorMap(entityIds) {
  const sorted = [...entityIds].sort((a, b) => a - b);
  return new Map(sorted.map((id, index) => [id, seriesColor(index)]));
}
var SERIES_COLORS;
var init_design_colors = __esm({
  "src/shared/design-colors.ts"() {
    "use strict";
    SERIES_COLORS = [
      "#2f5fbf",
      "#d97706",
      "#15803d",
      "#9333ea",
      "#db2777",
      "#0891b2"
    ];
  }
});

// server/services/export-pdf.service.ts
import PDFDocument from "pdfkit";
function renderPdfReport(payload) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      bufferPages: true
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      drawReport(doc, payload);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
function drawReport(doc, payload) {
  const left = PAGE_MARGIN;
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;
  doc.font("Helvetica-Bold").fontSize(18).fillColor(INK);
  doc.text("Sales / Production Analytics Report", left, y);
  y = doc.y + 6;
  doc.font("Helvetica").fontSize(9).fillColor(MUTED);
  doc.text(`Period: ${payload.filters.start} to ${payload.filters.end}`, left, y);
  y = doc.y + 2;
  doc.text(`Branches: ${payload.filterLabels.branches}`, left, y);
  y = doc.y + 2;
  doc.text(`Categories: ${payload.filterLabels.categories}`, left, y);
  y = doc.y + 2;
  doc.text(
    `Generated ${formatTimestamp(payload.generatedAt)} by ${payload.exportedBy}`,
    left,
    y
  );
  y = doc.y + 2;
  if (payload.summary) {
    doc.text(`Data as of ${formatTimestamp(payload.summary.dataAsOf)}`, left, y);
    y = doc.y + 2;
  }
  y += 10;
  if (payload.summary) {
    y = drawSummaryBlocks(doc, payload.summary, left, y, contentWidth);
  } else {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", left, y);
    y = doc.y + 12;
  }
  const branchColors = buildEntityColorMap(payload.branchIds);
  const categoryColors = buildEntityColorMap(payload.categoryIds);
  y = drawTrendSection(doc, payload, left, y, contentWidth);
  y = drawComparisonSection(
    doc,
    "Sales by branch",
    payload.branchComparison,
    branchColors,
    left,
    y,
    contentWidth
  );
  y = drawComparisonSection(
    doc,
    "Sales by category",
    payload.categoryComparison,
    categoryColors,
    left,
    y,
    contentWidth
  );
}
function drawSummaryBlocks(doc, summary, x, y, width) {
  const gap = 8;
  const blockWidth = (width - gap * 3) / 4;
  const blocks = [
    { label: "TOTAL SALES", value: formatCurrency(summary.totalSales) },
    { label: "TOTAL UNITS", value: formatNumber(summary.totalUnits) },
    { label: "AVG DAILY SALES", value: formatCurrency(summary.avgDailySales) },
    {
      label: "SALES CHANGE",
      value: summary.change.salesPct === null ? "n/a" : formatSignedPercent(summary.change.salesPct)
    }
  ];
  blocks.forEach((block, index) => {
    const blockX = x + index * (blockWidth + gap);
    doc.roundedRect(blockX, y, blockWidth, 50, 6).strokeColor(BORDER).lineWidth(1).stroke();
    doc.font("Helvetica").fontSize(7).fillColor(MUTED).text(block.label, blockX + 10, y + 10, {
      width: blockWidth - 20,
      lineBreak: false
    });
    doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(block.value, blockX + 10, y + 22, {
      width: blockWidth - 20,
      height: 16,
      ellipsis: true
    });
  });
  return y + 50 + 16;
}
function drawTrendSection(doc, payload, x, y, width) {
  const height = 150;
  y = ensureSpace(doc, y, height + 90);
  y = drawSectionTitle(doc, "Sales trend", y, x);
  const allPoints = payload.trend.series.flatMap((series) => series.points);
  if (allPoints.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", x, y);
    return y + 20;
  }
  const buckets = [...new Set(allPoints.map((point) => point.date))].sort();
  const maxValue = Math.max(...allPoints.map((point) => point.value), 1);
  const chartTop = y + 4;
  const chartBottom = chartTop + height;
  doc.lineWidth(0.5).strokeColor(BORDER);
  for (let line = 0; line <= 4; line += 1) {
    const gridY = chartTop + height / 4 * line;
    doc.moveTo(x, gridY).lineTo(x + width, gridY).stroke();
  }
  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  doc.text(formatCompactNumber(maxValue), x + 2, chartTop - 8);
  doc.text("0", x + 2, chartBottom - 9);
  const colorMap = buildEntityColorMap(payload.branchIds);
  payload.trend.series.forEach((series) => {
    const color = colorMap.get(series.branchId) ?? INK;
    const values = new Map(series.points.map((point) => [point.date, point.value]));
    doc.strokeColor(color).lineWidth(1.6);
    let started = false;
    buckets.forEach((bucket, index) => {
      const value = values.get(bucket);
      if (value === void 0) {
        started = false;
        return;
      }
      const px = bucketX(x, width, buckets.length, index);
      const py = chartBottom - value / maxValue * height;
      if (!started) {
        doc.moveTo(px, py);
        started = true;
      } else {
        doc.lineTo(px, py);
      }
    });
    doc.stroke();
  });
  doc.font("Helvetica").fontSize(7).fillColor(MUTED);
  const labelIndexes = [
    ...new Set(
      buckets.length > 2 ? [0, Math.floor((buckets.length - 1) / 2), buckets.length - 1] : [0, buckets.length - 1]
    )
  ];
  labelIndexes.forEach((index) => {
    const px = bucketX(x, width, buckets.length, index);
    const labelX = Math.min(Math.max(px - 20, x), x + width - 40);
    doc.text(buckets[index] ?? "", labelX, chartBottom + 4, {
      width: 40,
      align: "center",
      lineBreak: false
    });
  });
  let legendX = x;
  let legendY = chartBottom + 20;
  payload.trend.series.forEach((series) => {
    const color = colorMap.get(series.branchId) ?? INK;
    doc.font("Helvetica").fontSize(8);
    const labelWidth = doc.widthOfString(series.branchName);
    if (legendX + labelWidth + 26 > x + width) {
      legendX = x;
      legendY += 14;
    }
    doc.circle(legendX + 3, legendY + 3.5, 3).fill(color);
    doc.fillColor(MUTED).text(series.branchName, legendX + 10, legendY, {
      lineBreak: false
    });
    legendX += labelWidth + 26;
  });
  return legendY + 20;
}
function drawComparisonSection(doc, title, comparison, colorMap, x, y, width) {
  y = ensureSpace(doc, y, 60);
  y = drawSectionTitle(doc, title, y, x);
  if (comparison.items.length === 0) {
    doc.font("Helvetica").fontSize(10).fillColor(MUTED);
    doc.text("No data for the selected filters.", x, y);
    return y + 20;
  }
  const maxValue = Math.max(
    ...comparison.items.map((item) => item.totalSales),
    1
  );
  const labelWidth = 120;
  const barArea = width - labelWidth - 110;
  comparison.items.forEach((item) => {
    y = ensureSpace(doc, y, 18);
    const color = colorMap.get(item.id) ?? INK;
    doc.font("Helvetica").fontSize(9).fillColor(INK);
    doc.text(item.name, x, y + 1, {
      width: labelWidth - 8,
      height: 12,
      ellipsis: true
    });
    const barWidth = Math.max(item.totalSales / maxValue * barArea, 1);
    doc.rect(x + labelWidth, y + 1, barWidth, 10).fill(color);
    doc.font("Helvetica").fontSize(9).fillColor(MUTED);
    doc.text(formatCurrency(item.totalSales), x + labelWidth + barArea + 8, y + 1, {
      width: 100,
      align: "right",
      lineBreak: false
    });
    y += 17;
  });
  return y + 8;
}
function drawSectionTitle(doc, title, y, x) {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(INK);
  doc.text(title, x, y);
  return doc.y + 8;
}
function bucketX(x, width, count, index) {
  if (count <= 1) return x + width / 2;
  return x + index / (count - 1) * width;
}
function ensureSpace(doc, y, needed) {
  if (y + needed <= doc.page.height - PAGE_MARGIN) return y;
  doc.addPage();
  return PAGE_MARGIN;
}
function formatTimestamp(value) {
  const iso3 = typeof value === "string" ? value : value.toISOString();
  return `${iso3.slice(0, 10)} ${iso3.slice(11, 16)} UTC`;
}
function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
function formatCurrency(value) {
  return `Rp ${formatCompactNumber(value)}`;
}
function formatSignedPercent(value) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}
var INK, MUTED, BORDER, PAGE_MARGIN;
var init_export_pdf_service = __esm({
  "server/services/export-pdf.service.ts"() {
    "use strict";
    init_design_colors();
    INK = "#111318";
    MUTED = "#565c66";
    BORDER = "#dee1e6";
    PAGE_MARGIN = 40;
  }
});

// server/services/exports.service.ts
async function createExport(format, snapshot, user) {
  try {
    const payload = await collectExportPayload(snapshot, user.name);
    const buffer = format === "pdf" ? await renderPdfReport(payload) : await renderExcelReport(payload);
    await prisma.exportLog.create({
      data: {
        userId: user.id,
        format,
        filterSnapshot: snapshot,
        status: "success"
      }
    });
    return {
      buffer,
      filename: `sales-report_${snapshot.start}_${snapshot.end}.${format === "pdf" ? "pdf" : "xlsx"}`,
      contentType: format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };
  } catch (error) {
    console.error("Export generation failed:", error);
    await prisma.exportLog.create({
      data: {
        userId: user.id,
        format,
        filterSnapshot: snapshot,
        status: "failed"
      }
    }).catch(() => void 0);
    throw error instanceof HttpError ? error : new HttpError(500, "We could not generate the export. Please try again.");
  }
}
async function collectExportPayload(snapshot, exportedByName) {
  const filters = {
    start: snapshot.start,
    end: snapshot.end,
    branchIds: snapshot.branches,
    categoryIds: snapshot.categories
  };
  const [
    summary,
    trend,
    branchComparison,
    categoryComparison,
    branchLabel,
    categoryLabel,
    allBranches,
    allCategories
  ] = await Promise.all([
    getSummary(filters),
    getTrend(filters),
    getBranchComparison(filters),
    getCategoryComparison(filters),
    describeBranches(snapshot.branches),
    describeCategories(snapshot.categories),
    prisma.branch.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
    prisma.productCategory.findMany({
      select: { id: true },
      orderBy: { id: "asc" }
    })
  ]);
  return {
    filters: snapshot,
    filterLabels: { branches: branchLabel, categories: categoryLabel },
    summary,
    trend,
    branchComparison,
    categoryComparison,
    branchIds: allBranches.map((branch) => Number(branch.id)),
    categoryIds: allCategories.map((category) => Number(category.id)),
    exportedBy: exportedByName,
    generatedAt: /* @__PURE__ */ new Date()
  };
}
async function describeBranches(ids) {
  if (ids.length === 0) return "All branches";
  const rows = await prisma.branch.findMany({
    where: { id: { in: ids.map((id) => BigInt(id)) } },
    orderBy: { name: "asc" },
    select: { name: true }
  });
  return rows.length > 0 ? rows.map((row) => row.name).join(", ") : `#${ids.join(", ")}`;
}
async function describeCategories(ids) {
  if (ids.length === 0) return "All categories";
  const rows = await prisma.productCategory.findMany({
    where: { id: { in: ids.map((id) => BigInt(id)) } },
    orderBy: { name: "asc" },
    select: { name: true }
  });
  return rows.length > 0 ? rows.map((row) => row.name).join(", ") : `#${ids.join(", ")}`;
}
async function listExportLogs(user) {
  const logs = await prisma.exportLog.findMany({
    where: user.role === "admin" ? void 0 : { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return logs.map((log) => ({
    id: Number(log.id),
    userId: Number(log.userId),
    format: log.format,
    filterSnapshot: log.filterSnapshot,
    status: log.status,
    createdAt: log.createdAt.toISOString()
  }));
}
var init_exports_service = __esm({
  "server/services/exports.service.ts"() {
    "use strict";
    init_client();
    init_db();
    init_errors();
    init_dashboard_service();
    init_export_excel_service();
    init_export_pdf_service();
  }
});

// server/controllers/exports.controller.ts
async function exportPdf(req, res) {
  const input = parseBody(exportRequestSchema, req.body);
  const result = await createExport(
    "pdf",
    input.filters,
    req.authUser
  );
  sendFile(res, result);
}
async function exportExcel(req, res) {
  const input = parseBody(exportRequestSchema, req.body);
  const result = await createExport(
    "excel",
    input.filters,
    req.authUser
  );
  sendFile(res, result);
}
async function listLogs(req, res) {
  const user = req.authUser;
  res.json(await listExportLogs({ id: user.id, role: user.role }));
}
function sendFile(res, result) {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.filename}"`
  );
  res.send(result.buffer);
}
var init_exports_controller = __esm({
  "server/controllers/exports.controller.ts"() {
    "use strict";
    init_requests();
    init_validation();
    init_exports_service();
  }
});

// server/routes/exports.routes.ts
import { Router as Router6 } from "express";
var exportRoutes;
var init_exports_routes = __esm({
  "server/routes/exports.routes.ts"() {
    "use strict";
    init_exports_controller();
    init_auth();
    exportRoutes = Router6();
    exportRoutes.use(requireAuth);
    exportRoutes.post("/pdf", exportPdf);
    exportRoutes.post("/excel", exportExcel);
    exportRoutes.get("/logs", listLogs);
  }
});

// server/services/import-parsers.ts
import { parse } from "csv-parse/sync";
import ExcelJS2 from "exceljs";
async function parseImportFile(input) {
  const name = input.filename.toLowerCase();
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCsv(input.buffer);
  }
  if (name.endsWith(".xlsx")) {
    return parseXlsx(input.buffer);
  }
  throw new Error(`Unsupported file type: ${input.filename}`);
}
function parseCsv(buffer) {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(text);
  const records = parse(text, {
    delimiter,
    skip_empty_lines: true,
    trim: true,
    // Rows with a different number of cells are still readable.
    relax_column_count: true
  });
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map(normalizeHeader);
  const rows = records.slice(1).map((cells, index) => ({
    row: index + 2,
    cells: toCellMap(headers, cells)
  }));
  return { headers: headers.filter(Boolean), rows };
}
async function parseXlsx(buffer) {
  const workbook = new ExcelJS2.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const headerRow = sheet.getRow(1);
  const columnCount = Math.max(headerRow.cellCount, 1);
  const headers = [];
  for (let column = 1; column <= columnCount; column += 1) {
    headers.push(normalizeHeader(cellToString(headerRow.getCell(column).value)));
  }
  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells = [];
    for (let column = 1; column <= columnCount; column += 1) {
      cells.push(cellToString(row.getCell(column).value));
    }
    if (cells.every((cell) => cell.trim() === "")) return;
    rows.push({ row: rowNumber, cells: toCellMap(headers, cells) });
  });
  return { headers: headers.filter(Boolean), rows };
}
function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const candidates = [",", ";", "	"];
  let best = ",";
  let bestCount = 0;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}
function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}
function toCellMap(headers, cells) {
  const map = {};
  headers.forEach((header, index) => {
    if (!header) return;
    map[header] = (cells[index] ?? "").trim();
  });
  return map;
}
function cellToString(value) {
  if (value === null || value === void 0) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const rich = value;
    if (typeof rich.text === "string") return rich.text;
    if (Array.isArray(rich.richText)) {
      return rich.richText.map((part) => part.text).join("");
    }
    if (rich.result !== void 0) return String(rich.result);
    return "";
  }
  return String(value);
}
var init_import_parsers = __esm({
  "server/services/import-parsers.ts"() {
    "use strict";
  }
});

// server/services/import.service.ts
async function importSalesRecords(input) {
  const startedAt = /* @__PURE__ */ new Date();
  try {
    return await runImport(input, startedAt);
  } catch (error) {
    const message = error instanceof HttpError ? error.message : "The import failed. Please try again.";
    await prisma.syncRun.create({
      data: {
        status: "failed",
        source: "file-import",
        recordCount: 0,
        message: message.slice(0, 500),
        startedAt,
        finishedAt: /* @__PURE__ */ new Date(),
        triggeredByUserId: input.userId
      }
    }).catch(() => void 0);
    if (error instanceof HttpError) throw error;
    console.error("Import failed:", error);
    throw new HttpError(500, "We could not complete the import. Please try again.");
  }
}
async function runImport(input, startedAt) {
  let parsed;
  try {
    parsed = await parseImportFile(input);
  } catch {
    throw new HttpError(
      400,
      "Could not read the file. Use the CSV/XLSX template and try again."
    );
  }
  const { headers, rows } = parsed;
  if (rows.length === 0) {
    throw new HttpError(400, "The file has no data rows.");
  }
  if (rows.length > MAX_ROWS) {
    throw new HttpError(
      400,
      `The file has too many rows (max ${MAX_ROWS.toLocaleString("en-US")} per import).`
    );
  }
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column)
  );
  if (missingColumns.length > 0) {
    throw new HttpError(
      400,
      `Missing required column(s): ${missingColumns.join(", ")}.`
    );
  }
  const errors = [];
  const candidates = [];
  const refsInFile = /* @__PURE__ */ new Set();
  for (const { row, cells } of rows) {
    const result = validateRow(row, cells);
    if ("message" in result) {
      errors.push({ row, message: result.message });
      continue;
    }
    const candidate = result.candidate;
    if (candidate.externalRef) {
      if (refsInFile.has(candidate.externalRef)) {
        errors.push({
          row,
          message: `duplicate external_ref "${candidate.externalRef}" in the file.`
        });
        continue;
      }
      refsInFile.add(candidate.externalRef);
    }
    candidates.push(candidate);
  }
  const existingRefs = refsInFile.size > 0 ? new Set(
    (await prisma.salesRecord.findMany({
      where: { externalRef: { in: [...refsInFile] } },
      select: { externalRef: true }
    })).map((record) => record.externalRef)
  ) : /* @__PURE__ */ new Set();
  const branchIds = /* @__PURE__ */ new Map();
  for (const branch of await prisma.branch.findMany({
    select: { id: true, name: true }
  })) {
    branchIds.set(branch.name.trim().toLowerCase(), branch.id);
  }
  const categoryIds = /* @__PURE__ */ new Map();
  for (const category of await prisma.productCategory.findMany({
    select: { id: true, name: true }
  })) {
    categoryIds.set(category.name.trim().toLowerCase(), category.id);
  }
  const productIds = /* @__PURE__ */ new Map();
  for (const product of await prisma.product.findMany({
    select: { id: true, name: true, categoryId: true }
  })) {
    productIds.set(productKey(product.categoryId, product.name), product.id);
  }
  const created = { branches: 0, categories: 0, products: 0 };
  const toInsert = [];
  let skipped = 0;
  for (const candidate of candidates) {
    if (candidate.externalRef && existingRefs.has(candidate.externalRef)) {
      skipped += 1;
      continue;
    }
    const branchId = await resolveBranch(candidate.branch);
    if (!branchId) {
      errors.push({
        row: candidate.row,
        message: `branch "${candidate.branch}" does not exist (enable "create missing entries" to add it).`
      });
      continue;
    }
    const categoryId = await resolveCategory(candidate.category);
    if (!categoryId) {
      errors.push({
        row: candidate.row,
        message: `category "${candidate.category}" does not exist (enable "create missing entries" to add it).`
      });
      continue;
    }
    const productId = await resolveProduct(categoryId, candidate.product);
    if (!productId) {
      errors.push({
        row: candidate.row,
        message: `product "${candidate.product}" does not exist in category "${candidate.category}" (enable "create missing entries" to add it).`
      });
      continue;
    }
    toInsert.push({
      branchId,
      productId,
      quantity: candidate.quantity,
      value: candidate.value,
      recordDate: candidate.recordDate,
      source: "file-import",
      externalRef: candidate.externalRef
    });
  }
  let imported = 0;
  for (let index = 0; index < toInsert.length; index += BATCH_SIZE) {
    const chunk = toInsert.slice(index, index + BATCH_SIZE);
    const result = await prisma.salesRecord.createMany({
      data: chunk,
      skipDuplicates: true
    });
    imported += result.count;
  }
  const failed = errors.length;
  errors.sort((a, b) => a.row - b.row);
  const details = [
    `Imported ${imported} of ${rows.length} row(s) from ${input.filename}`,
    skipped > 0 ? `skipped ${skipped} already-imported` : null,
    failed > 0 ? `${failed} failed` : null,
    failed > MAX_ERRORS ? `first ${MAX_ERRORS} errors shown` : null
  ].filter(Boolean).join(", ");
  const run = await prisma.syncRun.create({
    data: {
      status: "success",
      source: "file-import",
      recordCount: imported,
      message: `${details}.`.slice(0, 500),
      startedAt,
      finishedAt: /* @__PURE__ */ new Date(),
      triggeredByUserId: input.userId
    }
  });
  return {
    run: toSyncRunItem(run),
    imported,
    skipped,
    failed,
    created,
    errors: errors.slice(0, MAX_ERRORS)
  };
  async function resolveBranch(name) {
    const key = name.trim().toLowerCase();
    const existing = branchIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;
    const row = await prisma.branch.create({ data: { name: name.trim() } });
    branchIds.set(key, row.id);
    created.branches += 1;
    return row.id;
  }
  async function resolveCategory(name) {
    const key = name.trim().toLowerCase();
    const existing = categoryIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;
    const row = await prisma.productCategory.create({
      data: { name: name.trim() }
    });
    categoryIds.set(key, row.id);
    created.categories += 1;
    return row.id;
  }
  async function resolveProduct(categoryId, name) {
    const key = productKey(categoryId, name);
    const existing = productIds.get(key);
    if (existing) return existing;
    if (!input.createMissing) return null;
    const row = await prisma.product.create({
      data: { name: name.trim(), categoryId }
    });
    productIds.set(key, row.id);
    created.products += 1;
    return row.id;
  }
}
function productKey(categoryId, name) {
  return `${categoryId}:${name.trim().toLowerCase()}`;
}
function validateRow(row, cells) {
  const branch = (cells.branch ?? "").trim();
  if (!branch) return { message: "branch is required." };
  const category = (cells.category ?? "").trim();
  if (!category) return { message: "category is required." };
  const product = (cells.product ?? "").trim();
  if (!product) return { message: "product is required." };
  const quantityRaw = (cells.quantity ?? "").trim();
  const quantity = Number(quantityRaw);
  if (quantityRaw === "" || !Number.isFinite(quantity) || quantity < 0) {
    return { message: "quantity must be a number of 0 or more." };
  }
  const valueRaw = (cells.value ?? "").trim();
  let value = null;
  if (valueRaw !== "") {
    value = Number(valueRaw);
    if (!Number.isFinite(value) || value < 0) {
      return {
        message: "value must be a number of 0 or more (leave it empty for unit-only rows)."
      };
    }
  }
  const recordDate = parseRecordDate((cells.record_date ?? "").trim());
  if (!recordDate) {
    return { message: "record_date must be a date like 2026-10-01." };
  }
  const externalRef = (cells.external_ref ?? "").trim();
  if (externalRef.length > 100) {
    return { message: "external_ref must be 100 characters or fewer." };
  }
  return {
    candidate: {
      row,
      branch,
      category,
      product,
      quantity,
      value,
      recordDate,
      externalRef: externalRef === "" ? null : externalRef
    }
  };
}
function parseRecordDate(raw3) {
  if (/^\d+(\.\d+)?$/.test(raw3)) {
    const serial = Number(raw3);
    if (serial > 2e4 && serial < 8e4) {
      return new Date(Date.UTC(1899, 11, 30) + serial * MS_PER_DAY2);
    }
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw3)) return null;
  const date = /* @__PURE__ */ new Date(`${raw3}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== raw3) return null;
  return date;
}
var REQUIRED_COLUMNS, MAX_ERRORS, BATCH_SIZE, MAX_ROWS, MS_PER_DAY2;
var init_import_service = __esm({
  "server/services/import.service.ts"() {
    "use strict";
    init_client();
    init_db();
    init_errors();
    init_import_parsers();
    init_sync_service();
    REQUIRED_COLUMNS = [
      "branch",
      "category",
      "product",
      "quantity",
      "record_date"
    ];
    MAX_ERRORS = 20;
    BATCH_SIZE = 500;
    MAX_ROWS = 2e4;
    MS_PER_DAY2 = 864e5;
  }
});

// server/controllers/imports.controller.ts
import { readFile } from "node:fs/promises";
import path2 from "node:path";
async function importRecords(req, res) {
  if (!req.file) {
    throw new HttpError(400, "Attach a CSV or Excel file (field name: file).");
  }
  const result = await importSalesRecords({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    createMissing: req.body?.createMissing === "true",
    userId: req.authUser.id
  });
  res.json(result);
}
async function downloadTemplate(_req, res) {
  let content = FALLBACK_TEMPLATE;
  try {
    content = await readFile(
      path2.resolve(process.cwd(), "samples", "import-template.csv"),
      "utf8"
    );
  } catch {
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="import-template.csv"'
  );
  res.send(content);
}
var FALLBACK_TEMPLATE;
var init_imports_controller = __esm({
  "server/controllers/imports.controller.ts"() {
    "use strict";
    init_errors();
    init_import_service();
    FALLBACK_TEMPLATE = [
      "branch,category,product,quantity,value,record_date,external_ref",
      "Central Branch,Equipment,Espresso Machine,2,30000000,2026-10-01,DEMO-0001",
      "West Branch,Consumables,Coffee Beans 1kg,10,2500000,2026-10-01,DEMO-0002",
      "East Branch,Services,Barista Training,1,3000000,2026-10-02,DEMO-0003"
    ].join("\n");
  }
});

// server/routes/imports.routes.ts
import { Router as Router7 } from "express";
import multer2 from "multer";
var upload, importsRoutes;
var init_imports_routes = __esm({
  "server/routes/imports.routes.ts"() {
    "use strict";
    init_imports_controller();
    init_auth();
    upload = multer2({
      storage: multer2.memoryStorage(),
      // 4 MB keeps the upload inside Vercel's serverless request-body limit.
      limits: { fileSize: 4 * 1024 * 1024, files: 1 }
    });
    importsRoutes = Router7();
    importsRoutes.use(requireAuth, requireAdmin);
    importsRoutes.post(
      "/records",
      upload.single("file"),
      importRecords
    );
    importsRoutes.get("/template.csv", downloadTemplate);
  }
});

// server/services/users.service.ts
import { hash } from "bcryptjs";
async function listUsers() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(toUser);
}
async function createUser(input) {
  const email3 = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: email3 } });
  if (existing) {
    throw new HttpError(409, "A user with this email already exists.");
  }
  const created = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email: email3,
      role: input.role,
      passwordHash: await hash(input.password, PASSWORD_SALT_ROUNDS)
    }
  });
  return toUser(created);
}
function toUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null
  };
}
var PASSWORD_SALT_ROUNDS;
var init_users_service = __esm({
  "server/services/users.service.ts"() {
    "use strict";
    init_db();
    init_errors();
    PASSWORD_SALT_ROUNDS = 10;
  }
});

// server/controllers/users.controller.ts
async function list3(_req, res) {
  res.json(await listUsers());
}
async function create3(req, res) {
  const input = parseBody(createUserRequestSchema, req.body);
  res.status(201).json(await createUser(input));
}
var init_users_controller = __esm({
  "server/controllers/users.controller.ts"() {
    "use strict";
    init_requests();
    init_validation();
    init_users_service();
  }
});

// server/routes/users.routes.ts
import { Router as Router8 } from "express";
var userRoutes;
var init_users_routes = __esm({
  "server/routes/users.routes.ts"() {
    "use strict";
    init_users_controller();
    init_auth();
    userRoutes = Router8();
    userRoutes.use(requireAuth, requireAdmin);
    userRoutes.get("/", list3);
    userRoutes.post("/", create3);
  }
});

// server/routes/index.ts
import { Router as Router9 } from "express";
var apiRouter;
var init_routes = __esm({
  "server/routes/index.ts"() {
    "use strict";
    init_admin_routes();
    init_auth_routes();
    init_branches_routes();
    init_categories_routes();
    init_dashboard_routes();
    init_exports_routes();
    init_imports_routes();
    init_users_routes();
    apiRouter = Router9();
    apiRouter.use(authRoutes);
    apiRouter.use("/dashboard", dashboardRoutes);
    apiRouter.use("/branches", branchRoutes);
    apiRouter.use("/product-categories", categoryRoutes);
    apiRouter.use("/users", userRoutes);
    apiRouter.use("/exports", exportRoutes);
    apiRouter.use("/admin", adminRoutes);
    apiRouter.use("/admin/imports", importsRoutes);
  }
});

// server/app.ts
var app_exports = {};
__export(app_exports, {
  createApp: () => createApp
});
import { existsSync } from "node:fs";
import path3 from "node:path";
import express from "express";
function createApp() {
  const app2 = express();
  app2.disable("x-powered-by");
  app2.use(express.json());
  app2.use("/api/v1", apiRouter);
  app2.use("/api", notFoundHandler);
  const distDir = path3.resolve(process.cwd(), "dist");
  if (existsSync(distDir)) {
    app2.use(express.static(distDir));
    app2.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path3.join(distDir, "index.html"));
    });
  }
  app2.use(errorHandler);
  return app2;
}
var init_app = __esm({
  "server/app.ts"() {
    "use strict";
    init_error();
    init_routes();
  }
});

// server/vercel.ts
var app = null;
var initError = null;
var initialized = false;
async function initialize() {
  if (initialized) return;
  initialized = true;
  try {
    const { createApp: createApp2 } = await Promise.resolve().then(() => (init_app(), app_exports));
    app = createApp2();
  } catch (error) {
    initError = error instanceof Error ? error.message : String(error);
    console.error("API initialization failed:", error);
  }
}
async function handler(req, res) {
  await initialize();
  if (!app) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({ error: "api_initialization_failed", message: initError })
    );
    return;
  }
  const rawUrl = req.url ?? "/";
  const queryIndex = rawUrl.indexOf("?");
  const queryString = queryIndex >= 0 ? rawUrl.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(queryString);
  const originalPath = params.get("__api_path");
  if (originalPath !== null) {
    params.delete("__api_path");
    const query = params.toString();
    req.url = `/api/${originalPath}${query ? `?${query}` : ""}`;
  }
  app(req, res);
}
export {
  handler as default
};
