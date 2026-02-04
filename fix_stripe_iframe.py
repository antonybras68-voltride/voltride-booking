filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Rediriger Stripe vers la page parent (pas dans l'iframe)
old_redirect = "window.location.href = url"
new_redirect = "(window.top || window).location.href = url"

if old_redirect in content:
    content = content.replace(old_redirect, new_redirect)
    changes += 1
    print("1. Stripe redirect -> window.top (page parent)")

# 2. Utiliser l'URL du parent pour successUrl et cancelUrl
old_success = "successUrl: window.location.origin + window.location.pathname"
new_success = "successUrl: (window.top || window).location.origin + (window.top || window).location.pathname"

count = content.count(old_success)
if count > 0:
    content = content.replace(old_success, new_success)
    changes += 1
    print(f"2. successUrl/cancelUrl -> parent origin ({count} occurrences)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{changes} modification(s)")
