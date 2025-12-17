import jwt from "jsonwebtoken";

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string; // UUID
  iat?: number; // Issued at
  exp?: number; // Expiration
}

/**
 * Sign a JWT token for a user
 *
 * @param userId - User UUID
 * @returns Signed JWT token
 * @throws Error if JWT_SECRET is not set
 */
export function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const payload: JWTPayload = {
    userId,
  };

  // Token expires in 7 days
  return jwt.sign(payload, secret, {
    expiresIn: "7d",
  });
}

/**
 * Verify and decode a JWT token
 *
 * @param token - JWT token string
 * @returns Decoded payload with userId
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  try {
    const decoded = jwt.verify(token, secret) as JWTPayload;
    return decoded;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    }
    throw error;
  }
}








