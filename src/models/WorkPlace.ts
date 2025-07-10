import { ObjectId } from "mongodb";
import { getDB } from "../config/database";

export interface WorkPlace {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  latitude: number;
  longitude: number;
  description?: {
    date: Date;
    content: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkPlaceInput {
  userId: string | ObjectId;
  name: string;
  latitude: number;
  longitude: number;
  description?: {
    date: Date;
    content: string;
  }[];
}

export interface UpdateWorkPlaceInput {
  name?: string;
  latitude?: number;
  longitude?: number;
  description?: {
    date: Date;
    content: string;
  }[];
}

export class WorkPlaceModel {
  private static get collection() {
    return getDB().collection<WorkPlace>("workplaces");
  }

  static async create(workPlaceData: CreateWorkPlaceInput): Promise<WorkPlace> {
    const now = new Date();
    const userId =
      typeof workPlaceData.userId === "string"
        ? new ObjectId(workPlaceData.userId)
        : workPlaceData.userId;

    const workPlace: WorkPlace = {
      ...workPlaceData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.collection.insertOne(workPlace);
    return { ...workPlace, _id: result.insertedId };
  }

  static async findById(id: string | ObjectId): Promise<WorkPlace | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    return await this.collection.findOne({ _id: objectId });
  }

  static async findByUserId(userId: string | ObjectId): Promise<WorkPlace[]> {
    const objectId = typeof userId === "string" ? new ObjectId(userId) : userId;
    return await this.collection.find({ userId: objectId }).toArray();
  }

  static async update(
    id: string | ObjectId,
    updateData: UpdateWorkPlaceInput
  ): Promise<WorkPlace | null> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const result = await this.collection.findOneAndUpdate(
      { _id: objectId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    return result || null;
  }

  static async delete(id: string | ObjectId): Promise<boolean> {
    const objectId = typeof id === "string" ? new ObjectId(id) : id;
    const result = await this.collection.deleteOne({ _id: objectId });
    return result.deletedCount > 0;
  }

  static async findByLocation(
    latitude: number,
    longitude: number,
    radius: number = 0.01
  ): Promise<WorkPlace[]> {
    return await this.collection
      .find({
        latitude: { $gte: latitude - radius, $lte: latitude + radius },
        longitude: { $gte: longitude - radius, $lte: longitude + radius },
      })
      .toArray();
  }

  static async findAllWithCreators(): Promise<
    (WorkPlace & {
      creator: {
        _id: ObjectId;
        name: string;
        email: string;
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
      };
    })[]
  > {
    const result = await this.collection
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "creator",
          },
        },
        {
          $unwind: "$creator",
        },
        {
          $project: {
            _id: 1,
            userId: 1,
            name: 1,
            latitude: 1,
            longitude: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            creator: {
              _id: "$creator._id",
              name: "$creator.name",
              email: "$creator.email",
              profileImage: "$creator.profileImage",
              githubId: "$creator.githubId",
              googleId: "$creator.googleId",
              skillSet: "$creator.skillSet",
              githubUrl: "$creator.githubUrl",
              linkedinUrl: "$creator.linkedinUrl",
              company: "$creator.company",
              mbti: "$creator.mbti",
              collaborationGoal: "$creator.collaborationGoal",
              createdAt: "$creator.createdAt",
              updatedAt: "$creator.updatedAt",
              lastLoginAt: "$creator.lastLoginAt",
            },
          },
        },
      ])
      .toArray();

    return result as (WorkPlace & {
      creator: {
        _id: ObjectId;
        name: string;
        email: string;
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
      };
    })[];
  }
}
