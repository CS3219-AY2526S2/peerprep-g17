import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import request from "supertest";
import bcrypt from "bcrypt";
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
  role?: Role;
  password?: string;
}) {
  const hashedPassword = await bcrypt.hash(params.password || PASSWORD, 10);
  return User.create({
    username: params.username,
    email: params.email,
    password: hashedPassword,
    role: params.role || Role.USER,
  });
}

async function login(identifier: string, password = PASSWORD): Promise<string> {
  const res = await request(app)
    .post("/api/users/login")
    .send({ identifier, password });

  assert.equal(res.status, 200);
  assert.ok(res.body?.data?.token);
  return res.body.data.token as string;
}

test.before(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: {
      ip: "127.0.0.1",
    },
  });
  await mongoose.connect(mongoServer.getUri());
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test.beforeEach(async () => {
  await mongoose.connection.db?.dropDatabase();
});

test("registration defaults to user role (no implicit first-admin bootstrap)", async () => {
  const res = await request(app).post("/api/users/register").send({
    username: "new-user",
    email: "new-user@example.com",
    password: PASSWORD,
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.role, "user");
});

test("role freshness uses DB role on every request (Superadmin demotes Admin)", async () => {
  const adminA = await createUser({
    username: "admin-a",
    email: "admin-a@example.com",
    role: Role.ADMIN,
  });

  await createUser({
    username: "super-b",
    email: "super-b@example.com",
    role: Role.SUPERADMIN,
  });

  const adminAToken = await login("admin-a");
  const superBToken = await login("super-b");

  const demoteRes = await request(app)
    .patch(`/api/users/${adminA._id}/role`)
    .set("Authorization", `Bearer ${superBToken}`)
    .send({ role: Role.USER });

  assert.equal(demoteRes.status, 200);

  const staleTokenAdminListRes = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${adminAToken}`);

  assert.equal(staleTokenAdminListRes.status, 403);
});

test("last superadmin cannot delete self", async () => {
  const superadmin = await createUser({
    username: "sole-super",
    email: "sole-super@example.com",
    role: Role.SUPERADMIN,
  });

  const superToken = await login("sole-super");

  const deleteRes = await request(app)
    .delete(`/api/users/${superadmin._id}`)
    .set("Authorization", `Bearer ${superToken}`);

  assert.equal(deleteRes.status, 409);
  assert.match(deleteRes.body.error, /last admin/i);
});

test("bootstrap-admin script promotes target email (with role flag)", async () => {
  await createUser({
    username: "super-target",
    email: "super-target@example.com",
    role: Role.USER,
  });

  const scriptPath = path.resolve(
    process.cwd(),
    "dist/scripts/bootstrapAdmin.js",
  );

  execFileSync(process.execPath, [
    scriptPath, 
    "--email", "super-target@example.com", 
    "--role", "superadmin"
  ], {
    env: {
      ...process.env,
      MONGO_URI: mongoServer.getUri(),
    },
  });

  const updated = await User.findOne({ email: "super-target@example.com" });
  assert.ok(updated);
  assert.equal(updated.role, Role.SUPERADMIN);
});

test("bootstrap-admin script defaults to admin role when flag is omitted", async () => {
  await createUser({
    username: "default-admin-target",
    email: "default@example.com",
    role: Role.USER,
  });

  const scriptPath = path.resolve(
    process.cwd(),
    "dist/scripts/bootstrapAdmin.js",
  );

  execFileSync(process.execPath, [scriptPath, "--email", "default@example.com"], {
    env: {
      ...process.env,
      MONGO_URI: mongoServer.getUri(),
    },
  });

  const updated = await User.findOne({ email: "default@example.com" });
  assert.ok(updated);
  assert.equal(updated.role, Role.ADMIN);
});

test("bootstrap-admin script promotes target email to superadmin", async () => {
  await createUser({
    username: "super-target",
    email: "super-target@example.com",
    role: Role.USER,
  });

  const scriptPath = path.resolve(process.cwd(), "dist/scripts/bootstrapAdmin.js");

  execFileSync(process.execPath, [scriptPath, "--email", "super-target@example.com", "--role", "superadmin"], {
    env: { ...process.env, MONGO_URI: mongoServer.getUri() },
  });

  const updated = await User.findOne({ email: "super-target@example.com" });
  assert.ok(updated);
  assert.equal(updated.role, Role.SUPERADMIN);
});

test("admin request lifecycle: submit -> review -> promotion applies immediately", async () => {
  await createUser({
    username: "approver-admin",
    email: "approver-admin@example.com",
    role: Role.ADMIN,
  });
  const requester = await createUser({
    username: "requester-user",
    email: "requester-user@example.com",
    role: Role.USER,
  });

  const userToken = await login("requester-user");
  const adminToken = await login("approver-admin");

  const submitRes = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ reason: "I help maintain moderation workflows." });
  assert.equal(submitRes.status, 201);
  const requestId = submitRes.body.data.id as string;

  const duplicatePendingRes = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ reason: "Second pending request" });
  assert.equal(duplicatePendingRes.status, 409);

  const listRes = await request(app)
    .get("/api/users/admin-requests?status=pending")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.data.length, 1);

  const reviewRes = await request(app)
    .patch(`/api/users/admin-requests/${requestId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.body.data.status, "approved");

  const staleUserTokenAdminEndpointRes = await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${userToken}`);
  assert.equal(staleUserTokenAdminEndpointRes.status, 200);

  const nowAdminSubmitRes = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ reason: "Should not be allowed for admins" });
  assert.equal(nowAdminSubmitRes.status, 400);

  const promotedRequester = await User.findById(requester._id);
  assert.ok(promotedRequester);
  assert.equal(promotedRequester.role, Role.ADMIN);
});

test("admin cannot delete another admin", async () => {
  await createUser({
    username: "attacker-admin",
    email: "attacker@example.com",
    role: Role.ADMIN,
  });

  const targetAdmin = await createUser({
    username: "target-admin",
    email: "target@example.com",
    role: Role.ADMIN,
  });

  const attackerToken = await login("attacker-admin");

  const deleteRes = await request(app)
    .delete(`/api/users/${targetAdmin._id}`)
    .set("Authorization", `Bearer ${attackerToken}`);

  assert.equal(deleteRes.status, 403);
  assert.match(deleteRes.body.error, /cannot delete other admins/i);

  const stillExists = await User.findById(targetAdmin._id);
  assert.ok(stillExists, "Target admin should not have been deleted from the database");
});

test("superadmin can delete an admin", async () => {
  await createUser({
    username: "power-super",
    email: "super@example.com",
    role: Role.SUPERADMIN,
  });

  const targetAdmin = await createUser({
    username: "target-to-delete",
    email: "target-admin@example.com",
    role: Role.ADMIN,
  });

  const superToken = await login("power-super");

  const deleteRes = await request(app)
    .delete(`/api/users/${targetAdmin._id}`)
    .set("Authorization", `Bearer ${superToken}`);

  assert.equal(deleteRes.status, 204);

  const deletedUser = await User.findById(targetAdmin._id);
  assert.equal(deletedUser, null, "The Admin user should have been removed from the database");
});