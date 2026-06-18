// Same config as frontend (healthify-14bfa)
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCycXRZQZBTY8FdjRy6GtHYF9oV-_98JxU',
  authDomain: 'healthify-14bfa.firebaseapp.com',
  projectId: 'healthify-14bfa',
  storageBucket: 'healthify-14bfa.firebasestorage.app',
  messagingSenderId: '235946892929',
  appId: '1:235946892929:web:bff72a6a5ce80a0bf9f780',
  measurementId: 'G-77YKPJLNYS',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
