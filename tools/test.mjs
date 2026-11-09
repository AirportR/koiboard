import { chromium } from "playwright-core";

const base = "http://127.0.0.1:5289/";
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : ""));
}

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

await page.goto(base + "?demo=1&theme=dark&view=basic", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
check("demo config loaded", (await page.locator(".view-head h1").innerText()).includes("基础与权限"));

const license = page.locator('.panel input[type="password"]').first();
await license.fill("KOI-DEMO-CHANGED-0002");
await page.waitForTimeout(400);
check("dirty dock appears", (await page.locator(".dock").count()) === 1 && (await page.locator(".dock").innerText()).includes("1 处未保存改动"));

await page.locator("body").click({ position: { x: 5, y: 300 } });
await page.keyboard.press("Control+z");
await page.waitForTimeout(400);
check("undo clears dirty", (await page.locator(".dock").count()) === 0);
await page.keyboard.press("Control+Shift+z");
await page.waitForTimeout(400);
check("redo restores dirty", (await page.locator(".dock").count()) === 1);

await page.locator(".dock").getByRole("button", { name: "校验" }).click();
await page.waitForTimeout(700);
check("validate toast", (await page.locator(".toasts").innerText()).includes("校验通过"));

await page.locator(".dock").getByRole("button", { name: "保存", exact: true }).click();
await page.waitForTimeout(1600);
check("save toast", (await page.locator(".toasts").innerText()).includes("已保存"));
check("dock hidden after save", (await page.locator(".dock").count()) === 0);

await page.getByRole("button", { name: "测试规则", exact: true }).first().click();
await page.waitForTimeout(600);
check("rules view", (await page.locator(".view-head h1").innerText()).includes("测试规则"));

const before = await page.locator(".rows .row").count();
await page.getByRole("button", { name: "新增规则" }).click();
await page.waitForTimeout(500);
const after = await page.locator(".rows .row").count();
check("add rule", after === before + 1, before + " -> " + after);

const lastRule = page.locator(".rows .row").last();
const overrideSelect = lastRule.locator('select[aria-label="添加覆盖项"]');
await overrideSelect.selectOption({ label: "下载时长" });
await page.waitForTimeout(400);
check("add runtime override", (await lastRule.locator(".override").count()) === 1);
await lastRule.getByRole("button", { name: /移除覆盖/ }).first().click();
await page.waitForTimeout(300);
check("remove runtime override", (await lastRule.locator(".override").count()) === 0);

await page.locator('.rows .row').last().locator('button[aria-label="删除规则"]').click();
await page.waitForTimeout(400);
check("delete rule", (await page.locator(".rows .row").count()) === before);

await page.keyboard.press("Control+k");
await page.waitForTimeout(400);
await page.keyboard.type("bot-token");
await page.waitForTimeout(400);
check("palette search", (await page.locator(".palette__item").count()) > 0);
await page.keyboard.press("Enter");
await page.waitForTimeout(500);
check("palette opens inspector", (await page.locator(".drawer").count()) === 1);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

await page.getByRole("button", { name: "测速后端", exact: true }).first().click();
await page.waitForTimeout(500);
const slaveRow = page.locator(".rows .row").first();
await slaveRow.locator(".row__toggle").click();
await page.waitForTimeout(500);
check("slave row expands", (await slaveRow.getAttribute("data-open")) === "true");

check("no runtime errors", errors.length === 0, errors.join(" | "));

// mobile checks
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: "dark" });
const mpage = await mctx.newPage();
const mErrors = [];
mpage.on("pageerror", (error) => mErrors.push(String(error)));
await mpage.goto(base + "?demo=1&theme=dark&view=dashboard", { waitUntil: "networkidle" });
await mpage.waitForTimeout(1000);
check("mobile no h-scroll", (await mpage.evaluate(() => document.documentElement.scrollWidth)) <= 390);
check("mobile tab bar", (await mpage.locator(".mobile-bar__item").count()) === 5);
await mpage.getByRole("button", { name: "更多" }).click();
await mpage.waitForTimeout(400);
check("mobile nav sheet", (await mpage.locator(".nav-sheet").count()) === 1);
await mpage.getByRole("button", { name: "连接设置" }).click();
await mpage.waitForTimeout(400);
check("mobile connect sheet", (await mpage.getByRole("dialog", { name: "连接设置" }).count()) === 1);
await mpage.keyboard.press("Escape");
await mpage.waitForTimeout(300);
await mpage.getByRole("button", { name: "规则" }).first().click();
await mpage.waitForTimeout(600);
check("mobile tab switch", (await mpage.locator(".view-head h1").innerText()).includes("测试规则"));
const mrow = mpage.locator(".rows .row").nth(1);
await mrow.locator(".row__toggle").click();
await mpage.waitForTimeout(500);
check("mobile row expand", (await mrow.getAttribute("data-open")) === "true");
check("mobile no errors", mErrors.length === 0, mErrors.join(" | "));

await browser.close();
const failed = results.filter((entry) => !entry.ok);
console.log("\n" + (results.length - failed.length) + "/" + results.length + " checks passed");
process.exit(failed.length ? 1 : 0);
