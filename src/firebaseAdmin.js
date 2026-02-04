import admin from "firebase-admin";

function getServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const parsed = JSON.parse(raw);

  // Fix private_key if Render stores it with escaped newlines
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }

  return parsed;
}

if (!admin.apps.length) {
  const svc = getServiceAccountFromEnv();
  if (!svc) {
    throw new Error("Missing FIREBASE_SERVICE_ACCOUNT_JSON on server");
  }

  admin.initializeApp({
    credential: admin.credential.cert(svc),
  });
}

export const authAdmin = admin.auth();
export const dbAdmin = admin.firestore();
export default admin;
