import {roomIdAlphabet} from "@protocol";

/**
 * A room id you can read out loud over a call.
 *
 * The alphabet has no vowels, so a generated id cannot accidentally spell a
 * word, and none of the characters that get confused when someone dictates
 * them — no 0/o, 1/l or i.
 */
export const generateRoomId = (length = 6) => {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return [...values].map((value) => roomIdAlphabet[value % roomIdAlphabet.length]).join("");
};
