import React, { useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User, 
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateAuthProfile
} from './firebase';
import { doc, getDoc, setDoc, Timestamp, collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  applications: any[];
  loading: boolean;
  signIn: () => Promise<void>;
  signInEmail: (email: string, pass: string) => Promise<void>;
  signUpEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  updateSubscription: (tier: 'free' | 'standard' | 'premium') => Promise<void>;
  addApplication: (app: any) => Promise<void>;
  updateApplicationStatus: (appId: string, status: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const updateProfile = async (data: any) => {
    if (!user) return;
    const updatedProfile = { ...profile, ...data, updatedAt: Timestamp.now() };
    await setDoc(doc(db, 'users', user.uid), updatedProfile);
    setProfile(updatedProfile);
  };

  const updateSubscription = async (tier: 'free' | 'standard' | 'premium') => {
    if (!user) return;
    await updateProfile({ subscription: tier });
  };

  const addApplication = async (app: any) => {
    if (!user) return;
    const now = Timestamp.now();
    const appData = {
      ...app,
      userId: user.uid,
      userEmail: user.email,
      createdAt: now,
      appliedAt: now,
      updatedAt: now
    };
    
    // Save to user sub-collection
    const userAppRef = await addDoc(collection(db, 'users', user.uid, 'applications'), appData);
    
    // Save to global collection for admin monitoring
    await setDoc(doc(db, 'applications', userAppRef.id), {
      ...appData,
      id: userAppRef.id
    });
    
    setApplications(prev => [...prev, { ...appData, id: userAppRef.id }]);
  };

  const updateApplicationStatus = async (appId: string, status: string) => {
    if (!user) return;
    const appRef = doc(db, 'users', user.uid, 'applications', appId);
    await setDoc(appRef, { status, updatedAt: Timestamp.now() }, { merge: true });
  };

  useEffect(() => {
    let unsubscribeApps: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create profile
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // Create default profile
          const newProfile = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            subscription: 'free',
            profileComplete: false,
            isEmailConnected: false,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            savedJobs: []
          };
          await setDoc(doc(db, 'users', currentUser.uid), newProfile);
          setProfile(newProfile);
        }

        // Listen to applications subcollection
        const appsQuery = query(
          collection(db, 'users', currentUser.uid, 'applications'),
          orderBy('appliedAt', 'desc')
        );
        unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
          const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setApplications(apps);
        });
      } else {
        setProfile(null);
        setApplications([]);
        if (unsubscribeApps) unsubscribeApps();
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeApps) unsubscribeApps();
    };
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error('Email sign in error:', error);
      throw error;
    }
  };

  const signUpEmail = async (email: string, pass: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateAuthProfile(result.user, { displayName: name });
    } catch (error) {
      console.error('Email sign up error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      applications, 
      loading, 
      signIn, 
      signInEmail,
      signUpEmail,
      logout, 
      updateProfile, 
      updateSubscription,
      addApplication, 
      updateApplicationStatus 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
