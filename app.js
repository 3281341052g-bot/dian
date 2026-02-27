/**
 * 电子书阅读器 - 书库管理
 * 使用 IndexedDB 存储 PDF 二进制，localStorage 存储元数据
 */

const DB_NAME = 'EbookReaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'books';

// 封面渐变色池
const COVER_GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#ffecd2', '#fcb69f'],
  ['#89f7fe', '#66a6ff'],
  ['#fddb92', '#d1fdff'],
  ['#a1c4fd', '#c2e9fb'],
];

let db = null;

// =====================
// IndexedDB 初始化
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

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

// =====================
// 数据操作
// =====================
function saveBookToDB(bookData) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(bookData);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deleteBookFromDB(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// 元数据存储在 localStorage
function getMeta() {
  try {
    return JSON.parse(localStorage.getItem('ebook_meta') || '[]');
  } catch {
    return [];
  }
}

function saveMeta(list) {
  localStorage.setItem('ebook_meta', JSON.stringify(list));
}

function generateId() {
  return `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getCoverGradient(index) {
  const g = COVER_GRADIENTS[index % COVER_GRADIENTS.length];
  return `linear-gradient(135deg, ${g[0]}, ${g[1]})`;
}

// =====================
// UI 渲染
// =====================
function renderLibrary() {
  const meta = getMeta();
  const grid = document.getElementById('bookGrid');
  const empty = document.getElementById('emptyState');
  const header = document.getElementById('libraryHeader');
  const countEl = document.getElementById('bookCount');

  grid.innerHTML = '';

  if (meta.length === 0) {
    empty.style.display = 'block';
    header.style.display = 'none';
  } else {
    empty.style.display = 'none';
    header.style.display = 'flex';
    countEl.textContent = `${meta.length} 本书`;

    meta.forEach((book, index) => {
      const progress = book.totalPages
        ? Math.round(((book.lastPage || 1) / book.totalPages) * 100)
        : 0;

      const initial = (book.name || '书')[0].toUpperCase();
      const gradient = getCoverGradient(index);

      const card = document.createElement('div');
      card.className = 'book-card glass';
      card.innerHTML = `
        <div class="book-cover" style="background: ${gradient}">
          ${initial}
        </div>
        <div class="book-info">
          <div class="book-name" title="${escapeHtml(book.name)}">${escapeHtml(book.name)}</div>
          <div class="book-meta">
            ${book.totalPages ? `共 ${book.totalPages} 页 · ` : ''}${formatDate(book.uploadDate)}
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" style="width: ${progress}%"></div>
          </div>
          <div class="book-actions">
            <button class="btn-read glass-btn" data-id="${book.id}">
              ${progress > 0 ? `续读 ${progress}%` : '开始阅读'}
            </button>
            <button class="btn-delete glass-btn" data-id="${book.id}" title="删除">🗑</button>
          </div>
        </div>
      `;

      // 3D 倾斜效果
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${x * 12}deg) rotateX(${-y * 8}deg) translateY(-10px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });

      grid.appendChild(card);
    });

    // 绑定按钮事件
    grid.querySelectorAll('.btn-read').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.location.href = `reader.html?id=${id}`;
      });
    });

    grid.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        confirmDelete(id);
      });
    });
  }
}

// =====================
// 文件上传处理
// =====================
async function handleFiles(files) {
  const pdfFiles = Array.from(files).filter(
    (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
  );

  if (pdfFiles.length === 0) {
    showToast('⚠️ 请上传 PDF 格式的文件');
    return;
  }

  showLoading(`正在处理 ${pdfFiles.length > 1 ? pdfFiles.length + ' 个' : ''}文件...`);

  try {
    for (const file of pdfFiles) {
      await processFile(file);
    }
    renderLibrary();
    showToast(`✅ 成功添加 ${pdfFiles.length} 本书！`);
  } catch (err) {
    console.error(err);
    showToast('❌ 上传失败，请重试');
  } finally {
    hideLoading();
  }
}

async function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result;
        const id = generateId();
        const name = file.name.replace(/\.pdf$/i, '');

        // 存储到 IndexedDB
        await saveBookToDB({ id, arrayBuffer });

        // 元数据存 localStorage
        const meta = getMeta();
        meta.unshift({
          id,
          name,
          size: file.size,
          uploadDate: Date.now(),
          lastPage: 1,
          totalPages: 0,
        });
        saveMeta(meta);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// =====================
// 删除书籍
// =====================
async function confirmDelete(id) {
  const meta = getMeta();
  const book = meta.find((b) => b.id === id);
  if (!book) return;

  if (!confirm(`确定要删除《${book.name}》吗？`)) return;

  try {
    await deleteBookFromDB(id);
    const newMeta = meta.filter((b) => b.id !== id);
    saveMeta(newMeta);
    renderLibrary();
    showToast('🗑️ 已删除');
  } catch (err) {
    console.error(err);
    showToast('❌ 删除失败');
  }
}

// =====================
// Toast & Loading
// =====================
let toastTimer = null;

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function showLoading(text = '处理中...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

// =====================
// 工具函数
// =====================
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =====================
// 拖拽上传
// =====================
function initDragDrop() {
  const zone = document.getElementById('dropZone');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
  });

  zone.addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });

  // 全局拖拽
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('.drop-zone')) return;
    handleFiles(e.dataTransfer.files);
  });
}

// =====================
// 初始化
// =====================
async function init() {
  await initDB();
  renderLibrary();
  initDragDrop();

  const fileInput = document.getElementById('fileInput');
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  document.getElementById('uploadBtn').addEventListener('click', () => {
    fileInput.click();
  });

  document.getElementById('emptyUploadBtn')?.addEventListener('click', () => {
    fileInput.click();
  });
}

init().catch(console.error);
