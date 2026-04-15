import "dotenv/config";
import mongoose from "mongoose";
import User, { Role } from "../models/User";
import { config } from "../config";

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
}

async function run(): Promise<void> {
  const email = getArgValue("--email");
  // Default to ADMIN if no role is specified, but allow 'superadmin'
  const rawRole = getArgValue("--role")?.toLowerCase() || Role.ADMIN;
  const targetRole = rawRole as Role;

  if (!email) {
    console.error("Usage: npm run bootstrap-admin -- --email <email> [--role admin|superadmin]");
    process.exit(1);
  }

  // Check if the input role is valid based on your User model
  if (!Object.values(Role).includes(targetRole)) {
    console.error(`Invalid role: ${targetRole}. Valid roles: ${Object.values(Role).join(", ")}`);
    process.exit(1);
  }

  await mongoose.connect(config.mongoUri);

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`No user found for email: ${email}`);
      process.exit(1);
    }

    if (user.role === targetRole) {
      console.log(`User ${user.email} is already a ${targetRole}.`);
      process.exit(0);
    }

    user.role = targetRole;
    await user.save();
    console.log(`Successfully updated ${user.email} to ${targetRole}.`);
  } finally {
    await mongoose.disconnect();
  }
}

run().catch(async (error) => {
  console.error("Failed to bootstrap admin:", error);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(1);
});
