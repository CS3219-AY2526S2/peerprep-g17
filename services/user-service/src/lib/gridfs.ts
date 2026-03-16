import mongoose from "mongoose";

let profilePhotoBucket: mongoose.mongo.GridFSBucket | null = null;

export function initializeProfilePhotoBucket(): void {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection is not initialized.");
  }

  profilePhotoBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "profilePhotos",
  });
}

export function getProfilePhotoBucket(): mongoose.mongo.GridFSBucket {
  if (!profilePhotoBucket) {
    throw new Error("Profile photo bucket is not initialized.");
  }

  return profilePhotoBucket;
}
