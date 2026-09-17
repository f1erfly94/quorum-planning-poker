import type {Metadata} from "next";
import {StartRoom} from "@/components/StartRoom";

export const metadata: Metadata = {
    title: "Quorum — planning poker",
};

const points = [
    {
        title: "Nobody can peek",
        body: "Cards are withheld by the server until the reveal. Open the network tab during a round and there is nothing to find — a hidden vote that ships to every browser is not hidden.",
    },
    {
        title: "Presence is the connection",
        body: "The list of people in a room is derived from the open sockets, so closing a laptop removes you and reconnecting puts you back in the same seat.",
    },
    {
        title: "One link, no account",
        body: "Rooms are created by visiting them. Nothing to install, nothing to sign up for, nothing to clean up afterwards.",
    },
];

export default function Home() {
    return (
        <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col justify-center gap-16 px-6 py-16">
            <div className="max-w-2xl">
                <p className="label">Planning poker</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
                    Estimate together,
                    <br />
                    <span className="text-brand">reveal at once.</span>
                </h1>
                <p className="mt-6 text-lg text-muted">
                    Everyone picks a card, nobody sees anyone else&apos;s until the host says so. The
                    hiding happens on the server, which is the only place it means anything.
                </p>

                <div className="mt-10">
                    <StartRoom />
                </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-3">
                {points.map((point) => (
                    <li key={point.title} className="card p-6">
                        <h2 className="font-medium">{point.title}</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted">{point.body}</p>
                    </li>
                ))}
            </ul>
        </main>
    );
}
