import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { verifyToken } from "./jwt";
import { db } from "../db";
import { users, User } from "../db/schema";

export async function getUserFromRequest(
  request: NextRequest
): Promise<User | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    return user ?? null;
  } catch {
    return null;
  }
}
