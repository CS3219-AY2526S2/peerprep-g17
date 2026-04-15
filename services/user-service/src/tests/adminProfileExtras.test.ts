import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import User, { Role } from "../models/User";
import AdminRequest from "../models/AdminRequest";
import AuditLog from "../models/AuditLogs";

const app = createApp();
const PASSWORD = "Passw0rd";

let mongoServer: MongoMemoryServer;

async function createUser(params: {
  username: string;
  email: string;
  role?: Role;
  password?: string;
  university?: string;
  bio?: string;
}) {
  const hashedPassword = await bcrypt.hash(params.password || PASSWORD, 10);
  return User.create({
    username: params.username,
    email: params.email,
    password: hashedPassword,
    role: params.role || Role.USER,
    university: params.university || "",
    bio: params.bio || "",
  });
}

async function login(identifier: string, password = PASSWORD): Promise<string> {
  const res = await request(app)
    .post("/api/users/login")
    .send({ identifier, password });

  assert.equal(res.status, 200);
  return res.body.data.token as string;
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

test("admin can list users and fetch audit logs", async () => {
  const admin = await createUser({
    username: "list-admin",
    email: "list-admin@example.com",
    role: Role.ADMIN,
  });
  await createUser({
    username: "list-user",
    email: "list-user@example.com",
  });
  await AuditLog.create({
    performedBy: admin._id,
    action: "SEE_THE_USER",
    targetUser: admin._id,
  });

  const adminToken = await login("list-admin");

  const usersResponse = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(usersResponse.status, 200);
  assert.equal(usersResponse.body.data.length, 2);

  const logsResponse = await request(app)
    .get("/api/users/audit/logs")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(logsResponse.status, 200);
  assert.equal(logsResponse.body.data.length, 1);
});

test("admin can update another user email and password", async () => {
  await createUser({
    username: "admin-updater",
    email: "admin-updater@example.com",
    role: Role.ADMIN,
  });
  const target = await createUser({
    username: "editable-user",
    email: "editable-user@example.com",
  });

  const adminToken = await login("admin-updater");
  const updateResponse = await request(app)
    .patch(`/api/users/${String(target._id)}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      email: "edited@example.com",
      password: "NewPassw0rd",
      university: "NUS",
    });

  assert.equal(updateResponse.status, 200);
  assert.equal(updateResponse.body.data.email, "edited@example.com");

  const reloginResponse = await request(app)
    .post("/api/users/login")
    .send({ identifier: "edited@example.com", password: "NewPassw0rd" });
  assert.equal(reloginResponse.status, 200);
});

test("reviewing an admin request can reject it and list it by status", async () => {
  await createUser({
    username: "review-admin",
    email: "review-admin@example.com",
    role: Role.ADMIN,
  });
  await createUser({
    username: "review-user",
    email: "review-user@example.com",
    role: Role.USER,
  });

  const userToken = await login("review-user");
  const adminToken = await login("review-admin");

  const createResponse = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ reason: "I support demo moderation." });
  assert.equal(createResponse.status, 201);

  const requestId = createResponse.body.data.id as string;
  const rejectResponse = await request(app)
    .patch(`/api/users/admin-requests/${requestId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "rejected" });
  assert.equal(rejectResponse.status, 200);
  assert.equal(rejectResponse.body.data.status, "rejected");

  const filteredResponse = await request(app)
    .get("/api/users/admin-requests?status=rejected")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(filteredResponse.status, 200);
  assert.equal(filteredResponse.body.data.length, 1);

  const storedRequest = await AdminRequest.findById(requestId);
  assert.equal(storedRequest?.status, "rejected");
});

test("get user enforces ownership for non-admins", async () => {
  const owner = await createUser({
    username: "owner-user",
    email: "owner@example.com",
  });
  const stranger = await createUser({
    username: "stranger-user",
    email: "stranger@example.com",
  });

  const strangerToken = await login("stranger-user");

  const forbiddenResponse = await request(app)
    .get(`/api/users/${String(owner._id)}`)
    .set("Authorization", `Bearer ${strangerToken}`);
  assert.equal(forbiddenResponse.status, 403);

  const ownResponse = await request(app)
    .get(`/api/users/${String(stranger._id)}`)
    .set("Authorization", `Bearer ${strangerToken}`);
  assert.equal(ownResponse.status, 200);
  assert.equal(ownResponse.body.data.username, "stranger-user");
});
