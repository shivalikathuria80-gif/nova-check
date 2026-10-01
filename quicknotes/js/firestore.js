// ============================================================
// Firestore Database Operations
// ============================================================
// This file handles all communication with Cloud Firestore,
// which is Firebase's database service.
//
// Think of Firestore like a filing cabinet:
//   - "users" is a drawer
//   - Each user has their own folder (identified by their UID)
//   - Inside that folder, "notes" is a sub-drawer
//   - Each note is a document (a piece of paper with data)
//
// Structure:
//   users/{uid}/notes/{noteId}
//
// This means each user's notes are completely separate from
// other users' notes.
// ============================================================

var FirestoreService = (function () {

  // Get a reference to the current user's notes collection
  function getNotesRef(userId) {
    return db.collection('users').doc(userId).collection('notes');
  }

  // ---- CREATE ----
  // Creates a new note in Firestore and returns the note data with its ID
  function createNote(userId) {
    var notesRef = getNotesRef(userId);
    var now = firebase.firestore.FieldValue.serverTimestamp();

    var noteData = {
      title: '',
      content: '',
      tags: [],
      pinned: false,
      archived: false,
      userId: userId,
      createdAt: now,
      updatedAt: now
    };

    return notesRef.add(noteData).then(function (docRef) {
      // Return the note with its generated ID
      return Object.assign({}, noteData, {
        id: docRef.id,
        // Use local timestamps for immediate display
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }

  // ---- READ ALL ----
  // Loads all notes for a user, ordered by most recently updated
  function loadNotes(userId) {
    return getNotesRef(userId)
      .orderBy('updatedAt', 'desc')
      .get()
      .then(function (snapshot) {
        var notes = [];
        snapshot.forEach(function (doc) {
          var data = doc.data();
          notes.push(Object.assign({}, data, {
            id: doc.id,
            // Convert Firestore timestamps to JavaScript dates
            createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
            updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date()
          }));
        });
        return notes;
      });
  }

  // ---- UPDATE ----
  // Saves changes to an existing note
  function updateNote(userId, noteId, changes) {
    changes.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
    return getNotesRef(userId).doc(noteId).update(changes);
  }

  // ---- DELETE ----
  // Permanently removes a note from Firestore
  function deleteNote(userId, noteId) {
    return getNotesRef(userId).doc(noteId).delete();
  }

  // Return the public functions so other files can use them
  return {
    createNote: createNote,
    loadNotes: loadNotes,
    updateNote: updateNote,
    deleteNote: deleteNote
  };
})();
