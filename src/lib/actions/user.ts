import User from '../models/user.model';
import { connect } from '../mongodb/mongoose';

interface EmailAddress {
  email: string;
}

export const createOrUpdateUser = async (
  id: string,
  first_name: string,
  last_name: string,
  image_url: string,
  email_addresses: EmailAddress[],
  username: string
): Promise<typeof User | null> => {
  try {
    // Ensure database connection
    await connect();

    // Find and update user, or create a new one if not found
    const user = await User.findOneAndUpdate(
      { clerkId: id },
      {
        $set: {
          firstName: first_name,
          lastName: last_name,
          avatar: image_url,
          email: email_addresses[0]?.email || '', // Fallback if no email is available
          username,
        },
      },
      {
        new: true, // Return the updated document
        upsert: true, // Create the document if it doesn't exist
      }
    );

    return user;
  } catch (error) {
    console.error('Error in createOrUpdateUser:', error);
    throw new Error('Failed to create or update user');
  }
};

export const deleteUser = async (id: string) => {
  try {
    // Ensure database connection
    await connect();

    await User.findOneAndDelete({ clerkId: id });
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};
