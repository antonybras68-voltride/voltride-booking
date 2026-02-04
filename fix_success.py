filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remplacer replaceState avec pathname par un qui garde lang et category
old = "window.history.replaceState({}, '', window.location.pathname)"
# On garde les paramètres essentiels (lang, category) et on enlève juste success/ref/etc
new = """(() => {
          const keep = new URLSearchParams()
          const cur = new URLSearchParams(window.location.search)
          if (cur.get('lang')) keep.set('lang', cur.get('lang')!)
          if (cur.get('category')) keep.set('category', cur.get('category')!)
          if (cur.get('returnUrl')) keep.set('returnUrl', cur.get('returnUrl')!)
          window.history.replaceState({}, '', window.location.pathname + '?' + keep.toString())
        })()"""

content = content.replace(old, new)
print(f"Remplace {content.count(new)} occurrence(s) de replaceState")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Termine !")
