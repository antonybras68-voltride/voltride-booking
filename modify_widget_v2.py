filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

old1 = '<div className="min-h-screen flex items-center justify-center relative" style={{ background: \'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)\' }}>\n      <WavesBackground />\n      <div className="text-gray-800 text-xl z-10">Chargement...</div>'
new1 = '<div className="min-h-screen flex items-center justify-center relative" style={{ background: \'transparent\' }}>\n      <div className="text-gray-800 text-xl z-10">Chargement...</div>'

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("1. Fond loading -> transparent")

old_bg = "style={{ background: 'linear-gradient(135deg, #abdee6 0%, #abdee6 60%, #ffaf10 100%)' }}"
new_bg = "style={{ background: 'transparent' }}"
if old_bg in content:
    content = content.replace(old_bg, new_bg)
    changes += 1
    print("2. Fond principal -> transparent")

if '<WavesBackground />' in content:
    content = content.replace('      <WavesBackground />\n', '')
    changes += 1
    print("3. WavesBackground supprime")

# Supprimer le bloc header (logo + titre + langues) - entre les 2 marqueurs
start_marker = '        <div className="text-center mb-6">'
end_marker = '        <div className="flex justify-between mb-6 px-4">'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]
    changes += 1
    print("4. Logo, titre et langues supprimes")

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
    print("5. index.html body -> transparent")

print(f"\n{changes} modification(s)")
