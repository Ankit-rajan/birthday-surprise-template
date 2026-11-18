import mongoose from 'mongoose';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Validates a route param as a Mongo ObjectId or throws a 404. */
export function objectId(value) {
  if (!mongoose.isValidObjectId(value)) throw new HttpError(404, 'Not found');
  return value;
}

/** 'YYYY-MM-DD' (or empty) -> Date at UTC midnight, or null. */
export function toDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}
