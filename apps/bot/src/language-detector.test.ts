import test from "node:test";
import assert from "node:assert/strict";
import {
  detectLanguageFromTitle,
  detectMessageLanguage,
} from "./language-detector.js";

// detectLanguageFromTitle tests

test("Russian _ru suffix is detected as RU", () => {
  assert.equal(detectLanguageFromTitle("crypto_daily_ru"), "RU");
});

test("English _en suffix is detected as EN", () => {
  assert.equal(detectLanguageFromTitle("crypto_daily_en"), "EN");
});

test("Cyrillic-only title is detected as RU", () => {
  assert.equal(detectLanguageFromTitle("Крипто Новости"), "RU");
});

test("Latin-only title is detected as EN", () => {
  assert.equal(detectLanguageFromTitle("Crypto News"), "EN");
});

test("mixed title with mostly Cyrillic is detected as RU", () => {
  // "Крипто" = 6 Cyrillic, "News" = 4 Latin → Cyrillic clearly outnumbers
  assert.equal(detectLanguageFromTitle("Крипто News"), "RU");
});

test("mixed title with mostly Latin is detected as EN", () => {
  // "Crypto" = 6 Latin, "Новости" = 7 Cyrillic → near-equal, defaults to EN
  assert.equal(detectLanguageFromTitle("Crypto Новости"), "EN");
});

test("numbers-only title defaults to EN", () => {
  assert.equal(detectLanguageFromTitle("channel123"), "EN");
});

test("empty string defaults to EN", () => {
  assert.equal(detectLanguageFromTitle(""), "EN");
});

// detectMessageLanguage tests

test("Russian message text is detected as RU", () => {
  assert.equal(detectMessageLanguage("Здравствуйте, сколько стоит?"), "RU");
});

test("English message text is detected as EN", () => {
  assert.equal(detectMessageLanguage("Hello, how much?"), "EN");
});

test("message with TON/crypto terms only is detected as EN", () => {
  assert.equal(detectMessageLanguage("Price is 5 TON"), "EN");
});

test("Ukrainian Cyrillic is detected as RU (Cyrillic → RU)", () => {
  assert.equal(detectMessageLanguage("Крипто Україна"), "RU");
});
