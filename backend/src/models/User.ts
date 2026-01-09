import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  role: UserRole;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    resetTokenHash: { type: String },
    resetTokenExpiresAt: { type: Date },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = mongoose.model<IUser>('User', UserSchema);
