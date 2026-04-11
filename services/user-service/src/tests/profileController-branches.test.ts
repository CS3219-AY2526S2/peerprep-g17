import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import type { AuthRequest } from "../middleware/authMiddleware";
import User, { Role } from "../models/User";
import {
  deleteMyself,
  getUserPhoto,
  updateMe,
  uploadMePhoto,
} from "../controllers/profileController";

let mongoServer: MongoMemoryServer;

function createMockResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    headersSent: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
    setHeader() {
      return;
    },
  };
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

test("profile controller covers unauthorized upload, invalid ids, and missing photos", async () => {
  const unauthorizedUploadRes = createMockResponse();
  await uploadMePhoto({} as AuthRequest, unauthorizedUploadRes as never);
  assert.equal(unauthorizedUploadRes.statusCode, 401);

  const missingFileRes = createMockResponse();
  await uploadMePhoto({ userId: "user-1" } as AuthRequest, missingFileRes as never);
  assert.equal(missingFileRes.statusCode, 400);

  const invalidPhotoRes = createMockResponse();
  await getUserPhoto(
    { params: { id: "" } } as unknown as AuthRequest,
    invalidPhotoRes as never,
  );
  assert.equal(invalidPhotoRes.statusCode, 400);

  const user = await User.create({
    username: "photo-less",
    email: "photo-less@example.com",
    password: "Passw0rd",
    role: Role.USER,
  });

  const missingPhotoRes = createMockResponse();
  await getUserPhoto(
    { params: { id: String(user._id) } } as unknown as AuthRequest,
    missingPhotoRes as never,
  );
  assert.equal(missingPhotoRes.statusCode, 404);
});

test("updateMe and deleteMyself cover unauthorized and last-admin protection branches", async () => {
  const unauthorizedUpdateRes = createMockResponse();
  await updateMe({} as AuthRequest, unauthorizedUpdateRes as never);
  assert.equal(unauthorizedUpdateRes.statusCode, 401);

  const unauthorizedDeleteRes = createMockResponse();
  await deleteMyself({} as AuthRequest, unauthorizedDeleteRes as never);
  assert.equal(unauthorizedDeleteRes.statusCode, 401);

  const superadmin = await User.create({
    username: "last-admin",
    email: "last-admin@example.com",
    password: "Passw0rd",
    role: Role.SUPERADMIN,
  });

  const blockedDeleteRes = createMockResponse();
  await deleteMyself(
    { userId: String(superadmin._id) } as AuthRequest,
    blockedDeleteRes as never,
  );
  assert.equal(blockedDeleteRes.statusCode, 409);
});
