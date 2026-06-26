require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/db");

const newPassword = process.argv[2];

if (!newPassword || newPassword.length < 6) {
  console.error("Usage: npm run reset-admin-password -- <newPasswordMin6Chars>");
  process.exit(1);
}

// There's normally just one admin account (id 1, the one created on first run).
const user = db.getAdminById(1);
if (!user) {
  console.error("No admin user found in the database.");
  process.exit(1);
}

db.updateAdminPassword(user.id, bcrypt.hashSync(newPassword, 10));
console.log(`Password updated for admin user "${user.username}". You can log in with it now.`);
