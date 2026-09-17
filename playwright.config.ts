import {defineConfig, devices} from "@playwright/test";

const isCI = Boolean(process.env.CI);
const port = 3105;
const workerPort = 8787;

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    reporter: isCI ? [["github"], ["html", {open: "never"}]] : "list",
    use: {
        baseURL: `http://localhost:${port}`,
        trace: "on-first-retry",
        channel: isCI ? undefined : "chrome",
    },
    projects: [{name: "chromium", use: {...devices["Desktop Chrome"]}}],
    // Two servers: the page, and the Durable Object that is the room.
    webServer: [
        {
            command: `npx wrangler dev --config worker/wrangler.toml --port ${workerPort}`,
            url: `http://127.0.0.1:${workerPort}/health`,
            reuseExistingServer: !isCI,
            timeout: 120_000,
            env: {WRANGLER_SEND_METRICS: "false"},
        },
        {
            command: `npm run start -- --port ${port}`,
            url: `http://localhost:${port}`,
            reuseExistingServer: !isCI,
            timeout: 120_000,
        },
    ],
});
