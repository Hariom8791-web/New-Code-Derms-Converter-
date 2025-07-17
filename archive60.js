const { MongoClient } = require("mongodb");

async function archive60Days() {
  const cutoff = new Date(Date.now() - 60 * 86_400_000); // 60 days ago
  const liveClient = new MongoClient("mongodb://localhost:27017");
  const archiveClient = new MongoClient("mongodb://localhost:27017");

  try {
    await liveClient.connect();
    await archiveClient.connect();

    const liveDB = liveClient.db("gnVoltage");
    const archiveDB = archiveClient.db("gnVoltageArchive");

    const BATCH_LIMIT = 100000;
    const docs = await liveDB.collection("devicemsgs")
      .find({ createdAt: { $lt: cutoff } })
      .limit(BATCH_LIMIT)
      .toArray();

    if (docs.length > 0) {
      await archiveDB.collection("devicemsgs").insertMany(docs);
      const ids = docs.map(doc => doc._id);
      await liveDB.collection("devicemsgs").deleteMany({ _id: { $in: ids } });
      console.log(`Archived ${docs.length} documents older than ${cutoff.toISOString()}`);
    } else {
      console.log("No old documents to archive.");
    }
  } catch (err) {
    console.error("Error in archiving:", err);
  } finally {
    await liveClient.close();
    await archiveClient.close();
    process.exit(0); // Explicitly exit (optional)
  }
}

archive60Days();