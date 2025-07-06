import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import { WorkPlaceModel } from "./WorkPlace";

export interface User {
  _id?: ObjectId;
  email: string;
  name: string;
  profileImage?: string;
  githubId?: string;
  googleId?: string;
  skillSet?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  company?: string;
  mbti?: string;
  collaborationGoal?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  profileImage?: string;
  githubId?: string;
  googleId?: string;
  skillSet?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  company?: string;
  mbti?: string;
  collaborationGoal?: string;
}

export class UserModel {
  private static get collection() {
    return getDB().collection<User>("users");
  }

  static async create(userData: CreateUserInput): Promise<User> {
    const now = new Date();
    const user: User = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async findByEmail(email: string): Promise<User | null> {
    return await this.collection.findOne({ email });
  }

  static async findByGithubId(githubId: string): Promise<User | null> {
    return await this.collection.findOne({ githubId });
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    return await this.collection.findOne({ googleId });
  }

  static async findById(id: string | ObjectId): Promise<User | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  static async update(id: string | ObjectId, updateData: Partial<User>): Promise<User | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result || null;
  }

  static async updateLastLogin(id: string | ObjectId): Promise<void> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    await this.collection.updateOne(
      { _id: objectId },
      { $set: { lastLoginAt: new Date(), updatedAt: new Date() } }
    );
  }

  static async getWorkPlaces(userId: string | ObjectId) {
    return await WorkPlaceModel.findByUserId(userId);
  }
}