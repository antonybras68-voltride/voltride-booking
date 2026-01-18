#!/usr/bin/env python3
"""
Améliore la gestion d'erreur de la route check-out
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Améliorer le catch pour voir l'erreur complète
old_catch = '''  } catch (error) {
    console.error('Check-out error:', error)
    res.status(500).json({ error: 'Failed to process check-out', details: (error as Error).message })
  }
})'''

new_catch = '''  } catch (error: any) {
    console.error('=== CHECK-OUT ERROR ===')
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error code:', error?.code)
    console.error('Error meta:', error?.meta)
    console.error('Full error:', JSON.stringify(error, null, 2))
    res.status(500).json({ 
      error: 'Failed to process check-out', 
      details: error?.message,
      code: error?.code,
      meta: error?.meta
    })
  }
})'''

content = content.replace(old_catch, new_catch)

with open(filepath, 'w') as f:
    f.write(content)

print("✓ Gestion d'erreur améliorée")
