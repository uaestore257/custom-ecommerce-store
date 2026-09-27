import "server-only";
import { connection } from "next/server";
import { getDb } from "../db";

/**
 * The database client for admin pages. `connection()` makes the page
 * render at request time, so admin pages always show live data and are
 * never prerendered at build time (which would also need a database).
 * Tests call the data-access functions with their own client instead.
 */
export async function adminDb() {
  await connection();
  return getDb();
}
