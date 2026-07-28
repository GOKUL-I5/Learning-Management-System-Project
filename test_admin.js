import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(
  readFileSync(new URL('./serviceAccountKey.json', import.meta.url))
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
async function run() {
  try {
    const snap = await db.collection('users').limit(1).get();
    console.log('Users collection empty?', snap.empty);
    if (!snap.empty) {
      console.log('Sample user:', snap.docs[0].data());
    }
  } catch (err) {
    console.error(err);
  }
}
run();
