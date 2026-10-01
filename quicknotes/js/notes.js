// ============================================================
// Notes Controller
// ============================================================
// This is the "brain" of the notes feature. It coordinates between:
//   - Firestore (database) — where notes are stored
//   - UI (rendering) — what the user sees
//   - User actions — create, edit, delete, pin, archive, search
//
// It keeps a local copy of notes in memory so the app feels fast,
// but all changes are saved to Firestore (the real source of truth).
// ============================================================

var NotesController = (function () {
  var notes = [];           // All notes loaded from Firestore
  var currentFilter = 'all'; // Current view: 'all', 'pinned', 'archived', or a tag name
  var currentTag = null;     // When filtering by tag
  var selectedNoteId = null; // The note currently open in the editor
  var searchQuery = '';      // Current search text
  var saveTimer = null;      // Debounce timer for autosave
  var userId = null;         // The current user's Firebase UID

  // ---- Initialize ----
  function init(uid) {
    userId = uid;
    loadAllNotes();
  }

  // ---- Load Notes from Firestore ----
  function loadAllNotes() {
    var loading = document.getElementById('notes-loading');
    var notesList = document.getElementById('notes-list');
    var empty = document.getElementById('notes-empty');

    // Show loading state
    if (loading) loading.classList.remove('hidden');
    if (notesList) notesList.classList.add('hidden');
    if (empty) empty.classList.add('hidden');

    FirestoreService.loadNotes(userId)
      .then(function (loadedNotes) {
        notes = loadedNotes;
        refreshView();
      })
      .catch(function (error) {
        console.error('Failed to load notes:', error);
        if (loading) loading.classList.add('hidden');
        UI.setEmptyState('Could not load notes', 'There was a problem connecting to the database. Please refresh the page.');
        if (empty) empty.classList.remove('hidden');
      });
  }

  // ---- Create a New Note ----
  function createNote() {
    FirestoreService.createNote(userId)
      .then(function (newNote) {
        // Add to the beginning of our local list
        notes.unshift(newNote);
        // Switch to "All Notes" view and select the new note
        currentFilter = 'all';
        currentTag = null;
        searchQuery = '';
        var searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = '';
        var mobileSearch = document.getElementById('mobile-search-input');
        if (mobileSearch) mobileSearch.value = '';

        selectNote(newNote.id);
        refreshView();

        // Focus the title field so the user can start typing immediately
        var titleInput = document.getElementById('note-title');
        if (titleInput) titleInput.focus();
      })
      .catch(function (error) {
        console.error('Failed to create note:', error);
        alert('Could not create note. Please try again.');
      });
  }

  // ---- Select a Note (open it in the editor) ----
  function selectNote(noteId) {
    selectedNoteId = noteId;
    var note = notes.find(function (n) { return n.id === noteId; });

    var editorPanel = document.getElementById('note-editor-panel');
    var editorEmpty = document.getElementById('editor-empty');
    var editorActive = document.getElementById('editor-active');
    var notesListPanel = document.getElementById('notes-list-panel');

    if (!note) {
      // No note selected — show empty editor
      if (editorEmpty) editorEmpty.classList.remove('hidden');
      if (editorActive) editorActive.classList.add('hidden');
      return;
    }

    // Show editor on mobile (hide notes list)
    if (window.innerWidth < 768) {
      if (notesListPanel) notesListPanel.classList.add('hidden');
      if (editorPanel) { editorPanel.classList.remove('hidden'); editorPanel.classList.add('flex'); }
    }

    if (editorEmpty) editorEmpty.classList.add('hidden');
    if (editorActive) editorActive.classList.remove('hidden');

    // Fill in the editor fields
    var titleInput = document.getElementById('note-title');
    var contentInput = document.getElementById('note-content');
    var updatedEl = document.getElementById('note-updated');

    if (titleInput) titleInput.value = note.title || '';
    if (contentInput) contentInput.value = note.content || '';
    if (updatedEl) updatedEl.textContent = 'Last updated ' + UI.formatDate(note.updatedAt);

    // Render tags
    UI.renderEditorTags(note.tags || [], removeTag);

    // Update pin/archive button appearance
    updateEditorButtons(note);

    // Auto-resize textarea
    autoResizeTextarea(contentInput);

    UI.setSaveStatus('');

    // Update the list to show which note is selected
    refreshNotesList();
  }

  // ---- Go Back (mobile) ----
  function goBack() {
    var notesListPanel = document.getElementById('notes-list-panel');
    var editorPanel = document.getElementById('note-editor-panel');

    if (notesListPanel) notesListPanel.classList.remove('hidden');
    if (editorPanel) { editorPanel.classList.add('hidden'); editorPanel.classList.remove('flex'); }
  }

  // ---- Autosave with Debounce ----
  // "Debounce" means: wait until the user stops typing for a moment,
  // then save. This prevents saving on every single keystroke.
  function scheduleAutosave() {
    if (saveTimer) clearTimeout(saveTimer);
    UI.setSaveStatus('unsaved');

    saveTimer = setTimeout(function () {
      saveCurrentNote();
    }, 800); // Wait 800ms after the user stops typing
  }

  function saveCurrentNote() {
    if (!selectedNoteId) return;
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) return;

    var titleInput = document.getElementById('note-title');
    var contentInput = document.getElementById('note-content');

    var newTitle = titleInput ? titleInput.value : note.title;
    var newContent = contentInput ? contentInput.value : note.content;

    // Update local copy
    note.title = newTitle;
    note.content = newContent;
    note.updatedAt = new Date();

    UI.setSaveStatus('saving');

    FirestoreService.updateNote(userId, selectedNoteId, {
      title: newTitle,
      content: newContent
    })
      .then(function () {
        UI.setSaveStatus('saved');
        refreshNotesList();
        refreshTagsList();
      })
      .catch(function (error) {
        console.error('Failed to save note:', error);
        UI.setSaveStatus('unsaved');
      });
  }

  // ---- Pin/Unpin ----
  function togglePin() {
    if (!selectedNoteId) return;
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) return;

    note.pinned = !note.pinned;
    note.updatedAt = new Date();
    updateEditorButtons(note);

    FirestoreService.updateNote(userId, selectedNoteId, { pinned: note.pinned })
      .then(function () {
        refreshView();
      })
      .catch(function (error) {
        console.error('Failed to pin note:', error);
        note.pinned = !note.pinned; // revert
        updateEditorButtons(note);
      });
  }

  // ---- Archive/Unarchive ----
  function toggleArchive() {
    if (!selectedNoteId) return;
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) return;

    note.archived = !note.archived;
    note.updatedAt = new Date();
    updateEditorButtons(note);

    FirestoreService.updateNote(userId, selectedNoteId, { archived: note.archived })
      .then(function () {
        // If we archived and we're not viewing archived, deselect
        if (note.archived && currentFilter !== 'archived') {
          selectedNoteId = null;
          var editorEmpty = document.getElementById('editor-empty');
          var editorActive = document.getElementById('editor-active');
          if (editorEmpty) editorEmpty.classList.remove('hidden');
          if (editorActive) editorActive.classList.add('hidden');
          goBack();
        }
        refreshView();
      })
      .catch(function (error) {
        console.error('Failed to archive note:', error);
        note.archived = !note.archived;
        updateEditorButtons(note);
      });
  }

  // ---- Delete ----
  function requestDelete() {
    if (!selectedNoteId) return;
    var modal = document.getElementById('delete-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function confirmDelete() {
    if (!selectedNoteId) return;
    var noteId = selectedNoteId;

    var modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');

    FirestoreService.deleteNote(userId, noteId)
      .then(function () {
        // Remove from local list
        notes = notes.filter(function (n) { return n.id !== noteId; });
        selectedNoteId = null;

        // Reset editor
        var editorEmpty = document.getElementById('editor-empty');
        var editorActive = document.getElementById('editor-active');
        if (editorEmpty) editorEmpty.classList.remove('hidden');
        if (editorActive) editorActive.classList.add('hidden');

        goBack();
        refreshView();
      })
      .catch(function (error) {
        console.error('Failed to delete note:', error);
        alert('Could not delete note. Please try again.');
      });
  }

  function cancelDelete() {
    var modal = document.getElementById('delete-modal');
    if (modal) modal.classList.add('hidden');
  }

  // ---- Tags ----
  function addTag(tagName) {
    if (!selectedNoteId) return;
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note) return;

    var tag = tagName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!tag || (note.tags && note.tags.includes(tag))) return;

    if (!note.tags) note.tags = [];
    note.tags.push(tag);
    note.updatedAt = new Date();

    UI.renderEditorTags(note.tags, removeTag);

    FirestoreService.updateNote(userId, selectedNoteId, { tags: note.tags })
      .then(function () {
        refreshNotesList();
        refreshTagsList();
      });
  }

  function removeTag(tagName) {
    if (!selectedNoteId) return;
    var note = notes.find(function (n) { return n.id === selectedNoteId; });
    if (!note || !note.tags) return;

    note.tags = note.tags.filter(function (t) { return t !== tagName; });
    note.updatedAt = new Date();

    UI.renderEditorTags(note.tags, removeTag);

    FirestoreService.updateNote(userId, selectedNoteId, { tags: note.tags })
      .then(function () {
        refreshNotesList();
        refreshTagsList();
      });
  }

  // ---- Search ----
  function setSearchQuery(query) {
    searchQuery = query.toLowerCase().trim();
    refreshView();
  }

  // ---- Filter ----
  function setFilter(filter) {
    currentFilter = filter;
    currentTag = null;
    searchQuery = '';
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    var mobileSearch = document.getElementById('mobile-search-input');
    if (mobileSearch) mobileSearch.value = '';
    UI.setActiveNav(filter);
    refreshView();
  }

  function setTagFilter(tag) {
    currentFilter = 'tag';
    currentTag = tag;
    searchQuery = '';
    var searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    var mobileSearch = document.getElementById('mobile-search-input');
    if (mobileSearch) mobileSearch.value = '';

    // Remove active state from nav items
    UI.setActiveNav(null);

    refreshView();
  }

  // ---- View Refresh ----
  function refreshView() {
    updateCounts();
    updatePanelTitle();
    refreshNotesList();
    refreshTagsList();
  }

  function getFilteredNotes() {
    var filtered = notes;

    // Apply filter
    if (currentFilter === 'all') {
      filtered = filtered.filter(function (n) { return !n.archived; });
    } else if (currentFilter === 'pinned') {
      filtered = filtered.filter(function (n) { return n.pinned && !n.archived; });
    } else if (currentFilter === 'archived') {
      filtered = filtered.filter(function (n) { return n.archived; });
    } else if (currentFilter === 'tag' && currentTag) {
      filtered = filtered.filter(function (n) {
        return !n.archived && n.tags && n.tags.includes(currentTag);
      });
    }

    // Apply search
    if (searchQuery) {
      filtered = filtered.filter(function (n) {
        var title = (n.title || '').toLowerCase();
        var content = (n.content || '').toLowerCase();
        var tags = (n.tags || []).join(' ').toLowerCase();
        return title.includes(searchQuery) || content.includes(searchQuery) || tags.includes(searchQuery);
      });
    }

    // Sort: pinned first, then by updatedAt
    filtered.sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

    return filtered;
  }

  function refreshNotesList() {
    var filtered = getFilteredNotes();
    UI.renderNotesList(filtered, selectedNoteId, selectNote);
  }

  function refreshTagsList() {
    // Collect all unique tags from all non-archived notes
    var tagSet = {};
    notes.forEach(function (n) {
      if (n.tags) {
        n.tags.forEach(function (t) { tagSet[t] = true; });
      }
    });
    var allTags = Object.keys(tagSet).sort();
    UI.renderTagsList(allTags, currentTag, setTagFilter);
  }

  function updateCounts() {
    var allCount = notes.filter(function (n) { return !n.archived; }).length;
    var pinnedCount = notes.filter(function (n) { return n.pinned && !n.archived; }).length;
    var archivedCount = notes.filter(function (n) { return n.archived; }).length;
    UI.updateCounts(allCount, pinnedCount, archivedCount);
  }

  function updatePanelTitle() {
    var filtered = getFilteredNotes();
    var title = 'All Notes';
    if (currentFilter === 'pinned') title = 'Pinned';
    else if (currentFilter === 'archived') title = 'Archived';
    else if (currentFilter === 'tag' && currentTag) title = '#' + currentTag;

    if (searchQuery) title = 'Search Results';

    UI.setPanelTitle(title, filtered.length);

    // Update empty state text
    if (currentFilter === 'pinned') {
      UI.setEmptyState('Nothing pinned yet', 'Pin important notes to find them quickly.');
    } else if (currentFilter === 'archived') {
      UI.setEmptyState('No archived notes', 'Archive notes you want to keep but hide from your main view.');
    } else if (searchQuery) {
      UI.setEmptyState('No notes found', 'Try another search term.');
    } else if (currentFilter === 'tag') {
      UI.setEmptyState('No notes with this tag', 'Add this tag to notes to see them here.');
    } else {
      UI.setEmptyState('Your canvas is empty', 'Create your first note and start capturing your ideas.');
    }
  }

  // ---- Editor Buttons ----
  function updateEditorButtons(note) {
    var pinBtn = document.getElementById('btn-pin');
    var archiveBtn = document.getElementById('btn-archive');

    if (pinBtn) {
      if (note.pinned) {
        pinBtn.classList.add('text-brand-600', 'dark:text-brand-400');
        pinBtn.classList.remove('text-gray-400');
        pinBtn.title = 'Unpin note';
        // Fill the bookmark icon
        pinBtn.innerHTML = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>';
      } else {
        pinBtn.classList.remove('text-brand-600', 'dark:text-brand-400');
        pinBtn.classList.add('text-gray-400');
        pinBtn.title = 'Pin note';
        pinBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>';
      }
    }

    if (archiveBtn) {
      if (note.archived) {
        archiveBtn.classList.add('text-yellow-600', 'dark:text-yellow-400');
        archiveBtn.classList.remove('text-gray-400');
        archiveBtn.title = 'Unarchive note';
      } else {
        archiveBtn.classList.remove('text-yellow-600', 'dark:text-yellow-400');
        archiveBtn.classList.add('text-gray-400');
        archiveBtn.title = 'Archive note';
      }
    }
  }

  // ---- Textarea Auto-Resize ----
  function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(200, textarea.scrollHeight) + 'px';
  }

  // Return public functions
  return {
    init: init,
    createNote: createNote,
    selectNote: selectNote,
    goBack: goBack,
    scheduleAutosave: scheduleAutosave,
    togglePin: togglePin,
    toggleArchive: toggleArchive,
    requestDelete: requestDelete,
    confirmDelete: confirmDelete,
    cancelDelete: cancelDelete,
    addTag: addTag,
    setSearchQuery: setSearchQuery,
    setFilter: setFilter,
    autoResizeTextarea: autoResizeTextarea
  };
})();
