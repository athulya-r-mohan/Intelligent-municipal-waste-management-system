import { BASE_URL } from "../api/api";

const BACKEND_BASE = BASE_URL;

/**
 * Returns a fully-qualified URL for any image path or URL returned from the backend.
 * Handles:
 * - Full URLs: https://... or http://... or data:...
 * - Paths starting with /media/...
 * - Raw database paths: waste_pickups/xyz.png, complaint_images/abc.jpg, etc.
 */
export function getFullImageUrl(imgPath) {
  if (!imgPath) return "";
  if (typeof imgPath !== "string") return "";

  const trimmed = imgPath.trim();
  if (!trimmed) return "";

  // Already an absolute URL or data URI
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Normalize path with leading slash
  let path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  // If path doesn't start with /media/, prepend /media
  if (!path.startsWith("/media/")) {
    path = `/media${path}`;
  }

  return `${BACKEND_BASE}${path}`;
}

export default getFullImageUrl;
