import re

filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

autoresize_code = """
  // Auto-resize iframe
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight
      window.parent.postMessage({ type: 'voltride-widget-resize', height }, '*')
    }
    sendHeight()
    const observer = new ResizeObserver(sendHeight)
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [step])

"""

first_useeffect = content.find('  useEffect(() => {')

if first_useeffect == -1:
    print("ERREUR: useEffect non trouvé dans le fichier")
elif 'voltride-widget-resize' in content:
    print("L'auto-resize est déjà présent dans le fichier, rien à faire.")
else:
    new_content = content[:first_useeffect] + autoresize_code + content[first_useeffect:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Auto-resize ajouté avec succès !")
