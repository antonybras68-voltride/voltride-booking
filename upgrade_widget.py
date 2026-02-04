filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ============================================================
# 1. FILTRE PAR CATEGORIE via ?category= dans l'URL
# ============================================================

# Ajouter la lecture du parametre category apres la lecture de lang
old_lang = """const [lang] = useState<Lang>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'es' || urlLang === 'en' || urlLang === 'fr') return urlLang
    return 'fr'
  })"""

new_lang = """const [lang] = useState<Lang>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const urlLang = urlParams.get('lang')
    if (urlLang === 'es' || urlLang === 'en' || urlLang === 'fr') return urlLang
    return 'fr'
  })
  const [categoryFilter] = useState<string[]>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const cat = urlParams.get('category')
    if (!cat) return []
    return cat.split(',')
  })"""

if old_lang in content:
    content = content.replace(old_lang, new_lang)
    changes += 1
    print("1. Parametre categoryFilter ajoute")

# Ajouter le filtre dans loadVehicles
old_filter = """const filtered = (Array.isArray(data) ? data : []).filter((v: Vehicle) => {
        return v.category?.brand === BRAND
      })
      setVehicles(filtered)"""

new_filter = """const filtered = (Array.isArray(data) ? data : []).filter((v: Vehicle) => {
        if (v.category?.brand !== BRAND) return false
        if (categoryFilter.length > 0) {
          const catName = v.category?.name
          const catStr = typeof catName === 'object' ? JSON.stringify(catName).toLowerCase() : ''
          return categoryFilter.some(f => catStr.includes(f.toLowerCase()))
        }
        return true
      })
      setVehicles(filtered)"""

if old_filter in content:
    content = content.replace(old_filter, new_filter)
    changes += 1
    print("2. Filtre categorie dans loadVehicles")

# ============================================================
# 2. OPTIONS : cacher description, bouton "+ d'infos"
# ============================================================

old_options = """{option.description && getName(option.description) && <p className="text-xs text-gray-500">{getName(option.description)}</p>}"""

new_options = """{option.description && getName(option.description) && (
                          <details className="mt-1">
                            <summary className="text-xs text-blue-500 cursor-pointer hover:text-blue-700">{lang === 'fr' ? "+ d'infos" : lang === 'es' ? '+ info' : '+ info'}</summary>
                            <p className="text-xs text-gray-500 mt-1">{getName(option.description)}</p>
                          </details>
                        )}"""

if old_options in content:
    content = content.replace(old_options, new_options)
    changes += 1
    print("3. Options: description cachee avec + d'infos")

# ============================================================
# 3. RESPONSIVE : ameliorer les cartes vehicules sur mobile
# ============================================================

# Carte vehicule : flex-col sur mobile
old_card = """<div key={vehicle.id} className={`border rounded-xl p-4 flex gap-4 transition"""
new_card = """<div key={vehicle.id} className={`border rounded-xl p-4 flex flex-col sm:flex-row gap-4 transition"""

if old_card in content:
    content = content.replace(old_card, new_card)
    changes += 1
    print("4. Vehicules: responsive flex-col mobile")

# Image vehicule : centree sur mobile
old_img = """<div className="w-24 h-24 bg-gradient-to-br from-[#abdee6]/30 to-[#ffaf10]/30 rounded-lg flex items-center justify-center flex-shrink-0">"""
new_img = """<div className="w-full sm:w-24 h-32 sm:h-24 bg-gradient-to-br from-[#abdee6]/30 to-[#ffaf10]/30 rounded-lg flex items-center justify-center flex-shrink-0">"""

if old_img in content:
    content = content.replace(old_img, new_img)
    changes += 1
    print("5. Image vehicule: pleine largeur mobile")

# Stepper : plus petit sur mobile
old_stepper = """<div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-md"""
new_stepper = """<div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shadow-md"""

if old_stepper in content:
    content = content.replace(old_stepper, new_stepper)
    changes += 1
    print("6. Stepper: plus petit sur mobile")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{'='*40}")
print(f"{changes} modification(s) effectuee(s)")
print(f"{'='*40}")
