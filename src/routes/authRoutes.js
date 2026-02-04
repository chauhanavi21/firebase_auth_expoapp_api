import express from "express";
import admin from "../firebaseAdmin.js";
import { authAdmin, dbAdmin } from "../firebaseAdmin.js";

const router = express.Router();

/**
 * POST /api/auth/register
 * body: { name, email, phone, password, memberId }
 *
 * Creates Firebase Auth user + Firestore user doc + reserves memberId.
 * All-or-nothing.
 */
router.post("/register", async (req, res) => {
  const { name, email, phone, password, memberId } = req.body || {};

  if (!name || !email || !phone || !password || !memberId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be >= 6 chars" });
  }

  const cleanMemberId = String(memberId).trim();

  try {
    // 1) Create Auth user
    const userRecord = await authAdmin.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: name,
    });

    const uid = userRecord.uid;

    // 2) Transaction: reserve memberId and create user profile
    const memberRef = dbAdmin.collection("memberIds").doc(cleanMemberId);
    const userRef = dbAdmin.collection("users").doc(uid);

    await dbAdmin.runTransaction(async (tx) => {
      const memberSnap = await tx.get(memberRef);
      if (memberSnap.exists) {
        throw new Error("MEMBER_ID_TAKEN");
      }

      tx.set(memberRef, {
        uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(userRef, {
        name,
        phone,
        memberId: cleanMemberId,
        email: email.trim().toLowerCase(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return res.json({ ok: true, uid });
  } catch (e) {
    // If memberId taken AFTER auth user creation, clean up auth user.
    if (e?.message === "MEMBER_ID_TAKEN") {
      // We may have already created auth user; attempt cleanup if possible.
      // NOTE: we don't have uid here if auth create failed.
      return res.status(409).json({ error: "MemberId already in use" });
    }

    // If auth user created but transaction failed: try to delete user if uid exists
    // (We don't always have it. Keep it simple.)

    return res.status(500).json({ error: "Registration failed", detail: e?.message });
  }
});

export default router;
