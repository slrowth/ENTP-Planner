
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdm0BloC6VxlBd3QAhOL-y7irD7Q1WNYE",
  authDomain: "entp-planner.firebaseapp.com",
  projectId: "entp-planner",
  storageBucket: "entp-planner.firebasestorage.app",
  messagingSenderId: "520579835375",
  appId: "1:520579835375:web:7055bc18e5cf5b6461821a",
  measurementId: "G-7ZXWBN291R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
