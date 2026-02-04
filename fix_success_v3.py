filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Changer la detection: si ref ET bookingId sont presents, c'est un success
old = "const isSuccess = params.get('success') === 'true'"
new = "const isSuccess = params.get('success') === 'true' || (params.get('ref') !== null && params.get('bookingId') !== null)"

if old in content:
    content = content.replace(old, new)
    print("1. Detection success elargie (ref + bookingId)")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Termine !")
