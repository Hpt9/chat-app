import { useState, useEffect } from 'react'
import './App.css'
import { initializeDatabase } from './db/initDb'
import { ChatRoom } from './components/ChatRoom'
import { Sidebar } from './components/Sidebar'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AuthPage } from './components/auth/AuthPage'
import { createUser } from './db/queries'
import { auth } from './firebase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function ChatInterface() {
  const [initialized, setInitialized] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { logout, currentUser } = useAuth();

  // Function to sync a single user to Firestore
  const syncUserToFirestore = async (user: FirebaseUser) => {
    if (!user) return;

    try {
      // Check if user document exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        console.log('Syncing user to Firestore:', user.uid);
        await createUser({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          photoURL: user.photoURL || undefined,
        });
      }
    } catch (error) {
      console.error('Error syncing user:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (initialized) return;
      
      try {
        setLoading(true);
        await initializeDatabase();

        // Set up auth state listener to sync new users
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (user) {
            await syncUserToFirestore(user);
          }
        });

        setInitialized(true);
        return unsubscribe;
      } catch (error) {
        console.error('Error initializing database:', error);
        setError('Failed to initialize the database');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [initialized]);

  // Effect to sync current user when they log in
  useEffect(() => {
    if (currentUser) {
      syncUserToFirestore(currentUser);
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat app...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex flex-col h-full">
        <button
          onClick={() => logout()}
          className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Logout
        </button>
        <Sidebar
          onRoomSelect={setSelectedRoomId}
          selectedRoomId={selectedRoomId}
        />
      </div>
      <div className="flex-1">
        {selectedRoomId ? (
          <ChatRoom roomId={selectedRoomId} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

function AuthenticatedApp() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <AuthPage />;
  }

  return <ChatInterface />;
}

export default App
