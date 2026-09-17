"use client";

import {useRouter} from "next/navigation";
import {useState} from "react";
import {isValidRoomId} from "@protocol";
import {generateRoomId} from "@/lib/room-id";

/** Create a room, or type the code someone read out to you. */
export const StartRoom = () => {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [error, setError] = useState<string | null>(null);

    const join = (event: React.FormEvent) => {
        event.preventDefault();
        const room = code.trim().toLowerCase();
        if (!isValidRoomId(room)) {
            setError("That does not look like a room code.");
            return;
        }
        router.push(`/r/${room}`);
    };

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <button
                type="button"
                onClick={() => router.push(`/r/${generateRoomId()}`)}
                className="rounded-full bg-brand px-7 py-3.5 font-medium text-white transition-transform duration-200 hover:-translate-y-0.5"
            >
                Start a room
            </button>

            <form onSubmit={join} className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <label htmlFor="room-code" className="sr-only">
                        Room code
                    </label>
                    <input
                        id="room-code"
                        value={code}
                        onChange={(event) => {
                            setCode(event.target.value);
                            setError(null);
                        }}
                        placeholder="Room code"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-40 rounded-full border border-line bg-surface px-5 py-3.5 font-mono text-sm outline-none placeholder:text-muted focus:border-brand"
                    />
                    <button
                        type="submit"
                        className="rounded-full border border-line px-6 py-3.5 font-medium transition-colors hover:border-brand hover:text-brand"
                    >
                        Join
                    </button>
                </div>
                {error && (
                    <p role="alert" className="px-2 text-sm text-red-500">
                        {error}
                    </p>
                )}
            </form>
        </div>
    );
};
