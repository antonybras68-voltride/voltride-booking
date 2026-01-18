#!/usr/bin/env python3
"""
Supprime toutes les routes dupliquées dans l'API
Garde la PREMIÈRE occurrence de chaque route
"""

import re

filepath = "/workspaces/voltride-booking/apps/api/src/index.ts"

with open(filepath, 'r') as f:
    content = f.read()

# Pattern pour trouver les définitions de routes
route_pattern = r"app\.(post|get|put|delete)\('([^']+)'"

# Trouver toutes les routes avec leur position
routes_found = {}
lines = content.split('\n')
new_lines = []
skip_until_close = False
brace_count = 0
current_route = None

i = 0
while i < len(lines):
    line = lines[i]
    
    # Chercher une définition de route
    match = re.search(r"app\.(post|get|put|delete)\('([^']+)'", line)
    
    if match and not skip_until_close:
        method = match.group(1)
        path = match.group(2)
        route_key = f"{method}:{path}"
        
        if route_key in routes_found:
            # Route dupliquée - on saute tout le bloc
            print(f"  Suppression doublon: {method.upper()} {path} (ligne {i+1})")
            skip_until_close = True
            brace_count = 0
            # Compter les accolades sur cette ligne
            brace_count += line.count('{') - line.count('}')
            if brace_count == 0 and '{' in line:
                # Bloc sur une seule ligne ou début
                pass
            i += 1
            continue
        else:
            routes_found[route_key] = i + 1
            new_lines.append(line)
    elif skip_until_close:
        brace_count += line.count('{') - line.count('}')
        if brace_count <= 0:
            skip_until_close = False
            brace_count = 0
            # Ne pas ajouter la ligne de fermeture du doublon
        i += 1
        continue
    else:
        new_lines.append(line)
    
    i += 1

with open(filepath, 'w') as f:
    f.write('\n'.join(new_lines))

print(f"\n✓ Nettoyage terminé!")
print(f"  Routes uniques conservées: {len(routes_found)}")

# Vérifier qu'il n'y a plus de doublons
import subprocess
result = subprocess.run(
    "grep -o \"app\\.\\(post\\|get\\|put\\|delete\\)('[^']*'\" " + filepath + " | sort | uniq -d",
    shell=True, capture_output=True, text=True
)
if result.stdout.strip():
    print(f"\n⚠️ Doublons restants:\n{result.stdout}")
else:
    print("\n✓ Aucun doublon restant!")
