import {
  RekognitionClient,
  SearchFacesByImageCommand,
  IndexFacesCommand,
  CreateCollectionCommand,
  DeleteFacesCommand,
} from "@aws-sdk/client-rekognition";

const client = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const COLLECTION_ID = process.env.AWS_REKOGNITION_COLLECTION!;

export async function ensureCollection() {
  try {
    await client.send(
      new CreateCollectionCommand({ CollectionId: COLLECTION_ID })
    );
  } catch (e: any) {
    if (e.name !== "ResourceAlreadyExistsException") throw e;
  }
}

export async function indexFace(s3Key: string, externalImageId: string) {
  const command = new IndexFacesCommand({
    CollectionId: COLLECTION_ID,
    Image: {
      S3Object: {
        Bucket: process.env.AWS_S3_BUCKET!,
        Name: s3Key,
      },
    },
    ExternalImageId: externalImageId,
    MaxFaces: 5,
    QualityFilter: "AUTO",
  });
  const result = await client.send(command);
  return result.FaceRecords ?? [];
}

/** Collection에서 얼굴 삭제 (사진 삭제 시) */
export async function deleteFaces(faceIds: string[]) {
  const ids = faceIds.filter(Boolean);
  if (ids.length === 0) return;
  await client.send(
    new DeleteFacesCommand({ CollectionId: COLLECTION_ID, FaceIds: ids })
  );
}

export async function searchFacesByImage(imageBytes: Uint8Array) {
  const command = new SearchFacesByImageCommand({
    CollectionId: COLLECTION_ID,
    Image: { Bytes: imageBytes },
    MaxFaces: 100,
    FaceMatchThreshold: 80,
  });
  const result = await client.send(command);
  return result.FaceMatches ?? [];
}
