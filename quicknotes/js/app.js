// ============================================================
// App Entry Point
// ============================================================
// This is the main file that starts the QuickNotes application.
// It checks if the user is signed in, and if so, sets up the
// entire app. If not, it redirects to the auth page.
//
// Think of this file as the "conductor" — it doesn't do the
// detailed work itself, but it tells the other modules when
// to start and connects user actions to the right functions.
// ============================================================

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var loadingScreen = document.getElementById('loading-screen');
    var appShell = document.getElementById('app-shell');

    // Check if Firebase is configured
    if (firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
      window.location.href = 'auth.html';
      return;
    }

    // Listen for auth state changes
    // Firebase checks if the user has a valid session
    auth.onAuthStateChanged(function (user) {
      if (!user) {
        // Not signed in — redirect to auth page
        window.location.href = 'auth.html';
        return;
      }

      // User is signed in — set up the app
      loadingScreen.classList.add('hidden');
      appShell.classList.remove('hidden');

      // Show user's profile info in the header
      UI.updateProfileUI(user);

      // Set up UI components
      var sidebar = UI.setupSidebar();
      UI.setupProfileDropdown();
      UI.setActiveNav('all');

      // Start the notes controller
      NotesController.init(user.uid);

      // ---- Wire Up Event Listeners ----

      // New Note buttons
      var newNoteBtn = document.getElementById('new-note-btn');
      var emptyNewNoteBtn = document.getElementById('empty-new-note-btn');
      if (newNoteBtn) newNoteBtn.addEventListener('click', function () {
        NotesController.createNote();
        sidebar.close();
      });
      if (emptyNewNoteBtn) emptyNewNoteBtn.addEventListener('click', function () {
        NotesController.createNote();
      });

      // Sidebar navigation filters
      var navItems = document.querySelectorAll('.sidebar-nav-item');
      navItems.forEach(function (item) {
        item.addEventListener('click', function () {
          var filter = item.getAttribute('data-filter');
          NotesController.setFilter(filter);
          sidebar.close();
        });
      });

      // Sign out
      var signoutBtn = document.getElementById('signout-btn');
      if (signoutBtn) {
        signoutBtn.addEventListener('click', function () {
          auth.signOut().then(function () {
            window.location.href = 'auth.html';
          });
        });
      }

      // Search (desktop)
      var searchInput = document.getElementById('search-input');
      if (searchInput) {
        var searchTimer;
        searchInput.addEventListener('input', function () {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(function () {
            NotesController.setSearchQuery(searchInput.value);
          }, 200);
        });
      }

      // Search (mobile)
      var mobileSearch = document.getElementById('mobile-search-input');
      if (mobileSearch) {
        var mobileSearchTimer;
        mobileSearch.addEventListener('input', function () {
          clearTimeout(mobileSearchTimer);
          mobileSearchTimer = setTimeout(function () {
            NotesController.setSearchQuery(mobileSearch.value);
            // Sync desktop search too
            if (searchInput) searchInput.value = mobileSearch.value;
          }, 200);
        });
      }

      // Editor: title and content changes trigger autosave
      var noteTitle = document.getElementById('note-title');
      var noteContent = document.getElementById('note-content');

      if (noteTitle) {
        noteTitle.addEventListener('input', function () {
          NotesController.scheduleAutosave();
        });
      }

      if (noteContent) {
        noteContent.addEventListener('input', function () {
          NotesController.scheduleAutosave();
          NotesController.autoResizeTextarea(noteContent);
        });
      }

      // Editor: pin, archive, delete buttons
      var btnPin = document.getElementById('btn-pin');
      var btnArchive = document.getElementById('btn-archive');
      var btnDelete = document.getElementById('btn-delete');
      if (btnPin) btnPin.addEventListener('click', NotesController.togglePin);
      if (btnArchive) btnArchive.addEventListener('click', NotesController.toggleArchive);
      if (btnDelete) btnDelete.addEventListener('click', NotesController.requestDelete);

      // Delete modal
      var deleteConfirm = document.getElementById('delete-confirm');
      var deleteCancel = document.getElementById('delete-cancel');
      if (deleteConfirm) deleteConfirm.addEventListener('click', NotesController.confirmDelete);
      if (deleteCancel) deleteCancel.addEventListener('click', NotesController.cancelDelete);

      // Close delete modal on backdrop click
      var deleteModal = document.getElementById('delete-modal');
      if (deleteModal) {
        deleteModal.addEventListener('click', function (e) {
          if (e.target === deleteModal) NotesController.cancelDelete();
        });
      }

      // Tag input — press Enter to add a tag
      var tagInput = document.getElementById('tag-input');
      if (tagInput) {
        tagInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            var value = tagInput.value.trim();
            if (value) {
              NotesController.addTag(value);
              tagInput.value = '';
            }
          }
        });
      }

      // Back button (mobile editor)
      var editorBack = document.getElementById('editor-back');
      if (editorBack) {
        editorBack.addEventListener('click', NotesController.goBack);
      }

      // Handle Escape key to close modals
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          NotesController.cancelDelete();
          var dropdown = document.getElementById('profile-dropdown');
          if (dropdown) dropdown.classList.add('hidden');
        }
      });
    });
  });
})();
