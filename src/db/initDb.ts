import { db } from '../firebase';
import { collection, doc, setDoc, serverTimestamp, getDocs, FieldValue, Timestamp } from 'firebase/firestore';

// Types for our database structure
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp | FieldValue;
  lastSeen: Timestamp | FieldValue;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp | FieldValue;
  lastMessageAt: Timestamp | FieldValue;
  members: string[];
  isPrivate: boolean;
}

interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
}

// Function to create a new user
export const createUser = async (userData: Omit<User, 'createdAt' | 'lastSeen'>) => {
  const userRef = doc(db, 'users', userData.uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });
};

// Function to create a new room
export const createRoom = async (roomData: Omit<Room, 'id' | 'createdAt' | 'lastMessageAt'>) => {
  const roomRef = doc(collection(db, 'rooms'));
  await setDoc(roomRef, {
    ...roomData,
    id: roomRef.id,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
  });
  return roomRef.id;
};

// Function to create a new message
export const createMessage = async (messageData: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => {
  const messageRef = doc(collection(db, 'messages'));
  await setDoc(messageRef, {
    ...messageData,
    id: messageRef.id,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return messageRef.id;
};

// Function to initialize the database with some sample data
export const initializeDatabase = async () => {
  try {
    // Check if there are any existing users
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    
    // Only create sample data if there are no users
    if (usersSnapshot.empty) {
      console.log('No existing users found. Creating sample data...');
      
      // Create sample users
      const user1 = {
        uid: 'user1',
        email: 'user1@example.com',
        displayName: 'John Doe',
        photoURL: 'https://example.com/photo1.jpg',
      };

      const user2 = {
        uid: 'user2',
        email: 'user2@example.com',
        displayName: 'Jane Smith',
        photoURL: 'https://example.com/photo2.jpg',
      };

      await createUser(user1);
      await createUser(user2);

      // Create a sample room
      const roomId = await createRoom({
        name: 'General Chat',
        description: 'A room for general discussion',
        createdBy: user1.uid,
        members: [user1.uid, user2.uid],
        isPrivate: false,
      });

      // Create sample messages
      await createMessage({
        roomId,
        senderId: user1.uid,
        content: 'Hello everyone!',
        type: 'text',
      });

      await createMessage({
        roomId,
        senderId: user2.uid,
        content: 'Hi John! How are you?',
        type: 'text',
      });

      console.log('Database initialized with sample data successfully!');
    } else {
      console.log('Database already contains users, skipping sample data creation.');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};


// Call this function when you want to initialize the database
