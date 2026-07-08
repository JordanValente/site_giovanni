<?php
/**
 * Good Pool Concept — Envoi devis avec pièces jointes
 * Reçoit les données du calculateur + les photos et envoie un mail
 * à goodpoolconcept@outlook.fr avec toutes les infos.
 */

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Méthode non autorisée']);
    exit;
}

$TO        = 'goodpoolconcept@outlook.fr';
$MAX_FILES = 5;
$MAX_SIZE  = 10 * 1024 * 1024;
$ALLOWED   = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

// ---------- Récupération & nettoyage ----------
function clean($v) { return trim(strip_tags((string)$v)); }

$name  = clean($_POST['name']  ?? '');
$email = clean($_POST['email'] ?? '');
$phone = clean($_POST['phone'] ?? '');
$city  = clean($_POST['city']  ?? '');

$project  = json_decode($_POST['project']  ?? '{}', true) ?: [];
$estimate = json_decode($_POST['estimate'] ?? '{}', true) ?: [];

// ---------- Validation ----------
$errors = [];
if ($name === '')                                    $errors[] = 'Nom requis';
if (!filter_var($email, FILTER_VALIDATE_EMAIL))      $errors[] = 'Email invalide';
if ($phone === '' || !preg_match('/[\d\s().+-]{8,}/', $phone)) $errors[] = 'Téléphone invalide';

if ($errors) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => implode(' · ', $errors)]);
    exit;
}

// ---------- Traitement des fichiers ----------
$attachments = [];
if (!empty($_FILES['files']) && is_array($_FILES['files']['tmp_name'])) {
    $count = min(count($_FILES['files']['tmp_name']), $MAX_FILES);
    for ($i = 0; $i < $count; $i++) {
        $tmp  = $_FILES['files']['tmp_name'][$i];
        $err  = $_FILES['files']['error'][$i] ?? 0;
        $fname = $_FILES['files']['name'][$i] ?? "photo-$i";
        $ftype = $_FILES['files']['type'][$i] ?? '';
        $fsize = $_FILES['files']['size'][$i] ?? 0;

        if ($err !== UPLOAD_ERR_OK)      continue;
        if (!is_uploaded_file($tmp))     continue;
        if ($fsize > $MAX_SIZE)          continue;
        // Type par extension pour HEIC/HEIF (souvent mal détectés)
        $ext = strtolower(pathinfo($fname, PATHINFO_EXTENSION));
        $isImg = in_array($ftype, $ALLOWED, true) || in_array($ext, ['jpg','jpeg','png','webp','heic','heif'], true);
        if (!$isImg) continue;

        $data = file_get_contents($tmp);
        if ($data === false) continue;

        // Type de contenu propre
        $mime = $ftype ?: match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            'heic', 'heif'=> 'image/heic',
            default       => 'application/octet-stream',
        };

        $attachments[] = [
            'name' => preg_replace('/[^A-Za-z0-9._-]/', '_', $fname),
            'mime' => $mime,
            'data' => $data,
        ];
    }
}

// ---------- Construction du corps HTML ----------
$shapeLabels    = ['rectangle'=>'Rectangulaire','oval'=>'Ovale','round'=>'Ronde','freeform'=>'Forme libre'];
$structureLabels= ['beton'=>'Béton','panneaux'=>'Panneaux','coque'=>'Coque polyester'];
$coatingLabels  = ['liner'=>'Liner','pvc'=>'PVC Armé'];
$colorLabels    = ['bleu-clair'=>'Bleu clair','bleu-fonce'=>'Bleu foncé','sable'=>'Sable','gris'=>'Gris ardoise'];
$optionLabels   = [
    'escalier'=>'Escalier / banquette',
    'frise'=>'Frise décorative ligne d\'eau',
    'antiderapant'=>'Antidérapant fond de bassin',
    'feutrine'=>'Feutrine de protection 400g',
    'projecteurs'=>'Projecteurs LED (jeu de 2)',
    'skimmer'=>'Remplacement skimmers & buses',
    'preparation'=>'Préparation du support',
    'vidange'=>'Vidange & remise en eau',
];

$shape     = $shapeLabels[$project['shape'] ?? ''] ?? '—';
$structure = $structureLabels[$project['structure'] ?? ''] ?? '—';
$coating   = $coatingLabels[$project['coating'] ?? ''] ?? '—';
$thickness = $project['thickness'] ?? '—';
$color     = $colorLabels[$project['color'] ?? ''] ?? '—';
$options   = $project['options'] ?? [];
$optsList  = $options ? array_map(fn($k) => $optionLabels[$k] ?? $k, $options) : ['Aucune option'];

$fmt = fn($n) => is_numeric($n) ? number_format((float)$n, 0, ',', ' ') . ' €' : '—';

$html = <<<HTML
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Nouvelle demande de devis</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#fdfaf3;color:#0a2540;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(10,37,64,0.08);">
    <div style="background:linear-gradient(135deg,#c9a961,#a3874a);padding:32px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:24px;">Nouvelle demande de devis</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Good Pool Concept — Rénovation piscine</p>
    </div>

    <div style="padding:32px;">
      <h2 style="color:#0a2540;font-size:18px;margin:0 0 16px;border-bottom:2px solid #ebe4d3;padding-bottom:8px;">Contact client</h2>
      <table style="width:100%;font-size:14px;line-height:1.6;">
        <tr><td style="color:#6b7a8e;padding:6px 0;width:140px;">Nom</td><td style="font-weight:600;">{$name}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Email</td><td><a href="mailto:{$email}" style="color:#c9a961;text-decoration:none;">{$email}</a></td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Téléphone</td><td><a href="tel:{$phone}" style="color:#c9a961;text-decoration:none;">{$phone}</a></td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Ville</td><td>{$city}</td></tr>
      </table>

      <h2 style="color:#0a2540;font-size:18px;margin:28px 0 16px;border-bottom:2px solid #ebe4d3;padding-bottom:8px;">Détails du projet</h2>
      <table style="width:100%;font-size:14px;line-height:1.6;">
        <tr><td style="color:#6b7a8e;padding:6px 0;width:140px;">Forme du bassin</td><td>{$shape}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Structure</td><td>{$structure}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Longueur</td><td>{$project['length']} m</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Largeur</td><td>{$project['width']} m</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Profondeur</td><td>{$project['depthMin']} m → {$project['depthMax']} m</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Revêtement</td><td><strong>{$coating} {$thickness}/100</strong></td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;">Coloris</td><td>{$color}</td></tr>
        <tr><td style="color:#6b7a8e;padding:6px 0;vertical-align:top;">Options</td><td>{ul_options}</td></tr>
      </table>

      <div style="margin-top:28px;padding:24px;background:linear-gradient(135deg,#0a2540,#051834);border-radius:8px;color:#fff;text-align:center;">
        <div style="font-size:12px;opacity:0.7;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Estimation calculée</div>
        <div style="font-size:28px;font-weight:700;">{fmt_min} — {fmt_max}</div>
        <div style="font-size:13px;opacity:0.7;margin-top:6px;">Surface {surface} m² · volume {volume} m³</div>
      </div>

      <p style="margin-top:24px;font-size:13px;color:#6b7a8e;text-align:center;">
        Envoyé depuis le formulaire de devis en ligne · {date}
      </p>
    </div>
  </div>
</body></html>
HTML;

$ulOptions = '<ul style="margin:0;padding-left:18px;">'
    . implode('', array_map(fn($o) => "<li>$o</li>", $optsList))
    . '</ul>';

$html = str_replace(
    ['{ul_options}', '{fmt_min}', '{fmt_max}', '{surface}', '{volume}', '{date}'],
    [
        $ulOptions,
        $fmt($estimate['totalMin'] ?? 0),
        $fmt($estimate['totalMax'] ?? 0),
        $estimate['surface'] ?? '—',
        $estimate['volume']  ?? '—',
        date('d/m/Y à H:i'),
    ],
    $html
);

// ---------- Construction du mail MIME ----------
$boundary = 'gpc-' . md5(uniqid('', true));
$subject  = '=?UTF-8?B?' . base64_encode("Nouvelle demande de devis — {$name}") . '?=';

$fromDomain = $_SERVER['SERVER_NAME'] ?? 'goodpoolconcept.fr';
$fromEmail  = 'no-reply@' . preg_replace('/^www\./', '', $fromDomain);

$headers  = "From: =?UTF-8?B?" . base64_encode('Good Pool Concept - Devis') . "?= <{$fromEmail}>\r\n";
$headers .= "Reply-To: =?UTF-8?B?" . base64_encode($name) . "?= <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";
$headers .= "X-Mailer: GoodPoolConcept-Devis/1.0\r\n";

$body  = "--{$boundary}\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= $html . "\r\n\r\n";

foreach ($attachments as $att) {
    $body .= "--{$boundary}\r\n";
    $body .= "Content-Type: {$att['mime']}; name=\"{$att['name']}\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-Disposition: attachment; filename=\"{$att['name']}\"\r\n\r\n";
    $body .= chunk_split(base64_encode($att['data'])) . "\r\n";
}

$body .= "--{$boundary}--";

// ---------- Envoi ----------
$sent = @mail($TO, $subject, $body, $headers, "-f{$fromEmail}");

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Échec de l\'envoi du mail. Contactez l\'administrateur.']);
    exit;
}

echo json_encode([
    'ok'          => true,
    'message'     => 'Demande envoyée avec succès.',
    'attachments' => count($attachments),
]);
