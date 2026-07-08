<?php
/**
 * Good Pool Concept — Envoi message de contact
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$TO = 'goodpoolconcep@outlook.fr';

function clean($v) { return trim(strip_tags((string)$v)); }

$name    = clean($_POST['name']    ?? '');
$email   = clean($_POST['email']   ?? '');
$phone   = clean($_POST['phone']   ?? '');
$city    = clean($_POST['city']    ?? '');
$message = clean($_POST['message'] ?? '');

$errors = [];
if ($name === '')                                    $errors[] = 'Nom requis';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))      $errors[] = 'Email invalide';
if ($message === '')                                 $errors[] = 'Message requis';

if ($errors) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => implode(' · ', $errors)]);
    exit;
}

$safeMessage = nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8'));

$html = <<<HTML
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nouveau message de contact</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#fdfaf3;color:#0a2540;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(10,37,64,0.08);">
    <div style="background:linear-gradient(135deg,#c9a961,#a3874a);padding:32px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:24px;">Nouveau message de contact</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Good Pool Concept</p>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;font-size:14px;line-height:1.6;">
        <tr><td style="color:#6b7a8e;padding:6px 0;width:120px;">Nom</td><td style="font-weight:600;">{$name}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Email</td><td><a href="mailto:{$email}" style="color:#c9a961;text-decoration:none;">{$email}</a></td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Téléphone</td><td>{$phone}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Ville</td><td>{$city}</td></tr>
      </table>
      <div style="margin-top:24px;padding:20px;background:#f6f0e2;border-left:4px solid #c9a961;border-radius:6px;font-size:14px;line-height:1.6;">
        {$safeMessage}
      </div>
      <p style="margin-top:24px;font-size:13px;color:#6b7a8e;text-align:center;">
        Envoyé depuis le formulaire de contact · {date}
      </p>
    </div>
  </div>
</body></html>
HTML;

$html = str_replace('{date}', date('d/m/Y à H:i'), $html);

$subject    = '=?UTF-8?B?' . base64_encode("Contact — {$name}") . '?=';
$fromDomain = $_SERVER['SERVER_NAME'] ?? 'goodpoolconcept.fr';
$fromEmail  = 'no-reply@' . preg_replace('/^www\./', '', $fromDomain);

$headers  = "From: =?UTF-8?B?" . base64_encode('Good Pool Concept - Contact') . "?= <{$fromEmail}>\r\n";
$headers .= "Reply-To: =?UTF-8?B?" . base64_encode($name) . "?= <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: text/html; charset=UTF-8\r\n";
$headers .= "Content-Transfer-Encoding: 8bit\r\n";

$sent = @mail($TO, $subject, $html, $headers, "-f{$fromEmail}");

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Échec de l\'envoi du mail.']);
    exit;
}

echo json_encode(['ok' => true, 'message' => 'Message envoyé avec succès.']);
