-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionSession" (
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name"      TEXT    NOT NULL,
    "status"    TEXT    NOT NULL DEFAULT 'OPEN',
    "assetType" TEXT,
    "deadline"  DATETIME,
    "createdBy" TEXT,
    "note"      TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt"  DATETIME
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionItem" (
    "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId"  INTEGER NOT NULL,
    "assetId"    INTEGER NOT NULL,
    "status"     TEXT    NOT NULL DEFAULT 'PENDING',
    "returnedAt" DATETIME,
    "returnedBy" TEXT,
    "note"       TEXT,
    CONSTRAINT "CollectionItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CollectionSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CollectionItem_assetId_fkey"   FOREIGN KEY ("assetId")   REFERENCES "Asset" ("id")              ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionItem_sessionId_assetId_key" ON "CollectionItem"("sessionId", "assetId");
