<?php
session_start();
if (!($_SESSION['admin'] ?? false)) { header('Location: login.php'); exit; }
require_once '../db.php';
$total_books    = $pdo->query("SELECT COUNT(*) FROM books")->fetchColumn();
$total_chapters = $pdo->query("SELECT COUNT(*) FROM chapters")->fetchColumn();
$total_words    = $pdo->query("SELECT COALESCE(SUM(word_count),0) FROM chapters")->fetchColumn();
$today_words    = $pdo->query("SELECT COALESCE(SUM(word_count),0) FROM chapters WHERE DATE(updated_at)=CURDATE()")->fetchColumn();
$recent = $pdo->query("SELECT c.*,b.title as book_title FROM chapters c JOIN books b ON c.book_id=b.id ORDER BY c.updated_at DESC LIMIT 8")->fetchAll();
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>创作后台 — 概览</title>
<link rel="stylesheet" href="../style.css"/>
</head>
<body>
<div class="bg-orb orb1"></div>
<div class="bg-orb orb2"></div>
<div class="bg-orb orb3"></div>
<?php include 'nav.php'; ?>
<div class="admin-wrap">
  <h2 class="page-title">📊 今日概览</h2>
  <div class="stats-grid">
    <div class="stat-card glass">
      <div class="stat-icon">📅</div>
      <div class="stat-num"><?= number_format($today_words) ?></div>
      <div class="stat-label">今日更新字数</div>
    </div>
    <div class="stat-card glass">
      <div class="stat-icon">📝</div>
      <div class="stat-num"><?= number_format($total_words) ?></div>
      <div class="stat-label">累计总字数</div>
    </div>
    <div class="stat-card glass">
      <div class="stat-icon">📚</div>
      <div class="stat-num"><?= $total_books ?></div>
      <div class="stat-label">书籍总数</div>
    </div>
    <div class="stat-card glass">
      <div class="stat-icon">📖</div>
      <div class="stat-num"><?= $total_chapters ?></div>
      <div class="stat-label">章节总数</div>
    </div>
  </div>
  <div class="goal-card glass">
    <div class="goal-header">
      <span>今日写作进度</span>
      <span><?= number_format($today_words) ?> / 3000 字</span>
    </div>
    <div class="goal-bar-wrap">
      <div class="goal-bar-fill" style="width:<?= min(100, round($today_words/3000*100)) ?>%"></div>
    </div>
    <div class="goal-tip">目标：每日 3000 字 <?= $today_words >= 3000 ? '🎉 已完成！' : '💪 加油！' ?></div>
  </div>
  <h3 class="section-sub-title">🕐 最近更新</h3>
  <div class="recent-list glass">
    <?php if (empty($recent)): ?>
      <div style="padding:30px;text-align:center;color:var(--text-muted)">还没有章节，去写第一章吧！</div>
    <?php else: ?>
      <?php foreach ($recent as $ch): ?>
        <div class="recent-item">
          <div class="recent-info">
            <span class="recent-book"><?= htmlspecialchars($ch['book_title']) ?></span>
            <span class="recent-chapter"><?= htmlspecialchars($ch['title']) ?></span>
          </div>
          <div class="recent-right">
            <span class="recent-words"><?= number_format($ch['word_count']) ?>字</span>
            <span class="recent-time"><?= date('m-d H:i', strtotime($ch['updated_at'])) ?></span>
            <a href="write.php?chapter_id=<?= $ch['id'] ?>" class="glass-btn small-btn">编辑</a>
          </div>
        </div>
      <?php endforeach; ?>
    <?php endif; ?>
  </div>
  <div class="quick-actions">
    <a href="books.php" class="glass-btn action-btn">📚 管理书籍</a>
    <a href="write.php" class="glass-btn action-btn btn-primary">✍️ 开始写作</a>
  </div>
</div>
</body>
</html>