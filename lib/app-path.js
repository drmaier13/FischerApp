const APP_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function appPath(path) {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("tel:")) return path;
  return `${APP_BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
