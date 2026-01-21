-- CreateTable: ReadingList
-- Personal, ordered, shareable collections of books
CREATE TABLE "ReadingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareCode" TEXT,
    "itemsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReadingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReadingListItem
-- Junction table for books in reading lists with ordering
CREATE TABLE "ReadingListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingList_shareCode_key" ON "ReadingList"("shareCode");

-- CreateIndex
CREATE INDEX "ReadingList_userId_idx" ON "ReadingList"("userId");

-- CreateIndex
CREATE INDEX "ReadingList_isPublic_idx" ON "ReadingList"("isPublic");

-- CreateIndex
CREATE INDEX "ReadingList_deletedAt_idx" ON "ReadingList"("deletedAt");

-- CreateIndex
CREATE INDEX "ReadingList_createdAt_idx" ON "ReadingList"("createdAt");

-- CreateIndex
CREATE INDEX "ReadingListItem_listId_idx" ON "ReadingListItem"("listId");

-- CreateIndex
CREATE INDEX "ReadingListItem_bookId_idx" ON "ReadingListItem"("bookId");

-- CreateIndex
CREATE INDEX "ReadingListItem_listId_orderIndex_idx" ON "ReadingListItem"("listId", "orderIndex");

-- CreateIndex (prevent duplicate books in same list)
CREATE UNIQUE INDEX "ReadingListItem_listId_bookId_key" ON "ReadingListItem"("listId", "bookId");

-- AddForeignKey
ALTER TABLE "ReadingList" ADD CONSTRAINT "ReadingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingListItem" ADD CONSTRAINT "ReadingListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ReadingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingListItem" ADD CONSTRAINT "ReadingListItem_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
