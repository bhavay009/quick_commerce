-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "importId" UUID;

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "filename" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "sku_count" INTEGER NOT NULL DEFAULT 0,
    "date_range_start" DATE,
    "date_range_end" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportHistory_userId_idx" ON "ImportHistory"("userId");

-- CreateIndex
CREATE INDEX "Sku_importId_idx" ON "Sku"("importId");

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
