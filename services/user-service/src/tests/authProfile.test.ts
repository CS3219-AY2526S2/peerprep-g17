import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import User, { Role } from "../models/User";

const app = createApp();
const PASSWORD = "Passw0rd";

let mongoServer: MongoMemoryServer;

async function createUser(params: {
  username: string;
  email: string;
  password?: string;
  role?: Role;
  university?: string;
  bio?: string;
  profilePhotoPresetUrl?: string | null;
}) {
  const hashedPassword = await bcrypt.hash(params.password || PASSWORD, 10);
  return User.create({
    username: params.username,
    email: params.email,
    password: hashedPassword,
    role: params.role || Role.USER,
    university: params.university || "",
    bio: params.bio || "",
    profilePhotoPresetUrl: params.profilePhotoPresetUrl ?? null,
  });
}

async function login(identifier: string, password = PASSWORD): Promise<string> {
  const response = await request(app)
    .post("/api/users/login")
    .send({ identifier, password });

  assert.equal(response.status, 200);
  assert.ok(response.body?.data?.token);
  return response.body.data.token as string;
}

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

test("registers a user, logs in with email, and returns the self profile", async () => {
  const registerResponse = await request(app).post("/api/users/register").send({
    username: "casey",
    email: "Casey@example.com",
    password: PASSWORD,
  });

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.data.username, "casey");
  assert.equal(registerResponse.body.data.role, "user");

  const token = await login("casey@example.com");
  const meResponse = await request(app)
    .get("/api/users/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.data.email, "casey@example.com");
  assert.equal(meResponse.body.data.profilePhotoUrl, null);
});

test("rejects weak passwords during registration", async () => {
  const response = await request(app).post("/api/users/register").send({
    username: "weakling",
    email: "weak@example.com",
    password: "weak",
  });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /password/i);
});

test("updates the authenticated user's profile and accepts preset photo urls", async () => {
  await createUser({
    username: "profile-user",
    email: "profile@example.com",
  });
  const token = await login("profile-user");

  const response = await request(app)
    .patch("/api/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({
      university: "National University of Singapore",
      bio: "Practicing graphs and dynamic programming.",
      profilePhotoUrl: "https://cdn.example.com/avatar.png",
    });

  assert.equal(response.status, 200);
  assert.equal(
    response.body.data.university,
    "National University of Singapore",
  );
  assert.equal(
    response.body.data.profilePhotoUrl,
    "https://cdn.example.com/avatar.png",
  );
});

test("rejects duplicate usernames on self profile updates", async () => {
  await createUser({
    username: "taken-name",
    email: "taken@example.com",
  });
  await createUser({
    username: "other-user",
    email: "other@example.com",
  });
  const token = await login("other-user");

  const response = await request(app)
    .patch("/api/users/me")
    .set("Authorization", `Bearer ${token}`)
    .send({ username: "taken-name" });

  assert.equal(response.status, 409);
  assert.match(response.body.error, /already exists/i);
});

test("returns a public profile for an authenticated caller", async () => {
  const profileOwner = await createUser({
    username: "public-user",
    email: "public@example.com",
    university: "NUS",
    bio: "Happy to pair on arrays.",
    profilePhotoPresetUrl: "https://cdn.example.com/public-avatar.png",
  });
  await createUser({
    username: "viewer",
    email: "viewer@example.com",
  });

  const viewerToken = await login("viewer");
  const response = await request(app)
    .get(`/api/users/${String(profileOwner._id)}/profile`)
    .set("Authorization", `Bearer ${viewerToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.data.username, "public-user");
  assert.equal(response.body.data.email, undefined);
  assert.equal(response.body.data.profilePhotoUrl, "https://cdn.example.com/public-avatar.png");
});

test("deletes the authenticated user's own account", async () => {
  const user = await createUser({
    username: "delete-me",
    email: "delete@example.com",
  });
  const token = await login("delete-me");

  const response = await request(app)
    .delete("/api/users/me")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 200);
  const deletedUser = await User.findById(user._id);
  assert.equal(deletedUser, null);
});
