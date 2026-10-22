import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const S3_BUCKET = process.env.S3_BUCKET || 'gongafit-uploads';
const LOCAL_STORAGE_DIR = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), 'uploads');

export const isStorageConfigured = Boolean(
  process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY
);

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Ensure the local uploads directory exists.
 */
function ensureLocalDir(): void {
  if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
    fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
  }
}

// Memoized so bucket existence is checked/created once per process, not once per request.
let bucketReadyPromise: Promise<void> | null = null;

async function ensureBucketExists(): Promise<void> {
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
      } catch (error: any) {
        const statusCode = error?.$metadata?.httpStatusCode;
        const errorName = error?.name;
        const notFound =
          statusCode === 404 ||
          errorName === 'NoSuchBucket' ||
          errorName === 'NotFound';

        if (!notFound) {
          console.error('Failed to check storage bucket:', error);
          throw error;
        }

        try {
          await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
        } catch (createError) {
          console.error('Failed to create storage bucket:', createError);
          throw createError;
        }
      }
    })().catch((error) => {
      bucketReadyPromise = null;
      throw error;
    });
  }

  return bucketReadyPromise;
}

export interface GetObjectStreamResult {
  stream: NodeJS.ReadableStream;
  contentType?: string;
  contentLength?: number;
}

export const storageService = {
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string | void> {
    // Fall back to local disk when S3 credentials aren't configured
    if (!isStorageConfigured) {
      ensureLocalDir();
      const filePath = path.join(LOCAL_STORAGE_DIR, key);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, body);
      console.log(`[storage] Saved locally: ${filePath}`);
      return;
    }

    await ensureBucketExists();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  },

  async deleteFile(key: string): Promise<void> {
    await ensureBucketExists();
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );
  },

  async getObjectStream(key: string): Promise<GetObjectStreamResult> {
    await ensureBucketExists();
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error(`Object not found: ${key}`);
    }

    return {
      stream: response.Body as unknown as Readable,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  },

  generateAvatarKey(userId: string, filename: string): string {
    const ext = filename.split('.').pop() || 'jpg';
    return `avatars/${userId}.${ext}`;
  },
};
