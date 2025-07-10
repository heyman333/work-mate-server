import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

export async function migrateWorkPlaceDescription() {
  console.log("Starting migration...", process.env.MONGODB_URI);
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017/workmate"
  );

  try {
    await client.connect();
    console.log("Connected to MongoDB for migration");

    const db = client.db();
    const collection = db.collection("workplaces");

    // Find all documents where description is a string
    const documentsToUpdate = await collection
      .find({
        description: { $type: "string" },
      })
      .toArray();

    console.log(`Found ${documentsToUpdate.length} documents to migrate`);

    // Update each document
    for (const doc of documentsToUpdate) {
      const oldDescription = doc.description;
      const newDescription = oldDescription
        ? [
            {
              date: doc.createdAt || new Date(),
              content: oldDescription,
            },
          ]
        : [];

      await collection.updateOne(
        { _id: doc._id },
        {
          $set: { description: newDescription },
          $currentDate: { updatedAt: true },
        }
      );

      console.log(`Updated document ${doc._id}`);
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateWorkPlaceDescription()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
