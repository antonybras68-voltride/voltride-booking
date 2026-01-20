import re
with open('apps/api/src/index.ts', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\\`', '`')
content = content.replace('\\${', '${')
with open('apps/api/src/index.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fichier corrigé !')
