filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Ajouter un ; entre alert et la IIFE
old = """alert(lang === 'fr' ? 'Paiement annulé' : lang === 'es' ? 'Pago cancelado' : 'Payment canceled')
      (() => {"""

new = """alert(lang === 'fr' ? 'Paiement annulé' : lang === 'es' ? 'Pago cancelado' : 'Payment canceled');
      (() => {"""

if old in content:
    content = content.replace(old, new)
    print("1. Point-virgule ajoute apres alert")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Termine !")
