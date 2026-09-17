/**
 * Exercises the room protocol against a running worker with two real sockets.
 *
 * The important assertion is the hidden one: before the reveal, a client must
 * not be able to see anyone else's card — not hidden in the UI, absent from the
 * payload.
 */
const base = process.argv[2] ?? "ws://127.0.0.1:8787";
// Room ids use a vowel-free alphabet, so "demo42" would be rejected by the worker.
const room = "kqt394";
const failures = [];

const check = (label, condition, detail) => {
    if (condition) console.log("  ok  " + label);
    else {
        console.log("FAIL  " + label + (detail ? " — " + JSON.stringify(detail) : ""));
        failures.push(label);
    }
};

const connect = (name) =>
    new Promise((resolve) => {
        const ws = new WebSocket(base + "/room/" + room);
        const client = {ws, name, states: [], id: null};
        ws.addEventListener("message", (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "state") {
                client.id = message.you;
                client.states.push(message.state);
            }
        });
        ws.addEventListener("open", () => resolve(client));
        ws.addEventListener("error", () => {
            console.log("FAIL  socket refused for " + name);
            process.exit(1);
        });
        setTimeout(() => {
            console.log("FAIL  socket never opened for " + name);
            process.exit(1);
        }, 5000);
    });

const send = (client, message) => client.ws.send(JSON.stringify(message));
const latest = (client) => client.states.at(-1);
const settle = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const find = (client, name) => latest(client)?.participants.find((p) => p.name === name);

const ada = await connect("Ada");
const linus = await connect("Linus");

send(ada, {type: "join", name: "Ada"});
send(linus, {type: "join", name: "Linus"});
await settle();

check("both people are in the room", latest(ada)?.participants.length === 2, latest(ada)?.participants);
check("the first to arrive is the host", latest(ada)?.hostId === ada.id);

send(ada, {type: "vote", value: "5"});
send(linus, {type: "vote", value: "8"});
await settle();

check("you can see your own card", find(ada, "Ada")?.vote === "5");
check("you cannot see someone else's card", find(ada, "Linus")?.vote === null, find(ada, "Linus"));
check("but you can see that they voted", find(ada, "Linus")?.hasVoted === true);
check("the round is not revealed yet", latest(ada)?.revealed === false);
check("no summary before the reveal", latest(ada)?.summary === null);

send(linus, {type: "reveal"});
await settle();
check("a guest cannot reveal", latest(ada)?.revealed === false);

send(ada, {type: "reveal"});
await settle();

check("after the reveal everyone sees every card", find(linus, "Ada")?.vote === "5", find(linus, "Ada"));
check("the average is computed on the server", latest(ada)?.summary?.average === 6.5, latest(ada)?.summary);
check("no false consensus", latest(ada)?.summary?.consensus === false);

send(ada, {type: "reset"});
await settle();

check("reset clears the votes", find(ada, "Ada")?.vote === null && find(linus, "Linus")?.vote === null);
check("reset starts the next round", latest(ada)?.round === 2);
check("reset hides the cards again", latest(ada)?.revealed === false);

linus.ws.close();
await settle(400);
check("leaving removes you from the room", latest(ada)?.participants.length === 1, latest(ada)?.participants);

ada.ws.close();
console.log(failures.length ? "\nПРОВАЛЕНО: " + failures.length : "\nусі перевірки пройдено");
process.exit(failures.length ? 1 : 0);
