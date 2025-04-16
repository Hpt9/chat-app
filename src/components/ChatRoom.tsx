import { useState, useEffect, useRef } from 'react';
import { Message, Room, subscribeToMessages, sendMessage, getRoomById } from '../db/queries';
import { useAuth } from '../context/AuthContext';

interface ChatRoomProps {
  roomId: string;
}

export const ChatRoom = ({ roomId }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth();

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadRoom = async () => {
      try {
        console.log('Loading room data for:', roomId);
        const roomData = await getRoomById(roomId);
        if (roomData) {
          console.log('Room data loaded:', roomData.name);
          setRoom(roomData);
        } else {
          console.error('Room not found:', roomId);
          setError('Room not found');
        }
      } catch (err) {
        console.error('Error loading room:', err);
        setError('Failed to load room');
      }
    };

    loadRoom();
  }, [roomId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMessageError(null);

    console.log('Setting up message subscription for room:', roomId);
    
    // Subscribe to messages
    const unsubscribe = subscribeToMessages(
      roomId,
      50,
      (updatedMessages) => {
        console.log(`Received ${updatedMessages.length} messages`);
        setMessages(updatedMessages);
        setLoading(false);
        setMessageError(null);
        // Scroll to bottom when new messages arrive
        scrollToBottom();
      },
      (error) => {
        console.error('Error in messages subscription:', error);
        setMessageError('Failed to load messages. Please try again.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or room change
    return () => {
      console.log('Cleaning up message subscription');
      unsubscribe();
    };
  }, [roomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newMessage.trim() || !roomId) return;

    try {
      setMessageError(null);
      await sendMessage(roomId, currentUser.uid, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageError('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-500">
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
    <div className="flex-1 flex flex-col h-screen">
      {/* Chat Header */}
      <div className="bg-white border-b px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-800">{room?.name}</h2>
        <p className="text-sm text-gray-500">{room?.description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageError && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-center">
            {messageError}
            <button
              onClick={() => window.location.reload()}
              className="ml-2 text-blue-500 hover:underline"
            >
              Retry
            </button>
          </div>
        )}
        
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-4">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg px-4 py-2 ${
                  message.senderId === currentUser?.uid
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p>{message.content}</p>
                <span className="text-xs opacity-75">
                  {message.createdAt.toDate().toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="bg-white border-t p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}; 