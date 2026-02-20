-- CreateTable
CREATE TABLE "ad_performance" (
    "id" UUID NOT NULL,
    "sku_name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend" DECIMAL NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0,
    "roas" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'Watch',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_performance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ad_performance_date_idx" ON "ad_performance"("date");

-- CreateIndex
CREATE INDEX "ad_performance_status_idx" ON "ad_performance"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
