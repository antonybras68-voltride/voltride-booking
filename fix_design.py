filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remettre les textes en gris foncé (annuler le blanc)
content = content.replace('text-white">{t.selectDates}', 'text-gray-800">{t.selectDates}')
content = content.replace('text-white">{t.selectVehicles}', 'text-gray-800">{t.selectVehicles}')
content = content.replace('text-white">{t.yourInfo}', 'text-gray-800">{t.yourInfo}')
content = content.replace('text-white">{t.payment}', 'text-gray-800">{t.payment}')
content = content.replace('text-white">{t.options}', 'text-gray-800">{t.options}')
content = content.replace('text-white mb-1">', 'text-gray-600 mb-1">')
content = content.replace('text-white font-bold rounded-xl', 'text-gray-800 font-bold rounded-xl')
print("1. Texte -> gris fonce (lisible)")

# 2. Ajuster transparence a 85
content = content.replace('bg-white/75', 'bg-white/85')
print("2. Transparence -> bg-white/85")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nTermine !")
