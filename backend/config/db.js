import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected');
}

const buckets = {};

/** Public and private media live in physically separate GridFS buckets. */
export function getBucket(visibility) {
  const bucketName = visibility === 'private' ? 'private_media' : 'public_media';
  if (!buckets[bucketName]) {
    buckets[bucketName] = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName });
  }
  return buckets[bucketName];
}
