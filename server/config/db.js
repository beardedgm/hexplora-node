import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Migrate: drop old non-sparse username index if it exists
    // The old index was unique but not sparse, which breaks when multiple
    // users have null username. The new schema uses sparse: true.
    try {
      const usersCollection = conn.connection.collection('users');
      const indexes = await usersCollection.indexes();
      const oldUsernameIndex = indexes.find(
        (idx) => idx.key?.username === 1 && !idx.sparse
      );
      if (oldUsernameIndex) {
        await usersCollection.dropIndex(oldUsernameIndex.name);
        console.log('Dropped old non-sparse username index — Mongoose will recreate it as sparse.');
      }
    } catch (indexErr) {
      // Ignore if index doesn't exist or already migrated
      if (indexErr.code !== 27) { // 27 = IndexNotFound
        console.warn('Index migration note:', indexErr.message);
      }
    }
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default connectDB;
