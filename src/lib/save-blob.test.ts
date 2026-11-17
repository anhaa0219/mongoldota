import { describe, expect, it, vi } from "vitest";
import { saveBlob } from "@/lib/save-blob";

describe("saveBlob", () => {
  it("starts the download and frees the file only later, so Safari and Firefox finish it", () => {
    const scheduled: (() => void)[] = [];
    const saver = {
      createUrl: vi.fn(() => "blob:1"),
      click: vi.fn(),
      revoke: vi.fn(),
      later: (task: () => void) => {
        scheduled.push(task);
      },
    };
    saveBlob(new Blob(["x"]), "setup.zip", saver);
    expect(saver.click).toHaveBeenCalledWith("blob:1", "setup.zip");
    expect(saver.revoke).not.toHaveBeenCalled();
    scheduled.forEach((task) => task());
    expect(saver.revoke).toHaveBeenCalledWith("blob:1");
  });
});
