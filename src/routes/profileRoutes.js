import express from "express";
import admin from "../firebaseAdmin.js";
import { dbAdmin } from "../firebaseAdmin.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * GET /api/profile/me
 */
router.get("/me", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const snap = await dbAdmin.collection("users").doc(uid).get();
  if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
  return res.json(snap.data());
});

/**
 * PATCH /api/profile/me
 * body: { name, phone, memberId }
 * memberId update is transactional to preserve uniqueness.
 */
router.patch("/me", requireAuth, async (req, res) => {
  const uid = req.user.uid;
  const { name, phone, memberId } = req.body || {};

  if (!name || !phone || !memberId) {
    return res.status(400).json({ error: "name, phone, memberId are required" });
  }

  const newMemberId = String(memberId).trim();

  const userRef = dbAdmin.collection("users").doc(uid);
  const newMemberRef = dbAdmin.collection("memberIds").doc(newMemberId);

  try {
    await dbAdmin.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("NO_PROFILE");

      const current = userSnap.data();
      const oldMemberId = current.memberId;
      const oldMemberRef = dbAdmin.collection("memberIds").doc(String(oldMemberId));

      // if memberId changed, claim new and release old
      if (String(oldMemberId) !== newMemberId) {
        const newMemberSnap = await tx.get(newMemberRef);
        if (newMemberSnap.exists) throw new Error("MEMBER_ID_TAKEN");

        // claim new
        tx.set(newMemberRef, {
          uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // release old (only if it belongs to this uid)
        const oldSnap = await tx.get(oldMemberRef);
        if (oldSnap.exists && oldSnap.data()?.uid === uid) {
          tx.delete(oldMemberRef);
        }
      }

      tx.update(userRef, {
        name,
        phone,
        memberId: newMemberId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return res.json({ ok: true });
  } catch (e) {
    if (e?.message === "MEMBER_ID_TAKEN") {
      return res.status(409).json({ error: "MemberId already in use" });
    }
    if (e?.message === "NO_PROFILE") {
      return res.status(404).json({ error: "Profile not found" });
    }
    return res.status(500).json({ error: "Update failed", detail: e?.message });
  }
});

export default router;
