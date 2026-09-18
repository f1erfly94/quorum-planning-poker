"use client";

import {useCallback, useMemo, useState} from "react";
import {useSocketRoom} from "use-socket-room";
import type {ClientMessage, DeckName, RoomState, ServerMessage} from "@protocol";

export type Connection = "connecting" | "open" | "reconnecting" | "offline";

/**
 * Where the rooms live.
 *
 * Trimmed and checked rather than taken on trust: a platform that stores a
 * declared-but-empty variable as "" would otherwise leave this an empty string,
 * and `"" + "/room/x"` is a relative URL — the browser would happily open a
 * socket back to the page itself and retry forever.
 */
const configured = (process.env.NEXT_PUBLIC_WORKER_URL ?? "").trim();
// Falling back to localhost is a convenience for development. In a production
// build it would point every visitor at their own machine, so there is no
// fallback there — the room says what is missing instead.
const workerUrl =
    configured || (process.env.NODE_ENV === "production" ? "" : "ws://127.0.0.1:8787");
const misconfigured = !workerUrl.startsWith("ws://") && !workerUrl.startsWith("wss://");
const misconfiguredMessage = "The room server is not configured: NEXT_PUBLIC_WORKER_URL must be a ws:// or wss:// URL.";

/**
 * Holds the room state on top of `use-socket-room`'s transport.
 *
 * The room is whatever the server last said it is: every change comes back as
 * a full snapshot, so the client never has to reconcile a local guess with the
 * truth. `use-socket-room` re-sends the join on every reconnect, which is why
 * a dropped laptop lid puts you back in the same seat instead of leaving a
 * ghost behind — that behaviour now lives in the published package, not here.
 */
export const useRoom = (roomId: string, name: string | null) => {
    const [state, setState] = useState<RoomState | null>(null);
    const [you, setYou] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);

    const url = useMemo(
        () => (misconfigured || !roomId || !name ? null : `${workerUrl}/room/${roomId}`),
        [roomId, name],
    );

    const room = useSocketRoom<ServerMessage, ClientMessage>({
        url,
        onOpen: (send) => send({type: "join", name: name ?? ""}),
        onMessage: (message) => {
            if (message.type === "state") {
                setYou(message.you);
                setState(message.state);
            } else {
                setServerError(message.message);
            }
        },
    });

    const send = room.send;

    return {
        state,
        you,
        connection: room.connection as Connection,
        error: misconfigured ? misconfiguredMessage : (serverError ?? room.error?.message ?? null),
        vote: useCallback((value: string | null) => send({type: "vote", value}), [send]),
        reveal: useCallback(() => send({type: "reveal"}), [send]),
        reset: useCallback(() => send({type: "reset"}), [send]),
        rename: useCallback((next: string) => send({type: "rename", name: next}), [send]),
        spectate: useCallback((spectating: boolean) => send({type: "spectate", spectating}), [send]),
        setDeck: useCallback((deck: DeckName) => send({type: "deck", deck}), [send]),
    };
};
