# Déploiement du site Good Pool Concept

Le site est **statique + PHP** : il faut donc un hébergement supportant PHP (OVH, o2switch, LWS, Hostinger, 1&1/IONOS, Infomaniak, Ex2, PlanetHoster, etc.).

## Étape 1 · Uploader les fichiers

Uploadez le contenu du dossier `site giovanni/` à la racine de votre hébergement (dossier `www/`, `public_html/` ou `httpdocs/` selon l'hébergeur).

Fichiers essentiels :
- `index.html`
- `styles.css`
- `calculator.js`
- `send-devis.php`
- `send-contact.php`
- `logo/logo.png`
- `images/*.png`

**Optionnel** (peut être supprimé pour alléger) : `banque d'image/`, `README.md`, `DEPLOIEMENT.md`, `.gitignore`, `.git/`.

## Étape 2 · Vérifier PHP

Créez un fichier temporaire `test.php` à la racine :
```php
<?php phpinfo();
```
Ouvrez `votresite.fr/test.php`. Si une page bleue avec les infos PHP apparaît → PHP fonctionne. **Supprimez ensuite ce fichier**.

## Étape 3 · Tester l'envoi de mail

Sur la plupart des hébergements mutualisés français, la fonction `mail()` PHP fonctionne d'office.

- Ouvrez le site, remplissez le formulaire de devis et envoyez.
- Un mail doit arriver à **goodpoolconcep@outlook.fr** en moins de 2 minutes.
- Vérifiez aussi les spams/courriers indésirables Outlook la première fois.

### Si le mail n'arrive pas

Trois causes fréquentes :

1. **Le mail atterrit dans les spams Outlook.**
   Ajoutez `no-reply@votresite.fr` aux contacts autorisés dans Outlook.

2. **L'hébergeur bride `mail()` sans SMTP authentifié.**
   Certains hébergeurs (OVH « perso » notamment) exigent un compte mail sur leur infra. Solutions :
   - Créer un compte `contact@votresite.fr` chez l'hébergeur, puis modifier `send-devis.php` / `send-contact.php` pour utiliser cette adresse en `From:`.
   - Installer **PHPMailer** et envoyer via SMTP Outlook directement (voir ci-dessous).

3. **Erreur PHP.**
   Ouvrez la console navigateur (F12 → onglet Réseau) et regardez la réponse de `send-devis.php`. Le message d'erreur y sera.

### Solution SMTP Outlook (si `mail()` ne suffit pas)

Si votre hébergeur bloque `mail()`, la solution robuste est d'utiliser **PHPMailer** avec le SMTP d'Outlook :

```bash
composer require phpmailer/phpmailer
```

Puis remplacer le bloc d'envoi dans `send-devis.php` :

```php
use PHPMailer\PHPMailer\PHPMailer;
require 'vendor/autoload.php';

$mail = new PHPMailer(true);
$mail->isSMTP();
$mail->Host       = 'smtp-mail.outlook.com';
$mail->SMTPAuth   = true;
$mail->Username   = 'goodpoolconcep@outlook.fr';
$mail->Password   = 'MOT_DE_PASSE_APPLICATION_OUTLOOK';
$mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
$mail->Port       = 587;

$mail->setFrom('goodpoolconcep@outlook.fr', 'Good Pool Concept');
$mail->addAddress('goodpoolconcep@outlook.fr');
$mail->addReplyTo($email, $name);

$mail->isHTML(true);
$mail->Subject = "Nouvelle demande de devis — {$name}";
$mail->Body    = $html;

foreach ($attachments as $att) {
    $mail->addStringAttachment($att['data'], $att['name'], 'base64', $att['mime']);
}

$mail->send();
```

⚠️ Outlook nécessite un **mot de passe d'application** (pas le mot de passe classique) : à créer sur https://account.microsoft.com/security → « Sécurité avancée » → « Mots de passe d'application ».

## Étape 4 · HTTPS

Activez le certificat SSL Let's Encrypt gratuit depuis le panneau de votre hébergeur. Sans HTTPS, certains navigateurs bloquent l'upload de fichiers.

## Limites actuelles

- **50 Mo max par soumission** (5 photos × 10 Mo). Modifiable dans `send-devis.php` (`$MAX_SIZE`) et dans le `php.ini` (`upload_max_filesize`, `post_max_size`).
- La fonction `mail()` PHP est utilisée : reprise SMTP recommandée pour un usage professionnel intensif (Outlook peut classer les mails automatiques en spam à long terme).
