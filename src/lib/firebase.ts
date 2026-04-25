import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  updateProfile,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// User role types
export type UserRole = 'admin' | 'user';

// User data structure
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  photoURL?: string;
  createdAt: Date;
  profileCompleted: boolean;
  companyName?: string;
  phoneNumber?: string;
}

// User profile completion data
export interface UserProfile {
  displayName: string;
  companyName?: string;
  phoneNumber?: string;
  photoURL?: string;
}

// Save user data to Firestore
export const saveUserData = async (user: User, role: UserRole = 'user') => {
  const userData: UserData = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    role,
    photoURL: user.photoURL || '',
    createdAt: new Date(),
    profileCompleted: false
  };

  await setDoc(doc(db, 'users', user.uid), userData);
  return userData;
};

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<UserData | null> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() as UserData : null;
};

// Sign up with email and password
export const signUpWithEmail = async (email: string, password: string, displayName: string, role: UserRole = 'user') => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Update profile with display name
  if (userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
    
    // Send email verification
    await sendEmailVerification(userCredential.user);
    
    // Save user data to Firestore
    await saveUserData(userCredential.user, role);
  }
  
  return userCredential;
};

// Delete user account and all associated data
export const deleteUserAccount = async (user: User) => {
  try {
    // Delete user data from Firestore
    await deleteDoc(doc(db, 'users', user.uid));
    
    // Delete user's tasks
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const tasksSnapshot = await getDocs(tasksQuery);
    const deleteTasks = tasksSnapshot.docs.map(taskDoc => deleteDoc(taskDoc.ref));
    await Promise.all(deleteTasks);
    
    // Delete user's invites
    const invitesQuery = query(collection(db, 'invites'), where('adminId', '==', user.uid));
    const invitesSnapshot = await getDocs(invitesQuery);
    const deleteInvites = invitesSnapshot.docs.map(inviteDoc => deleteDoc(inviteDoc.ref));
    await Promise.all(deleteInvites);
    
    // Delete user from Firebase Auth
    await user.delete();
    
    return true;
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  updateProfile
};