import { z } from 'zod';
import { PHONE_REGEX, UUID_REGEX } from './zod-validator';

// ---------------------------------------------------------
// Authentication Schemas
// ---------------------------------------------------------

export const pinLoginSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, 'Invalid Indian phone number format (+91XXXXXXXXXX)'),
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must be numeric'),
  recaptchaToken: z.string().optional().nullable()
});

export const preCheckSchema = z.object({
  phone: z.string().regex(PHONE_REGEX, 'Invalid Indian phone number format (+91XXXXXXXXXX)'),
  deviceToken: z.string().optional().nullable(),
  recaptchaToken: z.string().optional().nullable()
});

export const setPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits').regex(/^\d+$/, 'PIN must be numeric')
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

// ---------------------------------------------------------
// Customer Schemas
// ---------------------------------------------------------

export const customerProfileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  address: z.string().max(255).optional(),
  avatar_url: z.string().url().or(z.string().length(0)).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional()
}).strict();

export const customerAddressSchema = z.object({
  label: z.string().min(1).max(50).optional(),
  address: z.string().min(5).max(255),
  city: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: z.string().min(4).max(20),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  is_default: z.boolean().optional(),
  place_id: z.string().optional(),
  formatted_address: z.string().optional()
}).strict();

// ---------------------------------------------------------
// Worker Schemas
// ---------------------------------------------------------

export const workerProfileUpdateSchema = z.object({
  full_name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().or(z.string().length(0)).optional(),
  dob: z.string().optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  skills: z.array(z.string()).optional(),
  experience: z.number().min(0).max(50).optional(),
  languages: z.array(z.string()).optional(),
  bio: z.string().max(1000).optional()
}).strict();

export const workerLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).optional(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  deviceType: z.string().optional()
}).strict();

// ---------------------------------------------------------
// Booking Schemas
// ---------------------------------------------------------

export const bookingCreateSchema = z.object({
  service_item_id: z.string().min(1, 'service_item_id is required'),
  address_id: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  latitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  longitude: z.number().or(z.string().transform(Number)).optional().nullable(),
  images: z.array(z.string()).optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  promo_code: z.string().max(50).optional().nullable(),
  payment_mode: z.string().optional().default('COD')
});

export const bookingStatusUpdateSchema = z.object({
  status: z.string().min(1, 'status is required'),
  reason: z.string().max(500).optional().nullable(),
  otp: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable()
});

// ---------------------------------------------------------
// SOS Schemas
// ---------------------------------------------------------

export const sosTriggerSchema = z.object({
  booking_id: z.string().regex(UUID_REGEX).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional()
}).strict();
