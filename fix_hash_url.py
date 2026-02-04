filepath = '/workspaces/voltride-booking/apps/widget/src/App.tsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Changer successUrl pour utiliser # au lieu de ?
old_success = "successUrl: returnUrl + (returnUrl.includes('?') ? '&' : '?') + `success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}&category=${new URLSearchParams(window.location.search).get('category') || ''}`"

# Si pas trouvé, essayer l'ancien format
if old_success not in content:
    old_success = "successUrl: returnUrl + `?success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}`"

new_success = "successUrl: returnUrl + `#success=true&ref=${booking.reference}&bookingId=${booking.id}&deposit=${calculateSecurityDeposit()}&email=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + ' ' + customer.lastName)}&lang=${lang}`"

if old_success in content:
    content = content.replace(old_success, new_success)
    print("1. successUrl -> hash fragment #")
else:
    print("ERREUR: successUrl non trouve!")

# 2. Changer cancelUrl aussi
old_cancel = "cancelUrl: returnUrl + '?canceled=true'"
new_cancel = "cancelUrl: returnUrl + '#canceled=true'"

if old_cancel in content:
    content = content.replace(old_cancel, new_cancel)
    print("2. cancelUrl -> hash fragment #")

# 3. Changer la detection des params pour lire depuis hash aussi
old_detect = """const params = new URLSearchParams(window.location.search)
    const isSuccess = params.get('success') === 'true' || (params.get('ref') !== null && params.get('bookingId') !== null)
    const isCanceled = params.get('canceled') === 'true'"""

new_detect = """// Lire params depuis search OU hash (Stripe redirige avec #)
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
    const searchParams = new URLSearchParams(window.location.search)
    const params = hashParams.get('ref') ? hashParams : searchParams
    const isSuccess = params.get('success') === 'true' || (params.get('ref') !== null && params.get('bookingId') !== null)
    const isCanceled = params.get('canceled') === 'true' || hashParams.get('canceled') === 'true'"""

if old_detect in content:
    content = content.replace(old_detect, new_detect)
    print("3. Detection params depuis hash")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nTermine !")
