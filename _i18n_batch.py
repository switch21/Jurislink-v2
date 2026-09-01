import os, re, sys, glob

LOG = '/home/z/my-project/worklog.md'
DIR = '/home/z/my-project/src/views'
FILES = sorted(glob.glob(os.path.join(DIR, '*.tsx')))

os_ext = {
    'fr': [
        "'Adresse e-mail'", 't(\x27login.email\x27)',
        "'Mot de passe'", 't(\x27login.password\x27)',
        "'Le système d\\xe9\'exploitation de votre cabinet\x27)", 't(\x27login.subtitle\x27)',
        "\"Entrez le code à 6 chiffres...\", 't(\x27login.mfaDescription\x27)',
        "Code de vérification\x27", 't(\x27login.mfaCode\x27)',
        \"Vérification...\", 't(\x27login.mfaVerify\x27)',
        "Retour\x27, 't(\x27common.back\x27)',
        \"Accéder à mon espace\x27, 't(\x27portal.login\x27)',
        \"Vérifier\x27, 't(\x27login.mfaVerify\x27)',
        \"Code valide pendant 5 minutes\x27, 't(\x27login.mfaTimer\x27)',
        \"Fonctionnalité bientôt disponible\x27, 't(\x27login.forgotPassword\x27)',
        \"Mot de passe oublié ?\x27, 't(\x27login.forgotPassword\x27)',
        \"Espace réservé aux clients\x27, 't(\x27portal.portal\x27)',
        \"© 2025 JurisLink — Tous droits réservés\x27, 't(\x27login.copyright\x27)',
        \"Voir les forfaits et tarifs →\x27, 't(\x27login.viewPricing\x27)',
    ],
    'es': [
        "\"Adresse e-mail\", 't(\x27login.email\x27)',
        \"\"Mot de passe\", 't(\x27login.password\x27)',
    ],
}
results = []

for f in FILES:
    with open(f, 'r', encoding='utf-8') as fh:
        content = fh.read()
        for old, new in nos_ext.get(lang, []):
            new_content = content.replace(old, new, 1)
            if content != new_content:
                results.append(f'{f}: {len(nos_ext.get(lang, []))+1} changes')
        else:
            results.append(f'{f}: no changes')
    for r in results:
        print(r)
print(f'\nTotal: {sum(c for _, c in results)} replacements across {len(results)} files')
with open(LOG, 'a') as lf:
    lf.seek(0)
    lf.write(str(r)+'\n')
print('Worklog appended')
