import { chromium } from "@playwright/test";

const base = process.argv[2];
const alphabet = "bcdfghjkmnpqrstvwxz23456789";
const room = Array.from({length: 6}, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
const browser = await chromium.launch({ channel: "chrome" });
const failures = [];

const check = (label, ok, detail) => {
  if (ok) console.log("  ok  " + label);
  else { console.log("FAIL  " + label + (detail ? " — " + detail : "")); failures.push(label); }
};

const join = async (name) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/r/${room}`, { waitUntil: "networkidle" });
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join the room" }).click();
  await page.waitForTimeout(1500);
  return { page, errors };
};

const ada = await join("Ada");
const linus = await join("Linus");

const status = await ada.page.getByRole("status").innerText();
check("the socket reached the worker", status.includes("Live"), status);
check("both people are in the room", await ada.page.getByText("Linus").isVisible());

await ada.page.getByRole("button", { name: "5", exact: true }).click();
await linus.page.getByRole("button", { name: "8", exact: true }).click();
await ada.page.waitForTimeout(800);

const before = await ada.page.content();
check("the other card is absent from the page", !before.includes("Voted 8"));
check("but both are marked ready", await ada.page.getByText("2 of 2 ready").isVisible());

// Whoever the worker made host is the one who can reveal.
const hostIsAda = await ada.page.getByRole("button", { name: "Reveal" }).isVisible();
const host = hostIsAda ? ada : linus;
const guest = hostIsAda ? linus : ada;
await host.page.getByRole("button", { name: "Reveal" }).click();
await guest.page.waitForTimeout(900);

check("the reveal reaches the other browser", await guest.page.getByText("Cards are on the table").isVisible());
check("the average is shown", await host.page.getByText("6.5").isVisible());

check("no page errors", ada.errors.length === 0 && linus.errors.length === 0, [...ada.errors, ...linus.errors].join("; "));

await ada.page.screenshot({ path: process.argv[3] + "/live-hidden.jpg", type: "jpeg", quality: 82 });
await host.page.screenshot({ path: process.argv[3] + "/live-revealed.jpg", type: "jpeg", quality: 82 });

console.log(failures.length ? "\nПРОВАЛЕНО: " + failures.length : "\nусі перевірки пройдено");
await browser.close();
process.exit(failures.length ? 1 : 0);
