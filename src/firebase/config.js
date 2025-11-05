// Firebase configuration
// TODO: Replace with your Firebase config
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Automatically sign in anonymously when the app loads
let authInitialized = false;
let authPromise = null;

export const ensureAuth = () => {
  if (authPromise) return authPromise;
  
  authPromise = new Promise((resolve, reject) => {
    if (authInitialized && auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        authInitialized = true;
        unsubscribe();
        resolve(user);
      } else if (!authInitialized) {
        // Sign in anonymously if no user
        signInAnonymously(auth)
          .then((result) => {
            authInitialized = true;
            unsubscribe();
            resolve(result.user);
          })
          .catch((error) => {
            unsubscribe();
            reject(error);
          });
      }
    });
  });

  return authPromise;
};

