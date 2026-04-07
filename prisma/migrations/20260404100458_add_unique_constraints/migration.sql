/*
  Warnings:

  - A unique constraint covering the columns `[fullName]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[fullName]` on the table `ResponsiblePerson` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "InventorySession" ADD COLUMN "assetFaType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_fullName_key" ON "Employee"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsiblePerson_fullName_key" ON "ResponsiblePerson"("fullName");
