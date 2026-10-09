import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCNKclv3c5s87Kvqj-bxmng43_i9M6vURA',
  authDomain: 'healthify-chat.firebaseapp.com',
  projectId: 'healthify-chat',
  storageBucket: 'healthify-chat.firebasestorage.app',
  messagingSenderId: '748884487444',
  appId: '1:748884487444:web:733e106c3fabd0d650e601',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
