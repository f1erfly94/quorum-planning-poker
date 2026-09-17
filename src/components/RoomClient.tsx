"use client";

import Link from "next/link";
import {useState, useSyncExternalStore} from "react";
import {decks, type DeckName} from "@protocol";
import {readName, readServerName, subscribeName, writeName} from "@/lib/stored-name";
import {useRoom} from "@/lib/use-room";
import {DeckHand} from "@/components/DeckHand";
import {NameGate} from "@/components/NameGate";
import {RoundSummary} from "@/components/RoundSummary";
import {Seats} from "@/components/Seats";

const connectionLabel: Record<string, string> = {
    connecting: "Connecting…",
    open: "Live",
    reconnecting: "Reconnecting…",
    offline: "Offline",
};

export const RoomClient = ({roomId}: {roomId: string}) => {
    // Remembered, so the second room of the day skips the question.
    const name = useSyncExternalStore(subscribeName, readName, readServerName);
    const [copied, setCopied] = useState(false);

    const room = useRoom(roomId, name);

    if (!name) {
        return (
            <NameGate roomId={roomId} onSubmit={writeName} />
        );
    }

    const state = room.state;
    const me = state?.participants.find((person) => person.id === room.you) ?? null;
    const isHost = Boolean(state && room.you && state.hostId === room.you);
    const voters = state?.participants.filter((person) => !person.spectating) ?? [];
    const votedCount = voters.filter((person) => person.hasVoted).length;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-8">
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/" className="font-semibold tracking-tight">
                        Quorum
                    </Link>
                    <span className="label">Room</span>
                    <span className="font-mono text-lg tracking-widest">{roomId}</span>
                </div>

                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
                        <span
                            className={`h-2 w-2 rounded-full ${
                                room.connection === "open"
                                    ? "bg-good"
                                    : room.connection === "offline"
                                      ? "bg-red-500"
                                      : "bg-amber-500"
                            }`}
                        />
                        {connectionLabel[room.connection]}
                    </span>

                    <button
                        type="button"
                        onClick={copyLink}
                        className="rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-brand hover:text-brand"
                    >
                        {copied ? "Link copied" : "Copy link"}
                    </button>
                </div>
            </header>

            {room.error && (
                <p role="alert" className="card border-red-500/40 p-4 text-sm text-red-500">
                    {room.error}
                </p>
            )}

            <section className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h1 className="text-xl font-semibold tracking-tight">Round {state?.round ?? 1}</h1>
                    <p className="text-sm text-muted">
                        {state?.revealed ? "Cards are on the table" : `${votedCount} of ${voters.length} ready`}
                    </p>
                </div>

                <Seats
                    participants={state?.participants ?? []}
                    revealed={Boolean(state?.revealed)}
                    hostId={state?.hostId ?? null}
                    you={room.you}
                />
            </section>

            {state?.revealed && state.summary && <RoundSummary summary={state.summary} />}

            <section className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="label">{me?.spectating ? "Watching this round" : "Your card"}</h2>

                    <div className="flex flex-wrap items-center gap-2">
                        {isHost && (
                            <>
                                <label className="sr-only" htmlFor="deck">
                                    Deck
                                </label>
                                <select
                                    id="deck"
                                    value={state?.deck ?? "fibonacci"}
                                    onChange={(event) => room.setDeck(event.target.value as DeckName)}
                                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm"
                                >
                                    {Object.keys(decks).map((deck) => (
                                        <option key={deck} value={deck}>
                                            {deck}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    type="button"
                                    onClick={room.reveal}
                                    disabled={state?.revealed || votedCount === 0}
                                    className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                                >
                                    Reveal
                                </button>
                                <button
                                    type="button"
                                    onClick={room.reset}
                                    className="rounded-full border border-line px-5 py-2 text-sm transition-colors hover:border-brand hover:text-brand"
                                >
                                    New round
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={() => room.spectate(!me?.spectating)}
                            className="rounded-full border border-line px-5 py-2 text-sm transition-colors hover:border-brand hover:text-brand"
                        >
                            {me?.spectating ? "Join the vote" : "Just watch"}
                        </button>
                    </div>
                </div>

                {!me?.spectating && (
                    <DeckHand
                        cards={state?.cards ?? []}
                        mine={me?.vote ?? null}
                        disabled={Boolean(state?.revealed) || room.connection !== "open"}
                        onPick={room.vote}
                    />
                )}

                {!isHost && !state?.revealed && (
                    <p className="text-sm text-muted">The host reveals the cards when everyone is ready.</p>
                )}
            </section>
        </main>
    );
};
