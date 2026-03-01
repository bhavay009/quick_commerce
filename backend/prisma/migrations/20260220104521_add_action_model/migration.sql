-- CreateTable
CREATE TABLE "Action" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "importId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "desc" TEXT,
    "impact" DECIMAL,
    "confidence" INTEGER,
    "state" TEXT NOT NULL DEFAULT 'applied',
    "baselineMetrics" JSONB,
    "afterMetrics" JSONB,
    "appliedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluatedAt" TIMESTAMPTZ(6),
    "outcome" TEXT,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Action_userId_idx" ON "Action"("userId");

-- CreateIndex
CREATE INDEX "Action_importId_idx" ON "Action"("importId");

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Action" ADD CONSTRAINT "Action_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ImportHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
