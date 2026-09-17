import {describe, expect, it} from "vitest";
import {cleanName, decks, isValidRoomId, numericVotes, summarise} from "@protocol";
import {generateRoomId} from "@/lib/room-id";

describe("round summary", () => {
    it("averages the numeric votes", () => {
        expect(summarise(["3", "5", "8"]).average).toBeCloseTo(5.3, 5);
    });

    it("ignores the cards that are not estimates", () => {
        // "?" means "I do not know" and "☕" means "I need a break" — averaging
        // either one into the estimate would be nonsense.
        expect(numericVotes(["5", "?", "☕", "3"])).toEqual([5, 3]);
        expect(summarise(["5", "?", "☕"]).average).toBe(5);
    });

    it("has no average when nobody voted a number", () => {
        expect(summarise(["?", "☕"]).average).toBeNull();
    });

    it("calls consensus only when more than one person agrees", () => {
        expect(summarise(["5", "5", "5"]).consensus).toBe(true);
        expect(summarise(["5"]).consensus).toBe(false);
        expect(summarise(["5", "8"]).consensus).toBe(false);
    });

    it("does not call consensus on two different non-numeric cards", () => {
        expect(summarise(["?", "☕"]).consensus).toBe(false);
    });

    it("orders the distribution by how many people played each card", () => {
        expect(summarise(["5", "8", "5", "3", "5", "8"]).distribution).toEqual([
            {value: "5", count: 3},
            {value: "8", count: 2},
            {value: "3", count: 1},
        ]);
    });

    it("survives an empty round", () => {
        expect(summarise([])).toEqual({average: null, consensus: false, distribution: []});
    });
});

describe("room ids", () => {
    it("accepts what the generator produces", () => {
        for (let attempt = 0; attempt < 200; attempt += 1) {
            expect(isValidRoomId(generateRoomId())).toBe(true);
        }
    });

    it("has no vowels, so an id cannot spell a word", () => {
        const ids = Array.from({length: 200}, () => generateRoomId()).join("");
        expect(ids).not.toMatch(/[aeiou]/);
    });

    it("has none of the characters people confuse when reading aloud", () => {
        expect(Array.from({length: 200}, () => generateRoomId()).join("")).not.toMatch(/[01lio]/);
    });

    it("rejects anything else", () => {
        expect(isValidRoomId("demo42")).toBe(false);
        expect(isValidRoomId("abc")).toBe(false);
        expect(isValidRoomId("")).toBe(false);
        expect(isValidRoomId("kqt394!")).toBe(false);
        expect(isValidRoomId("k".repeat(13))).toBe(false);
    });
});

describe("names", () => {
    it("collapses whitespace and trims", () => {
        expect(cleanName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
    });

    it("cuts names that would break the layout", () => {
        expect(cleanName("x".repeat(80))).toHaveLength(24);
    });
});

describe("decks", () => {
    it("always offers a way out of estimating", () => {
        for (const cards of Object.values(decks)) {
            expect(cards).toContain("?");
            expect(cards).toContain("☕");
        }
    });
});
