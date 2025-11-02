// Firebase configuration
// TODO: Replace with your Firebase config
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC4jlyirLwczS-7UBF32kh08Hgi-lo7eNw",
  authDomain: "terra-d9ff9.firebaseapp.com",
  projectId: "terra-d9ff9",
  storageBucket: "terra-d9ff9.firebasestorage.app",
  messagingSenderId: "183787893626",
  appId: "1:183787893626:web:944ac9af146cf9f396dcc3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

