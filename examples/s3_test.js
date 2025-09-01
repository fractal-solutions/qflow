
import { AsyncFlow } from '../src/qflow.js';
import { S3CloudStorageNode } from '../src/nodes/index.js';

(async () => {
  const s3 = new S3CloudStorageNode();
  s3.setParams({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
    action: 'upload',
    key: 'test.txt',
    content: 'Hello, S3!'
  });

  const presign = new S3CloudStorageNode();
  presign.setParams({
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    bucket: process.env.S3_BUCKET,
    endpoint: process.env.S3_ENDPOINT,
    action: 'presign',
    key: 'test.txt',
    expiresIn: 3600,
  });

  presign.postAsync = async (shared, prepRes, execRes) => {
      console.log('--- Presigned URL ---');
      console.log(execRes);
      return 'default';
  };

  const download = new S3CloudStorageNode();
  download.setParams({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      action: 'download',
      key: 'test.txt',
  });

  download.postAsync = async (shared, prepRes, execRes) => {
      console.log('--- Downloaded Content ---');
      console.log(execRes);
      return 'default';
  };

  const list = new S3CloudStorageNode();
  list.setParams({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      action: 'list',
  });

  list.postAsync = async (shared, prepRes, execRes) => {
      console.log('--- File List ---');
      console.log(execRes);
      return 'default';
  };

  const del = new S3CloudStorageNode();
  del.setParams({
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      action: 'delete',
      key: 'test.txt',
  });

  s3.next(presign).next(download).next(list).next(del);

  const flow = new AsyncFlow(s3);
  await flow.runAsync({});
})();
