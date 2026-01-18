#!/usr/bin/env python3
"""
Supprime la route dupliquée /api/bookings/:id/check-out
"""

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    lines = f.readlines()

# Trouver la DEUXIÈME occurrence de la route (ligne 2517+)
# et supprimer tout le bloc jusqu'à la fermeture
new_lines = []
skip_block = False
brace_count = 0
found_first = False

i = 0
while i < len(lines):
    line = lines[i]
    
    # Détecter la route check-out
    if "app.post('/api/bookings/:id/check-out'" in line:
        if not found_first:
            # Première occurrence, on la garde
            found_first = True
            new_lines.append(line)
        else:
            # Deuxième occurrence, on la saute entièrement
            print(f"  Suppression du doublon à la ligne {i+1}")
            # Compter les accolades pour trouver la fin du bloc
            brace_count = 0
            while i < len(lines):
                if '{' in lines[i]:
                    brace_count += lines[i].count('{')
                if '}' in lines[i]:
                    brace_count -= lines[i].count('}')
                i += 1
                if brace_count == 0 and i > 0:
                    break
            # Sauter aussi la ligne vide après
            if i < len(lines) and lines[i].strip() == '':
                i += 1
            continue
    else:
        new_lines.append(line)
    i += 1

with open(filepath, 'w') as f:
    f.writelines(new_lines)

# Vérifier
import subprocess
result = subprocess.run(['grep', '-n', "bookings/:id/check-out", filepath], capture_output=True, text=True)
print(f"\n✓ Routes restantes:\n{result.stdout}")
