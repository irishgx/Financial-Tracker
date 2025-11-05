import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_KEY,
  region: process.env.S3_REGION || 'us-east-1'
});

const s3 = new AWS.S3({
  endpoint: process.env.S3_ENDPOINT,
  s3ForcePathStyle: true, // Required for MinIO
  signatureVersion: 'v4'
});

export class S3Service {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET || 'financial-statements';
  }

  async initializeBucket() {
    try {
      await s3.headBucket({ Bucket: this.bucketName }).promise();
      console.log(`Bucket ${this.bucketName} already exists`);
    } catch (error: any) {
      if (error.statusCode === 404) {
        await s3.createBucket({ Bucket: this.bucketName }).promise();
        console.log(`Bucket ${this.bucketName} created successfully`);
      } else {
        throw error;
      }
    }
  }

  async generatePresignedUrl(key: string, contentType: string): Promise<string> {
    const params = {
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
      Expires: 3600 // 1 hour
    };

    return s3.getSignedUrlPromise('putObject', params);
  }

  async getObject(key: string): Promise<AWS.S3.GetObjectOutput> {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    return s3.getObject(params).promise();
  }

  async deleteObject(key: string): Promise<void> {
    const params = {
      Bucket: this.bucketName,
      Key: key
    };

    await s3.deleteObject(params).promise();
  }

  generateKey(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop();
    const uuid = uuidv4();
    return `uploads/${userId}/${timestamp}-${uuid}.${extension}`;
  }
}

export const s3Service = new S3Service();
