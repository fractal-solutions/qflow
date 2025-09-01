
import { AsyncNode } from '../qflow.js';
import { S3Client } from 'bun';

export class S3CloudStorageNode extends AsyncNode {
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
