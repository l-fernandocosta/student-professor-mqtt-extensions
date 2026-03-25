import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

@Injectable()
export class S3StorageService implements OnModuleInit {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly bucket = process.env.S3_BUCKET ?? "inicie-screenshots";
  private readonly region = process.env.AWS_REGION ?? "us-east-1";
  private readonly endpoint = process.env.S3_ENDPOINT ?? "http://localstack:4566";
  private readonly publicEndpoint = process.env.S3_PUBLIC_ENDPOINT ?? "http://localhost:4566";

  private readonly client = new S3Client({
    region: this.region,
    endpoint: this.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "test",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "test"
    }
  });

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket ready: ${this.bucket}`);
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`S3 bucket created: ${this.bucket}`);
    }
  }

  async uploadBase64Png(base64: string): Promise<string> {
    const key = `screenshots/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.png`;
    const body = Buffer.from(base64, "base64");
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: "image/png"
      })
    );

    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }

  toPublicUrl(storageUrl: string): string {
    const trimmed = storageUrl.trim();
    if (!trimmed) return trimmed;

    // Normalize legacy/incorrect URLs that point to the internal docker hostname.
    const normalized = trimmed.replace(/^http:\/\/localstack:4566\b/, this.publicEndpoint);
    return normalized;
  }
}
