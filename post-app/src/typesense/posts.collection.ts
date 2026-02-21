import { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections.js';
import { typesenseClient } from './client.js';

const POSTS_COLLECTION = 'posts';

const postsSchema: CollectionCreateSchema = {
  name: POSTS_COLLECTION,
  fields: [
    { name: 'title', type: 'string' },
    { name: 'content', type: 'string' },
    { name: 'published', type: 'bool' },
    { name: 'authorId', type: 'string', index: false },
    { name: 'authorName', type: 'string', optional: true },
    { name: 'createdAt', type: 'int64' },
    { name: 'updatedAt', type: 'int64' },
  ],
};

export async function initPostsCollection() {
  try {
    await typesenseClient.collections(POSTS_COLLECTION).retrieve();
    console.log(`Typesense collection "${POSTS_COLLECTION}" already exists.`);
  } catch (error: unknown) {
    const statusCode = (error as { httpStatus?: number }).httpStatus;

    if (statusCode === 404) {
      await typesenseClient.collections().create(postsSchema);
      console.log(`Typesense collection "${POSTS_COLLECTION}" created.`);
    } else {
      throw error;
    }
  }
}

export { POSTS_COLLECTION };
