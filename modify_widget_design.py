filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

old_loading = """<div className="min-h-screen flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)' }}>
      <WavesBackground />
      <div className="text-gray-800 text-xl z-10">Chargement...</div>
    </div>"""
new_loading = """<div className="min-h-screen flex items-center justify-center relative" style={{ background: 'transparent' }}>
      <div className="text-gray-800 text-xl z-10">Chargement...</div>
    </div>"""
if old_loading in content:
    content = content.replace(old_loading, new_loading)
    changes += 1
    print("1. Fond loading transparent")

old_main = """<div className="min-h-screen p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)' }}>
      <WavesBackground />"""
new_main = """<div className="min-h-screen p-4 relative overflow-hidden" style={{ background: 'transparent' }}>"""
if old_main in content:
    content = content.replace(old_main, new_main)
    changes += 1
    print("2. Fond principal transparent")

old_header = """<div className="text-center mb-6">
          <img src="https://res.cloudinary.com/dis5pcnfr/image/upload/v1766883143/IMG-20251228-WA0001-removebg-preview_n0fsq5.png" alt="Voltride" className="h-20 mx-auto mb-2 drop-shadow-lg" />
          <p className="text-gray-700 font-medium">{t.title}</p>
          <div className="flex justify-center gap-2 mt-3">
            {(['fr', 'es', 'en'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full text-2xl transition shadow-md ${lang === l ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}>
                {l === 'fr' ? '\\u{1F1EB}\\u{1F1F7}' : l === 'es' ? '\\u{1F1EA}\\u{1F1F8}' : '\\u{1F1EC}\\u{1F1E7}'}
              </button>
            ))}
          </div>
        </div>"""
if old_header in content:
    content = content.replace(old_header, '')
    changes += 1
    print("3. Logo, titre et langues supprimes")
else:
    print("3. Header non trouve, essai methode 2...")
    import re
    pattern = r'<div className="text-center mb-6">.*?</div>\s*</div>\s*</div>'
    if re.search(pattern, content, re.DOTALL):
        content = re.sub(pattern, '', content, count=1, flags=re.DOTALL)
        changes += 1
        print("3. Logo, titre et langues supprimes (methode 2)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

html_path = '/workspaces/voltride-booking/apps/widget/index.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()
if 'background: transparent' not in html_content:
    html_content = html_content.replace('<body>', '<body style="background: transparent; margin: 0; padding: 0;">')
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    changes += 1
    print("4. index.html body transparent")

print(f"\n{changes} modification(s) effectuee(s)")
