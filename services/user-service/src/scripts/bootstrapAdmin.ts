import "dotenv/config";
import mongoose from "mongoose";
import User, { Role } from "../models/User";

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return null;
  }

  return process.argv[index + 1];
}

async function run(): Promise<void> {
  const email = getArgValue("--email");
  if (!email) {
    console.error("Usage: npm run bootstrap-admin -- --email <email>");
    process.exit(1);
  }

  const mongoUri =
    process.env.MONGO_URI || "mongodb://localhost:27017/user-service";

  await mongoose.connect(mongoUri);

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.error(`No user found for email: ${email}`);
      process.exit(1);
    }

    if (user.role === Role.ADMIN) {
      console.log(`User ${user.email} is already an admin.`);
      process.exit(0);
    }

    user.role = Role.ADMIN;
    await user.save();
    console.log(`Promoted ${user.email} to admin.`);
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
