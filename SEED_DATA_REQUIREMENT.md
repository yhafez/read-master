# Seed Data Requirement - Documentation Update

**Date:** 2026-01-19
**Status:** ✅ Complete - All documentation updated

## 🎯 Requirement

**ALL database schema changes MUST include corresponding seed data updates.**

Whenever a model is added or modified in the Prisma schema, the seed data in `packages/database/prisma/seed.ts` must be updated accordingly to ensure consistent, realistic test data across all development environments.

## 📝 Files Updated

### 1. ✅ `docs/SPECIFICATIONS.md`

Added **"Database Development Practices"** subsection under Technical Specifications.

**Key additions:**

- Critical warning about seed data updates
- When to update seeds (new models, required fields, enums, relationships, constraints)
- What should be included in seed data
- Why seed data matters (development, testing, onboarding, demos)

**Location:** After "Database & Cache" section in Technical Specifications

### 2. ✅ `CLAUDE.md`

Added **"Seed Data Requirements"** subsection under Database section.

**Key additions:**

- Rule #5: Always update seed data when modifying schema
- Comprehensive guide on when to update seed data
- What to include in seed data (realistic data, edge cases, relationships, all tiers, all states)
- Example of BAD vs GOOD seed data
- Why it matters (development, testing, onboarding, demos, bug prevention)
- Enforcement guidelines

**Location:** Under Database section, after rules 1-4

### 3. ✅ `.cursorrules`

Added **"Seed Data Requirements"** subsection under Database section.

**Key additions:**

- Rule #5: Critical requirement to update seed data
- When schema changes require seed updates
- What seed data must include
- Why it matters
- Enforcement rule

**Location:** Under Database section, after rules 1-4

## 🎯 The Core Mandate

> **CRITICAL: All schema changes MUST include corresponding seed data updates.**

## 📋 When to Update Seed Data

### Always Update Seeds When:

1. ✅ **Adding a new model**
   - Add 3-5 seed records minimum
   - Include variety of data states
   - Cover all required fields

2. ✅ **Adding a required field to existing model**
   - Update ALL existing seed records with the new field
   - Provide realistic values for the field
   - Test that old seed data still works

3. ✅ **Adding an enum type**
   - Include seed examples using ALL enum values
   - Show each possible state/status/type

4. ✅ **Adding a relationship (foreign key)**
   - Ensure related records exist in seed data
   - Test the full relationship chain
   - Include examples of all relationship scenarios

5. ✅ **Modifying constraints (unique, check, etc.)**
   - Verify seed data respects new constraints
   - Update seed data if it violates constraints
   - Add examples that test constraint boundaries

6. ✅ **Adding indexes or unique constraints**
   - Ensure seed data doesn't violate uniqueness
   - Update duplicate seed data if necessary

## ✅ What Seed Data Must Include

### Required Elements

```typescript
// ✅ GOOD Seed Data Includes:

1. Realistic Data
   - Use real names, titles, descriptions
   - Not "test1", "test2", "foo", "bar"
   - Actual book titles, real author names, etc.

2. Edge Cases
   - Null values (where allowed)
   - Empty strings (where allowed)
   - Minimum/maximum values
   - Boundary conditions
   - Special characters, unicode, emoji

3. Complete Relationships
   - All foreign keys populated
   - Bidirectional relationships work
   - Cascade deletes tested
   - Optional relationships have some with/without

4. All Subscription Tiers
   - Free tier users and data
   - Pro tier users and data
   - Scholar tier users and data
   - Tier-specific features represented

5. All User Roles/Permissions
   - Admin users
   - Regular users
   - Moderators (if applicable)
   - Banned/suspended users (if applicable)

6. Various Record States
   - Active records
   - Completed records
   - Deleted records (soft delete)
   - In-progress records
   - Abandoned records

7. Varied Timestamps
   - Recent data (last week)
   - Old data (months/years ago)
   - Future dates (where applicable, like scheduled posts)
   - Test sorting and filtering by date

8. Test Scenario Coverage
   - Data that supports all test cases
   - Edge cases for business logic
   - Examples of validation failures (to test error handling)
```

## 📊 Examples

### ❌ BAD Seed Data

```typescript
// Minimal, unrealistic, no variety
await prisma.book.create({
  data: {
    title: "Test Book 1",
    userId: user1.id,
  },
});

await prisma.book.create({
  data: {
    title: "Test Book 2",
    userId: user1.id,
  },
});
```

**Problems:**

- Not realistic
- Missing many fields
- No variety in data states
- No relationships populated
- No edge cases
- Hard to understand what the data represents

### ✅ GOOD Seed Data

```typescript
// Comprehensive, realistic, covers multiple scenarios
const books = await Promise.all([
  // Completed fiction book
  prisma.book.create({
    data: {
      title: "1984",
      author: "George Orwell",
      isbn: "978-0-452-28423-4",
      status: "COMPLETED",
      genre: "FICTION",
      language: "en",
      pageCount: 328,
      currentPage: 328,
      userId: user1.id,
      completedAt: new Date("2024-01-15"),
      startedAt: new Date("2024-01-10"),
      rating: 5,
      review: "A chilling masterpiece that remains relevant today.",
      tags: ["dystopian", "classic", "political"],
    },
  }),

  // Currently reading non-fiction
  prisma.book.create({
    data: {
      title: "Sapiens: A Brief History of Humankind",
      author: "Yuval Noah Harari",
      isbn: "978-0-062-31609-7",
      status: "READING",
      genre: "NON_FICTION",
      language: "en",
      pageCount: 443,
      currentPage: 127,
      userId: user1.id,
      startedAt: new Date("2024-01-18"),
      tags: ["history", "anthropology", "science"],
    },
  }),

  // Want to read technical book
  prisma.book.create({
    data: {
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt, David Thomas",
      isbn: "978-0-135-95705-9",
      status: "WANT_TO_READ",
      genre: "TECHNICAL",
      language: "en",
      pageCount: 352,
      userId: user2.id,
      tags: ["programming", "software", "career"],
    },
  }),

  // Abandoned book (edge case)
  prisma.book.create({
    data: {
      title: "Infinite Jest",
      author: "David Foster Wallace",
      isbn: "978-0-316-92004-9",
      status: "ABANDONED",
      genre: "FICTION",
      language: "en",
      pageCount: 1079,
      currentPage: 234,
      userId: user2.id,
      startedAt: new Date("2023-11-20"),
      abandonedAt: new Date("2023-12-15"),
      abandonedReason: "Too complex for current reading goals",
      tags: ["postmodern", "literary"],
    },
  }),

  // Public domain book with full text
  prisma.book.create({
    data: {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      isbn: "978-0-141-43951-8",
      status: "COMPLETED",
      genre: "FICTION",
      language: "en",
      pageCount: 432,
      currentPage: 432,
      isPublicDomain: true,
      hasFullText: true,
      userId: user3.id,
      completedAt: new Date("2024-01-05"),
      startedAt: new Date("2023-12-28"),
      rating: 4,
      tags: ["classic", "romance", "19th-century"],
    },
  }),
]);

// Add annotations for some books
await prisma.annotation.createMany({
  data: [
    {
      bookId: books[0].id, // 1984
      userId: user1.id,
      type: "HIGHLIGHT",
      text: "War is peace. Freedom is slavery. Ignorance is strength.",
      location: "page 6",
      color: "#FFFF00",
    },
    {
      bookId: books[0].id,
      userId: user1.id,
      type: "NOTE",
      text: "This passage introduces the concept of doublethink",
      location: "page 6",
      highlightText: "War is peace.",
    },
    {
      bookId: books[1].id, // Sapiens
      userId: user1.id,
      type: "BOOKMARK",
      location: "page 127",
    },
  ],
});

// Add flashcards
await prisma.flashcard.createMany({
  data: [
    {
      bookId: books[0].id,
      userId: user1.id,
      front: "What is Newspeak in 1984?",
      back: "A controlled language designed to limit freedom of thought",
      cardType: "CONCEPT",
      status: "REVIEW",
      easeFactor: 2.5,
      interval: 7,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      bookId: books[1].id,
      userId: user1.id,
      front: "What is the Cognitive Revolution?",
      back: "The emergence of new ways of thinking and communicating ~70,000 years ago",
      cardType: "CONCEPT",
      status: "NEW",
      easeFactor: 2.5,
      interval: 0,
      dueDate: new Date(),
    },
  ],
});
```

**Benefits:**

- Realistic, recognizable data
- Multiple data states (completed, reading, want to read, abandoned)
- Full relationships (books → annotations, books → flashcards)
- Edge cases (abandoned book, public domain book)
- All tiers represented (through different users)
- Rich metadata (ISBNs, tags, ratings, reviews)
- Varied timestamps
- Supports test scenarios

## 🚀 Workflow for Schema Changes

### Step-by-Step Process

```bash
# 1. Modify Prisma schema
vim packages/database/prisma/schema.prisma

# 2. Generate migration
cd packages/database
pnpm prisma migrate dev --name descriptive_migration_name

# 3. Update seed data (REQUIRED!)
vim prisma/seed.ts

# 4. Run seed to verify
pnpm db:seed

# 5. Verify seed worked
pnpm prisma studio  # Check data visually

# 6. Run tests
pnpm test

# 7. Commit changes (schema + migration + seed together)
git add prisma/schema.prisma prisma/migrations/ prisma/seed.ts
git commit -m "feat: add BookReview model with seed data"
```

### Example: Adding a New Model

```prisma
// 1. Add model to schema.prisma
model BookReview {
  id        String   @id @default(cuid())
  bookId    String
  book      Book     @relation(fields: [bookId], references: [id])
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  rating    Int      @db.SmallInt // 1-5
  review    String?  @db.Text
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([bookId, userId]) // User can only review book once
}
```

```typescript
// 2. Add to seed.ts (REQUIRED!)
const bookReviews = await prisma.bookReview.createMany({
  data: [
    {
      bookId: books[0].id,
      userId: user1.id,
      rating: 5,
      review:
        "A chilling masterpiece. Orwell's vision of totalitarianism remains disturbingly relevant.",
    },
    {
      bookId: books[0].id,
      userId: user2.id,
      rating: 4,
      review:
        "Thought-provoking and unsettling. Some parts dragged, but overall excellent.",
    },
    {
      bookId: books[1].id,
      userId: user1.id,
      rating: 5,
      review:
        "Mind-blowing perspective on human history. Harari connects dots I never saw.",
    },
    {
      bookId: books[2].id,
      userId: user3.id,
      rating: 5,
      review: "Essential reading for any software developer. Timeless wisdom.",
    },
    // Edge case: Review with no text (just rating)
    {
      bookId: books[3].id,
      userId: user2.id,
      rating: 2,
      review: null,
    },
  ],
});
```

## 🎓 Best Practices

### DO ✅

- **Add seed data immediately** when creating migrations
- **Use realistic data** from actual books, authors, etc.
- **Include edge cases** in seed data (nulls, boundaries, etc.)
- **Test the seed script** after every change (`pnpm db:seed`)
- **Commit seed changes with schema changes** (atomic commits)
- **Document special seed requirements** in code comments
- **Run seed in CI/CD** to catch issues early

### DON'T ❌

- **Skip seed data** thinking "I'll add it later" (you won't!)
- **Use fake data** like "test1", "foo", "bar"
- **Add only one record** (need variety for testing)
- **Forget relationships** (orphaned records cause test failures)
- **Ignore edge cases** (missing edge cases = bugs in production)
- **Hardcode IDs** (use variables/references)
- **Forget to test** the seed script

## 📊 Impact on Development

### Before This Requirement ❌

```
Developer adds new model
→ Creates migration
→ Forgets to update seeds
→ Seeds break for other developers
→ Tests fail mysteriously
→ Demo environments have no data
→ New developers struggle to see features
→ Manual data entry required
```

### After This Requirement ✅

```
Developer adds new model
→ Creates migration
→ Updates seed data (required!)
→ Tests seed script
→ Seeds work for everyone
→ Tests pass consistently
→ Demo environments populated automatically
→ New developers see working features immediately
→ No manual data entry needed
```

## 🎯 Enforcement

### Pre-Commit Checklist

When modifying database schema:

```
□ Schema changes made in schema.prisma
□ Migration created (pnpm prisma migrate dev)
□ Seed data updated in seed.ts
□ Seed script tested (pnpm db:seed)
□ Seed script runs without errors
□ Database inspected to verify data (pnpm prisma studio)
□ Tests pass with new seed data
□ Schema, migration, and seed committed together
```

### Code Review Checklist

When reviewing schema changes:

```
□ Does this PR include seed data updates?
□ Is the seed data realistic and comprehensive?
□ Are edge cases included?
□ Are relationships properly populated?
□ Does seed script run without errors?
□ Does the seed data support all test scenarios?
```

## 📚 Documentation References

For detailed seed data guidelines, refer to:

- **`docs/SPECIFICATIONS.md`** - Database Development Practices section
- **`CLAUDE.md`** - Database → Seed Data Requirements subsection
- **`.cursorrules`** - Database → Seed Data Requirements subsection
- **`packages/database/prisma/seed.ts`** - The actual seed file

## 🎉 Summary

**Three critical updates made:**

1. ✅ **SPECIFICATIONS.md** - Added "Database Development Practices" with seed requirements
2. ✅ **CLAUDE.md** - Added comprehensive "Seed Data Requirements" subsection
3. ✅ **.cursorrules** - Added concise "Seed Data Requirements" subsection

**Core requirement now enforced:**

> **NO schema change is complete without corresponding seed data updates.**

**Why this matters:**

- Consistent development environments
- Reliable test data
- Faster onboarding
- Better demos
- Early bug detection
- Professional data examples

---

**Next Steps:** All future schema changes must include seed data updates. Ralph will now update seeds as part of every database-related task.
