/**
 * 电子书阅读器 - PDF 阅读器逻辑
 * 使用 PDF.js 渲染 PDF 页面
 */

// PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const DB_NAME = 'EbookReaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

let db = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let scale = 1.2;
let isRendering = false;
let bookId = null;
let bookMeta = null;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.2;

// =====================
// IndexedDB
// =====================
function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(); };
    req.onerror = () => reject(req.error);
  });
}

function getBookFromDB(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// =====================
// 元数据操作
// =====================
function getMeta() {
  try {
    return JSON.parse(localStorage.getItem('ebook_meta') || '[]');
  } catch { return []; }
}

function updateMeta(id, updates) {
  const meta = getMeta();
  const index = meta.findIndex((b) => b.id === id);
  if (index !== -1) {
    Object.assign(meta[index], updates);
    localStorage.setItem('ebook_meta', JSON.stringify(meta));
  }
}

// =====================
// PDF 渲染
// =====================
async function renderPage(pageNum) {
  if (isRendering) return;
  isRendering = true;

  const canvas = document.getElementById('pdfCanvas');
  const loadingEl = document.getElementById('pageLoading');
  loadingEl.classList.add('active');
  canvas.classList.add('fading');

  try {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;

    // 更新 UI
    document.getElementById('currentPageDisplay').textContent = pageNum;
    document.getElementById('progressSlider').value = pageNum;
    document.getElementById('pageJumpInput').value = pageNum;

    // 保存进度
    currentPage = pageNum;
    updateMeta(bookId, { lastPage: pageNum, totalPages });

    canvas.classList.remove('fading');
    loadingEl.classList.remove('active');
  } catch (err) {
    console.error('渲染页面失败:', err);
    loadingEl.classList.remove('active');
  } finally {
    isRendering = false;
  }
}

// 翻页
async function goToPage(pageNum) {
  pageNum = Math.max(1, Math.min(totalPages, pageNum));
  if (pageNum === currentPage && pdfDoc) return;
  await renderPage(pageNum);

  // 检查是否读完
  if (pageNum === totalPages) {
    setTimeout(() => {
      document.getElementById('finishOverlay').style.display = 'flex';
    }, 500);
  }
}

function prevPage() {
  if (currentPage > 1) goToPage(currentPage - 1);
}

function nextPage() {
  if (currentPage < totalPages) goToPage(currentPage + 1);
}

// 缩放
function setScale(newScale) {
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  document.getElementById('zoomLabel').textContent =
    Math.round(scale * 100) + '%';
  renderPage(currentPage);
}

// =====================
// 键盘快捷键
// =====================
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case ' ':
      e.preventDefault();
      nextPage();
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      e.preventDefault();
      prevPage();
      break;
    case '+':
    case '=':
      setScale(scale + SCALE_STEP);
      break;
    case '-':
      setScale(scale - SCALE_STEP);
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
  }
});

// =====================
// 全屏
// =====================
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

// =====================
// 主初始化
// =====================
async function init() {
  // 解析 URL 参数
  const params = new URLSearchParams(location.search);
  bookId = params.get('id');

  if (!bookId) {
    alert('未指定书籍 ID');
    location.href = 'index.html';
    return;
  }

  // 获取元数据
  const meta = getMeta();
  bookMeta = meta.find((b) => b.id === bookId);

  if (!bookMeta) {
    alert('未找到书籍信息');
    location.href = 'index.html';
    return;
  }

  document.title = `${bookMeta.name} — 电子书阅读器`;
  document.getElementById('bookTitleBar').textContent = bookMeta.name;

  // 初始化 DB，加载 PDF
  await initDB();
  const bookData = await getBookFromDB(bookId);

  if (!bookData || !bookData.arrayBuffer) {
    alert('未找到 PDF 数据，可能已被清除');
    location.href = 'index.html';
    return;
  }

  // 加载 PDF
  const loadingTask = pdfjsLib.getDocument({ data: bookData.arrayBuffer.slice(0) });
  pdfDoc = await loadingTask.promise;
  totalPages = pdfDoc.numPages;

  document.getElementById('totalPagesDisplay').textContent = totalPages;
  document.getElementById('progressSlider').max = totalPages;
  document.getElementById('pageJumpInput').max = totalPages;

  // 更新总页数
  updateMeta(bookId, { totalPages });

  // 从上次进度继续
  const startPage = bookMeta.lastPage && bookMeta.lastPage <= totalPages
    ? bookMeta.lastPage
    : 1;

  await goToPage(startPage);

  // =====================
  // 绑定控件事件
  // =====================
  document.getElementById('prevBtn').addEventListener('click', prevPage);
  document.getElementById('nextBtn').addEventListener('click', nextPage);

  document.getElementById('zoomInBtn').addEventListener('click', () =>
    setScale(scale + SCALE_STEP)
  );
  document.getElementById('zoomOutBtn').addEventListener('click', () =>
    setScale(scale - SCALE_STEP)
  );

  document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

  document.getElementById('backBtn').addEventListener('click', () => {
    location.href = 'index.html';
  });

  // 进度滑块
  const slider = document.getElementById('progressSlider');
  slider.addEventListener('input', () => goToPage(Number(slider.value)));

  // 页码跳转
  const jumpInput = document.getElementById('pageJumpInput');
  const jumpBtn = document.getElementById('pageJumpBtn');

  jumpBtn.addEventListener('click', () => {
    const p = parseInt(jumpInput.value);
    if (!isNaN(p)) goToPage(p);
  });

  jumpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(jumpInput.value);
      if (!isNaN(p)) goToPage(p);
    }
  });

  // 读完按钮
  document.getElementById('restartBtn')?.addEventListener('click', () => {
    document.getElementById('finishOverlay').style.display = 'none';
    goToPage(1);
  });

  document.getElementById('backToLibBtn')?.addEventListener('click', () => {
    location.href = 'index.html';
  });

  // 触摸滑动翻页（移动端）
  let touchStartX = 0;
  const wrap = document.getElementById('canvasWrap');

  wrap.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  wrap.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) nextPage();
      else prevPage();
    }
  }, { passive: true });
}

init().catch((err) => {
  console.error('阅读器初始化失败:', err);
  alert('加载失败，请返回书架重试');
});
