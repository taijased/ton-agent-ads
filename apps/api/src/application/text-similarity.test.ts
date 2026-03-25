import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTextSimilarity,
  SIMILARITY_THRESHOLD,
} from "./text-similarity.js";

test("exact match returns 1.0", () => {
  assert.equal(computeTextSimilarity("hello world", "hello world"), 1.0);
});

test("case insensitive returns 1.0", () => {
  assert.equal(computeTextSimilarity("Hello World", "hello world"), 1.0);
});

test("superset (campaign text + extra) returns 1.0", () => {
  assert.equal(
    computeTextSimilarity("buy now", "buy now with discount today"),
    1.0,
  );
});

test("completely different texts return 0.0", () => {
  assert.equal(computeTextSimilarity("Sexy shmeksy", "new offer lol"), 0.0);
});

test("empty proof returns 0", () => {
  assert.equal(computeTextSimilarity("", "hello world"), 0);
});

test("empty campaign returns 0", () => {
  assert.equal(computeTextSimilarity("hello world", ""), 0);
});

test("both empty returns 0", () => {
  assert.equal(computeTextSimilarity("", ""), 0);
});

test("unicode/emoji text returns 1.0", () => {
  const similarity = computeTextSimilarity("Buy now!", "Buy now!");
  assert.equal(similarity, 1.0);
});

test("boundary below threshold (1/3 words -> 0.33 < 0.5)", () => {
  const similarity = computeTextSimilarity("one two three", "one four five");
  assert.ok(
    similarity < SIMILARITY_THRESHOLD,
    `Expected ${similarity} < ${SIMILARITY_THRESHOLD}`,
  );
  assert.ok(
    Math.abs(similarity - 1 / 3) < 0.01,
    `Expected ~0.33 but got ${similarity}`,
  );
});

test("boundary at threshold (2/4 words -> 0.5)", () => {
  const similarity = computeTextSimilarity("a b c d", "a b e f");
  assert.ok(
    similarity >= SIMILARITY_THRESHOLD,
    `Expected ${similarity} >= ${SIMILARITY_THRESHOLD}`,
  );
  assert.equal(similarity, 0.5);
});

test("short campaign in long proof returns 1.0", () => {
  assert.equal(
    computeTextSimilarity(
      "buy TON",
      "Great opportunity to buy TON tokens at the best price today",
    ),
    1.0,
  );
});

test("Cyrillic text returns 1.0", () => {
  assert.equal(
    computeTextSimilarity("Купи сейчас со скидкой", "Купи сейчас"),
    1.0,
  );
});

test("mixed Latin/Cyrillic returns 0.5", () => {
  const similarity = computeTextSimilarity("Buy TON", "Купи TON сейчас");
  assert.equal(similarity, 0.5);
});

test("whitespace/newline normalization returns 1.0", () => {
  assert.equal(
    computeTextSimilarity("hello   world\n foo", "hello world foo"),
    1.0,
  );
});
