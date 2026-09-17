import {expect, test, type Browser, type Page} from "@playwright/test";

/** A fresh room id per test, from the same vowel-free alphabet the app uses. */
const roomId = () => "t" + Math.random().toString(36).replace(/[^bcdfghjkmnpqrstvwxz2-9]/g, "").slice(0, 5).padEnd(5, "k");

const joinAs = async (browser: Browser, room: string, name: string): Promise<Page> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`/r/${room}`);
    await page.getByLabel("Your name").fill(name);
    await page.getByRole("button", {name: "Join the room"}).click();
    await expect(page.getByRole("status")).toContainText("Live");
    return page;
};

test("two people estimate the same story", async ({browser}) => {
    const room = roomId();
    const host = await joinAs(browser, room, "Ada");
    const guest = await joinAs(browser, room, "Linus");

    // Presence: each browser sees the other person arrive.
    await expect(host.getByText("Linus")).toBeVisible();
    await expect(guest.getByText("Ada")).toBeVisible();
    await expect(host.getByText("Host")).toBeVisible();

    await host.getByRole("button", {name: "5", exact: true}).click();
    await guest.getByRole("button", {name: "8", exact: true}).click();

    // Both are marked ready in both browsers.
    await expect(host.getByText("2 of 2 ready")).toBeVisible();
    await expect(guest.getByText("2 of 2 ready")).toBeVisible();

    // The hidden part: the guest's card is nowhere in the host's page — not
    // hidden by CSS, not in the DOM, not in any script payload.
    const hostContent = await host.content();
    expect(hostContent).not.toContain("Voted 8");

    await host.getByRole("button", {name: "Reveal"}).click();

    await expect(host.getByLabel("Voted 8")).toBeVisible();
    await expect(guest.getByLabel("Voted 5")).toBeVisible();
    await expect(host.getByText("6.5")).toBeVisible();

    // A new round clears both tables at once.
    await host.getByRole("button", {name: "New round"}).click();
    await expect(host.getByText("Round 2")).toBeVisible();
    await expect(guest.getByText("Round 2")).toBeVisible();
    await expect(guest.getByText("0 of 2 ready")).toBeVisible();

    await host.context().close();
    await guest.context().close();
});

test("only the host can reveal", async ({browser}) => {
    const room = roomId();
    const host = await joinAs(browser, room, "Ada");
    const guest = await joinAs(browser, room, "Linus");

    await expect(host.getByRole("button", {name: "Reveal"})).toBeVisible();
    await expect(guest.getByRole("button", {name: "Reveal"})).toHaveCount(0);
    await expect(guest.getByText("The host reveals the cards")).toBeVisible();

    await host.context().close();
    await guest.context().close();
});

test("leaving a room removes you from it", async ({browser}) => {
    const room = roomId();
    const host = await joinAs(browser, room, "Ada");
    const guest = await joinAs(browser, room, "Linus");

    await expect(host.getByText("Linus")).toBeVisible();
    await guest.context().close();
    await expect(host.getByText("Linus")).toHaveCount(0);

    await host.context().close();
});
