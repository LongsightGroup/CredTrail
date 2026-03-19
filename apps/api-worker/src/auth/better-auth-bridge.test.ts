import { describe, expect, it } from "vitest";

import { buildBetterAuthRouteResponse } from "./better-auth-bridge";

describe("better auth bridge", () => {
  it("preserves Better Auth cookies and headers when wrapper routes shape their own response", async () => {
    const betterAuthHeaders = new Headers();
    betterAuthHeaders.append(
      "set-cookie",
      "better-auth.session_token=session-123; HttpOnly; Path=/; SameSite=Lax",
    );
    betterAuthHeaders.set("cache-control", "no-store");
    betterAuthHeaders.set("x-better-auth-flow", "magic-link");

    const betterAuthResponse = new Response(null, {
      status: 204,
      headers: betterAuthHeaders,
    });

    const response = buildBetterAuthRouteResponse(betterAuthResponse, {
      status: 202,
      json: {
        status: "sent",
        tenantId: "tenant_123",
      },
    });

    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toContain("better-auth.session_token=session-123");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-better-auth-flow")).toBe("magic-link");
    await expect(response.json()).resolves.toEqual({
      status: "sent",
      tenantId: "tenant_123",
    });
  });
});
