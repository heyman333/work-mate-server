import { ObjectId } from "mongodb";
import { getDB } from "../config/database";
import { UserModel } from "./User";

export interface Like {
  _id?: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  createdAt: Date;
}

export interface CreateLikeInput {
  fromUserId: ObjectId;
  toUserId: ObjectId;
}

export class LikeModel {
  private static get collection() {
    return getDB().collection<Like>("likes");
  }

  static async create(likeData: CreateLikeInput): Promise<Like | null> {
    try {
      const existingLike = await this.collection.findOne({
        fromUserId: likeData.fromUserId,
        toUserId: likeData.toUserId,
      });

      if (existingLike) {
        throw new Error("이미 좋아요한 사용자입니다.");
      }

      const like: Like = {
        ...likeData,
        createdAt: new Date(),
      };

      const insertResult = await this.collection.insertOne(like);
      const result = { ...like, _id: insertResult.insertedId };

      await UserModel.incrementLikeCount(likeData.fromUserId, "likedCount");
      await UserModel.incrementLikeCount(likeData.toUserId, "likedByCount");

      return result;
    } catch (error) {
      console.error("좋아요 생성 오류:", error);
      return null;
    }
  }

  static async delete(fromUserId: ObjectId, toUserId: ObjectId): Promise<boolean> {
    try {
      const deleteResult = await this.collection.deleteOne({
        fromUserId,
        toUserId,
      });

      if (deleteResult.deletedCount === 0) {
        throw new Error("좋아요 기록을 찾을 수 없습니다.");
      }

      await UserModel.decrementLikeCount(fromUserId, "likedCount");
      await UserModel.decrementLikeCount(toUserId, "likedByCount");

      return true;
    } catch (error) {
      console.error("좋아요 삭제 오류:", error);
      return false;
    }
  }

  static async exists(fromUserId: ObjectId, toUserId: ObjectId): Promise<boolean> {
    const like = await this.collection.findOne({
      fromUserId,
      toUserId,
    }, { projection: { _id: 1 } });

    return !!like;
  }

  static async getLikedUsers(userId: ObjectId, limit: number = 50, skip: number = 0) {
    const result = await this.collection.aggregate([
      { $match: { fromUserId: userId } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "toUserId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          likedAt: "$createdAt",
          user: {
            _id: "$user._id",
            email: "$user.email",
            name: "$user.name",
            profileImage: "$user.profileImage",
            skillSet: "$user.skillSet",
            company: "$user.company",
            mbti: "$user.mbti",
            collaborationGoal: "$user.collaborationGoal",
          }
        }
      }
    ]).toArray();

    return result;
  }

  static async getLikedByUsers(userId: ObjectId, limit: number = 50, skip: number = 0) {
    const result = await this.collection.aggregate([
      { $match: { toUserId: userId } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "fromUserId",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          likedAt: "$createdAt",
          user: {
            _id: "$user._id",
            email: "$user.email",
            name: "$user.name",
            profileImage: "$user.profileImage",
            skillSet: "$user.skillSet",
            company: "$user.company",
            mbti: "$user.mbti",
            collaborationGoal: "$user.collaborationGoal",
          }
        }
      }
    ]).toArray();

    return result;
  }

  static async deleteByUserId(userId: ObjectId): Promise<void> {
    try {
      const likesGiven = await this.collection.find({ fromUserId: userId }).toArray();
      const likesReceived = await this.collection.find({ toUserId: userId }).toArray();

      for (const like of likesGiven) {
        await UserModel.decrementLikeCount(like.toUserId, "likedByCount");
      }

      for (const like of likesReceived) {
        await UserModel.decrementLikeCount(like.fromUserId, "likedCount");
      }

      await this.collection.deleteMany({
        $or: [
          { fromUserId: userId },
          { toUserId: userId }
        ]
      });
    } catch (error) {
      console.error("사용자 좋아요 데이터 삭제 오류:", error);
      throw error;
    }
  }

  static async getLikeCount(fromUserId: ObjectId): Promise<number> {
    return await this.collection.countDocuments({ fromUserId });
  }

  static async getLikedByCount(toUserId: ObjectId): Promise<number> {
    return await this.collection.countDocuments({ toUserId });
  }

  static async createIndex(): Promise<void> {
    await this.collection.createIndex({ fromUserId: 1, toUserId: 1 }, { unique: true });
    await this.collection.createIndex({ fromUserId: 1, createdAt: -1 });
    await this.collection.createIndex({ toUserId: 1, createdAt: -1 });
  }
}