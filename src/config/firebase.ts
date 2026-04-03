import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function makeAdmin(uid: string): Promise<void> {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
}

const db = admin.firestore();

export { admin, db, makeAdmin };