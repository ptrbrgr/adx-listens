// Firebase setup
firebase.initializeApp({
  apiKey: "AIzaSyA4aED4LLNCK2wvC3oQJW7iew1RD_zxXZk",
  authDomain: "adx-tunes.firebaseapp.com",
  databaseURL: "https://adx-tunes-default-rtdb.firebaseio.com",
  projectId: "adx-tunes",
  storageBucket: "adx-tunes.firebasestorage.app",
  messagingSenderId: "748177956148",
  appId: "1:748177956148:web:557ae22004e381a72bd961",
});

const db = firebase.database();
const albumsRef = db.ref('albums');

const ALBUM_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#e84393', '#00b894', '#6c5ce7',
  '#fd79a8', '#0984e3', '#d63031', '#a29bfe', '#00cec9',
  '#fab1a0', '#74b9ff', '#55efc4', '#636e72', '#2d3436',
];

const crate = document.getElementById('crate');
const modal = document.getElementById('modal');
const addBtn = document.getElementById('addRecordBtn');
const cancelBtn = document.getElementById('cancelBtn');
const form = document.getElementById('albumForm');
const descInput = document.getElementById('albumDesc');
const charCount = document.getElementById('charCount');
const sidebar = document.getElementById('sidebar');

var editingKey = null;
var activeGenreFilter = 'all';
var currentAlbumsData = null;

function randomColor() {
  return ALBUM_COLORS[Math.floor(Math.random() * ALBUM_COLORS.length)];
}

function buildSpotifySearchUrl(title, artist) {
  return 'https://open.spotify.com/search/' + encodeURIComponent(artist + ' ' + title);
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function createRecordEl(album, key) {
  var el = document.createElement('div');
  el.className = 'record';
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', album.title + ' by ' + album.artist + ' — added by ' + album.reader);

  var link = album.link || buildSpotifySearchUrl(album.title, album.artist);
  var typeLabel = album.type === 'song' ? '♪ Song' : '💿 Album';

  var actionsHtml = '';
  if (album.link) {
    actionsHtml += '<a href="' + escapeHtml(album.link) + '" target="_blank" rel="noopener" class="tt-link tt-spotify">Spotify</a>';
  }
  if (album.appleLink) {
    actionsHtml += '<a href="' + escapeHtml(album.appleLink) + '" target="_blank" rel="noopener" class="tt-link tt-apple">Apple</a>';
  }
  if (album.youtubeLink) {
    actionsHtml += '<a href="' + escapeHtml(album.youtubeLink) + '" target="_blank" rel="noopener" class="tt-link tt-youtube">YouTube</a>';
  }
  if (!actionsHtml) {
    actionsHtml = '<a href="' + escapeHtml(link) + '" target="_blank" rel="noopener" class="tt-link tt-spotify">Search Spotify</a>';
  }

  var labelContent = '';
  if (album.artwork) {
    labelContent = '<div class="cassette-label has-artwork"><img class="label-artwork" src="' + escapeHtml(album.artwork) + '" alt="' + escapeHtml(album.title) + '"></div>';
  } else {
    labelContent = '<div class="cassette-label"><div class="label-title">' + escapeHtml(album.title) + '</div><div class="label-artist">' + escapeHtml(album.artist) + '</div></div>';
  }

  el.innerHTML =
    '<div class="record-tooltip">' +
      '<div class="tt-title">' + escapeHtml(album.title) + '</div>' +
      '<div class="tt-artist">' + escapeHtml(album.artist) + ' · ' + typeLabel + '</div>' +
      (album.desc ? '<div class="tt-desc">' + escapeHtml(album.desc) + '</div>' : '') +
      '<div class="tt-reader">Added by ' + escapeHtml(album.reader) + '</div>' +
      '<div class="tt-actions">' + actionsHtml + '</div>' +
      '<div class="tt-actions tt-search-actions">' +
        '<a href="https://music.apple.com/search?term=' + encodeURIComponent(album.artist + ' ' + album.title) + '" target="_blank" rel="noopener" class="tt-link tt-apple">Search Apple</a>' +
        '<a href="https://www.youtube.com/results?search_query=' + encodeURIComponent(album.artist + ' ' + album.title) + '" target="_blank" rel="noopener" class="tt-link tt-youtube">Search YouTube</a>' +
      '</div>' +
      '<div class="tt-actions tt-manage-actions">' +
        '<button class="tt-edit-btn" data-key="' + key + '">Edit</button>' +
        '<button class="tt-remove-btn" data-key="' + key + '">Remove</button>' +
      '</div>' +
    '</div>' +
    '<div class="jewel-case">' +
      '<div class="case-glare"></div>' +
      '<div class="record-sleeve" style="background:' + album.color + '">' +
        (album.artwork ? '<img class="sleeve-artwork" src="' + escapeHtml(album.artwork) + '" alt="' + escapeHtml(album.title) + ' cover art">' : '') +
        '<div class="sleeve-title">' + escapeHtml(album.title) + '</div>' +
        '<div class="sleeve-artist">' + escapeHtml(album.artist) + '</div>' +
      '</div>' +
    '</div>';

  el.querySelector('.tt-link').addEventListener('click', function(e) {
    e.stopPropagation();
  });

  // Stop propagation on all links
  el.querySelectorAll('.tt-link').forEach(function(a) {
    a.addEventListener('click', function(e) { e.stopPropagation(); });
  });

  // Remove button
  el.querySelector('.tt-remove-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    if (confirm('Remove "' + album.title + '" from the crate?')) {
      albumsRef.child(key).remove();
    }
  });

  // Edit button
  el.querySelector('.tt-edit-btn').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('albumType').value = album.type || 'album';
    document.getElementById('albumTitle').value = album.title;
    document.getElementById('albumArtist').value = album.artist;
    document.getElementById('albumDesc').value = album.desc || '';
    document.getElementById('albumReader').value = album.reader;
    document.getElementById('albumLink').value = album.link || '';
    document.getElementById('appleLink').value = album.appleLink || '';
    document.getElementById('youtubeLink').value = album.youtubeLink || '';
    charCount.textContent = (album.desc || '').length;
    editingKey = key;
    modal.classList.add('active');
    document.getElementById('albumTitle').focus();
  });

  return el;
}

function renderAlbums(albumsObj) {
  crate.querySelectorAll('.record, .genre-section').forEach(function(r) { r.remove(); });
  if (!albumsObj) return;

  // Group by genre
  var genres = {};
  Object.entries(albumsObj).forEach(function(entry) {
    var key = entry[0];
    var album = entry[1];
    var genre = album.genre || 'Other';
    if (!genres[genre]) genres[genre] = [];
    genres[genre].push({ key: key, album: album });
  });

  // Update sidebar
  var existingButtons = sidebar.querySelectorAll('.genre-filter:not([data-genre="all"])');
  existingButtons.forEach(function(btn) { btn.remove(); });

  var genreNames = Object.keys(genres).sort(function(a, b) {
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return a.localeCompare(b);
  });

  genreNames.forEach(function(genre) {
    var btn = document.createElement('button');
    btn.className = 'genre-filter' + (activeGenreFilter === genre ? ' active' : '');
    btn.dataset.genre = genre;
    btn.textContent = genre + ' (' + genres[genre].length + ')';
    btn.addEventListener('click', function() {
      activeGenreFilter = genre;
      updateActiveFilter();
      renderAlbums(currentAlbumsData);
    });
    sidebar.appendChild(btn);
  });

  // Update "All" button
  var allBtn = sidebar.querySelector('[data-genre="all"]');
  allBtn.className = 'genre-filter' + (activeGenreFilter === 'all' ? ' active' : '');
  var totalCount = Object.keys(albumsObj).length;
  allBtn.textContent = 'All (' + totalCount + ')';

  // Filter genres to display
  var displayGenres = activeGenreFilter === 'all' ? genreNames : [activeGenreFilter];

  displayGenres.forEach(function(genre) {
    if (!genres[genre]) return;
    var section = document.createElement('div');
    section.className = 'genre-section';
    section.innerHTML = '<h3 class="genre-heading">' + escapeHtml(genre) + '</h3><div class="genre-grid"></div>';
    var grid = section.querySelector('.genre-grid');

    genres[genre].forEach(function(item) {
      grid.appendChild(createRecordEl(item.album, item.key));
    });

    crate.appendChild(section);
  });
}

function updateActiveFilter() {
  sidebar.querySelectorAll('.genre-filter').forEach(function(btn) {
    btn.className = 'genre-filter' + (btn.dataset.genre === activeGenreFilter ? ' active' : '');
  });
}

function openModal() {
  modal.classList.add('active');
  document.getElementById('albumTitle').focus();
}

function closeModal() {
  modal.classList.remove('active');
  form.reset();
  charCount.textContent = '0';
  editingKey = null;
}

// Real-time listener — syncs across all browsers
albumsRef.on('value', function(snapshot) {
  currentAlbumsData = snapshot.val();
  renderAlbums(currentAlbumsData);

  // Backfill genre for entries that don't have one
  if (currentAlbumsData) {
    Object.entries(currentAlbumsData).forEach(function(entry) {
      var key = entry[0];
      var album = entry[1];
      if (!album.genre) {
        fetchArtwork(album.title, album.artist).then(function(result) {
          if (result.genre && result.genre !== 'Other') {
            albumsRef.child(key).update({ genre: result.genre });
          }
        });
      }
    });
  }
});

// "All" button click
sidebar.querySelector('[data-genre="all"]').addEventListener('click', function() {
  activeGenreFilter = 'all';
  updateActiveFilter();
  renderAlbums(currentAlbumsData);
});

// Events
addBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
descInput.addEventListener('input', function() { charCount.textContent = descInput.value.length; });

function fetchArtwork(title, artist) {
  var query = encodeURIComponent(artist + ' ' + title);
  var url = 'https://itunes.apple.com/search?term=' + query + '&media=music&entity=album&limit=1';
  return fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.results && data.results.length > 0) {
        return {
          artwork: data.results[0].artworkUrl100.replace('100x100', '600x600'),
          genre: data.results[0].primaryGenreName || 'Other'
        };
      }
      return { artwork: '', genre: 'Other' };
    })
    .catch(function() { return { artwork: '', genre: 'Other' }; });
}

form.addEventListener('submit', function(e) {
  e.preventDefault();

  var title = document.getElementById('albumTitle').value.trim();
  var artist = document.getElementById('albumArtist').value.trim();
  var submitBtn = form.querySelector('.btn-submit');
  submitBtn.textContent = 'Finding artwork...';
  submitBtn.disabled = true;

  fetchArtwork(title, artist).then(function(result) {
    var album = {
      type: document.getElementById('albumType').value,
      title: title,
      artist: artist,
      desc: document.getElementById('albumDesc').value.trim(),
      reader: document.getElementById('albumReader').value.trim(),
      link: document.getElementById('albumLink').value.trim() || '',
      appleLink: document.getElementById('appleLink').value.trim() || '',
      youtubeLink: document.getElementById('youtubeLink').value.trim() || '',
      color: randomColor(),
      artwork: result.artwork,
      genre: result.genre,
    };

    if (editingKey) {
      albumsRef.child(editingKey).update(album);
    } else {
      albumsRef.push(album);
    }
    submitBtn.textContent = 'Drop the Needle';
    submitBtn.disabled = false;
    closeModal();
  });
});
