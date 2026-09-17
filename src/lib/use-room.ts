"use client";

import {useCallback, useEffect, useRef, useState} from "react";
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

/** 0.5s, 1s, 2s, 4s, then every 8s — fast enough to feel instant on a blip. */
const backoff = (attempt: number) => Math.min(8000, 500 * 2 ** attempt);

/**
 * Holds the room socket.
 *
 * The room is whatever the server last said it is: every change comes back as a
 * full snapshot, so the client never has to reconcile a local guess with the
 * truth. Reconnecting re-sends the join, which is why a dropped laptop lid puts
 * you back in the same seat instead of leaving a ghost behind.
 */
export const useRoom = (roomId: string, name: string | null) => {
    const [state, setState] = useState<RoomState | null>(null);
    const [you, setYou] = useState<string | null>(null);
    const [connection, setConnection] = useState<Connection>(misconfigured ? "offline" : "connecting");
    const [error, setError] = useState<string | null>(
        misconfigured ? "The room server is not configured: NEXT_PUBLIC_WORKER_URL must be a ws:// or wss:// URL." : null,
    );

    const socketRef = useRef<WebSocket | null>(null);
    const attemptRef = useRef(0);
    const timerRef = useRef<number | null>(null);
    const closedRef = useRef(false);

    const send = useCallback((message: ClientMessage) => {
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
    }, []);

    useEffect(() => {
        if (!roomId || !name || misconfigured) return undefined;

        closedRef.current = false;

        const open = () => {
            const socket = new WebSocket(`${workerUrl}/room/${roomId}`);
            socketRef.current = socket;

            socket.addEventListener("open", () => {
                attemptRef.current = 0;
                setConnection("open");
                setError(null);
                socket.send(JSON.stringify({type: "join", name}));
            });

            socket.addEventListener("message", (event) => {
                const message = JSON.parse(event.data as string) as ServerMessage;
                if (message.type === "state") {
                    setYou(message.you);
                    setState(message.state);
                } else {
                    setError(message.message);
                }
            });

            socket.addEventListener("close", () => {
                if (closedRef.current) return;
                setConnection("reconnecting");
                const delay = backoff(attemptRef.current);
                attemptRef.current += 1;
                if (attemptRef.current > 8) setConnection("offline");
                timerRef.current = window.setTimeout(open, delay);
            });
        };

        open();

        return () => {
            closedRef.current = true;
            if (timerRef.current) window.clearTimeout(timerRef.current);
            socketRef.current?.close();
            socketRef.current = null;
        };
    }, [roomId, name]);

    return {
        state,
        you,
        connection,
        error,
        vote: useCallback((value: string | null) => send({type: "vote", value}), [send]),
        reveal: useCallback(() => send({type: "reveal"}), [send]),
        reset: useCallback(() => send({type: "reset"}), [send]),
        rename: useCallback((next: string) => send({type: "rename", name: next}), [send]),
        spectate: useCallback((spectating: boolean) => send({type: "spectate", spectating}), [send]),
        setDeck: useCallback((deck: DeckName) => send({type: "deck", deck}), [send]),
    };
};
