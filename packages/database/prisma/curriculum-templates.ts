/**
 * Curriculum Templates
 *
 * Pre-made curriculum templates that users can clone and use.
 * These are seeded into the database on initialization.
 */

export interface CurriculumTemplate {
  title: string;
  description: string;
  category: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  visibility: "PUBLIC";
  isOfficial: boolean;
  items: Array<{
    orderIndex: number;
    externalTitle: string;
    externalAuthor?: string;
    externalIsbn?: string;
    externalUrl?: string;
    notes?: string;
    estimatedTime?: number;
    isOptional: boolean;
  }>;
}

/**
 * Official Read Master curriculum templates
 */
export const CURRICULUM_TEMPLATES: CurriculumTemplate[] = [
  // Classic Literature
  {
    title: "Introduction to Classic Literature",
    description:
      "A guided journey through timeless works of Western literature. Perfect for beginners looking to explore the classics.",
    category: "Literature",
    difficulty: "BEGINNER",
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "To Kill a Mockingbird",
        externalAuthor: "Harper Lee",
        externalIsbn: "9780061120084",
        notes:
          "A powerful story about racial injustice and moral growth in the American South.",
        estimatedTime: 600,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "The Great Gatsby",
        externalAuthor: "F. Scott Fitzgerald",
        externalIsbn: "9780743273565",
        notes:
          "Explore themes of wealth, love, and the American Dream in the Jazz Age.",
        estimatedTime: 480,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "1984",
        externalAuthor: "George Orwell",
        externalIsbn: "9780451524935",
        notes:
          "A dystopian masterpiece about totalitarianism and surveillance.",
        estimatedTime: 540,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "Pride and Prejudice",
        externalAuthor: "Jane Austen",
        externalIsbn: "9780141439518",
        notes:
          "A witty romance exploring class, marriage, and social expectations.",
        estimatedTime: 660,
        isOptional: false,
      },
      {
        orderIndex: 4,
        // Removed type: "ARTICLE",
        externalTitle: "Understanding Classic Literature: A Guide",
        externalUrl: "https://example.com/classic-lit-guide",
        notes: "Supplementary reading on analyzing classic texts.",
        estimatedTime: 30,
        isOptional: true,
      },
    ],
  },

  // Programming Fundamentals
  {
    title: "Modern Web Development Fundamentals",
    description:
      "Learn the foundations of web development with modern best practices. Covers HTML, CSS, JavaScript, and React.",
    category: "Technology",
    difficulty: "BEGINNER",
    // Removed estimatedHours: 80,
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "HTML and CSS: Design and Build Websites",
        externalAuthor: "Jon Duckett",
        externalIsbn: "9781118008188",
        notes: "Visual introduction to HTML and CSS fundamentals.",
        estimatedTime: 900,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "JavaScript: The Good Parts",
        externalAuthor: "Douglas Crockford",
        externalIsbn: "9780596517748",
        notes: "Essential JavaScript concepts and best practices.",
        estimatedTime: 600,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "You Don't Know JS: Scope & Closures",
        externalAuthor: "Kyle Simpson",
        externalIsbn: "9781449335588",
        notes: "Deep dive into JavaScript scope and closures.",
        estimatedTime: 420,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "Learning React",
        externalAuthor: "Alex Banks & Eve Porcello",
        externalIsbn: "9781492051718",
        notes: "Modern React development with hooks and best practices.",
        estimatedTime: 780,
        isOptional: false,
      },
      {
        orderIndex: 4,
        // Removed type: "EXERCISE",
        externalTitle: "Build a React Todo App",
        notes:
          "Practice exercise: Create a functional todo application using React.",
        estimatedTime: 240,
        isOptional: false,
      },
    ],
  },

  // Personal Development
  {
    title: "Productivity & Time Management Mastery",
    description:
      "Transform your productivity with proven strategies from leading experts. Learn to manage time, build habits, and achieve your goals.",
    category: "Self-Help",
    difficulty: "BEGINNER",
    // Removed estimatedHours: 40,
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "Atomic Habits",
        externalAuthor: "James Clear",
        externalIsbn: "9780735211292",
        notes:
          "Learn how tiny changes lead to remarkable results through habit formation.",
        estimatedTime: 480,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "Deep Work",
        externalAuthor: "Cal Newport",
        externalIsbn: "9781455586691",
        notes: "Master the art of focused work in a distracted world.",
        estimatedTime: 540,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "Getting Things Done",
        externalAuthor: "David Allen",
        externalIsbn: "9780143126560",
        notes: "The classic productivity system for stress-free efficiency.",
        estimatedTime: 600,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "The 7 Habits of Highly Effective People",
        externalAuthor: "Stephen R. Covey",
        externalIsbn: "9781982137274",
        notes:
          "Timeless principles for personal and professional effectiveness.",
        estimatedTime: 720,
        isOptional: false,
      },
      {
        orderIndex: 4,
        // Removed type: "ARTICLE",
        externalTitle: "Weekly Review Template",
        externalUrl: "https://example.com/weekly-review",
        notes: "Downloadable template for your weekly review process.",
        estimatedTime: 15,
        isOptional: true,
      },
    ],
  },

  // Science & Philosophy
  {
    title: "Introduction to Philosophy",
    description:
      "Explore fundamental questions about existence, knowledge, ethics, and reality through classic and modern philosophical texts.",
    category: "Philosophy",
    difficulty: "INTERMEDIATE",
    // Removed estimatedHours: 100,
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "Sophie's World",
        externalAuthor: "Jostein Gaarder",
        externalIsbn: "9780374530716",
        notes:
          "An accessible introduction to philosophy through a captivating story.",
        estimatedTime: 900,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "Meditations",
        externalAuthor: "Marcus Aurelius",
        externalIsbn: "9780143036272",
        notes: "Stoic philosophy and wisdom from a Roman Emperor.",
        estimatedTime: 420,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "The Republic",
        externalAuthor: "Plato",
        externalIsbn: "9780140449143",
        notes: "Plato's vision of an ideal society and the nature of justice.",
        estimatedTime: 840,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "Being and Time",
        externalAuthor: "Martin Heidegger",
        externalIsbn: "9780061575594",
        notes: "Advanced: Existential philosophy and the question of being.",
        estimatedTime: 1200,
        isOptional: true,
      },
    ],
  },

  // Business & Economics
  {
    title: "Startup Founder's Reading List",
    description:
      "Essential books for aspiring entrepreneurs. Learn from successful founders and build a strong foundation for your startup journey.",
    category: "Business",
    difficulty: "INTERMEDIATE",
    // Removed estimatedHours: 60,
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "The Lean Startup",
        externalAuthor: "Eric Ries",
        externalIsbn: "9780307887894",
        notes: "Revolutionary approach to building and scaling startups.",
        estimatedTime: 600,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "Zero to One",
        externalAuthor: "Peter Thiel",
        externalIsbn: "9780804139298",
        notes:
          "Contrarian thinking and insights on building innovative companies.",
        estimatedTime: 480,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "The Hard Thing About Hard Things",
        externalAuthor: "Ben Horowitz",
        externalIsbn: "9780062273208",
        notes:
          "Real advice for navigating the toughest challenges in business.",
        estimatedTime: 540,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "Crossing the Chasm",
        externalAuthor: "Geoffrey A. Moore",
        externalIsbn: "9780062292988",
        notes:
          "Marketing and selling disruptive products to mainstream customers.",
        estimatedTime: 600,
        isOptional: false,
      },
      {
        orderIndex: 4,
        // Removed type: "BOOK",
        externalTitle: "The Innovator's Dilemma",
        externalAuthor: "Clayton M. Christensen",
        externalIsbn: "9781633691780",
        notes: "Why great companies fail and how to avoid their mistakes.",
        estimatedTime: 660,
        isOptional: true,
      },
    ],
  },

  // Science
  {
    title: "Understanding Modern Science",
    description:
      "Explore the wonders of science through engaging books that explain complex concepts in accessible ways. Perfect for curious minds.",
    category: "Science",
    difficulty: "BEGINNER",
    // Removed estimatedHours: 70,
    visibility: "PUBLIC",
    isOfficial: true,
    items: [
      {
        orderIndex: 0,
        // Removed type: "BOOK",
        externalTitle: "A Short History of Nearly Everything",
        externalAuthor: "Bill Bryson",
        externalIsbn: "9780767908184",
        notes: "An entertaining journey through the history of science.",
        estimatedTime: 900,
        isOptional: false,
      },
      {
        orderIndex: 1,
        // Removed type: "BOOK",
        externalTitle: "Cosmos",
        externalAuthor: "Carl Sagan",
        externalIsbn: "9780345539434",
        notes: "Explore the universe and our place in it with Carl Sagan.",
        estimatedTime: 840,
        isOptional: false,
      },
      {
        orderIndex: 2,
        // Removed type: "BOOK",
        externalTitle: "The Selfish Gene",
        externalAuthor: "Richard Dawkins",
        externalIsbn: "9780198788607",
        notes: "Revolutionary ideas about evolution and natural selection.",
        estimatedTime: 720,
        isOptional: false,
      },
      {
        orderIndex: 3,
        // Removed type: "BOOK",
        externalTitle: "Sapiens",
        externalAuthor: "Yuval Noah Harari",
        externalIsbn: "9780062316110",
        notes: "The history of humankind from the Stone Age to the modern era.",
        estimatedTime: 900,
        isOptional: false,
      },
    ],
  },
];
