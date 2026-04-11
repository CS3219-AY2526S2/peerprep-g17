/**
 * Fetches a protected image URL (one that requires an Authorization header)
 * and returns a local blob URL that can be used as an <img> src.
 *
 * Remember to call URL.revokeObjectURL() when you're done with the returned URL.
 */
export async function createProtectedImageUrl(
  photoUrl: string,
  token?: string | null,
): Promise<string> {
  const response = await fetch(photoUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!response.ok) {
    throw new Error("Failed to load photo");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
