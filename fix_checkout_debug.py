#!/usr/bin/env python3
"""
Ajoute des logs de debug à la route check-out
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Ajouter des logs au début de la route
old_start = '''app.post('/api/bookings/:id/check-out', async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({'''

new_start = '''app.post('/api/bookings/:id/check-out', async (req, res) => {
  console.log('=== CHECK-OUT START ===')
  console.log('Booking ID:', req.params.id)
  console.log('Body keys:', Object.keys(req.body))
  try {
    const booking = await prisma.booking.findUnique({'''

content = content.replace(old_start, new_start)

# Ajouter un log avant la création du contrat
old_contract = '''    // Créer le contrat
    const contract = await prisma.rentalContract.create({'''

new_contract = '''    // Créer le contrat
    console.log('Creating contract with:', {
      contractNumber,
      bookingId: booking.id,
      fleetVehicleId: req.body.fleetVehicleId,
      totalDays,
      depositAmount: fleetVehicle.vehicle?.deposit
    })
    const contract = await prisma.rentalContract.create({'''

content = content.replace(old_contract, new_contract)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Logs de debug ajoutés")
