import { useState, useEffect } from 'react';
import { User, Room, getAllUsers, subscribeToRooms } from '../db/queries';
import { createRoom } from '../db/initDb';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
}

export const Sidebar = ({ onRoomSelect, selectedRoomId }: SidebarProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Load users once
        console.log('Fetching all users...');
        const fetchedUsers = await getAllUsers();
        console.log('Fetched users:', fetchedUsers);
        
        // Filter out the current user and any invalid users
        const otherUsers = fetchedUsers.filter(user => {
          const isValid = user && user.uid && user.displayName;
          const isNotCurrentUser = user.uid !== currentUser.uid;
          return isValid && isNotCurrentUser;
        });
        
        console.log('Filtered users to show:', otherUsers);
        setUsers(otherUsers);
        
        // Subscribe to rooms
        unsubscribe = subscribeToRooms(
          currentUser.uid,
          (updatedRooms) => {
            setRooms(updatedRooms);
            setLoading(false);
          },
          (error) => {
            console.error('Error in rooms subscription:', error);
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error loading sidebar data:', error);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  const startNewChat = async (otherUser: User) => {
    if (!currentUser || creatingChat) return;

    try {
      setCreatingChat(true);
      
      // Check if a chat already exists with this user
      const existingRoom = rooms.find(room => 
        room.members.length === 2 && 
        room.members.includes(currentUser.uid) && 
        room.members.includes(otherUser.uid)
      );

      if (existingRoom) {
        onRoomSelect(existingRoom.id);
        setActiveTab('chats');
        return;
      }

      // Create a new room
      const roomId = await createRoom({
        name: `${currentUser.displayName} & ${otherUser.displayName}`,
        description: 'Private chat',
        createdBy: currentUser.uid,
        members: [currentUser.uid, otherUser.uid],
        isPrivate: true,
      });

      // Switch to the new chat
      onRoomSelect(roomId);
      setActiveTab('chats');
    } catch (error) {
      console.error('Error creating new chat:', error);
    } finally {
      setCreatingChat(false);
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-gray-100 h-screen p-4">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white h-screen flex flex-col border-r">
      {/* Header */}
      <div className="bg-gray-100 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold">
              {currentUser?.displayName?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {currentUser?.displayName || 'User'}
            </h1>
            <p className="text-sm text-gray-500">{currentUser?.email}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'chats'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('chats')}
        >
          CHATS
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === 'contacts'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('contacts')}
        >
          CONTACTS
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'chats' ? (
          <div className="divide-y">
            {rooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No chats yet. Start a conversation from the Contacts tab!
              </div>
            ) : (
              rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 flex items-start ${
                    selectedRoomId === room.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-semibold">
                      {room.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {room.name}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {room.lastMessageAt?.toDate().toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {room.description || 'No messages yet'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y">
            {users.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No other users found
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startNewChat(user)}
                  disabled={creatingChat}
                  className="w-full p-4 flex items-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <span className="text-gray-600 font-semibold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {user.displayName}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="ml-4">
                    <span className="text-blue-600 text-sm">Start Chat</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 