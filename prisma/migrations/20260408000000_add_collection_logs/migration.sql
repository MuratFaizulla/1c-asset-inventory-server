-- CreateTable
CREATE TABLE "CollectionItemLog" (
    "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId"      INTEGER NOT NULL,
    "action"      TEXT NOT NULL,
    "performedBy" TEXT,
    "note"        TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollectionItemLog_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "CollectionItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
