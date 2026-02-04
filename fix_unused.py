filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Supprimer le composant WavesBackground entier
start = content.find('const WavesBackground = () => (')
if start != -1:
    # Trouver la fin du composant (le ")" de fermeture suivi de newline)
    # Le composant se termine par "\n)\n" au bon niveau d'indentation
    end_marker = '\n)\n'
    end = content.find(end_marker, start)
    if end != -1:
        content = content[:start] + content[end + len(end_marker):]
        print("1. WavesBackground supprime")

# 2. Remplacer const [lang, setLang] par const [lang]
old_lang = 'const [lang, setLang] = useState<Lang>('
new_lang = 'const [lang] = useState<Lang>('
if old_lang in content:
    content = content.replace(old_lang, new_lang)
    print("2. setLang supprime")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nTermine ! Deploie maintenant.")
