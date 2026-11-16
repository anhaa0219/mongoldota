import { describe, expect, it } from "vitest";
import { buildDraftPrompt, parseDraftReply } from "@/lib/draft-recognition";

const heroes = [
  { id: 47, name: "Viper", slug: "viper" },
  { id: 106, name: "Ember Spirit", slug: "ember_spirit" },
  { id: 11, name: "Shadow Fiend", slug: "nevermore" },
  { id: 2, name: "Axe", slug: "axe" },
];

describe("parseDraftReply", () => {
  it("reads JSON wrapped in prose or a code fence and pads teams to 5", () => {
    const reply = 'Here you go:\n```json\n{"radiant": ["Viper", "shadow fiend"], "dire": ["Ember Spirit", null, "Axe"]}\n```';
    expect(parseDraftReply(reply, heroes)).toEqual({
      radiant: [47, 11, null, null, null],
      dire: [106, null, 2, null, null],
    });
  });

  it("matches slugs, drops unknown and repeated heroes", () => {
    const draft = parseDraftReply('{"radiant": ["nevermore", "Zeus", "Viper"], "dire": ["Viper"]}', heroes);
    expect(draft?.radiant).toEqual([11, null, 47, null, null]);
    expect(draft?.dire[0]).toBeNull();
  });

  it("returns null when the reply has no usable JSON", () => {
    expect(parseDraftReply("I can't see any heroes.", heroes)).toBeNull();
    expect(parseDraftReply('{"radiant": "Viper"}', heroes)).toBeNull();
  });
});

describe("buildDraftPrompt", () => {
  it("lists the allowed hero names", () => {
    expect(buildDraftPrompt(["Viper", "Axe"])).toContain("Viper, Axe");
  });
});
