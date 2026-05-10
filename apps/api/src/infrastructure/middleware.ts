import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

export function setupMiddleware(app: Hono) {
  const allowedOrigins = [
    "http://localhost:3000",
    ...(process.env.WEB_ORIGIN ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ];

  app.use(logger());
  app.use(
    cors({
      origin: allowedOrigins,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: err.message }, err.status);
    }

    if (err instanceof ZodError) {
      return c.json(
        {
          error: "Validation error",
          issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        400
      );
    }

    console.error("Unexpected error:", err);
    return c.json({ error: "Internal server error" }, 500);
  });
}
