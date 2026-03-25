import test from "node:test";
import assert from "node:assert/strict";
import { parseDateText } from "./date-parser.js";

// ── Helper ──────────────────────────────────────────────────────────────────

function todayAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function tomorrowAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ── "today" tests ───────────────────────────────────────────────────────────

test("DP1: parseDateText('today 6 p.m') returns today at 18:00", () => {
  const result = parseDateText("today 6 p.m");
  const expected = todayAt(18, 0);
  assert.equal(result?.getHours(), expected.getHours());
  assert.equal(result?.getMinutes(), expected.getMinutes());
  assert.equal(result?.getDate(), expected.getDate());
});

test("DP2: parseDateText('today 18:00') returns today at 18:00", () => {
  const result = parseDateText("today 18:00");
  const expected = todayAt(18, 0);
  assert.equal(result?.getHours(), expected.getHours());
  assert.equal(result?.getMinutes(), expected.getMinutes());
});

test("DP3: parseDateText('today') returns today's date", () => {
  const result = parseDateText("today");
  const now = new Date();
  assert.notEqual(result, null);
  assert.equal(result!.getFullYear(), now.getFullYear());
  assert.equal(result!.getMonth(), now.getMonth());
  assert.equal(result!.getDate(), now.getDate());
});

// ── "tomorrow" tests ────────────────────────────────────────────────────────

test("DP4: parseDateText('tomorrow') returns tomorrow's date", () => {
  const result = parseDateText("tomorrow");
  const expected = new Date();
  expected.setDate(expected.getDate() + 1);
  assert.notEqual(result, null);
  assert.equal(result!.getDate(), expected.getDate());
  assert.equal(result!.getMonth(), expected.getMonth());
});

test("DP5: parseDateText('tomorrow 2pm') returns tomorrow at 14:00", () => {
  const result = parseDateText("tomorrow 2pm");
  const expected = tomorrowAt(14, 0);
  assert.equal(result?.getHours(), expected.getHours());
  assert.equal(result?.getMinutes(), expected.getMinutes());
  assert.equal(result?.getDate(), expected.getDate());
});

test("DP6: parseDateText('tomorrow 14:30') returns tomorrow at 14:30", () => {
  const result = parseDateText("tomorrow 14:30");
  const expected = tomorrowAt(14, 30);
  assert.equal(result?.getHours(), expected.getHours());
  assert.equal(result?.getMinutes(), expected.getMinutes());
});

// ── Russian locale tests ────────────────────────────────────────────────────

test("DP7: parseDateText('сегодня') returns today", () => {
  const result = parseDateText("сегодня");
  const now = new Date();
  assert.notEqual(result, null);
  assert.equal(result!.getDate(), now.getDate());
});

test("DP8: parseDateText('завтра') returns tomorrow", () => {
  const result = parseDateText("завтра");
  const expected = new Date();
  expected.setDate(expected.getDate() + 1);
  assert.notEqual(result, null);
  assert.equal(result!.getDate(), expected.getDate());
});

// ── Unparseable input ───────────────────────────────────────────────────────

test("DP9: parseDateText('gibberish') returns null", () => {
  const result = parseDateText("gibberish");
  assert.equal(result, null);
});

test("DP10: parseDateText('next week') returns null", () => {
  const result = parseDateText("next week");
  assert.equal(result, null);
});

test("DP11: parseDateText('') returns null", () => {
  const result = parseDateText("");
  assert.equal(result, null);
});

// ── Edge cases ──────────────────────────────────────────────────────────────

test("DP12: parseDateText('today 12am') returns today at 00:00 (midnight)", () => {
  const result = parseDateText("today 12am");
  assert.notEqual(result, null);
  assert.equal(result!.getHours(), 0);
  assert.equal(result!.getMinutes(), 0);
});

test("DP13: parseDateText('today 12pm') returns today at 12:00 (noon)", () => {
  const result = parseDateText("today 12pm");
  assert.notEqual(result, null);
  assert.equal(result!.getHours(), 12);
  assert.equal(result!.getMinutes(), 0);
});

test("DP14: parseDateText('Today 6 P.M.') handles mixed case and dots", () => {
  const result = parseDateText("Today 6 P.M.");
  assert.notEqual(result, null);
  assert.equal(result!.getHours(), 18);
});
