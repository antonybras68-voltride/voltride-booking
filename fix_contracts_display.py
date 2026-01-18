#!/usr/bin/env python3
"""
Corrige l'affichage des contrats
"""

filepath = "/workspaces/voltride-booking/apps/operator/src/App.tsx"

with open(filepath, 'r') as f:
    content = f.read()

# Corriger l'affichage du véhicule (identificationNumber n'existe pas)
old_vehicle = "contract.fleetVehicle?.identificationNumber || contract.fleetVehicle?.vehicle?.name"
new_vehicle = "contract.fleetVehicle?.vehicleNumber || contract.fleetVehicle?.vehicle?.name?.fr || contract.fleetVehicle?.vehicle?.name || 'N/A'"

content = content.replace(old_vehicle, new_vehicle)

# Aussi, sécuriser l'affichage du montant total (peut être un Decimal)
old_amount = "Number(contract.totalAmount).toFixed(2)"
new_amount = "(Number(contract.totalAmount) || 0).toFixed(2)"

content = content.replace(old_amount, new_amount)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Affichage des contrats corrigé")
