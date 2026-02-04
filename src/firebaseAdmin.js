import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert("./serviceAccountKey.json"),
  });
}

export const authAdmin = admin.auth();
export const dbAdmin = admin.firestore();
export default admin;
