import mongoose, { Document, Schema } from "mongoose";

export enum Role {
  USER = "user",
  ADMIN = "admin",
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: [true, "Username is required!"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required!"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address."],
    },
    password: {
      type: String,
      required: [true, "Password is Required!"],
      minlength: [8, "Password must be at least 8 characters."],
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.USER,
    },
  },
  {
    // Automatically handles createdAt and updatedAt fields
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", userSchema);
export default User;
