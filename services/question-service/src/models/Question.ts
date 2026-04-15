import mongoose, { Document, Schema } from "mongoose";

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
export const EXECUTION_MODES = [
  "python_function",
  "python_class",
  "unsupported",
] as const;
export const COMPARISON_MODES = ["exact_json", "float_tolerance"] as const;

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

export interface IExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface StarterCodeRecord {
  python: string;
}

export interface FunctionTestCase {
  id: string;
  args: unknown[];
  expected: unknown;
}

export interface ClassTestCase {
  id: string;
  operations: string[];
  arguments: unknown[][];
  expected: unknown[];
}

export type JudgeTestCase = FunctionTestCase | ClassTestCase;

export interface JudgeConfig {
  className?: string;
  methodName?: string;
  comparisonMode: (typeof COMPARISON_MODES)[number];
  timeLimitMs: number;
  memoryLimitMb: number;
}

export interface IQuestion extends Document {
  title: string;
  difficulty: string;
  categories: string[];
  description: string;
  examples: IExample[];
  link: string;
  executionMode: (typeof EXECUTION_MODES)[number];
  starterCode: StarterCodeRecord;
  visibleTestCases: JudgeTestCase[];
  hiddenTestCases: JudgeTestCase[];
  judgeConfig?: JudgeConfig | null;
  createdAt: Date;
  updatedAt: Date;
}

const exampleSchema = new Schema<IExample>(
  {
    input: {
      type: String,
      required: [true, "Example input is required."],
      trim: true,
    },
    output: {
      type: String,
      required: [true, "Example output is required."],
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const questionSchema = new Schema<IQuestion>(
  {
    title: {
      type: String,
      required: [true, "Title is required."],
      unique: true,
      trim: true,
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required."],
      enum: {
        values: [...DIFFICULTIES],
        message: "Difficulty must be one of: Easy, Medium, Hard.",
      },
      trim: true,
    },
    categories: {
      type: [String],
      required: [true, "At least one category is required."],
      validate: {
        validator: (value: string[]) => value.length > 0,
        message: "At least one category is required.",
      },
      enum: {
        values: [...CATEGORIES],
        message: "Invalid category: {VALUE}.",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      trim: true,
      minlength: [10, "Description must be at least 10 characters."],
    },
    examples: {
      type: [exampleSchema],
      default: [],
    },
    link: {
      type: String,
      trim: true,
      default: "",
    },
    executionMode: {
      type: String,
      enum: [...EXECUTION_MODES],
      default: "unsupported",
    },
    starterCode: {
      python: {
        type: String,
        default: "",
      },
    },
    visibleTestCases: {
      type: [Schema.Types.Mixed] as unknown as never,
      default: [],
    },
    hiddenTestCases: {
      type: [Schema.Types.Mixed] as unknown as never,
      default: [],
    },
    judgeConfig: {
      type: {
        className: { type: String, trim: true },
        methodName: { type: String, trim: true },
        comparisonMode: {
          type: String,
          enum: [...COMPARISON_MODES],
          default: "exact_json",
        },
        timeLimitMs: {
          type: Number,
          default: 4000,
        },
        memoryLimitMb: {
          type: Number,
          default: 256,
        },
      },
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for common query patterns
questionSchema.index({ difficulty: 1 });
questionSchema.index({ categories: 1 });
questionSchema.index({ difficulty: 1, categories: 1 });

const Question = mongoose.model<IQuestion>("Question", questionSchema);
export default Question;
