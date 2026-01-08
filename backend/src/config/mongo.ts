import mongoose from 'mongoose';
import { env } from './env.js';

export const connectMongo = async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGO_URI);
};
