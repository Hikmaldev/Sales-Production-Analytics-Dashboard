-- AlterTable
ALTER TABLE "sales_records" ADD COLUMN "external_ref" VARCHAR(100);

-- CreateIndex
CREATE UNIQUE INDEX "sales_records_external_ref_key" ON "sales_records"("external_ref");
