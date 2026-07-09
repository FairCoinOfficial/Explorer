/**
 * Read a JSON `{ error?: string }` body from a failed Response, falling back to
 * a status-based message. Shared by React Query hooks so error parsing stays
 * consistent across block / address / transaction fetches.
 */
export async function readErrorMessage(
  response: Response,
  fallbackLabel: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) return body.error
  } catch {
    // Fall through to the generic status-based message below.
  }
  return `Failed to load ${fallbackLabel} (${response.status})`
}
