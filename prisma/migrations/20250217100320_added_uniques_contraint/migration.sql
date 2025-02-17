/*
  Warnings:

  - A unique constraint covering the columns `[shortId]` on the table `Url` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Url_shortId_key" ON "Url"("shortId");
