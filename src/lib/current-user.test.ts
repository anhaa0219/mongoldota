import { describe, expect, it, vi } from "vitest";

const currentUser = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ currentUser: () => currentUser() }));

const { currentUserOrNull } = await import("@/lib/current-user");

// One-time mocks per test (a shared beforeEach(mockReset) made Vitest report the caught rejection).
describe("currentUserOrNull", () => {
  it("returns the signed-in user", async () => {
    currentUser.mockImplementationOnce(async () => ({ id: "user_1" }));
    expect(await currentUserOrNull()).toEqual({ id: "user_1" });
  });

  it("returns null instead of throwing when Clerk's API fails (e.g. 'This operation was aborted')", async () => {
    currentUser.mockImplementationOnce(async () => {
      throw new Error("This operation was aborted");
    });
    expect(await currentUserOrNull()).toBeNull();
  });
});
