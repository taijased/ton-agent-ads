import test from "node:test";
import assert from "node:assert/strict";
import { parseBudgetInput } from "./budget-parser.js";

test("pure integer returns unknown currency", () => {
  assert.deepEqual(parseBudgetInput("5"), { amount: 5, currency: "unknown" });
});

test("decimal number returns unknown currency", () => {
  assert.deepEqual(parseBudgetInput("10.5"), {
    amount: 10.5,
    currency: "unknown",
  });
});

test("zero returns null", () => {
  assert.equal(parseBudgetInput("0"), null);
});

test("negative number returns null", () => {
  assert.equal(parseBudgetInput("-5"), null);
});

test("empty string returns null", () => {
  assert.equal(parseBudgetInput(""), null);
});

test("non-numeric string returns null", () => {
  assert.equal(parseBudgetInput("abc"), null);
});

test("lowercase ton suffix is accepted as TON", () => {
  assert.deepEqual(parseBudgetInput("5 ton"), { amount: 5, currency: "TON" });
});

test("uppercase TON suffix is accepted as TON", () => {
  assert.deepEqual(parseBudgetInput("5 TON"), { amount: 5, currency: "TON" });
});

test("Russian тон suffix is accepted as TON", () => {
  assert.deepEqual(parseBudgetInput("5 тон"), { amount: 5, currency: "TON" });
});

test("decimal amount with ton suffix is accepted", () => {
  assert.deepEqual(parseBudgetInput("10.5 ton"), {
    amount: 10.5,
    currency: "TON",
  });
});

test("USD suffix returns other currency", () => {
  assert.deepEqual(parseBudgetInput("5 USD"), {
    amount: 5,
    currency: "other",
    raw: "USD",
  });
});

test("dollar sign prefix returns other currency", () => {
  assert.deepEqual(parseBudgetInput("$50"), {
    amount: 50,
    currency: "other",
    raw: "$",
  });
});

test("Russian рублей suffix returns other currency", () => {
  assert.deepEqual(parseBudgetInput("1000 рублей"), {
    amount: 1000,
    currency: "other",
    raw: "рублей",
  });
});

test("euro sign prefix returns other currency", () => {
  assert.deepEqual(parseBudgetInput("€100"), {
    amount: 100,
    currency: "other",
    raw: "€",
  });
});

test("leading and trailing spaces are trimmed", () => {
  assert.deepEqual(parseBudgetInput("  5 ton  "), {
    amount: 5,
    currency: "TON",
  });
});

test("comma decimal separator is normalized", () => {
  assert.deepEqual(parseBudgetInput("10,5 ton"), {
    amount: 10.5,
    currency: "TON",
  });
});

test("very large number returns unknown currency", () => {
  assert.deepEqual(parseBudgetInput("999999"), {
    amount: 999999,
    currency: "unknown",
  });
});

test("very small decimal returns unknown currency", () => {
  assert.deepEqual(parseBudgetInput("0.01"), {
    amount: 0.01,
    currency: "unknown",
  });
});

test("number with leading word returns null (ambiguous)", () => {
  assert.equal(parseBudgetInput("about 5"), null);
});

test("two numbers returns null (ambiguous)", () => {
  assert.equal(parseBudgetInput("5 10"), null);
});
