filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Ajouter la lecture du parametre returnUrl apres categoryFilter
old_cat = """const [categoryFilter] = useState<string[]>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const cat = urlParams.get('category')
    if (!cat) return []
    return cat.split(',')
  })"""

new_cat = """const [categoryFilter] = useState<string[]>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const cat = urlParams.get('category')
    if (!cat) return []
    return cat.split(',')
  })
  const [returnUrl] = useState<string>(() => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get('returnUrl') || window.location.origin + window.location.pathname
  })"""

if old_cat in content:
    content = content.replace(old_cat, new_cat)
    changes += 1
    print("1. Parametre returnUrl ajoute")

# 2. Remplacer successUrl
old_success = """successUrl: (window.top || window).location.origin + (window.top || window).location.pathname + `?success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}`"""

new_success = """successUrl: returnUrl + `?success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}`"""

if old_success in content:
    content = content.replace(old_success, new_success)
    changes += 1
    print("2. successUrl -> returnUrl")

# 3. Remplacer cancelUrl
old_cancel = "cancelUrl: window.location.origin + window.location.pathname + '?canceled=true'"
new_cancel = "cancelUrl: returnUrl + '?canceled=true'"

if old_cancel in content:
    content = content.replace(old_cancel, new_cancel)
    changes += 1
    print("3. cancelUrl -> returnUrl")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n{changes} modification(s)")
