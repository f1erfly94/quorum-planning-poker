/**
 * Routes a room id to its Durable Object.
 *
 * The id is derived from the room name, so every browser asking for the same
 * room lands in the same object — that object *is* the room.
 */
import {isValidRoomId} from "../../protocol";
import {Room} from "./room";

export {Room};

interface Env {
    ROOM: DurableObjectNamespace;
    ALLOWED_ORIGINS?: string;
}

const allowList = (env: Env) =>
    (env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);

/**
 * Is this origin allowed to open a room?
 *
 * A request with no Origin header is allowed through: only browsers send one,
 * and a script can leave it out anyway, so rejecting on its absence would block
 * our own test client while stopping nobody. What this does stop is another
 * *site* opening sockets against these rooms from someone else'''s browser.
 */
const originAllowed = (origin: string | null, env: Env) => {
    const allowed = allowList(env);
    if (!allowed.length || !origin) return true;
    return allowed.includes(origin);
};

const corsHeaders = (origin: string | null, env: Env): Record<string, string> => {
    if (!origin || !originAllowed(origin, env)) return {};
    return {"Access-Control-Allow-Origin": origin, Vary: "Origin"};
};

const handler = {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const origin = request.headers.get("Origin");

        if (url.pathname === "/health") {
            return new Response("ok", {headers: corsHeaders(origin, env)});
        }

        const match = url.pathname.match(/^\/room\/([^/]+)$/);
        if (!match) return new Response("Not found", {status: 404});

        const roomId = match[1].toLowerCase();
        if (!isValidRoomId(roomId)) return new Response("Invalid room id", {status: 400});
        if (!originAllowed(origin, env)) return new Response("Origin not allowed", {status: 403});

        // One object per room name, wherever in the world it is first touched.
        const id = env.ROOM.idFromName(roomId);
        return env.ROOM.get(id).fetch(request);
    },
};

export default handler;
