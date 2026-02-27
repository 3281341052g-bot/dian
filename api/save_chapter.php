<?php
session_start();
header('Content-Type: application/json');
if (!($_SESSION['admin'] ?? false)) { echo json_encode(['error'=>'未登录']); exit; }
require_once '../db.php';
$data=json_decode(file_get_contents('php://input'),true);
$book_id=(int)($data['book_id']??0);
$chapter_id=(int)($data['chapter_id']??0);
$title=trim($data['title']??'');
$content=trim($data['content']??'');
if(!$book_id||!$title){echo json_encode(['error'=>'参数缺失']);exit;}
$word_count=mb_strlen(preg_replace('/\s+/u','',$content));
try{
  if($chapter_id){
    $stmt=$pdo->prepare("UPDATE chapters SET title=?,content=?,word_count=?,updated_at=NOW() WHERE id=? AND book_id=?");
    $stmt->execute([$title,$content,$word_count,$chapter_id,$book_id]);
    $new_id=$chapter_id;$reload=false;
  }else{
    $max_sort=$pdo->prepare("SELECT COALESCE(MAX(sort_order),0)+1 FROM chapters WHERE book_id=?");
    $max_sort->execute([$book_id]);
    $sort=$max_sort->fetchColumn();
    $stmt=$pdo->prepare("INSERT INTO chapters(book_id,title,content,word_count,sort_order) VALUES(?,?,?,?,?)");
    $stmt->execute([$book_id,$title,$content,$word_count,$sort]);
    $new_id=$pdo->lastInsertId();$reload=true;
  }
  $pdo->prepare("UPDATE books SET updated_at=NOW() WHERE id=?")->execute([$book_id]);
  $today_words=(int)$pdo->query("SELECT COALESCE(SUM(word_count),0) FROM chapters WHERE DATE(updated_at)=CURDATE()")->fetchColumn();
  echo json_encode(['success'=>true,'chapter_id'=>$new_id,'word_count'=>$word_count,'today_words'=>$today_words,'reload_sidebar'=>$reload]);
}catch(Exception $e){echo json_encode(['error'=>$e->getMessage()]);}