CREATE TABLE "AccountApiKey" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AccountApiKey_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountApiKey_hash_key" ON "AccountApiKey"("hash");
CREATE INDEX "AccountApiKey_accountId_revokedAt_idx" ON "AccountApiKey"("accountId", "revokedAt");

CREATE TABLE "AccountApiRun" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "runId" TEXT,
  "state" TEXT NOT NULL DEFAULT 'starting',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountApiRun_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccountApiRun_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "AccountApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountApiRun_accountId_idempotencyKey_key" ON "AccountApiRun"("accountId", "idempotencyKey");
CREATE INDEX "AccountApiRun_accountId_createdAt_idx" ON "AccountApiRun"("accountId", "createdAt");

CREATE TABLE "AccountCreditGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "reference" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "actor" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountCreditGrant_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AccountCreditGrant_reference_key" ON "AccountCreditGrant"("reference");
CREATE INDEX "AccountCreditGrant_accountId_createdAt_idx" ON "AccountCreditGrant"("accountId", "createdAt");

CREATE TABLE "StoreLinkCode" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "storeUrl" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreLinkCode_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "StoreLinkCode_codeHash_key" ON "StoreLinkCode"("codeHash");
CREATE INDEX "StoreLinkCode_accountId_createdAt_idx" ON "StoreLinkCode"("accountId", "createdAt");
