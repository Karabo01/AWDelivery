import { mkdir, writeFile } from "fs/promises";
import path from "path";

const POD_ROOT = path.resolve(process.cwd(), "uploads", "pod");

export interface SavedPodFiles {
  photoUrl: string;
  signatureUrl: string;
}

export async function savePodFiles(
  orderId: string,
  photo: { buffer: Buffer; mimetype: string },
  signatureBase64: string,
): Promise<SavedPodFiles> {
  const dir = path.join(POD_ROOT, orderId);
  await mkdir(dir, { recursive: true });

  const photoExt = extensionFor(photo.mimetype);
  const photoPath = path.join(dir, `photo.${photoExt}`);
  await writeFile(photoPath, photo.buffer);

  const signatureBuffer = decodeSignature(signatureBase64);
  const signaturePath = path.join(dir, "signature.png");
  await writeFile(signaturePath, signatureBuffer);

  return {
    photoUrl: `/api/uploads/pod/${orderId}/photo.${photoExt}`,
    signatureUrl: `/api/uploads/pod/${orderId}/signature.png`,
  };
}

function extensionFor(mimetype: string): string {
  switch (mimetype) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/jpeg":
    case "image/jpg":
    default:
      return "jpg";
  }
}

function decodeSignature(input: string): Buffer {
  const stripped = input.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(stripped, "base64");
}

export const POD_UPLOAD_ROOT = POD_ROOT;
