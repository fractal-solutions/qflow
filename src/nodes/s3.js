
import { AsyncNode } from '../qflow.js';
import { S3Client } from 'bun';

export class S3CloudStorageNode extends AsyncNode {
  static getToolDefinition() {
    return {
      name: "s3",
      description: "Interacts with an S3-compatible object storage service.",
      parameters: {
        type: "object",
        properties: {
          accessKeyId: {
            type: "string",
            description: "Your S3 access key ID."
          },
          secretAccessKey: {
            type: "string",
            description: "Your S3 secret access key."
          },
          bucket: {
            type: "string",
            description: "The name of your S3 bucket."
          },
          endpoint: {
            type: "string",
            description: "The S3 endpoint URL."
          },
          region: {
            type: "string",
            description: "The S3 region."
          },
          action: {
            type: "string",
            enum: ["upload", "download", "delete", "presign", "list"],
            description: "The action to perform."
          },
          key: {
            type: "string",
            description: "The key of the object to operate on."
          },
          content: {
            type: "string",
            description: "The content to upload."
          },
          acl: {
            type: "string",
            description: "The access control list for presigned URLs."
          },
          expiresIn: {
            type: "number",
            description: "The expiration time for presigned URLs."
          },
          method: {
            type: "string",
            description: "The HTTP method for presigned URLs."
          },
          prefix: {
            type: "string",
            description: "The prefix for listing files."
          },
          maxKeys: {
            type: "number",
            description: "The maximum number of keys to return when listing files."
          },
          startAfter: {
            type: "string",
            description: "The key to start after when listing files."
          }
        },
        required: ["accessKeyId", "secretAccessKey", "bucket", "endpoint", "action", "key"]
      }
    };
  }

  #s3 = null;

  async prepAsync(shared) {
    const { accessKeyId, secretAccessKey, bucket, endpoint, region } = this.params;

    if (!this.#s3) {
        this.#s3 = new S3Client({
            accessKeyId,
            secretAccessKey,
            bucket,
            endpoint,
            region,
        });
    }
  }

  async execAsync(prepRes, shared) {
    const { action, key, content, acl, expiresIn, method, prefix, maxKeys, startAfter } = this.params;

    switch (action) {
      case 'upload':
        return this.#s3.file(key).write(content);
      case 'download':
        return this.#s3.file(key).json();
      case 'delete':
        return this.#s3.file(key).delete();
      case 'presign':
        return this.#s3.file(key).presign({ acl, expiresIn, method });
      case 'list':
        return this.#s3.list({ prefix, maxKeys, startAfter });
      default:
        throw new Error(`Unsupported S3 action: ${action}`);
    }
  }

  async postAsync(shared, prepRes, execRes) {
    shared.s3_result = execRes;
    return 'default';
  }
}
