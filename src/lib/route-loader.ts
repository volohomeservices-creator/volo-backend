import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Router } from 'express';
import { adaptRoute } from './express-adapter';

interface RouteEntry {
  filePath: string;
  expressPath: string;
  depth: number;
  isCatchAll: boolean;
  isDynamic: boolean;
}

/**
 * Converts a filesystem directory path inside src/app/api to an Express 5 URL pattern.
 * Examples:
 *   src/app/api/health                     -> /api/health
 *   src/app/api/customer/services/[id]     -> /api/customer/services/:id
 *   src/app/api/admin/[...slug]            -> /api/admin/{*slug}
 */
function toExpressPath(relativePath: string): { expressPath: string; isCatchAll: boolean; isDynamic: boolean } {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  let isCatchAll = false;
  let isDynamic = false;

  const convertedSegments = segments.map((seg) => {
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      isCatchAll = true;
      const paramName = seg.slice(4, -1) || 'slug';
      return `{*${paramName}}`;
    }
    if (seg.startsWith('[') && seg.endsWith(']')) {
      isDynamic = true;
      const paramName = seg.slice(1, -1);
      return `:${paramName}`;
    }
    return seg;
  });

  const expressPath = '/api/' + convertedSegments.join('/');
  return { expressPath, isCatchAll, isDynamic };
}

/**
 * Recursively scans directory to discover all route.ts files.
 */
function discoverRoutes(dir: string, baseDir: string): RouteEntry[] {
  const entries: RouteEntry[] = [];
  if (!fs.existsSync(dir)) return entries;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (item.name === '__tests__' || item.name.startsWith('.')) continue;
      entries.push(...discoverRoutes(fullPath, baseDir));
    } else if (item.isFile() && (item.name === 'route.ts' || item.name === 'route.js')) {
      const relDir = path.relative(baseDir, dir);
      const { expressPath, isCatchAll, isDynamic } = toExpressPath(relDir);
      const depth = expressPath.split('/').filter(Boolean).length;
      entries.push({
        filePath: fullPath,
        expressPath,
        depth,
        isCatchAll,
        isDynamic,
      });
    }
  }

  return entries;
}

/**
 * Sorts route entries so that:
 * 1. Exact static routes match first (e.g. /api/admin/banners)
 * 2. Parameterized routes match next (e.g. /api/admin/banners/:id)
 * 3. Catch-all routes match last (e.g. /api/admin/{*slug})
 */
function sortRoutes(routes: RouteEntry[]): RouteEntry[] {
  return routes.sort((a, b) => {
    // Catch-all routes always go last
    if (a.isCatchAll && !b.isCatchAll) return 1;
    if (!a.isCatchAll && b.isCatchAll) return -1;

    // Static routes before dynamic routes
    if (!a.isDynamic && b.isDynamic) return -1;
    if (a.isDynamic && !b.isDynamic) return 1;

    // Deeper paths before shallower paths
    if (a.depth !== b.depth) {
      return b.depth - a.depth;
    }

    return a.expressPath.localeCompare(b.expressPath);
  });
}

/**
 * Automatically mounts all route.ts files in src/app/api onto an Express router.
 */
export async function loadApiRoutes(apiDir: string): Promise<{ router: Router; count: number }> {
  const router = Router();
  const rawRoutes = discoverRoutes(apiDir, apiDir);
  const sortedRoutes = sortRoutes(rawRoutes);

  let registeredCount = 0;

  for (const route of sortedRoutes) {
    try {
      // On Windows, dynamic ESM import requires a valid file:// URL
      const fileUrl = pathToFileURL(route.filePath).href;
      const routeModule = await import(fileUrl);
      router.all(route.expressPath, adaptRoute(routeModule));
      registeredCount++;
    } catch (err) {
      console.error(`❌ Failed to register route ${route.expressPath} (${route.filePath}):`, err);
    }
  }

  return { router, count: registeredCount };
}
