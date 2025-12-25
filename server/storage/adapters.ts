import { Response } from "express";
import { randomUUID } from "crypto";
import { getConfig, type AppConfig, type StorageProvider } from "@shared/config";

export interface StorageFile {
  name: string;
  path: string;
  size?: number;
  contentType?: string;
}

export interface StorageAdapter {
  getUploadUrl(fileName: string, contentType?: string): Promise<{ uploadUrl: string; objectPath: string }>;
  getDownloadUrl(objectPath: string): Promise<string>;
  downloadToResponse(objectPath: string, res: Response): Promise<void>;
  deleteObject(objectPath: string): Promise<void>;
  exists(objectPath: string): Promise<boolean>;
  listObjects(prefix: string): Promise<StorageFile[]>;
}

export class GCSReplitAdapter implements StorageAdapter {
  private client: any;
  private publicPaths: string[];
  private privateDir: string;

  constructor(config: AppConfig) {
    this.publicPaths = (config.storage.publicPaths || "").split(",").filter(p => p.trim());
    this.privateDir = config.storage.privateDir || "";
    
    if (!this.privateDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR must be set for GCS storage. " +
        "Create a bucket in 'Object Storage' tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
  }

  private async getClient() {
    if (!this.client) {
      const { Storage } = await import("@google-cloud/storage");
      const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
      this.client = new Storage({
        credentials: {
          audience: "replit",
          subject_token_type: "access_token",
          token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
          type: "external_account",
          credential_source: {
            url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
            format: {
              type: "json",
              subject_token_field_name: "access_token",
            },
          },
          universe_domain: "googleapis.com",
        },
        projectId: "",
      });
    }
    return this.client;
  }

  private parseObjectPath(path: string): { bucketName: string; objectName: string } {
    const parts = path.split("/");
    return {
      bucketName: parts[0],
      objectName: parts.slice(1).join("/"),
    };
  }

  async getUploadUrl(fileName: string, contentType?: string): Promise<{ uploadUrl: string; objectPath: string }> {
    const objectId = randomUUID();
    const fullPath = `${this.privateDir}/uploads/${objectId}`;
    const { bucketName, objectName } = this.parseObjectPath(fullPath);
    
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000,
      contentType: contentType || "application/octet-stream",
    });
    
    return {
      uploadUrl: url,
      objectPath: `/objects/uploads/${objectId}`,
    };
  }

  async getDownloadUrl(objectPath: string): Promise<string> {
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", `${this.privateDir}/`)
      : objectPath;
    
    const { bucketName, objectName } = this.parseObjectPath(normalizedPath);
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    
    return url;
  }

  async downloadToResponse(objectPath: string, res: Response): Promise<void> {
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", `${this.privateDir}/`)
      : objectPath;
    
    const { bucketName, objectName } = this.parseObjectPath(normalizedPath);
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [metadata] = await file.getMetadata();
    res.set({
      "Content-Type": metadata.contentType || "application/octet-stream",
      "Content-Length": metadata.size,
      "Cache-Control": "private, max-age=3600",
    });
    
    const stream = file.createReadStream();
    stream.pipe(res);
  }

  async deleteObject(objectPath: string): Promise<void> {
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", `${this.privateDir}/`)
      : objectPath;
    
    const { bucketName, objectName } = this.parseObjectPath(normalizedPath);
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.delete({ ignoreNotFound: true });
  }

  async exists(objectPath: string): Promise<boolean> {
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", `${this.privateDir}/`)
      : objectPath;
    
    const { bucketName, objectName } = this.parseObjectPath(normalizedPath);
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [exists] = await file.exists();
    return exists;
  }

  async listObjects(prefix: string): Promise<StorageFile[]> {
    const { bucketName, objectName } = this.parseObjectPath(`${this.privateDir}/${prefix}`);
    const client = await this.getClient();
    const bucket = client.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    return files.map((file: any) => ({
      name: file.name.split("/").pop() || file.name,
      path: file.name,
      size: parseInt(file.metadata.size || "0", 10),
      contentType: file.metadata.contentType,
    }));
  }
}

export class LocalStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(config: AppConfig) {
    this.basePath = config.storage.localPath || "./uploads";
  }

  async getUploadUrl(fileName: string, contentType?: string): Promise<{ uploadUrl: string; objectPath: string }> {
    const objectId = randomUUID();
    const objectPath = `/objects/uploads/${objectId}`;
    return {
      uploadUrl: `/api/upload-local?path=${encodeURIComponent(objectPath)}`,
      objectPath,
    };
  }

  async getDownloadUrl(objectPath: string): Promise<string> {
    return objectPath;
  }

  async downloadToResponse(objectPath: string, res: Response): Promise<void> {
    const fs = await import("fs");
    const path = await import("path");
    
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", "")
      : objectPath;
    
    const filePath = path.join(this.basePath, normalizedPath);
    
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  async deleteObject(objectPath: string): Promise<void> {
    const fs = await import("fs");
    const path = await import("path");
    
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", "")
      : objectPath;
    
    const filePath = path.join(this.basePath, normalizedPath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(objectPath: string): Promise<boolean> {
    const fs = await import("fs");
    const path = await import("path");
    
    const normalizedPath = objectPath.startsWith("/objects/") 
      ? objectPath.replace("/objects/", "")
      : objectPath;
    
    const filePath = path.join(this.basePath, normalizedPath);
    return fs.existsSync(filePath);
  }

  async listObjects(prefix: string): Promise<StorageFile[]> {
    const fs = await import("fs");
    const path = await import("path");
    
    const dirPath = path.join(this.basePath, prefix);
    
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    
    const files = fs.readdirSync(dirPath);
    return files.map(name => {
      const filePath = path.join(dirPath, name);
      const stats = fs.statSync(filePath);
      return {
        name,
        path: path.join(prefix, name),
        size: stats.size,
      };
    });
  }
}

let currentAdapter: StorageAdapter | null = null;

export function createStorageAdapter(config: AppConfig): StorageAdapter {
  switch (config.storage.provider) {
    case "gcs-replit":
      return new GCSReplitAdapter(config);
    case "local":
      return new LocalStorageAdapter(config);
    case "s3":
      console.warn("S3 adapter not yet implemented, falling back to local");
      return new LocalStorageAdapter(config);
    default:
      return new GCSReplitAdapter(config);
  }
}

export function getStorageAdapter(): StorageAdapter {
  if (!currentAdapter) {
    const config = getConfig();
    currentAdapter = createStorageAdapter(config);
  }
  return currentAdapter;
}

export function resetStorageAdapter(): void {
  currentAdapter = null;
}
