import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, downloadFile, setAuthToken, setUnauthorizedHandler } from "../api/client";

function mockFetchOnce(response: Partial<Response> & { ok: boolean; status: number }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: "world" }),
    } as unknown as Response);

    const result = await import("../api/client").then((mod) => mod.api.get("/test"));
    expect(result).toEqual({ hello: "world" });
  });

  it("sends the bearer token when set", async () => {
    setAuthToken("token-abc");
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as unknown as Response);

    await import("../api/client").then((mod) => mod.api.get("/test"));
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });

  it("throws ApiError with server detail on failure", async () => {
    mockFetchOnce({
      ok: false,
      status: 409,
      json: () => Promise.resolve({ detail: "A company with this name already exists" }),
    } as unknown as Response);

    const { api } = await import("../api/client");
    await expect(api.get("/companies")).rejects.toMatchObject({
      status: 409,
      message: "A company with this name already exists",
    });
  });

  it("normalizes non-string detail (validation arrays) to a friendly message", async () => {
    mockFetchOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ detail: [{ msg: "Field required" }] }),
    } as unknown as Response);

    const { api } = await import("../api/client");
    await expect(api.post("/leads", {})).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("Field required"),
    });
  });

  it("throws a network ApiError when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { api } = await import("../api/client");
    await expect(api.get("/anything")).rejects.toMatchObject({ status: 0 });
  });

  it("invokes the unauthorized handler on 401 responses", async () => {
    mockFetchOnce({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ detail: "Not authenticated" }),
    } as unknown as Response);

    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    const { api } = await import("../api/client");

    await expect(api.get("/dashboard")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("downloadFile triggers a browser download with auth header", async () => {
    setAuthToken("token-xyz");
    const blob = new Blob(["csv,data"], { type: "text/csv" });
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as unknown as Response);

    // jsdom lacks object URL support.
    const createObjectURL = vi.fn().mockReturnValue("blob:mock");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, configurable: true });

    const clickSpy = vi.fn();
    const createElementSpy = vi.spyOn(document, "createElement").mockReturnValue({
      click: clickSpy,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);

    await downloadFile("/export/leads", "leads.csv");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-xyz");
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    createElementSpy.mockRestore();
  });
});
