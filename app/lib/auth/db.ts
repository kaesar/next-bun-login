import db from "@/lib/db";

export async function getUserByEmail(email: string) {
  try {
    const row = db.query(
      "SELECT id, name, email, COALESCE(password, '') as password FROM users WHERE email = ? LIMIT 1"
    ).get(String(email)) as Record<string, any> | undefined;
    if (!row || !row.email) return null;
    return row;
  } catch (e: any) {
    console.error("[auth/db.ts]", e.message);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return Bun.password.verify(password, hashedPassword);
}

export default getUserByEmail;
