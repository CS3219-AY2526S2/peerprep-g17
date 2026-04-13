import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { createApp } from "../app";
import User, { Role } from "../models/User";
import AdminRequest from "../models/AdminRequest";

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

test("adminController rejects invalid ids, invalid role/status input, and non-pending reviews", async () => {
  await createUser({
    username: "admin-branch",
    email: "admin-branch@example.com",
    role: Role.ADMIN,
  });
  await createUser({
    username: "normal-user",
    email: "normal-user@example.com",
  });

  const adminToken = await login("admin-branch");
  const userToken = await login("normal-user");

  const invalidUserRead = await request(app)
    .get("/api/users/not-a-valid-id")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(invalidUserRead.status, 400);

  const invalidUserUpdate = await request(app)
    .patch("/api/users/not-a-valid-id")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ username: "updated" });
  assert.equal(invalidUserUpdate.status, 400);

  const invalidDelete = await request(app)
    .delete("/api/users/not-a-valid-id")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(invalidDelete.status, 400);

  const invalidRole = await request(app)
    .patch(`/api/users/${new mongoose.Types.ObjectId().toString()}/role`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ role: "owner" });
  assert.equal(invalidRole.status, 400);

  const invalidRoleSelf = await request(app)
    .patch(`/api/users/${(await User.findOne({ email: "admin-branch@example.com" }))!._id}/role`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ role: Role.USER });
  assert.equal(invalidRoleSelf.status, 400);

  const missingReason = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({});
  assert.equal(missingReason.status, 400);

  const invalidFilter = await request(app)
    .get("/api/users/admin-requests?status=weird")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(invalidFilter.status, 400);

  const createdRequest = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${userToken}`)
    .send({ reason: "Please promote me." });
  assert.equal(createdRequest.status, 201);

  const requestId = createdRequest.body.data.id as string;

  const invalidReviewId = await request(app)
    .patch("/api/users/admin-requests/not-a-valid-id")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  assert.equal(invalidReviewId.status, 400);

  const invalidReviewStatus = await request(app)
    .patch(`/api/users/admin-requests/${requestId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "maybe" });
  assert.equal(invalidReviewStatus.status, 400);

  const approved = await request(app)
    .patch(`/api/users/admin-requests/${requestId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  assert.equal(approved.status, 200);

  const secondReview = await request(app)
    .patch(`/api/users/admin-requests/${requestId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "rejected" });
  assert.equal(secondReview.status, 400);
});

test("adminController covers admin-only update validation and missing targets", async () => {
  const admin = await createUser({
    username: "validator-admin",
    email: "validator-admin@example.com",
    role: Role.ADMIN,
  });
  const target = await createUser({
    username: "target-user",
    email: "target-user@example.com",
  });

  const adminToken = await login("validator-admin");

  const invalidEmail = await request(app)
    .patch(`/api/users/${String(target._id)}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ email: "" });
  assert.equal(invalidEmail.status, 400);

  const invalidPasswordType = await request(app)
    .patch(`/api/users/${String(target._id)}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ password: 12345 });
  assert.equal(invalidPasswordType.status, 400);

  const weakPassword = await request(app)
    .patch(`/api/users/${String(target._id)}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ password: "weak" });
  assert.equal(weakPassword.status, 400);

  const missingTarget = await request(app)
    .patch(`/api/users/${new mongoose.Types.ObjectId().toString()}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ username: "updated-user" });
  assert.equal(missingTarget.status, 404);

  const tooLongReason = await request(app)
    .post("/api/users/admin-requests")
    .set("Authorization", `Bearer ${await login("target-user")}`)
    .send({ reason: "a".repeat(501) });
  assert.equal(tooLongReason.status, 400);

  const missingAdminRequest = await request(app)
    .patch(`/api/users/admin-requests/${new mongoose.Types.ObjectId().toString()}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  assert.equal(missingAdminRequest.status, 404);

  const orphanRequest = await AdminRequest.create({
    userId: new mongoose.Types.ObjectId(),
    reason: "No user behind this request",
  });

  const missingTargetUser = await request(app)
    .patch(`/api/users/admin-requests/${String(orphanRequest._id)}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "approved" });
  assert.equal(missingTargetUser.status, 404);

  assert.ok(admin);
});
