<?php
session_start();
require_once '../db.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = $_POST['username'] ?? '';
    $pass = $_POST['password'] ?? '';
    if ($user === ADMIN_USER && $pass === ADMIN_PASS) {
        $_SESSION['admin'] = true;
        header('Location: index.php');
        exit;
    }
    $error = '用户名或密码错误';
}
if ($_SESSION['admin'] ?? false) { header('Location: index.php'); exit; }
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>后台登录</title>
<link rel="stylesheet" href="../style.css"/>
</head>
<body>
<div class="bg-orb orb1"></div>
<div class="bg-orb orb2"></div>
<div class="bg-orb orb3"></div>
<div class="login-wrap">
  <div class="login-card glass">
    <div class="login-icon">✍️</div>
    <h2 class="login-title">创作后台</h2>
    <?php if (isset($error)): ?>
      <div class="alert-error"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>
    <form method="POST">
      <div class="form-group">
        <label>用户名</label>
        <input type="text" name="username" class="glass-input" placeholder="admin" required autocomplete="username"/>
      </div>
      <div class="form-group">
        <label>密码</label>
        <input type="password" name="password" class="glass-input" placeholder="••••••" required autocomplete="current-password"/>
      </div>
      <button type="submit" class="btn-primary glass-btn full-btn">登录后台</button>
    </form>
  </div>
</div>
</body>
</html>
