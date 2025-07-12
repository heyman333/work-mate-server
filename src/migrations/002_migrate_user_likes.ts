import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

export async function migrateUserLikes() {
  console.log("Starting user likes migration...", process.env.MONGODB_URI);
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017/workmate"
  );

  try {
    await client.connect();
    console.log("Connected to MongoDB for migration");

    const db = client.db();
    const usersCollection = db.collection("users");
    const likesCollection = db.collection("likes");

    // Create indexes for likes collection
    await likesCollection.createIndex({ fromUserId: 1, toUserId: 1 }, { unique: true });
    await likesCollection.createIndex({ fromUserId: 1, createdAt: -1 });
    await likesCollection.createIndex({ toUserId: 1, createdAt: -1 });
    console.log("Created indexes for likes collection");

    // Find all users with old like arrays
    const usersWithLikes = await usersCollection
      .find({
        $or: [
          { likedUsers: { $exists: true, $type: "array" } },
          { likedByUsers: { $exists: true, $type: "array" } }
        ]
      })
      .toArray();

    console.log(`Found ${usersWithLikes.length} users with old like data`);

    const now = new Date();
    let totalLikesCreated = 0;

    for (const user of usersWithLikes) {
      const userId = user._id;
      let likedCount = 0;
      let likedByCount = 0;

      // Process likedUsers array
      if (user.likedUsers && Array.isArray(user.likedUsers)) {
        for (const targetUserId of user.likedUsers) {
          if (ObjectId.isValid(targetUserId)) {
            try {
              await likesCollection.insertOne({
                fromUserId: userId,
                toUserId: new ObjectId(targetUserId),
                createdAt: now,
              });
              likedCount++;
              totalLikesCreated++;
            } catch (error: any) {
              // Skip duplicates
              if (error.code !== 11000) {
                console.error(`Error creating like for user ${userId} -> ${targetUserId}:`, error);
              }
            }
          }
        }
      }

      // Count how many users liked this user (from likedByUsers arrays of other users)
      if (user.likedByUsers && Array.isArray(user.likedByUsers)) {
        likedByCount = user.likedByUsers.length;
      }

      // Update user with counts and remove old arrays
      await usersCollection.updateOne(
        { _id: userId },
        {
          $set: {
            likedCount,
            likedByCount,
            updatedAt: now,
          },
          $unset: {
            likedUsers: "",
            likedByUsers: "",
          }
        }
      );

      console.log(`Updated user ${userId}: likedCount=${likedCount}, likedByCount=${likedByCount}`);
    }

    // Initialize counts for users without like data
    const usersWithoutCounts = await usersCollection
      .find({
        $or: [
          { likedCount: { $exists: false } },
          { likedByCount: { $exists: false } }
        ]
      })
      .toArray();

    for (const user of usersWithoutCounts) {
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            likedCount: user.likedCount || 0,
            likedByCount: user.likedByCount || 0,
            updatedAt: now,
          }
        }
      );
    }

    console.log(`Migration completed successfully. Created ${totalLikesCreated} like records.`);
    console.log(`Updated ${usersWithoutCounts.length} users without count data.`);

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Rollback function
export async function rollbackUserLikes() {
  console.log("Starting user likes rollback...");
  const client = new MongoClient(
    process.env.MONGODB_URI || "mongodb://localhost:27017/workmate"
  );

  try {
    await client.connect();
    console.log("Connected to MongoDB for rollback");

    const db = client.db();
    const usersCollection = db.collection("users");
    const likesCollection = db.collection("likes");

    // Get all like records
    const allLikes = await likesCollection.find({}).toArray();
    console.log(`Found ${allLikes.length} like records to rollback`);

    // Rebuild old arrays for each user
    const userLikes = new Map();
    const userLikedBy = new Map();

    for (const like of allLikes) {
      const fromUserId = like.fromUserId.toString();
      const toUserId = like.toUserId.toString();

      // Build likedUsers array for fromUser
      if (!userLikes.has(fromUserId)) {
        userLikes.set(fromUserId, []);
      }
      userLikes.get(fromUserId).push(like.toUserId);

      // Build likedByUsers array for toUser
      if (!userLikedBy.has(toUserId)) {
        userLikedBy.set(toUserId, []);
      }
      userLikedBy.get(toUserId).push(like.fromUserId);
    }

    // Update all users
    const allUsers = await usersCollection.find({}).toArray();
    for (const user of allUsers) {
      const userId = user._id.toString();
      
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            likedUsers: userLikes.get(userId) || [],
            likedByUsers: userLikedBy.get(userId) || [],
            updatedAt: new Date(),
          },
          $unset: {
            likedCount: "",
            likedByCount: "",
          }
        }
      );
    }

    // Drop likes collection
    await likesCollection.drop();
    console.log("Dropped likes collection");

    console.log("Rollback completed successfully");

  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration if called directly
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === "rollback") {
    rollbackUserLikes()
      .then(() => {
        console.log("Rollback script completed");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Rollback script failed:", error);
        process.exit(1);
      });
  } else {
    migrateUserLikes()
      .then(() => {
        console.log("Migration script completed");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Migration script failed:", error);
        process.exit(1);
      });
  }
}