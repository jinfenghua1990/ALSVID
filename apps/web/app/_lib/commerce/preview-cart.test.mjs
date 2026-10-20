import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const directory = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(directory, "preview-cart.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
});

function createPreviewCartModule({ blocked = false } = {}) {
  const stored = new Map();
  const storage = {
    getItem: (key) => stored.get(key) ?? null,
    setItem: (key, value) => {
      if (blocked) throw new Error("Storage blocked");
      stored.set(key, value);
    },
    removeItem: (key) => {
      if (blocked) throw new Error("Storage blocked");
      stored.delete(key);
    },
  };
  const module = { exports: {} };
  runInNewContext(outputText, { exports: module.exports, module, window: { sessionStorage: storage } });
  return { ...module.exports, stored };
}
const valid = { version: 1, product: "FC1", model: "standard", colour: "sample", quantity: 1 };

test("only approved preview models, colours and safe quantities may enter browser cart", () => {
  const { normalizeFc1PreviewCart: normalize } = createPreviewCartModule();
  assert.deepEqual(JSON.parse(JSON.stringify(normalize(valid))), valid);
  for (const bad of [
    null, [], {}, { ...valid, product: "CT1" }, { ...valid, version: 0 },
    { ...valid, model: "custom" }, { ...valid, colour: "red" },
    { ...valid, quantity: 0 }, { ...valid, quantity: 10 }, { ...valid, quantity: 1.5 },
    { ...valid, quantity: "1" },
  ]) assert.equal(normalize(bad), null);
});

test("preview cart is scoped to a browser session, removable and has no order API", () => {
  const cart = createPreviewCartModule();
  assert.equal(cart.readFc1PreviewCart(), null);
  assert.equal(cart.saveFc1PreviewCart(valid), true);
  assert.deepEqual(JSON.parse(JSON.stringify(cart.readFc1PreviewCart())), valid);
  assert.equal(cart.stored.size, 1);
  assert.equal(cart.clearFc1PreviewCart(), true);
  assert.equal(cart.readFc1PreviewCart(), null);
  assert.match(source, /sessionStorage/);
  assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|createOrder|paymentIntent|localStorage/);
});

test("disabled storage fails closed without simulating payment or order success", () => {
  const cart = createPreviewCartModule({ blocked: true });
  assert.equal(cart.saveFc1PreviewCart(valid), false);
  assert.equal(cart.readFc1PreviewCart(), null);
  assert.equal(cart.clearFc1PreviewCart(), false);
});
