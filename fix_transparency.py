filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Changer la transparence du rectangle blanc
if 'bg-white/95' in content:
    content = content.replace('bg-white/95', 'bg-white/75')
    changes += 1
    print("1. Transparence -> bg-white/75")

# 2. Changer les textes gris foncé en blanc pour visibilité
# Titres h2
content = content.replace('text-gray-800">{t.selectDates}', 'text-white">{t.selectDates}')
content = content.replace('text-gray-800">{t.selectVehicles}', 'text-white">{t.selectVehicles}')
content = content.replace('text-gray-800">{t.yourInfo}', 'text-white">{t.yourInfo}')
content = content.replace('text-gray-800">{t.payment}', 'text-white">{t.payment}')
content = content.replace('text-gray-800">{t.options}', 'text-white">{t.options}')

# Labels
content = content.replace('text-gray-600 mb-1">', 'text-white mb-1">')

# Textes généraux dans le formulaire
content = content.replace('text-gray-800 font-bold rounded-xl', 'text-white font-bold rounded-xl')

# Bouton continuer - garder le texte foncé sur fond coloré pour lisibilité
# On ne change PAS les boutons car ils ont un fond coloré

changes += 1
print("2. Police -> blanc pour lisibilite")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{changes} modification(s)")
