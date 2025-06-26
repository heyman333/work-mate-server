import { MongoClient, Db } from "mongodb";

let db: Db | null = null;
let client: MongoClient | null = null;

export const connectDB = async (): Promise<Db> => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/workmate";

    client = new MongoClient(uri);
    await client.connect();

    db = client.db();
    console.log("Successfully connected to MongoDB");

    return db;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export const getDB = (): Db => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB first.");
  }
  return db;
};

export const closeDB = async (): Promise<void> => {
  if (client) {
    await client.close();
    db = null;
    client = null;
    console.log("MongoDB connection closed");
  }
};
