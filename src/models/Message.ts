import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import { UserModel } from "./User";

export interface Message {
  _id?: ObjectId;
  fromUserId: ObjectId;
  targetUserId: ObjectId;
  toUserEmail: string;
  subject: string;
  content: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMessageInput {
  fromUserId: ObjectId;
  targetUserId: ObjectId;
  subject: string;
  content: string;
}

export class MessageModel {
  private static get collection() {
    return getDB().collection<Message>("messages");
  }

  static async create(messageData: CreateMessageInput): Promise<Message> {
    const now = new Date();
    
    // Get target user's email
    const targetUser = await UserModel.findById(messageData.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found");
    }
    
    const message: Message = {
      ...messageData,
      toUserEmail: targetUser.email,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(message);
    return { ...message, _id: result.insertedId };
  }

  static async findById(id: string | ObjectId): Promise<Message | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  static async findByToUserEmail(email: string): Promise<Message[]> {
    return await this.collection
      .find({ toUserEmail: email })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByFromUserId(userId: string | ObjectId): Promise<Message[]> {
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    return await this.collection
      .find({ fromUserId: objectId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByTargetUserId(userId: string | ObjectId): Promise<Message[]> {
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    return await this.collection
      .find({ targetUserId: objectId })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async markAsRead(id: string | ObjectId): Promise<Message | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const now = new Date();
    
    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { 
        $set: { 
          isRead: true, 
          readAt: now,
          updatedAt: now 
        } 
      },
      { returnDocument: "after" }
    );
    
    return result || null;
  }

  static async delete(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  static async deleteByUserId(userId: string | ObjectId): Promise<void> {
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    await this.collection.deleteMany({
      $or: [
        { fromUserId: objectId },
        { toUserEmail: { $exists: true } } // 수신자 이메일로는 직접 삭제하지 않고 별도 로직 필요
      ]
    });
  }
}