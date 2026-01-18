#!/usr/bin/env python3
"""
Ajoute la route GET /api/contracts pour lister tous les contrats
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Ajouter la route GET /api/contracts avant la route des deductions
new_route = '''// ============== LIST ALL CONTRACTS ==============
app.get('/api/contracts', async (req, res) => {
  try {
    const contracts = await prisma.rentalContract.findMany({
      include: {
        customer: true,
        fleetVehicle: { include: { vehicle: true } },
        agency: true,
        booking: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(contracts)
  } catch (e: any) {
    console.error('Error fetching contracts:', e)
    res.status(500).json({ error: e.message })
  }
})

'''

# Insérer avant la route des deductions
marker = "app.get('/api/contracts/:contractId/deductions'"
if marker in content and "app.get('/api/contracts'," not in content:
    content = content.replace(marker, new_route + marker)
    with open(filepath, 'w') as f:
        f.write(content)
    print("✓ Route GET /api/contracts ajoutée")
else:
    print("⚠️ Route déjà existante ou marker non trouvé")
