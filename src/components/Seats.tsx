"use client";

import type {Participant} from "@protocol";

/**
 * One tile per person.
 *
 * Before the reveal a tile can only say whether someone has voted, because
 * that is all the server sent — the card face simply is not in the payload.
 */
export const Seats = ({
    participants,
    revealed,
    hostId,
    you,
}: {
    participants: Participant[];
    revealed: boolean;
    hostId: string | null;
    you: string | null;
}) => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {participants.map((person) => {
            const isYou = person.id === you;
            const waiting = !person.spectating && !person.hasVoted;

            return (
                <li
                    key={person.id}
                    className={`card flex flex-col items-center gap-3 p-4 transition-colors ${
                        person.hasVoted && !revealed ? "border-brand/50" : ""
                    }`}
                >
                    <div
                        className={`flex h-20 w-14 items-center justify-center rounded-lg border text-xl font-semibold transition-all duration-300 ${
                            person.spectating
                                ? "border-dashed border-line text-muted"
                                : revealed || (isYou && person.hasVoted)
                                  ? "border-brand bg-brand-soft text-ink"
                                  : person.hasVoted
                                    ? "border-brand bg-brand text-white"
                                    : "border-line bg-canvas"
                        }`}
                        aria-label={
                            person.spectating
                                ? "Watching"
                                : revealed
                                  ? `Voted ${person.vote ?? "nothing"}`
                                  : person.hasVoted
                                    ? "Has voted"
                                    : "Still thinking"
                        }
                    >
                        {person.spectating
                            ? "👁"
                            : // Your own card comes back from the server, so show it: the round is
                              // hidden from everyone else, not from you.
                              revealed || isYou
                              ? (person.vote ?? (person.hasVoted ? "✓" : ""))
                              : person.hasVoted
                                ? "✓"
                                : ""}
                    </div>

                    <div className="text-center">
                        <p className="max-w-[10rem] truncate text-sm font-medium">
                            {person.name}
                            {isYou && <span className="text-muted"> (you)</span>}
                        </p>
                        <p className="label mt-1">
                            {person.id === hostId ? "Host" : person.spectating ? "Watching" : waiting ? "Thinking" : "Ready"}
                        </p>
                    </div>
                </li>
            );
        })}
    </ul>
);
