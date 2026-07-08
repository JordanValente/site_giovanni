# Déploiement Netlify — Envoi mails formulaires

Le site est déjà **prêt pour Netlify** : le code JS détecte automatiquement l'hébergement `*.netlify.app` et route les formulaires vers Netlify Forms au lieu du PHP.

## Ce que Netlify fait

- Héberge le site en HTTPS gratuit
- Reçoit les soumissions de formulaires (devis + contact)
- Stocke les fichiers photos uploadés (30 jours minimum)
- Envoie un email à **goodpoolconcept@outlook.fr** à chaque soumission

**Important** : les photos ne sont **pas** en pièce jointe du mail (limite anti-spam de Netlify). L'email contient à la place des **liens cliquables** vers chaque photo, hébergée sur Netlify.

## Étape 1 · Créer un compte Netlify

1. Aller sur https://app.netlify.com/signup
2. Cliquer sur "**Sign up with GitHub**" et autoriser Netlify
3. Une fois connecté, vous êtes sur le dashboard

## Étape 2 · Déployer le site depuis GitHub

1. Dashboard Netlify → **Add new site** → **Import an existing project**
2. Choisir **GitHub** comme fournisseur Git
3. Autoriser Netlify à accéder au repo `JordanValente/site_giovanni`
4. Sélectionner ce repo dans la liste
5. Sur la page de configuration :
   - **Branch to deploy** : `main`
   - **Base directory** : laisser vide
   - **Build command** : laisser vide (site statique, pas de build)
   - **Publish directory** : laisser vide (racine)
6. Cliquer **Deploy site**

Le site sera en ligne en 30-60 secondes à une URL du type `https://random-name-123.netlify.app`.

## Étape 3 · Renommer le site (optionnel)

1. Site → **Site configuration** → **Change site name**
2. Choisir `goodpoolconcept` par exemple → l'URL devient `https://goodpoolconcept.netlify.app`

## Étape 4 · Vérifier la détection des formulaires

1. Dashboard site → **Forms** dans le menu de gauche
2. Vous devez voir **2 formulaires détectés** :
   - `devis`
   - `contact`

Si les formulaires n'apparaissent pas : redéployer manuellement (**Deploys → Trigger deploy → Deploy site**).

## Étape 5 · Configurer les notifications email

Pour chaque formulaire (`devis` puis `contact`) :

1. Cliquer sur le nom du formulaire dans la liste
2. Onglet **Settings & usage** → section **Form notifications**
3. **Add notification** → **Email notification**
4. Remplir :
   - **Event to listen for** : `New form submission`
   - **Email to notify** : `goodpoolconcept@outlook.fr`
   - **Custom subject** (optionnel) : `Nouvelle demande de devis — Good Pool Concept` ou `Nouveau message — Good Pool Concept`
5. **Save**

## Étape 6 · Tester

1. Ouvrir votre site Netlify
2. Remplir le devis (5 étapes) + joindre 1 ou 2 photos → **Envoyer**
3. Sous 30 s, un email doit arriver à `goodpoolconcept@outlook.fr` avec :
   - Toutes les données saisies (nom, contact, projet, estimation)
   - Des liens cliquables vers les photos hébergées

Si l'email arrive en spam Outlook la première fois, marquer comme légitime.

## Étape 7 · Brancher un nom de domaine (optionnel)

Si vous avez un domaine `goodpoolconcept.fr` :

1. Site → **Domain management** → **Add a domain**
2. Suivre les instructions (modifier les DNS du registrar pour pointer sur Netlify)
3. Netlify installe automatiquement un SSL Let's Encrypt gratuit

## Limites gratuites Netlify

- **100 soumissions/mois** (formulaires cumulés)
- **10 Go de bande passante/mois** (largement suffisant pour un site vitrine)
- **10 Mo max par fichier uploadé**

Au-delà : plan Pro à 19 $/mois avec 1 000 soumissions incluses.

## Modes PHP vs Netlify

Le JS bascule automatiquement :
- Domaine `*.netlify.app` détecté → Netlify Forms
- Sinon → scripts PHP (`send-devis.php` / `send-contact.php`)

Vous pouvez donc conserver les deux sans conflit. Si vous voulez forcer Netlify sur un autre domaine, ajouter dans `<head>` :
```html
<meta name="mailer" content="netlify">
```
