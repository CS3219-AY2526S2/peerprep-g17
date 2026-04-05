import mongoose, { Document, Schema } from "mongoose";

export enum Role {
  USER = "user",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: Role;
  university: string;
  bio: string;
  googleId: string | null;
  githubId: String | null;
  profilePhotoFileId: mongoose.Types.ObjectId | null;
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
      required: false, // Not required if using Google OAuth
      minlength: [8, "Password must be at least 8 characters."],
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.USER,
    },
    university: {
      type: String,
      trim: true,
      maxlength: [120, "University must be at most 120 characters."],
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, "Bio must be at most 500 characters."],
      default: "",
    },
    profilePhotoFileId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    googleId: {
      type: String, 
      default: null, 
      sparse: true
    }, 
    githubId: {
      type: String,  
      default: null,
      sparse: true
    }
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", userSchema);
export default User;
