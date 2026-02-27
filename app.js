/**
 * 书库主页逻辑
 * - 从 books.json 读取书单
 * - 阅读进度保存在 localStorage（按书籍 id）
 */

const COVER_GRADIENTS = [
  ['#667eea','#764ba2'],
  ['#f093fb','#f5576c'],
  ['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'],
  ['#fa709a','#fee140'],
  ['#a18cd1','#fbc2eb'],
  ['#89f7fe','#66a6ff'],
  ['#fddb92','#d1fdff'],
  ['#a1c4fd','#c2e9fb'],
  ['#ffecd2','#fcb69f'],
];

// 获取某本书的阅读进度
function getProgress(id) {
  try {
    return JSON.parse(localStorage.getItem(`progress_${id}`) || 'null');
  } catch { return null; }
}

function renderBooks(books) {
  const grid      = document.getElementById('bookGrid');
  const loading   = document.getElementById('loadingState');
  const empty     = document.getElementById('emptyState');
  const countEl   = document.getElementById('totalCount');

  loading.style.display = 'none';
  countEl.textContent   = books.length;

  if (books.length === 0) {
    empty.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';

  books.forEach((book, index) => {
    const progress   = getProgress(book.id);
    const lastPage   = progress?.lastPage   || 1;
    const totalPages = progress?.totalPages || 0;
    const pct        = totalPages ? Math.round((lastPage / totalPages) * 100) : 0;

    // 封面渐变：优先用 books.json 里定义的颜色
    const colors  = book.cover_color || COVER_GRADIENTS[index % COVER_GRADIENTS.length];
    const gradient = `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
    const initial  = (book.name || '书')[0];

    const card = document.createElement('div');
    card.className = 'book-card glass';
    card.innerHTML = `
      <div class="book-cover" style="background:${gradient}">${initial}</div>
      <div class="book-info">
        <div class="book-name"  title="${esc(book.name)}">${esc(book.name)}</div>
        <div class="book-author">${esc(book.author || '')}</div>
        <div class="book-desc">${esc(book.description || '')}</div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <button class="btn-read glass-btn" data-file="${esc(book.file)}" data-id="${esc(book.id)}" data-name="${esc(book.name)}">
          ${pct > 0 ? `续读 ${pct}%` : '开始阅读'}
        </button>
      </div>
    `;

    // 3D 倾斜
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width  - 0.5;
      const y = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transform =
        `perspective(1000px) rotateY(${x*12}deg) rotateX(${-y*8}deg) translateY(-10px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });

    grid.appendChild(card);
  });

  // 阅读按钮
  grid.querySelectorAll('.btn-read').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { file, id, name } = btn.dataset;
      const url = `reader.html?file=${encodeURIComponent(file)}&id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
      window.location.href = url;
    });
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// 加载 books.json
fetch('books.json')
  .then(r => {
    if (!r.ok) throw new Error('books.json 加载失败');
    return r.json();
  })
  .then(renderBooks)
  .catch(err => {
    console.error(err);
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display  = 'block';
  });
