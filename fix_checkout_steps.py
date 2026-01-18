#!/usr/bin/env python3
"""
Ajoute des logs à chaque étape de la création du contrat
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Ajouter un log après la création du contrat
old_after_contract = '''    })
    
    // Mettre à jour la réservation'''

new_after_contract = '''    })
    console.log('Contract created:', contract.id)
    
    // Mettre à jour la réservation'''

content = content.replace(old_after_contract, new_after_contract, 1)

# Ajouter un log après la mise à jour de la réservation
old_after_booking = '''    })
    
    // Mettre à jour le véhicule'''

new_after_booking = '''    })
    console.log('Booking updated')
    
    // Mettre à jour le véhicule'''

content = content.replace(old_after_booking, new_after_booking, 1)

# Ajouter un log après la mise à jour du véhicule
old_after_fleet = '''    })
    
    // Créer l'inspection de départ'''

new_after_fleet = '''    })
    console.log('Fleet updated')
    
    // Créer l'inspection de départ'''

content = content.replace(old_after_fleet, new_after_fleet, 1)

# Ajouter un log après l'inspection
old_after_inspection = '''      }
    })
    
    res.json(contract)'''

new_after_inspection = '''      }
    })
    console.log('Inspection created')
    console.log('=== CHECK-OUT SUCCESS ===')
    
    res.json(contract)'''

content = content.replace(old_after_inspection, new_after_inspection, 1)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Logs ajoutés à chaque étape")
