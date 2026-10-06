import assert from "node:assert/strict";
import test from "node:test";

import {
  CLAIM_INTERNAL_PREFIXES,
  isInternalContractNumber,
  resolveSmtpConfigForContract,
  sendMailForContract,
} from "../lib/email/contract-smtp.js";

const env = {
  SMTP_HOST: "smtp.office365.com",
  SMTP_PORT: "587",
  SMTP_USER: "nachkauf@myarchitecto.de",
  SMTP_PASS: "default-pass",
  SMTP_FROM: "nachkauf@myarchitecto.de",
  SMTP_111_HOST: "smtp.gmail.com",
  SMTP_111_USER: "315primex.eu@gmail.com",
  SMTP_111_PASS: "abcd efgh ijkl mnop",
};

test("recognises 111 contracts, ignoring whitespace", () => {
  assert.equal(isInternalContractNumber("111123456"), true);
  assert.equal(isInternalContractNumber(" 111 123 "), true);
  assert.equal(isInternalContractNumber("670111111"), false);
  assert.equal(isInternalContractNumber(""), false);
});

test("111 contracts use the internal mailbox, app password without spaces", () => {
  const config = resolveSmtpConfigForContract("111123456", env);
  assert.equal(config.profile, "internal");
  assert.equal(config.host, "smtp.gmail.com");
  assert.equal(config.user, "315primex.eu@gmail.com");
  assert.equal(config.from, "315primex.eu@gmail.com");
  assert.equal(config.pass, "abcdefghijklmnop");
});

test("claims and orders for 222 contracts use the internal mailbox", () => {
  assert.equal(isInternalContractNumber("222123456", CLAIM_INTERNAL_PREFIXES), true);
  assert.equal(resolveSmtpConfigForContract("222123456", env, CLAIM_INTERNAL_PREFIXES).from, "315primex.eu@gmail.com");
  assert.equal(resolveSmtpConfigForContract("111123456", env, CLAIM_INTERNAL_PREFIXES).from, "315primex.eu@gmail.com");
  assert.equal(resolveSmtpConfigForContract("670123456", env, CLAIM_INTERNAL_PREFIXES).from, "nachkauf@myarchitecto.de");
  // default (orders) prefixes: 111 and 222
  assert.equal(isInternalContractNumber("222123456"), true);
  assert.equal(resolveSmtpConfigForContract("222123456", env).from, "315primex.eu@gmail.com");
  assert.equal(resolveSmtpConfigForContract("333123456", env).from, "nachkauf@myarchitecto.de");
});

test("sendMailForContract honours claim prefixes for 222", async () => {
  const sent = [];
  const createTransport = (config) => ({ sendMail: async (msg) => { sent.push(msg); return { messageId: "3" }; } });
  await sendMailForContract("222000111", { to: "x@example.com" }, { env, createTransport, prefixes: CLAIM_INTERNAL_PREFIXES });
  assert.equal(sent[0].from, '"Fragmento" <315primex.eu@gmail.com>');
});

test("all other contracts keep the default mailbox", () => {
  const config = resolveSmtpConfigForContract("670123456", env);
  assert.equal(config.profile, "default");
  assert.equal(config.from, "nachkauf@myarchitecto.de");
  assert.equal(config.pass, "default-pass");
});

test("111 contracts fall back to the default mailbox when SMTP_111 is not configured", () => {
  const { SMTP_111_USER, SMTP_111_PASS, ...withoutInternal } = env;
  assert.equal(resolveSmtpConfigForContract("111123456", withoutInternal).from, "nachkauf@myarchitecto.de");
});

test("sendMailForContract sends 111 mail from the internal mailbox", async () => {
  const sent = [];
  const createTransport = (config) => ({ sendMail: async (msg) => { sent.push({ user: config.user, msg }); return { messageId: "1" }; } });
  const { config } = await sendMailForContract("111123456", { to: "x@example.com" }, { env, createTransport });
  assert.equal(config.profile, "internal");
  assert.equal(sent[0].msg.from, '"Fragmento" <315primex.eu@gmail.com>');
  assert.equal(sent[0].user, "315primex.eu@gmail.com");
});

test("sendMailForContract retries via the default mailbox if the internal one fails", async () => {
  const sent = [];
  const createTransport = (config) => ({
    sendMail: async (msg) => {
      if (config.profile === "internal") throw new Error("535 auth failed");
      sent.push(msg);
      return { messageId: "2" };
    },
  });
  const warn = console.warn; console.warn = () => {};
  try {
    const { config } = await sendMailForContract("111123456", { to: "x@example.com" }, { env, createTransport });
    assert.equal(config.profile, "default");
    assert.equal(sent[0].from, '"Fragmento" <nachkauf@myarchitecto.de>');
  } finally { console.warn = warn; }
});

test("non-111 failures are not retried", async () => {
  const createTransport = () => ({ sendMail: async () => { throw new Error("down"); } });
  await assert.rejects(() => sendMailForContract("670123456", { to: "x@example.com" }, { env, createTransport }), /down/);
});
