import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User, { Role } from "../models/User";
import {
  applyProfileUpdates,
  toPublicProfile,
  toSelfProfile,
  validatePassword,
  validateProfileFields,
} from "../utils/userHelpers";

let mongoServer: MongoMemoryServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { ip: "127.0.0.1" },
  });
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test.beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

test("validatePassword enforces minimum strength rules", () => {
  assert.match(validatePassword("short1") || "", /at least 8 characters/i);
  assert.match(validatePassword("abcdefgh") || "", /1 digit/i);
  assert.equal(validatePassword("Passw0rd"), null);
});

test("validateProfileFields rejects invalid profile photo urls", () => {
  assert.match(
    validateProfileFields({ profilePhotoUrl: "not-a-url" }) || "",
    /valid url/i,
  );
  assert.match(
    validateProfileFields({ university: 123 }) || "",
    /university must be a string/i,
  );
  assert.equal(
    validateProfileFields({
      username: "valid-user",
      university: "NUS",
      bio: "Focused on interview prep.",
      profilePhotoUrl: "https://cdn.example.com/avatar.png",
    }),
    null,
  );
});

test("applyProfileUpdates trims usernames and blocks duplicates", async () => {
  await User.create({
    username: "taken",
    email: "taken@example.com",
    password: "Passw0rd",
    role: Role.USER,
  });

  const editableUser = await User.create({
    username: "editable",
    email: "editable@example.com",
    password: "Passw0rd",
    role: Role.USER,
  });

  const duplicateError = await applyProfileUpdates(editableUser, {
    username: "taken",
  });
  assert.match(duplicateError || "", /already exists/i);

  const success = await applyProfileUpdates(editableUser, {
    username: "  refreshed-name  ",
    bio: "Focused on trees.",
    profilePhotoUrl: "https://cdn.example.com/preset.png",
  });

  assert.equal(success, null);
  assert.equal(editableUser.username, "refreshed-name");
  assert.equal(editableUser.bio, "Focused on trees.");
  assert.equal(
    editableUser.profilePhotoPresetUrl,
    "https://cdn.example.com/preset.png",
  );
});

test("profile formatters expose the expected photo urls", async () => {
  const withPreset = await User.create({
    username: "preset-user",
    email: "preset@example.com",
    password: "Passw0rd",
    role: Role.USER,
    profilePhotoPresetUrl: "https://cdn.example.com/preset.png",
  });

  const withFile = await User.create({
    username: "file-user",
    email: "file@example.com",
    password: "Passw0rd",
    role: Role.USER,
    profilePhotoFileId: new mongoose.Types.ObjectId(),
  });

  assert.equal(
    toSelfProfile(withPreset).profilePhotoUrl,
    "https://cdn.example.com/preset.png",
  );
  assert.equal(
    toPublicProfile(withFile).profilePhotoUrl,
    `/api/users/${String(withFile._id)}/photo`,
  );
});
