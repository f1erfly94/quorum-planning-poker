"use client";

import {useState} from "react";
import {MAX_NAME_LENGTH, cleanName} from "@protocol";

/** Asked once; the answer is remembered for the next room. */
export const NameGate = ({roomId, onSubmit}: {roomId: string; onSubmit: (name: string) => void}) => {
    const [value, setValue] = useState("");
    const name = cleanName(value);

    return (
        <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6">
            <p className="label">Room {roomId}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Who is joining?</h1>
            <p className="mt-3 text-muted">
                Your name is only shown to the people in this room.
            </p>

            <form
                className="mt-8 flex flex-col gap-3"
                onSubmit={(event) => {
                    event.preventDefault();
                    if (name) onSubmit(name);
                }}
            >
                <label htmlFor="name" className="sr-only">
                    Your name
                </label>
                <input
                    id="name"
                    autoFocus
                    value={value}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Ada"
                    className="rounded-xl border border-line bg-surface px-5 py-3.5 outline-none placeholder:text-muted focus:border-brand"
                />
                <button
                    type="submit"
                    disabled={!name}
                    className="rounded-xl bg-brand px-5 py-3.5 font-medium text-white transition-opacity disabled:opacity-40"
                >
                    Join the room
                </button>
            </form>
        </main>
    );
};
