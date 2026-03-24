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

test("extractPriceTon detects non-TON currencies (Russian)", () => {
  assert.deepEqual(extractPriceTon("10 долларов"), {
    mentionedNonTonCurrency: true,
    rawAmount: 10,
    rawCurrency: "долларов",
  });
  assert.deepEqual(extractPriceTon("100 рублей"), {
    mentionedNonTonCurrency: true,
    rawAmount: 100,
    rawCurrency: "рублей",
  });
});

test("extractPriceTon detects non-TON currencies (English and symbols)", () => {
  assert.deepEqual(extractPriceTon("15 USD"), {
    mentionedNonTonCurrency: true,
    rawAmount: 15,
    rawCurrency: "usd",
  });
  assert.deepEqual(extractPriceTon("$20"), {
    mentionedNonTonCurrency: true,
    rawAmount: 20,
    rawCurrency: "$",
  });
  assert.deepEqual(extractPriceTon("50 EUR"), {
    mentionedNonTonCurrency: true,
    rawAmount: 50,
    rawCurrency: "eur",
  });
  assert.deepEqual(extractPriceTon("€30"), {
    mentionedNonTonCurrency: true,
    rawAmount: 30,
    rawCurrency: "€",
  });
});

test("extractPriceTon prefers TON over non-TON when TON is present", () => {
  assert.deepEqual(extractPriceTon("10 TON"), { offeredPriceTon: 10 });
});

test("extractPriceTon does not flag plain text as non-TON", () => {
  assert.deepEqual(extractPriceTon("hello"), {});
  assert.deepEqual(extractPriceTon("давайте обсудим"), {});
});
