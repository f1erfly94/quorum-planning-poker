/**
 * The wire protocol, shared by the browser and the Durable Object.
 *
 * Both sides import these types from the same file, so a message the server can
 * send is a message the client is forced to handle.
 */

/** Cards a room can be estimated with. */
export const decks = {
    fibonacci: ["1", "2", "3", "5", "8", "13", "21", "?", "☕"],
    tshirt: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
    linear: ["1", "2", "3", "4", "5", "6", "7", "8", "?", "☕"],
} as const;

export type DeckName = keyof typeof decks;

/** Values that are a deliberate non-answer rather than a number. */
export const nonNumeric = ["?", "☕"];

export interface Participant {
    id: string;
    name: string;
    /** Watching the round without voting — a facilitator, usually. */
    spectating: boolean;
    /** True once this person has picked a card, whatever the card is. */
    hasVoted: boolean;
    /**
     * The card itself — `null` until the round is revealed.
     *
     * The server strips it, rather than the interface hiding it: a round where
     * every vote is already in the browser is not a hidden round, it is a hidden
     * div.
     */
    vote: string | null;
}

export interface RoundSummary {
    /** Mean of the numeric votes, or null when nobody voted a number. */
    average: number | null;
    /** True when every numeric vote is identical. */
    consensus: boolean;
    /** How many people played each card, highest first. */
    distribution: Array<{value: string; count: number}>;
}

export interface RoomState {
    id: string;
    deck: DeckName;
    cards: string[];
    revealed: boolean;
    /** Increments on every reset, so clients can tell rounds apart. */
    round: number;
    participants: Participant[];
    /** The person who may reveal and reset; passes on when they leave. */
    hostId: string | null;
    summary: RoundSummary | null;
}

export type ClientMessage =
    | {type: "join"; name: string; spectating?: boolean}
    | {type: "vote"; value: string | null}
    | {type: "reveal"}
    | {type: "reset"}
    | {type: "rename"; name: string}
    | {type: "spectate"; spectating: boolean}
    | {type: "deck"; deck: DeckName};

export type ServerMessage =
    | {type: "state"; you: string; state: RoomState}
    | {type: "error"; message: string};

/** Numbers only: "?" and "☕" are opinions about the question, not estimates. */
export const numericVotes = (votes: string[]) =>
    votes.filter((vote) => !nonNumeric.includes(vote)).map(Number).filter((value) => !Number.isNaN(value));

/**
 * Summarises a revealed round.
 *
 * Pure on purpose: it runs on the server, and the tests run it without a socket,
 * a room or a browser anywhere in sight.
 */
export const summarise = (votes: string[]): RoundSummary => {
    const counts = new Map<string, number>();
    for (const vote of votes) counts.set(vote, (counts.get(vote) ?? 0) + 1);

    const numbers = numericVotes(votes);
    const average = numbers.length ? numbers.reduce((total, value) => total + value, 0) / numbers.length : null;

    return {
        average: average === null ? null : Math.round(average * 10) / 10,
        consensus: numbers.length > 1 && new Set(numbers).size === 1,
        distribution: [...counts.entries()]
            .map(([value, count]) => ({value, count}))
            .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
    };
};

/** Room ids in URLs: short, unambiguous, no vowels to accidentally spell things. */
export const roomIdAlphabet = "bcdfghjkmnpqrstvwxz23456789";

export const isValidRoomId = (value: string) =>
    value.length >= 4 && value.length <= 12 && [...value].every((char) => roomIdAlphabet.includes(char));

export const MAX_NAME_LENGTH = 24;

export const cleanName = (value: string) => value.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
