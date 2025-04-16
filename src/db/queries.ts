import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp,
  QuerySnapshot,
  DocumentSnapshot,
  setDoc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  FieldValue
} from 'firebase/firestore';

// Types
export interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastSeen: Timestamp;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  members: string[];
  isPrivate: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
}

// Interface for data being saved to Firestore
interface MessageData {
  roomId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  createdAt: FieldValue;
  updatedAt: FieldValue;
  fileUrl?: string;
}

// Helper function to convert document to typed data
const convertDoc = <T extends { id: string }>(doc: DocumentSnapshot): T | null => {
  if (!doc.exists()) return null;
  return { ...doc.data(), id: doc.id } as T;
};

const convertDocs = <T extends { id: string }>(snapshot: QuerySnapshot): T[] => {
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
};

// User queries
export const getUserById = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return convertDoc<User>(userDoc);
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('Fetching all users from Firestore...');
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);
    console.log('Found', usersSnapshot.size, 'users in Firestore');
    
    const users = convertDocs<User>(usersSnapshot);
    
    // Log each user for debugging
    users.forEach(user => {
      console.log('User found:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Room queries
export const getRoomById = async (roomId: string): Promise<Room | null> => {
  const roomDoc = await getDoc(doc(db, 'rooms', roomId));
  return convertDoc<Room>(roomDoc);
};

export const getRoomsByMember = async (userId: string): Promise<Room[]> => {
  try {
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', userId)
    );
    const roomsSnapshot = await getDocs(roomsQuery);
    return convertDocs<Room>(roomsSnapshot);
  } catch (error) {
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Missing index for rooms query. Please create the required index.');
      return [];
    }
    throw error;
  }
};

export const getPublicRooms = async (): Promise<Room[]> => {
  try {
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('isPrivate', '==', false)
    );
    const roomsSnapshot = await getDocs(roomsQuery);
    return convertDocs<Room>(roomsSnapshot);
  } catch (error) {
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Missing index for public rooms query. Please create the required index.');
      return [];
    }
    throw error;
  }
};

// Message queries
export const getMessageById = async (messageId: string): Promise<Message | null> => {
  const messageDoc = await getDoc(doc(db, 'messages', messageId));
  return convertDoc<Message>(messageDoc);
};

export const getMessagesByRoom = async (
  roomId: string, 
  messageLimit: number = 50
): Promise<Message[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(messageLimit)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    return convertDocs<Message>(messagesSnapshot);
  } catch (error) {
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Missing index for messages query. Please create the required index.');
      console.log('Falling back to unordered query...');
      // Fallback to a simple query without ordering
      const fallbackQuery = query(
        collection(db, 'messages'),
        where('roomId', '==', roomId),
        firestoreLimit(messageLimit)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const messages = convertDocs<Message>(fallbackSnapshot);
      // Sort messages in memory
      return messages.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }
    throw error;
  }
};

export const getMessagesByUser = async (
  userId: string,
  messageLimit: number = 50
): Promise<Message[]> => {
  try {
    const messagesQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(messageLimit)
    );
    const messagesSnapshot = await getDocs(messagesQuery);
    return convertDocs<Message>(messagesSnapshot);
  } catch (error) {
    if (error instanceof Error && error.message.includes('index')) {
      console.error('Missing index for messages query. Please create the required index.');
      console.log('Falling back to unordered query...');
      // Fallback to a simple query without ordering
      const fallbackQuery = query(
        collection(db, 'messages'),
        where('senderId', '==', userId),
        firestoreLimit(messageLimit)
      );
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const messages = convertDocs<Message>(fallbackSnapshot);
      // Sort messages in memory
      return messages.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }
    throw error;
  }
};

// User creation and queries
export const createUser = async (userData: {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}) => {
  try {
    console.log('Creating user document for:', userData.uid);
    const userRef = doc(db, 'users', userData.uid);
    
    // Check if user already exists
    const existingUser = await getDoc(userRef);
    if (existingUser.exists()) {
      console.log('User document already exists, updating...');
    }

    // Prepare user data with required fields
    const userDataToSave = {
      ...userData,
      id: userData.uid,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };

    // Remove photoURL if it's undefined
    if (!userData.photoURL) {
      delete userDataToSave.photoURL;
    }

    // Create or update the user document
    await setDoc(userRef, userDataToSave);
    console.log('User document created/updated successfully');

    return userDataToSave;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw new Error('Failed to create user document in Firestore');
  }
};

// Real-time listeners
export const subscribeToMessages = (
  roomId: string,
  messageLimit: number = 50,
  onUpdate: (messages: Message[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    console.log('Setting up message subscription for room:', roomId);
    
    // Use a simple query without ordering
    const messagesQuery = query(
      collection(db, 'messages'),
      where('roomId', '==', roomId)
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const messages = convertDocs<Message>(snapshot)
          .filter(message => message && message.createdAt) // Filter out null/invalid messages
          .sort((a, b) => {
            // Safely handle potential null values
            const timeA = a?.createdAt?.toMillis() ?? 0;
            const timeB = b?.createdAt?.toMillis() ?? 0;
            return timeB - timeA;
          });

        if (messageLimit) {
          messages.length = Math.min(messages.length, messageLimit);
        }
        console.log(`Received ${messages.length} messages for room:`, roomId);
        onUpdate(messages);
      },
      (error) => {
        console.error('Error in messages subscription:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('Error setting up messages subscription:', error);
    if (error instanceof Error && onError) onError(error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const subscribeToRooms = (
  userId: string,
  onUpdate: (rooms: Room[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const roomsQuery = query(
      collection(db, 'rooms'),
      where('members', 'array-contains', userId)
    );

    return onSnapshot(
      roomsQuery,
      (snapshot) => {
        const rooms = convertDocs<Room>(snapshot)
          .filter(room => room && room.lastMessageAt) // Filter out null/invalid rooms
          .sort((a, b) => {
            // Safely handle potential null values
            const timeA = a?.lastMessageAt?.toMillis() ?? 0;
            const timeB = b?.lastMessageAt?.toMillis() ?? 0;
            return timeB - timeA;
          });
        onUpdate(rooms);
      },
      (error) => {
        console.error('Error in rooms subscription:', error);
        if (onError) onError(error);
      }
    );
  } catch (error) {
    console.error('Error setting up rooms subscription:', error);
    if (error instanceof Error && onError) onError(error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

// Message creation
export const sendMessage = async (
  roomId: string,
  senderId: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  fileUrl?: string
): Promise<string> => {
  try {
    const messageData: MessageData = {
      roomId,
      senderId,
      content,
      type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Only add fileUrl if it exists
    if (fileUrl !== undefined) {
      messageData.fileUrl = fileUrl;
    }

    // Add the message
    const messageRef = await addDoc(collection(db, 'messages'), messageData);

    // Update the room's lastMessageAt
    const roomRef = doc(db, 'rooms', roomId);
    await setDoc(roomRef, {
      lastMessageAt: serverTimestamp()
    }, { merge: true });

    return messageRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    throw new Error('Failed to send message');
  }
}; 