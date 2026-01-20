#!/usr/bin/env python3
with open('apps/operator/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_code = '''  useEffect(() => { loadNotificationSettings() }, [])
    try {
      const res = await fetch(API_URL + "/api/contracts")
      const data = await res.json()
      setContracts(Array.isArray(data) ? data.filter(c => c.agency?.brand === brand) : [])
    } catch (e) { console.error("Erreur chargement contrats:", e) }
  }'''

new_code = '''  useEffect(() => { loadNotificationSettings() }, [])'''

if old_code in content:
    content = content.replace(old_code, new_code)
    print("✅ Correction appliquee!")
else:
    print("⚠️ Code non trouve")

with open('apps/operator/src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("✅ Fichier sauvegarde!")
