import { requestMediaUpload } from "./actions";

/** Uploads a file directly to R2 via a presigned URL. Returns the storage key. */
export async function uploadToR2(file: File): Promise<string> {
  const { key, uploadUrl } = await requestMediaUpload(file.name, file.type);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  return key;
}
