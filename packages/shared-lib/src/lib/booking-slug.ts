/**
 * Booking Slug & URL Identifier utilities.
 * 
 * Generates and parses human-friendly booking URL slugs (e.g., 'wiring-6b67f32f')
 * instead of displaying raw 36-character UUIDs in the browser address bar.
 */

export interface BookingSlugInput {
  id: string;
  service_items?: {
    name?: string;
  } | null;
}

export function getBookingSlug(booking: BookingSlugInput | null | undefined): string {
  if (!booking?.id) return '';
  const shortId = booking.id.substring(0, 8).toLowerCase();
  const rawName = booking.service_items?.name;
  if (!rawName) return `booking-${shortId}`;
  
  const serviceSlug = rawName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return `${serviceSlug || 'booking'}-${shortId}`;
}

export interface ParsedBookingIdentifier {
  isUuid: boolean;
  fullUuid?: string;
  shortId?: string;
  isValid: boolean;
}

export function parseBookingIdentifier(identifier: string): ParsedBookingIdentifier {
  if (!identifier || typeof identifier !== 'string') {
    return { isUuid: false, isValid: false };
  }

  const trimmed = identifier.trim().toLowerCase();

  // 1. Check if it's a full standard 36-character UUID
  const fullUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (fullUuidRegex.test(trimmed)) {
    return {
      isUuid: true,
      fullUuid: trimmed,
      shortId: trimmed.substring(0, 8),
      isValid: true
    };
  }

  // 2. Check if it's a slug ending in an 8-character hex ID (e.g. 'wiring-6b67f32f' or 'bk-6b67f32f' or '6b67f32f')
  const slugHexMatch = trimmed.match(/[0-9a-f]{8}$/i);
  if (slugHexMatch) {
    return {
      isUuid: false,
      shortId: slugHexMatch[0].toLowerCase(),
      isValid: true
    };
  }

  return { isUuid: false, isValid: false };
}

/**
 * Returns the min and max UUID boundary range for a short 8-character hex prefix.
 * Enables fast indexed range scanning on Postgres UUID columns without string casting.
 */
export function getUuidRangeForShortId(shortId: string): { minUuid: string; maxUuid: string } {
  const cleanHex = shortId.padEnd(8, '0').substring(0, 8).toLowerCase();
  return {
    minUuid: `${cleanHex}-0000-0000-0000-000000000000`,
    maxUuid: `${cleanHex}-ffff-ffff-ffff-ffffffffffff`
  };
}
