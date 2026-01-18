#!/usr/bin/env python3
filepath = "/workspaces/voltride-booking/apps/operator/src/CheckInModal.tsx"

with open(filepath, 'r') as f:
    content = f.read()

# 1. Ajouter une variable pour le montant de réservation
old_calc = '''  const paidOnline = booking?.paidAmount || 0
  const depositAmount = fleetVehicle?.vehicle?.deposit || 500  // Caution/garantie du véhicule
  const subtotal = Math.max(0, locationAmount - paidOnline - discount - optionsDiscount)'''

new_calc = '''  const paidOnline = booking?.paidAmount || 0
  const reservationAmount = booking?.depositAmount || 0  // Montant de réservation (acompte)
  const depositAmount = fleetVehicle?.vehicle?.deposit || 500  // Caution/garantie du véhicule
  const subtotal = Math.max(0, locationAmount - paidOnline - reservationAmount - discount - optionsDiscount)'''

content = content.replace(old_calc, new_calc)

# 2. Ajouter l'affichage du montant de réservation après "Payé en ligne"
old_display = '''                {paidOnline > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Payé en ligne</span>
                    <span>-{paidOnline.toFixed(2)}€</span>
                  </div>
                )}'''

new_display = '''                {paidOnline > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Payé en ligne</span>
                    <span>-{paidOnline.toFixed(2)}€</span>
                  </div>
                )}
                {reservationAmount > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>Acompte de réservation</span>
                    <span>-{reservationAmount.toFixed(2)}€</span>
                  </div>
                )}'''

content = content.replace(old_display, new_display)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Montant de réservation ajouté!")
print("  - Nouvelle variable: reservationAmount = booking.depositAmount")
print("  - Affiché comme 'Acompte de réservation'")
print("  - Soustrait du reste à payer")
