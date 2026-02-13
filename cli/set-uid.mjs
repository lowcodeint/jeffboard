import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const sa = JSON.parse(readFileSync('./service-account.json', 'utf8'));
initializeApp({ credential: cert(sa) });

const uid = 'JFx8aVIpcoS24LcxNxLjy2Jv6E72';
await getFirestore().collection('config').doc('allowedUsers').set({ uids: [uid] });
console.log('allowedUsers updated successfully');
