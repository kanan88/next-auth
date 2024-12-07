import mongoose from 'mongoose';

let initialized = false;

export const connect = async () => {
  mongoose.set('strictQuery', true);

  if (initialized) {
    console.log('MongoDB is already connected');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in the environment variables.');
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: 'next_auth_app',
    });

    console.log('MongoDB connected');
    initialized = true;
  } catch (e) {
    console.log('MongoDB connection error: ', e);
    throw new Error('Failed to connect to MongoDB');
  }
};
