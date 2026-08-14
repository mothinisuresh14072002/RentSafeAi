import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor() {
    // In a real app, these would come from ConfigService
    this.s3Client = new S3Client({
      region: process.env.MINIO_REGION || 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'admin',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'password123',
      },
      forcePathStyle: true,
    });
    this.bucketName = process.env.MINIO_BUCKET || 'rentsafe-private';
  }

  async generatePresignedUploadUrl(objectKey: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: mimeType,
    });
    // 15 minutes expiration
    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }

  async generatePresignedDownloadUrl(objectKey: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
    });
    // 15 minutes expiration
    return getSignedUrl(this.s3Client, command, { expiresIn: 900 });
  }
}
