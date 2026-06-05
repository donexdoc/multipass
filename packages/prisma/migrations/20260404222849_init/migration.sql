-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('IP', 'SUBNET', 'RANGE', 'DOMAIN');

-- CreateEnum
CREATE TYPE "SourceFormat" AS ENUM ('PLAIN_TEXT');

-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('SOURCE_FETCH', 'DOMAIN_RESOLVE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "format" "SourceFormat" NOT NULL DEFAULT 'PLAIN_TEXT',
    "updateInterval" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastStatus" "LogStatus",
    "entryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_addresses" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_entries" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "comment" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resolved_ips" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resolved_ips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_formats" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "header" TEXT,
    "lineTemplate" TEXT NOT NULL,
    "footer" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'text/plain',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "export_formats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "update_logs" (
    "id" TEXT NOT NULL,
    "type" "LogType" NOT NULL,
    "sourceId" TEXT,
    "status" "LogStatus" NOT NULL,
    "entriesAdded" INTEGER NOT NULL DEFAULT 0,
    "entriesRemoved" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "update_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE INDEX "source_addresses_sourceId_idx" ON "source_addresses"("sourceId");

-- CreateIndex
CREATE INDEX "source_addresses_type_idx" ON "source_addresses"("type");

-- CreateIndex
CREATE INDEX "resolved_ips_domain_idx" ON "resolved_ips"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "resolved_ips_domain_ip_key" ON "resolved_ips"("domain", "ip");

-- CreateIndex
CREATE UNIQUE INDEX "export_formats_slug_key" ON "export_formats"("slug");

-- CreateIndex
CREATE INDEX "update_logs_sourceId_idx" ON "update_logs"("sourceId");

-- CreateIndex
CREATE INDEX "update_logs_type_idx" ON "update_logs"("type");

-- CreateIndex
CREATE INDEX "update_logs_createdAt_idx" ON "update_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "source_addresses" ADD CONSTRAINT "source_addresses_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "update_logs" ADD CONSTRAINT "update_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
