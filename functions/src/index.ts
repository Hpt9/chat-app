import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const createRequiredIndexes = functions.https.onRequest(async (req, res) => {
  try {
    const firestore = admin.firestore();
    
    // Create index for messages (roomId + createdAt)
    await firestore.collection('messages').doc('dummy').set({
      roomId: 'dummy',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create a few dummy messages to trigger index creation
    const batch = firestore.batch();
    const dummyMessages = [
      {
        roomId: 'dummy',
        senderId: 'dummy',
        content: 'dummy',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        roomId: 'dummy',
        senderId: 'dummy',
        content: 'dummy2',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    // Add dummy messages
    for (const message of dummyMessages) {
      const docRef = firestore.collection('messages').doc();
      batch.set(docRef, message);
    }

    await batch.commit();

    // Query that will trigger index creation
    await firestore.collection('messages')
      .where('roomId', '==', 'dummy')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    await firestore.collection('messages')
      .where('senderId', '==', 'dummy')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    // Clean up dummy data
    const querySnapshot = await firestore.collection('messages')
      .where('roomId', '==', 'dummy')
      .get();

    const cleanupBatch = firestore.batch();
    querySnapshot.docs.forEach(doc => {
      cleanupBatch.delete(doc.ref);
    });

    await cleanupBatch.commit();

    res.json({ 
      success: true, 
      message: 'Index creation triggered. Please wait a few minutes for the indexes to be built.' 
    });
  } catch (error) {
    console.error('Error creating indexes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create indexes' 
    });
  }
}); 