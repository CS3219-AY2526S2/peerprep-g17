/* ── Question types ──────────────────────────────────── */

export interface ExampleRecord {
  input: string;
  output: string;
  explanation?: string;
}

export interface QuestionRecord {
  id: string;
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  examples: ExampleRecord[];
  link: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionMeta {
  total: number;
  difficulties: string[];
  categories: string[];
}

/* ── Question constants ─────────────────────────────── */

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const CATEGORIES = [
  "Algorithms",
  "Arrays",
  "Binary Search",
  "Bit Manipulation",
  "Brainteaser",
  "Data Structures",
  "Databases",
  "Depth-First Search",
  "Dynamic Programming",
  "Greedy",
  "Hash Table",
  "Math",
  "Recursion",
  "Sorting",
  "Strings",
] as const;

export const DIFFICULTY_STYLES: Record<string, string> = {
  Easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  Medium:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  Hard: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
};

/* ── User types ─────────────────────────────────────── */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}
