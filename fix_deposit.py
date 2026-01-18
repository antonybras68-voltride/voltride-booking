#!/usr/bin/env python3
import os

filepath = "/workspaces/voltride-booking/apps/operator/src/CheckInModal.tsx"

with open(filepath, 'r') as f:
    content = f.read()

# Corriger la ligne depositAmount - prendre la caution du véhicule en priorité
old_line = "const depositAmount = booking?.depositAmount || fleetVehicle?.vehicle?.deposit || 100"
new_line = "const depositAmount = fleetVehicle?.vehicle?.deposit || 500  // Caution/garantie du véhicule"

content = content.replace(old_line, new_line)

# Aussi, renommer "Caution" en "Caution / Garantie véhicule" pour plus de clarté
old_label = '<span className="font-medium">Caution</span>'
new_label = '<span className="font-medium">Caution / Garantie véhicule</span>'
content = content.replace(old_label, new_label)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Correction appliquée!")
print("  - depositAmount prend maintenant fleetVehicle.vehicle.deposit (750€)")
print("  - Label renommé en 'Caution / Garantie véhicule'")
