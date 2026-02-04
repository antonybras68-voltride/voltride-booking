filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Changer le fallback de returnUrl pour utiliser l'URL du widget
old = "return urlParams.get('returnUrl') || window.location.origin + window.location.pathname"
new = "return urlParams.get('returnUrl') || window.location.href.split('?')[0]"

if old in content:
    content = content.replace(old, new)
    print("1. returnUrl fallback corrige")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
