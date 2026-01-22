-- CreateTable
CREATE TABLE "AnnotationLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "annotationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnotationLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnotationLike_userId_idx" ON "AnnotationLike"("userId");

-- CreateIndex
CREATE INDEX "AnnotationLike_annotationId_idx" ON "AnnotationLike"("annotationId");

-- CreateIndex: Unique constraint for one like per user per annotation
CREATE UNIQUE INDEX "AnnotationLike_userId_annotationId_key" ON "AnnotationLike"("userId", "annotationId");

-- AddForeignKey
ALTER TABLE "AnnotationLike" ADD CONSTRAINT "AnnotationLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationLike" ADD CONSTRAINT "AnnotationLike_annotationId_fkey" FOREIGN KEY ("annotationId") REFERENCES "Annotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
