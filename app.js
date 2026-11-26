/* Koleksi Buku — versi baca saja (statis, tanpa tambah/edit/hapus) */
(function () {
  'use strict';

  var STATUS_LABEL = { selesai: 'Udah Baca', lagi: 'Lagi Baca', antre: 'Mau Baca' };

  var books = [];
  var shelfIndex = 0;
  var filter = 'all';
  var query = '';

  var shelfStage = document.getElementById('shelf-stage');
  var shelfCaption = document.getElementById('shelf-caption');
  var shelfEl = document.getElementById('shelf');
  var gridEl = document.getElementById('grid');
  var emptyEl = document.getElementById('empty');
  var searchEl = document.getElementById('search');
  var countEl = document.getElementById('book-count');

  /* ---------- Data ---------- */
  function loadBooks() {
    return fetch('books.json')
      .then(function (r) { if (!r.ok) throw new Error('books.json HTTP ' + r.status); return r.json(); })
      .then(function (data) { books = data; });
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function slidesOf(book) {
    var slides = [];
    for (var i = 1; i <= book.pages; i++) {
      slides.push({ type: 'page', src: 'assets/pages/' + book.slug + '/page-' + pad(i) + '.jpg', label: 'Halaman ' + i + ' / ' + book.pages });
    }
    slides.push({ type: 'mindmap', src: 'assets/mindmaps/' + book.slug + '.png', label: 'Mind Map' });
    return slides;
  }

  /* ---------- Rak kipas 3D ---------- */
  function buildShelf() {
    shelfStage.innerHTML = '';
    books.forEach(function (book, i) {
      var btn = document.createElement('button');
      btn.className = 'shelf-book';
      btn.setAttribute('aria-label', book.title + ' — ' + book.author);
      var img = document.createElement('img');
      img.src = 'assets/covers/' + book.slug + '.jpg';
      img.alt = 'Cover ' + book.title;
      img.draggable = false;
      btn.appendChild(img);
      btn.addEventListener('click', function () {
        if (i === shelfIndex) openReader(book);
        else setShelfIndex(i);
      });
      shelfStage.appendChild(btn);
    });
    layoutShelf();
  }

  function layoutShelf() {
    var items = shelfStage.children;
    for (var i = 0; i < items.length; i++) {
      var off = i - shelfIndex;
      var abs = Math.abs(off);
      var scale = Math.max(0.55, 1 - abs * 0.09);
      var x = off * 165;
      var rotY = off === 0 ? 0 : (off > 0 ? -32 : 32);
      var z = -abs * 130;
      items[i].style.transform =
        'translateX(' + x + 'px) translateZ(' + z + 'px) rotateY(' + rotY + 'deg) scale(' + scale + ')';
      items[i].style.zIndex = String(100 - abs);
      items[i].style.opacity = abs > 4 ? '0' : String(Math.max(0.35, 1 - abs * 0.18));
      items[i].classList.toggle('center', off === 0);
    }
    var b = books[shelfIndex];
    if (b) {
      shelfCaption.innerHTML = '<strong></strong><span></span>';
      shelfCaption.querySelector('strong').textContent = b.title;
      shelfCaption.querySelector('span').textContent =
        b.author + (b.year ? ' · ' + b.year : '') + ' · ' + STATUS_LABEL[b.status];
    }
  }

  function setShelfIndex(i) {
    if (!books.length) return;
    shelfIndex = (i + books.length) % books.length;
    layoutShelf();
  }

  document.getElementById('shelf-prev').addEventListener('click', function () { setShelfIndex(shelfIndex - 1); });
  document.getElementById('shelf-next').addEventListener('click', function () { setShelfIndex(shelfIndex + 1); });

  // Drag / swipe di rak
  (function () {
    var startX = null, dragging = false;
    shelfEl.addEventListener('pointerdown', function (e) { startX = e.clientX; dragging = true; });
    shelfEl.addEventListener('pointerup', function (e) {
      if (!dragging || startX === null) return;
      var dx = e.clientX - startX;
      if (dx < -60) setShelfIndex(shelfIndex + 1);
      else if (dx > 60) setShelfIndex(shelfIndex - 1);
      dragging = false; startX = null;
    });
    shelfEl.addEventListener('pointercancel', function () { dragging = false; startX = null; });
  })();

  document.addEventListener('keydown', function (e) {
    if (!reader.hidden) return; // reader punya handler sendiri
    if (e.key === 'ArrowLeft') setShelfIndex(shelfIndex - 1);
    if (e.key === 'ArrowRight') setShelfIndex(shelfIndex + 1);
  });

  /* ---------- Grid ---------- */
  function renderGrid() {
    var q = query.trim().toLowerCase();
    var list = books.filter(function (b) {
      var okFilter = filter === 'all' || b.status === filter;
      var okQuery = !q || b.title.toLowerCase().indexOf(q) !== -1 || b.author.toLowerCase().indexOf(q) !== -1;
      return okFilter && okQuery;
    });
    gridEl.innerHTML = '';
    list.forEach(function (b) {
      var card = document.createElement('button');
      card.className = 'card';
      card.innerHTML =
        '<img src="assets/covers/' + b.slug + '.jpg" alt="Cover ' + b.title + '" loading="lazy">' +
        '<span class="card-body"><h3></h3><p></p>' +
        '<span class="status-pill">' + STATUS_LABEL[b.status] + '</span></span>';
      card.querySelector('h3').textContent = b.title;
      card.querySelector('p').textContent = b.author + (b.year ? ' · ' + b.year : '');
      card.addEventListener('click', function () { openReader(b); });
      gridEl.appendChild(card);
    });
    emptyEl.hidden = list.length > 0;
  }

  searchEl.addEventListener('input', function () { query = searchEl.value; renderGrid(); });
  document.querySelectorAll('.filters button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filters button').forEach(function (x) { x.classList.remove('active'); });
      btn.classList.add('active');
      filter = btn.getAttribute('data-filter');
      renderGrid();
    });
  });

  /* ---------- Reader ---------- */
  var reader = document.getElementById('reader');
  var readerImg = document.getElementById('reader-img');
  var readerWrap = document.getElementById('reader-slide-wrap');
  var readerLabel = document.getElementById('reader-page-label');
  var readerFill = document.getElementById('reader-progress-fill');
  var readerPrev = document.getElementById('reader-prev');
  var readerNext = document.getElementById('reader-next');
  var currentBook = null;
  var currentSlides = [];
  var currentSlide = 0;

  function showSlide(i) {
    if (!currentSlides.length) return;
    currentSlide = Math.max(0, Math.min(i, currentSlides.length - 1));
    var s = currentSlides[currentSlide];
    readerWrap.classList.remove('zoomed');
    readerImg.src = s.src;
    readerImg.alt = currentBook.title + ' — ' + s.label;
    readerLabel.textContent = s.label + '  ·  ' + (currentSlide + 1) + ' / ' + currentSlides.length;
    readerFill.style.width = ((currentSlide + 1) / currentSlides.length * 100) + '%';
    readerPrev.disabled = currentSlide === 0;
    readerNext.disabled = currentSlide === currentSlides.length - 1;
    // Preload slide tetangga
    [currentSlide - 1, currentSlide + 1].forEach(function (j) {
      if (j >= 0 && j < currentSlides.length) { var im = new Image(); im.src = currentSlides[j].src; }
    });
  }

  function openReader(book) {
    currentBook = book;
    currentSlides = slidesOf(book);
    document.getElementById('reader-book-title').textContent = book.title;
    document.getElementById('reader-book-author').textContent =
      book.author + (book.year ? ' · ' + book.year : '');
    var dl = document.getElementById('reader-download');
    dl.href = 'assets/pdfs/' + book.slug + '.pdf';
    dl.setAttribute('download', book.slug + '-ringkasan.pdf');
    reader.hidden = false;
    document.body.style.overflow = 'hidden';
    showSlide(0);
  }

  function closeReader() {
    reader.hidden = true;
    document.body.style.overflow = '';
    currentBook = null;
    currentSlides = [];
  }

  document.getElementById('reader-close').addEventListener('click', closeReader);
  readerPrev.addEventListener('click', function () { showSlide(currentSlide - 1); });
  readerNext.addEventListener('click', function () { showSlide(currentSlide + 1); });
  readerImg.addEventListener('click', function () { readerWrap.classList.toggle('zoomed'); });

  // Tap di tepi kiri/kanan stage = pindah halaman
  document.getElementById('reader-stage').addEventListener('click', function (e) {
    if (e.target !== readerImg && e.target.closest('.reader-arrow')) return;
    if (e.target === readerImg) return;
    var rect = this.getBoundingClientRect();
    var x = e.clientX - rect.left;
    if (x < rect.width * 0.3) showSlide(currentSlide - 1);
    else if (x > rect.width * 0.7) showSlide(currentSlide + 1);
  });

  // Swipe di reader
  (function () {
    var sx = null, sy = null;
    reader.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    reader.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) showSlide(currentSlide + 1); else showSlide(currentSlide - 1);
      }
      sx = null; sy = null;
    }, { passive: true });
  })();

  document.addEventListener('keydown', function (e) {
    if (reader.hidden) return;
    if (e.key === 'Escape') closeReader();
    if (e.key === 'ArrowLeft') showSlide(currentSlide - 1);
    if (e.key === 'ArrowRight') showSlide(currentSlide + 1);
  });

  /* ---------- Init ---------- */
  loadBooks()
    .then(function () {
      countEl.textContent = String(books.length);
      buildShelf();
      renderGrid();
    })
    .catch(function (err) {
      shelfCaption.textContent = 'Gagal memuat daftar buku.';
      console.error(err);
    });
})();
