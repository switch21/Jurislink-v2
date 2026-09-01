import sys

def replacer(filepath):
    with open(filepath, 'r', encoding='utf-8') as fh:
        content = fh.read()
        changes = []
        for key, val in replacements.get(filepath, []):
            new_content = content.replace(key, val)
            if new_content != content:
                changes.append(f'{filepath}: {len(changes)} changes')
        if changes:
            with open(filepath, 'w', encoding='utf-8') as fw:
                fw.write(new_content)
                print(f'{filepath}: {len(changes)} changes')
        else:
            print(f'{filepath}: no changes')

replacer_log()


replacements = {
    'src/views/LoginPage.tsx': [
        ("'Adresse e-mail', 't(\x27login.email\x27)'),
        ("'Mot de passe', 't(\x27login.password\x27)'),
        ("'Le syst\xe8+9exploitation de votre cabinet\x27", 't(\x27login.subtitle\x27)'),
        ("\"Entrez le code à 6 chiffres...\", 't(\x27login.mfaDescription\x27)'),
        ("Code de vérification\x27", 't(\x27login.mfaCode\x27)'),
        ("Vérification...\x27", 't(\x27login.mfaVerify\x27)'),
        ("Retour\x27, 't(\x27common.back\x27)'),
        ("Accéder à mon espace\x27, 't(\x27portal.login\x27)'),
        ("Vérifier\x27, 't(\x27login.mfaVerify\x27)'),
        ("Code valide pendant 5 minutes\x27, 't(\x27login.mfaTimer\x27)'),
        ("Fonctionnalité bientôt disponible\x27, 't(\x27login.forgotPassword\x27)'),
        ("Mot de passe oublié ?\x27, 't(\x27login.forgotPassword\x27)'),
        ("Espace réservé aux clients\x27, 't(\x27portal.portal\x27)'),
        ("\"© 2025 JurisLink — Tous droits réservés\x27, 't(\x27login.copyright\x27)'),
        ("Voir les forfaits et tarifs →\x27, 't(\x27login.viewPricing\x27)'),
    ],
}

replacer_log()

results = []
with open(LOG, 'a') as lf:
    lf.seek(0)
    lf.write(str(r)+'\n')
print('Done:', len(results), 'files modified')
