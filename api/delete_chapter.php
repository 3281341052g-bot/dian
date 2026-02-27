<?php
session_start();
header('Content-Type: application/json');
if (!($_SESSION['admin'] ?? false)) { echo json_encode(['error'=>'未登录']); exit; }
require_once '../db.php';
$data=json_decode(file_get_contents('php://input'),true);
$id=(int)($data['id']??0);
if(!$id){echo json_encode(['error'=>'参数错误']);exit;}
try{
  $pdo->prepare("DELETE FROM chapters WHERE id=?")-\\>execute([$id]);
  echo json_encode(['success'=>true]);
}catch(Exception $e){ echo json_encode(['error'=>$e->getMessage()]); }