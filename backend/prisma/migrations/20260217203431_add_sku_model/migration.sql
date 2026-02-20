-- CreateTable
CREATE TABLE "Sku" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sku_name" TEXT NOT NULL,
    "spend" DECIMAL NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sku_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Sku_userId_idx" ON "Sku"("userId");

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
