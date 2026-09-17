import { chromium } from "@playwright/test";

const out = process.argv[2];
const base = "http://localhost:3105";
// A fresh room each run: a Durable Object keeps its state between runs.
const alphabet = "bcdfghjkmnpqrstvwxz23456789";
const room = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
const browser = await chromium.launch({ channel: "chrome" });

const join = async (name, viewport = { width: 1280, height: 860 }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(`${base}/r/${room}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Join the room" }).click();
  await page.waitForTimeout(400);
  return page;
};

const landing = await browser.newPage({ viewport: { width: 1280, height: 860 } });
await landing.goto(base);
await landing.waitForTimeout(600);
await landing.screenshot({ path: `${out}/landing.jpg`, type: "jpeg", quality: 82 });

const ada = await join("Ada");
const linus = await join("Linus");
const grace = await join("Grace");

await ada.getByRole("button", { name: "5", exact: true }).click();
await linus.getByRole("button", { name: "8", exact: true }).click();
await grace.getByRole("button", { name: "5", exact: true }).click();
await ada.waitForTimeout(500);
await ada.screenshot({ path: `${out}/hidden.jpg`, type: "jpeg", quality: 82 });

await ada.getByRole("button", { name: "Reveal" }).click();
await ada.waitForTimeout(700);
await ada.screenshot({ path: `${out}/revealed.jpg`, type: "jpeg", quality: 82 });
await linus.screenshot({ path: `${out}/revealed-guest.jpg`, type: "jpeg", quality: 82 });

const phone = await join("Mobile", { width: 390, height: 844 });
await phone.waitForTimeout(500);
await phone.screenshot({ path: `${out}/mobile.jpg`, type: "jpeg", quality: 82 });

console.log("знімки зроблено");
await browser.close();
