// ============================================================
// UI Helper Functions
// ============================================================
// Handles rendering notes, managing the sidebar, profile dropdown,
// and other visual updates. Keeps UI logic separate from data logic.
// ============================================================

var UI = (function () {

  // ---- Sidebar ----

  function setupSidebar() {
    var sidebar = document.getElementById('sidebar');
    var overlay = document.getElementById('sidebar-overlay');
    var toggle = document.getElementById('sidebar-toggle');
    var close = document.getElementById('sidebar-close');

    function openSidebar() {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    }

    function closeSidebar() {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }

    if (toggle) toggle.addEventListener('click', openSidebar);
    if (close) close.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    return { open: openSidebar, close: closeSidebar };
  }

  // ---- Profile Dropdown ----

  function setupProfileDropdown() {
    var btn = document.getElementById('profile-btn');
    var dropdown = document.getElementById('profile-dropdown');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      dropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', function (e) {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  // ---- Update Profile Display ----

  function updateProfileUI(user) {
    var avatar = document.getElementById('profile-avatar');
    var name = document.getElementById('profile-name');
    var dropdownAvatar = document.getElementById('dropdown-avatar');
    var dropdownName = document.getElementById('dropdown-name');
    var dropdownEmail = document.getElementById('dropdown-email');

    var displayName = user.displayName || 'User';
    var email = user.email || '';

    if (name) name.textContent = displayName;
    if (dropdownName) dropdownName.textContent = displayName;
    if (dropdownEmail) dropdownEmail.textContent = email;

    // Set avatar — use Google photo if available, otherwise show initials
    var photoURL = user.photoURL;
    if (photoURL) {
      if (avatar) { avatar.src = photoURL; avatar.alt = displayName; }
      if (dropdownAvatar) { dropdownAvatar.src = photoURL; dropdownAvatar.alt = displayName; }
    } else {
      // Create a simple initials avatar using a data URI
      var initials = getInitials(displayName);
      var dataUri = createInitialsAvatar(initials);
      if (avatar) { avatar.src = dataUri; avatar.alt = displayName; }
      if (dropdownAvatar) { dropdownAvatar.src = dataUri; dropdownAvatar.alt = displayName; }
    }
  }

  function getInitials(name) {
    var parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Creates a small SVG avatar with the user's initials
  function createInitialsAvatar(initials) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">' +
      '<rect width="80" height="80" rx="40" fill="%230074c8"/>' +
      '<text x="40" y="40" text-anchor="middle" dy=".35em" fill="white" font-family="Inter,system-ui,sans-serif" font-size="28" font-weight="600">' +
      initials + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  // ---- Render Notes List ----

  function renderNotesList(notes, selectedId, onSelect) {
    var container = document.getElementById('notes-list');
    var loading = document.getElementById('notes-loading');
    var empty = document.getElementById('notes-empty');

    if (loading) loading.classList.add('hidden');

    if (notes.length === 0) {
      container.classList.add('hidden');
      if (empty) empty.classList.remove('hidden');
      return;
    }

    container.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');

    container.innerHTML = notes.map(function (note) {
      var isSelected = note.id === selectedId;
      var preview = (note.content || '').substring(0, 100);
      var title = note.title || 'Untitled Note';
      var dateStr = formatDate(note.updatedAt);

      var tagsHtml = '';
      if (note.tags && note.tags.length > 0) {
        tagsHtml = '<div class="flex items-center gap-1.5 mt-2 flex-wrap">' +
          note.tags.map(function (tag) {
            return '<span class="text-xs px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">#' +
              escapeHtml(tag) + '</span>';
          }).join('') + '</div>';
      }

      var pinIcon = note.pinned
        ? '<svg class="w-3.5 h-3.5 text-brand-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>'
        : '';

      return '<button data-note-id="' + note.id + '" class="note-card w-full text-left p-4 rounded-xl border transition-all duration-150 ' +
        (isSelected
          ? 'bg-brand-50 dark:bg-brand-950/50 border-brand-200 dark:border-brand-800 shadow-sm'
          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-brand-200 dark:hover:border-brand-800 hover:shadow-sm') +
        '">' +
        '<div class="flex items-start justify-between gap-2">' +
        '<h3 class="font-medium text-sm truncate">' + escapeHtml(title) + '</h3>' +
        pinIcon +
        '</div>' +
        (preview ? '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">' + escapeHtml(preview) + '</p>' : '') +
        tagsHtml +
        '<p class="text-xs text-gray-400 mt-2">' + dateStr + '</p>' +
        '</button>';
    }).join('');

    // Attach click listeners to each card
    var cards = container.querySelectorAll('.note-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var noteId = card.getAttribute('data-note-id');
        onSelect(noteId);
      });
    });
  }

  // ---- Render Tags in Sidebar ----

  function renderTagsList(tags, activeTag, onTagClick) {
    var container = document.getElementById('tags-list');
    var noTags = document.getElementById('no-tags');

    if (tags.length === 0) {
      container.innerHTML = '';
      if (noTags) noTags.classList.remove('hidden');
      return;
    }

    if (noTags) noTags.classList.add('hidden');

    container.innerHTML = tags.map(function (tag) {
      var isActive = tag === activeTag;
      return '<button data-tag="' + escapeHtml(tag) + '" class="sidebar-tag-item w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-colors ' +
        (isActive
          ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800') +
        '">' +
        '<span class="text-xs">#</span>' +
        escapeHtml(tag) +
        '</button>';
    }).join('');

    var btns = container.querySelectorAll('.sidebar-tag-item');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        onTagClick(btn.getAttribute('data-tag'));
      });
    });
  }

  // ---- Render Tags in Editor ----

  function renderEditorTags(tags, onRemove) {
    var container = document.getElementById('note-tags');
    if (!container) return;

    container.innerHTML = tags.map(function (tag) {
      return '<span class="inline-flex items-center gap-1 text-sm px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">' +
        '#' + escapeHtml(tag) +
        '<button data-remove-tag="' + escapeHtml(tag) + '" class="hover:text-red-500 transition-colors ml-0.5" aria-label="Remove tag ' + escapeHtml(tag) + '">' +
        '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>' +
        '</button>' +
        '</span>';
    }).join('');

    var removeBtns = container.querySelectorAll('[data-remove-tag]');
    removeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        onRemove(btn.getAttribute('data-remove-tag'));
      });
    });
  }

  // ---- Update Sidebar Nav Active State ----

  function setActiveNav(filter) {
    var items = document.querySelectorAll('.sidebar-nav-item');
    items.forEach(function (item) {
      var f = item.getAttribute('data-filter');
      if (f === filter) {
        item.classList.add('bg-brand-50', 'dark:bg-brand-950', 'text-brand-600', 'dark:text-brand-400', 'font-medium');
        item.classList.remove('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
      } else {
        item.classList.remove('bg-brand-50', 'dark:bg-brand-950', 'text-brand-600', 'dark:text-brand-400', 'font-medium');
        item.classList.add('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
      }
    });

    // Also deactivate tag buttons when a main filter is chosen
    var tagItems = document.querySelectorAll('.sidebar-tag-item');
    tagItems.forEach(function (item) {
      item.classList.remove('bg-brand-50', 'dark:bg-brand-950', 'text-brand-600', 'dark:text-brand-400', 'font-medium');
      item.classList.add('text-gray-600', 'dark:text-gray-400', 'hover:bg-gray-100', 'dark:hover:bg-gray-800');
    });
  }

  // ---- Update Note Counts ----

  function updateCounts(allCount, pinnedCount, archivedCount) {
    var countAll = document.getElementById('count-all');
    var countPinned = document.getElementById('count-pinned');
    var countArchived = document.getElementById('count-archived');
    if (countAll) countAll.textContent = allCount || '';
    if (countPinned) countPinned.textContent = pinnedCount || '';
    if (countArchived) countArchived.textContent = archivedCount || '';
  }

  // ---- Update Panel Title ----

  function setPanelTitle(title, count) {
    var panelTitle = document.getElementById('panel-title');
    var panelCount = document.getElementById('panel-count');
    if (panelTitle) panelTitle.textContent = title;
    if (panelCount) panelCount.textContent = count > 0 ? count + ' note' + (count !== 1 ? 's' : '') : '';
  }

  // ---- Empty State Customization ----

  function setEmptyState(title, message) {
    var emptyTitle = document.getElementById('empty-title');
    var emptyMessage = document.getElementById('empty-message');
    if (emptyTitle) emptyTitle.textContent = title;
    if (emptyMessage) emptyMessage.textContent = message;
  }

  // ---- Save Status ----

  function setSaveStatus(status) {
    var el = document.getElementById('save-status');
    if (!el) return;
    if (status === 'saving') {
      el.textContent = 'Saving...';
      el.classList.remove('text-green-500');
      el.classList.add('text-gray-400');
    } else if (status === 'saved') {
      el.textContent = 'Saved';
      el.classList.remove('text-gray-400');
      el.classList.add('text-green-500');
    } else if (status === 'unsaved') {
      el.textContent = 'Unsaved changes';
      el.classList.remove('text-green-500');
      el.classList.add('text-gray-400');
    } else {
      el.textContent = '';
    }
  }

  // ---- Helpers ----

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(date) {
    if (!date) return '';
    var now = new Date();
    var d = date instanceof Date ? date : new Date(date);
    var diff = now - d;
    var mins = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);

    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    if (hours < 24) return hours + 'h ago';
    if (days < 7) return days + 'd ago';

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Return all public functions
  return {
    setupSidebar: setupSidebar,
    setupProfileDropdown: setupProfileDropdown,
    updateProfileUI: updateProfileUI,
    renderNotesList: renderNotesList,
    renderTagsList: renderTagsList,
    renderEditorTags: renderEditorTags,
    setActiveNav: setActiveNav,
    updateCounts: updateCounts,
    setPanelTitle: setPanelTitle,
    setEmptyState: setEmptyState,
    setSaveStatus: setSaveStatus,
    formatDate: formatDate,
    escapeHtml: escapeHtml
  };
})();
