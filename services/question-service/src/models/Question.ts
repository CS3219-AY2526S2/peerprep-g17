import mongoose, { Document, Schema } from "mongoose";

export interface IQuestion extends Document {
  title: string;
  difficulty: string;
  topic: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const questionSchema = new Schema<IQuestion>(
    {
        title: {
            type: String,
            required: [true, "Title is required!"],
            unique: true,
            trim: true,
        },
        difficulty: {
            type: String,
            required: [true, "Difficulty is required!"],
            enum: ['Easy', 'Medium', 'Hard'],
            trim: true,
        },
        topic: {
            type: String,
            trim: true,
            enum: ['Misc', 
                'Array', 
                'String', 
                'Hash Table', 
                'Math', 
                'Dynamic Programming', 
                'Sorting', 
                'Greedy', 
                'Depth-First Search',
                'Binary Search'
            ],
            default: "Misc",
        },
        description: {
            type: String,
            required: [true, "Description is required!"],
            trim: true,
            default: "Placeholder description",
        }
    },
    {
        // Automatically handles createdAt and updatedAt fields
        timestamps: true,
    },
);

const Question = mongoose.model<IQuestion>("Question", questionSchema);
export default Question;