import test from "node:test";
import assert from "node:assert/strict";
import { extractPriceTon } from "./price-extractor.js";

test("extractPriceTon handles common TON formats", () => {
  assert.deepEqual(extractPriceTon("10 TON"), { offeredPriceTon: 10 });
  assert.deepEqual(extractPriceTon("0.5 ton"), { offeredPriceTon: 0.5 });
  assert.deepEqual(extractPriceTon("10т"), { offeredPriceTon: 10 });
  assert.deepEqual(extractPriceTon("10 тонн"), { offeredPriceTon: 10 });
});

test("extractPriceTon takes upper bound for ranges and min for from phrases", () => {
  assert.deepEqual(extractPriceTon("8-9 TON"), { offeredPriceTon: 9 });
  assert.deepEqual(extractPriceTon("минимум 15 TON"), { offeredPriceTon: 15 });
  assert.deepEqual(extractPriceTon("от 12 TON"), { offeredPriceTon: 12 });
});

test("extractPriceTon returns empty result when no price is present", () => {
  assert.deepEqual(extractPriceTon("давайте обсудим позже"), {});
});
