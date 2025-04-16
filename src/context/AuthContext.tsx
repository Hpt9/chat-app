import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../firebase';
import { createUser } from '../db/queries';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Starting user registration process...');
      
      // Create the user in Firebase Authentication
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log('User created in Firebase Auth:', user.uid);
      
      // Update the user's display name
      await updateProfile(user, { displayName });
      console.log('Display name updated:', displayName);
      
      // Create the user document in Firestore using the dedicated function
      console.log('Creating user document in Firestore...');
      const userData = {
        uid: user.uid,
        email: user.email!,
        displayName: displayName,
      };
      
      await createUser(userData);
      console.log('User document created in Firestore successfully');
      
      return user;
    } catch (error) {
      console.error('Error during registration:', error);
      throw error; // Re-throw the error to be handled by the component
    }
  };

  const logout = () => signOut(auth);

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 