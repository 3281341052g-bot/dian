/**
 * 阅读器逻辑
 * - 从 URL 参数读取 PDF 路径、书籍 ID 和书名
 * - 进度保存在 localStorage
 */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc      = null;
let currentPage = 1;
let totalPages  = 0;
let scale       = 1.2;
let rendering   = false;

const MIN_SCALE  = 0.5;
const MAX_SCALE  = 3.5;
const SCALE_STEP = 0.2;

// URL 参数
const params  = new URLSearchParams(location.search);
const pdfFile = params.get('file');   // books/xxx.pdf
const bookId  = params.get('id');
const bookName = decodeURIComponent(params.get('name') || '未命名');

// =====================
// 进度存取
// =====================
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(`progress_${bookId}`)) || {}; }
  catch { return {}; }
}

function saveProgress(page, total) {
  localStorage.setItem(`progress_${bookId}`, JSON.stringify({
    lastPage: page, totalPages: total, updatedAt: Date.now()
  }));
}

// =====================
// 渲染页面
// =====================
async function renderPage(num) {
  if (rendering) return;
  rendering = true;

  const canvas  = document.getElementById('pdfCanvas');
  const loading = document.getElementById('pageLoading');

  loading.classList.add('active');
  canvas.classList.add('fading');

  try {
    const page     = await pdfDoc.getPage(num);
    const viewport = page.getViewport({ scale });
    canvas.width   = viewport.width;
    canvas.height  = viewport.height;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    currentPage = num;
    document.getElementById('currentPageDisplay').textContent = num;
    document.getElementById('progressSlider').value           = num;
    document.getElementById('pageJumpInput').value            = num;
    saveProgress(num, totalPages);

    canvas.classList.remove('fading');
    loading.classList.remove('active');
  } catch(e) {
    console.error(e);
    loading.classList.remove('active');
  } finally {
    rendering = false;
  }
}

async function goTo(num) {
  num = Math.max(1, Math.min(totalPages, num));
  await renderPage(num);
  if (num === totalPages) {
    setTimeout(() => {
      document.getElementById('finishOverlay').style.display = 'flex';
    }, 600);
  }
}

const prev = () => currentPage > 1          && goTo(currentPage - 1);
const next = () => currentPage < totalPages && goTo(currentPage + 1);

function setScale(v) {
  scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v));
  document.getElementById('zoomLabel').textContent = Math.round(scale * 100) + '%';
  renderPage(currentPage);
}

// =====================
// 键盘
// =====================
document.addEventListener('keydown', e => {
  switch(e.key) {
    case 'ArrowRight': case 'ArrowDown': case ' ':
      e.preventDefault(); next(); break;
    case 'ArrowLeft': case 'ArrowUp':
      e.preventDefault(); prev(); break;
    case '+': case '=': setScale(scale + SCALE_STEP); break;
    case '-':           setScale(scale - SCALE_STEP); break;
    case 'f': case 'F': toggleFS(); break;
  }
});

function toggleFS() {
  document.fullscreenElement
    ? document.exitFullscreen?.()
    : document.documentElement.requestFullscreen?.();
}

// =====================
// 初始化
// =====================
async function init() {
  if (!pdfFile || !bookId) {
    alert('参数缺失，返回书架');
    location.href = 'index.html';
    return;
  }

  document.title = `${bookName} — 书架`;
  document.getElementById('bookTitleBar').textContent = bookName;

  try {
    const task  = pdfjsLib.getDocument(pdfFile);
    pdfDoc      = await task.promise;
    totalPages  = pdfDoc.numPages;

    document.getElementById('totalPagesDisplay').textContent  = totalPages;
    document.getElementById('progressSlider').max             = totalPages;
    document.getElementById('pageJumpInput').max              = totalPages;

    const saved = loadProgress();
    const start = (saved.lastPage && saved.lastPage <= totalPages) ? saved.lastPage : 1;
    await goTo(start);

  } catch(err) {
    console.error(err);
    alert('PDF 加载失败，请检查文件路径是否正确');
    return;
  }

  // 控件绑定
  document.getElementById('prevBtn').addEventListener('click', prev);
  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('zoomInBtn').addEventListener('click',  () => setScale(scale + SCALE_STEP));
  document.getElementById('zoomOutBtn').addEventListener('click', () => setScale(scale - SCALE_STEP));
  document.getElementById('fullscreenBtn').addEventListener('click', toggleFS);
  document.getElementById('backBtn').addEventListener('click', () => location.href = 'index.html');

  const slider = document.getElementById('progressSlider');
  slider.addEventListener('input', () => goTo(Number(slider.value)));

  const jumpInput = document.getElementById('pageJumpInput');
  document.getElementById('pageJumpBtn').addEventListener('click', () => {
    const p = parseInt(jumpInput.value);
    if (!isNaN(p)) goTo(p);
  });
  jumpInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const p = parseInt(jumpInput.value); if (!isNaN(p)) goTo(p); }
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    document.getElementById('finishOverlay').style.display = 'none';
    goTo(1);
  });
  document.getElementById('backToLibBtn').addEventListener('click', () => location.href = 'index.html');

  // 触摸滑动（移动端）
  let tx = 0;
  const wrap = document.getElementById('canvasWrap');
  wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) dx < 0 ? next() : prev();
  }, { passive: true });
}

init().catch(console.error);
