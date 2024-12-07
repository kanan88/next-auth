import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { createOrUpdateUser, deleteUser } from '@/lib/actions/user';

// Define the expected structure for user-related events
interface UserEventData {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string;
  email_addresses: Array<{ email: string }>;
  username: string;
}

// Type guard for UserEventData
function isUserEventData(data: unknown): data is UserEventData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const userData = data as Partial<UserEventData>;

  return (
    typeof userData.id === 'string' &&
    typeof userData.first_name === 'string' &&
    typeof userData.last_name === 'string' &&
    typeof userData.image_url === 'string' &&
    Array.isArray(userData.email_addresses) &&
    userData.email_addresses.every(
      (emailObj) =>
        typeof emailObj === 'object' &&
        emailObj !== null &&
        typeof emailObj.email === 'string'
    ) &&
    typeof userData.username === 'string'
  );
}

export async function POST(req: Request): Promise<Response> {
  const SIGNING_SECRET = process.env.SIGNING_SECRET;

  if (!SIGNING_SECRET) {
    throw new Error(
      'Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local'
    );
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET);

  // Get headers from request
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // Validate presence of required headers
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Get body payload
  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  // Verify payload with headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error: Could not verify webhook:', err);
    return new Response('Error: Verification error', {
      status: 400,
    });
  }

  const eventType = evt?.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    if (isUserEventData(evt.data)) {
      const {
        id,
        first_name,
        last_name,
        image_url,
        email_addresses,
        username,
      } = evt.data;

      if (!id) {
        return new Response('Error: User ID is missing', {
          status: 400,
        });
      }

      try {
        await createOrUpdateUser(
          id,
          first_name,
          last_name,
          image_url,
          email_addresses,
          username
        );
        return new Response('User is created or updated', {
          status: 200,
        });
      } catch (error) {
        console.log('Error creating or updating user: ', error);
        return new Response('Error occured', {
          status: 500,
        });
      }
    } else {
      console.error(
        'Error: Invalid data structure for user.created/user.updated'
      );
      return new Response('Error: Invalid data structure', {
        status: 400,
      });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt?.data;

    if (!id) {
      return new Response('Error: User ID is missing', {
        status: 400,
      });
    }

    try {
      await deleteUser(id);
      return new Response('User is deleted', {
        status: 200,
      });
    } catch (error) {
      console.log('Error deleting user: ', error);
      return new Response('Error occured', {
        status: 500,
      });
    }
  }

  return new Response('Webhook received but no action taken', { status: 200 });
}
