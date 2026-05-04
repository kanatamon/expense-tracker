import type { Context } from "elysia";

export const handleHealthCheck = () => {
  return { status: "ok" };
};
