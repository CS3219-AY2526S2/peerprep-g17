import test from "node:test";
import assert from "node:assert/strict";
import express, { type NextFunction, type Response } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import User, { Role } from "../models/User";
import {
  verifyAdmin,
  verifySuperAdmin,
  verifyToken,
  type AuthRequest,
} from "../middleware/authMiddleware";
import { parseProfilePhotoUpload } from "../middleware/photoUploadMiddleware";
import { config } from "../config";

let mongoServer: MongoMemoryServer;

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  } as Response & { statusCode: number; body: unknown };
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

test("verifyToken rejects missing and invalid auth headers", async () => {
  const missingReq = { headers: {} } as AuthRequest;
  const missingRes = createMockResponse();
  let calledNext = false;

  await verifyToken(missingReq, missingRes, (() => {
    calledNext = true;
  }) as NextFunction);

  assert.equal(missingRes.statusCode, 401);
  assert.equal(calledNext, false);

  const invalidReq = {
    headers: { authorization: "Bearer invalid-token" },
  } as AuthRequest;
  const invalidRes = createMockResponse();

  await verifyToken(invalidReq, invalidRes, (() => undefined) as NextFunction);
  assert.equal(invalidRes.statusCode, 401);
});

test("verifyToken loads the DB-fresh role and verifyAdmin/verifySuperAdmin enforce it", async () => {
  const user = await User.create({
    username: "role-check",
    email: "role-check@example.com",
    password: "Passw0rd",
    role: Role.SUPERADMIN,
  });

  const token = jwt.sign({ id: String(user._id) }, config.jwtSecret);
  const req = {
    headers: { authorization: `Bearer ${token}` },
  } as AuthRequest;
  const res = createMockResponse();
  let nextCalls = 0;

  await verifyToken(req, res, (() => {
    nextCalls += 1;
  }) as NextFunction);

  assert.equal(res.statusCode, 200);
  assert.equal(req.role, Role.SUPERADMIN);
  assert.equal(nextCalls, 1);

  const adminRes = createMockResponse();
  verifyAdmin(req, adminRes, (() => {
    nextCalls += 1;
  }) as NextFunction);
  assert.equal(nextCalls, 2);

  const superRes = createMockResponse();
  verifySuperAdmin(req, superRes, (() => {
    nextCalls += 1;
  }) as NextFunction);
  assert.equal(nextCalls, 3);

  const nonSuperReq = { role: Role.ADMIN } as AuthRequest;
  const nonSuperRes = createMockResponse();
  verifySuperAdmin(nonSuperReq, nonSuperRes, (() => undefined) as NextFunction);
  assert.equal(nonSuperRes.statusCode, 403);
});

test("parseProfilePhotoUpload rejects invalid file types", async () => {
  const app = express();
  let calledHandler = false;

  app.post(
    "/upload",
    (req, _res, next) => parseProfilePhotoUpload(req as AuthRequest, _res, next),
    (_req, res) => {
      calledHandler = true;
      res.status(200).json({ ok: true });
    },
  );

  const response = await request(app)
    .post("/upload")
    .attach("photo", Buffer.from("GIF89a"), {
      filename: "avatar.gif",
      contentType: "image/gif",
    });

  assert.equal(calledHandler, false);
  assert.equal(response.status, 400);
  assert.match(String((response.body as { error?: string }).error), /invalid file type/i);
});
