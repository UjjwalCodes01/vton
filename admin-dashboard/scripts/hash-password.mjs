#!/usr/bin/env node
// Makes one ADMIN_USERS entry:
//
//   npm run hash -- you@example.com 'a long passphrase'
//
// Print it, paste it into ADMIN_USERS, and forget the plaintext.

import { randomBytes, scryptSync } from "node:crypto";

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: npm run hash -- <email> <password>");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Use at least 12 characters — this is the only thing between the internet and every store's data.");
  process.exit(1);
}

const salt = randomBytes(16).toString("base64url");
const hash = scryptSync(password, salt, 64).toString("base64url");

console.log(`\n${email.toLowerCase()}:scrypt$${salt}$${hash}\n`);
console.log("Add that to ADMIN_USERS (comma-separate several accounts).\n");
