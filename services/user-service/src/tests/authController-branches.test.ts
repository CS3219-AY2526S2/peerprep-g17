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

test("authController rejects missing registration/login fields and invalid credentials", async () => {
  const missingRegisterFields = await request(app)
    .post("/api/users/register")
    .send({ username: "alice" });
  assert.equal(missingRegisterFields.status, 400);

  await createUser({
    username: "existing-user",
    email: "existing@example.com",
  });

  const duplicateRegister = await request(app)
    .post("/api/users/register")
    .send({
      username: "existing-user",
      email: "new@example.com",
      password: PASSWORD,
    });
  assert.equal(duplicateRegister.status, 409);

  const missingLoginFields = await request(app)
    .post("/api/users/login")
    .send({ identifier: "existing@example.com" });
  assert.equal(missingLoginFields.status, 400);

  const missingUserLogin = await request(app)
    .post("/api/users/login")
    .send({ identifier: "nobody@example.com", password: PASSWORD });
  assert.equal(missingUserLogin.status, 401);

  const wrongPasswordLogin = await request(app)
    .post("/api/users/login")
    .send({ identifier: "existing@example.com", password: "WrongPass1" });
  assert.equal(wrongPasswordLogin.status, 401);
});

test("authController login supports username lookup path", async () => {
  await createUser({
    username: "username-login",
    email: "username-login@example.com",
  });

  const response = await request(app)
    .post("/api/users/login")
    .send({ identifier: "username-login", password: PASSWORD });

  assert.equal(response.status, 200);
  assert.equal(response.body.data.username, "username-login");
});
