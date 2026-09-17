/**
 * One Durable Object per room.
 *
 * Presence is not a list we maintain — it is derived from the sockets the
 * runtime is holding, so a dropped connection cannot leave a ghost behind.
 * Everything else about the round lives in storage, which survives hibernation.
 */
import {
    cleanName,
    decks,
    summarise,
    type ClientMessage,
    type DeckName,
    type Participant,
    type RoomState,
    type ServerMessage,
} from "../../protocol";

/** What we keep on each socket; it comes back after hibernation. */
interface Attachment {
    id: string;
    name: string;
    spectating: boolean;
    vote: string | null;
}

interface RoundState {
    deck: DeckName;
    revealed: boolean;
    round: number;
    hostId: string | null;
}

const defaultRound: RoundState = {deck: "fibonacci", revealed: false, round: 1, hostId: null};

export class Room implements DurableObject {
    private readonly ctx: DurableObjectState;

    constructor(ctx: DurableObjectState) {
        this.ctx = ctx;
    }

    async fetch(request: Request): Promise<Response> {
        if (request.headers.get("Upgrade") !== "websocket") {
            return new Response("Expected a WebSocket upgrade", {status: 426});
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        // Hibernation: the runtime may evict this object between messages and
        // bring it back on the next one without dropping the sockets.
        this.ctx.acceptWebSocket(server);
        this.attach(server, {id: crypto.randomUUID(), name: "", spectating: false, vote: null});

        return new Response(null, {status: 101, webSocket: client});
    }

    async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
        let message: ClientMessage;
        try {
            message = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
        } catch {
            return this.send(ws, {type: "error", message: "Malformed message"});
        }

        const round = await this.round();
        const me = this.read(ws);
        if (!me) return;

        switch (message.type) {
            case "join":
            case "rename": {
                const name = cleanName(message.name);
                if (!name) return this.send(ws, {type: "error", message: "A name is required"});
                this.attach(ws, {
                    ...me,
                    name,
                    spectating: message.type === "join" ? Boolean(message.spectating) : me.spectating,
                });
                // The first person in an empty room runs it.
                if (!round.hostId) await this.setRound({...round, hostId: me.id});
                break;
            }

            case "vote": {
                if (round.revealed || me.spectating) return;
                const value = message.value;
                if (value !== null && !decks[round.deck].includes(value as never)) return;
                this.attach(ws, {...me, vote: value});
                break;
            }

            case "spectate": {
                this.attach(ws, {...me, spectating: message.spectating, vote: null});
                break;
            }

            case "reveal": {
                if (me.id !== round.hostId) return this.send(ws, {type: "error", message: "Only the host can reveal"});
                await this.setRound({...round, revealed: true});
                break;
            }

            case "reset": {
                if (me.id !== round.hostId) return this.send(ws, {type: "error", message: "Only the host can reset"});
                this.clearVotes();
                await this.setRound({...round, revealed: false, round: round.round + 1});
                break;
            }

            case "deck": {
                if (me.id !== round.hostId || !(message.deck in decks)) return;
                this.clearVotes();
                await this.setRound({...round, deck: message.deck, revealed: false, round: round.round + 1});
                break;
            }
        }

        await this.broadcast();
    }

    async webSocketClose(ws: WebSocket) {
        await this.handleDeparture(ws);
    }

    async webSocketError(ws: WebSocket) {
        await this.handleDeparture(ws);
    }

    /** The host leaving hands the room to whoever else is still in it. */
    private async handleDeparture(ws: WebSocket) {
        const leaving = this.read(ws);
        const round = await this.round();

        if (leaving && round.hostId === leaving.id) {
            const next = this.ctx
                .getWebSockets()
                .filter((socket) => socket !== ws)
                .map((socket) => this.read(socket))
                .find((held) => held?.name);
            await this.setRound({...round, hostId: next?.id ?? null});
        }

        await this.broadcast(ws);
    }

    private clearVotes() {
        for (const socket of this.ctx.getWebSockets()) {
            const held = this.read(socket);
            if (held) this.attach(socket, {...held, vote: null});
        }
    }

    private attach(ws: WebSocket, attachment: Attachment) {
        ws.serializeAttachment(attachment);
    }

    private read(ws: WebSocket): Attachment | null {
        return (ws.deserializeAttachment() as Attachment | null) ?? null;
    }

    private async round(): Promise<RoundState> {
        return (await this.ctx.storage.get<RoundState>("round")) ?? defaultRound;
    }

    private async setRound(next: RoundState) {
        await this.ctx.storage.put("round", next);
    }

    private send(ws: WebSocket, message: ServerMessage) {
        ws.send(JSON.stringify(message));
    }

    /** Sends everyone the room as they are allowed to see it. */
    private async broadcast(excluding?: WebSocket) {
        const round = await this.round();
        const sockets = this.ctx.getWebSockets().filter((socket) => socket !== excluding);

        const people = sockets
            .map((socket) => this.read(socket))
            .filter((held): held is Attachment => Boolean(held?.name));

        const voted = people.filter((person) => !person.spectating && person.vote !== null);

        for (const socket of sockets) {
            const viewer = this.read(socket);
            if (!viewer) continue;

            const participants: Participant[] = people.map((person) => ({
                id: person.id,
                name: person.name,
                spectating: person.spectating,
                hasVoted: person.vote !== null,
                // Your own card is yours to see; everyone else's waits for the reveal.
                vote: round.revealed || person.id === viewer.id ? person.vote : null,
            }));

            const state: RoomState = {
                id: this.ctx.id.toString(),
                deck: round.deck,
                cards: [...decks[round.deck]],
                revealed: round.revealed,
                round: round.round,
                participants,
                hostId: round.hostId,
                summary: round.revealed ? summarise(voted.map((person) => person.vote as string)) : null,
            };

            this.send(socket, {type: "state", you: viewer.id, state});
        }
    }
}
