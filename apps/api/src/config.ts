// Every setting the API reads from the environment, checked once at startup.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Add it to apps/api/.env (see .env.example).`);
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  // HS256 is only as strong as its key; a short one can be brute-forced.
  throw new Error("JWT_SECRET must be at least 32 characters. Generate one: bun -e \"console.log(crypto.randomUUID()+crypto.randomUUID())\"");
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: new TextEncoder().encode(jwtSecret),
  tokenTtl: process.env.TOKEN_TTL ?? "2h",
  /** Usernames that get an Admin row (comma-separated). */
  adminUsernames: (process.env.ADMIN_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
