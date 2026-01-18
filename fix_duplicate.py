#!/usr/bin/env python3
import os

filepath = "/workspaces/voltride-booking/apps/operator/src/CheckOutModal.tsx"

with open(filepath, 'r') as f:
    lines = f.readlines()

# Trouver et supprimer le deuxième bloc handleDocUpload (lignes 130-145 environ)
# On cherche le deuxième "const handleDocUpload" et on supprime jusqu'au "}"
in_duplicate = False
skip_until_closing = False
new_lines = []
first_found = False

i = 0
while i < len(lines):
    line = lines[i]
    
    # Détecter "const handleDocUpload"
    if "const handleDocUpload = async" in line:
        if not first_found:
            # Premier, on le garde
            first_found = True
            new_lines.append(line)
        else:
            # Deuxième, on saute tout le bloc jusqu'à la fermeture
            # On compte les accolades pour trouver la fin
            brace_count = 0
            while i < len(lines):
                if '{' in lines[i]:
                    brace_count += lines[i].count('{')
                if '}' in lines[i]:
                    brace_count -= lines[i].count('}')
                i += 1
                if brace_count == 0:
                    break
            continue
    else:
        new_lines.append(line)
    i += 1

with open(filepath, 'w') as f:
    f.writelines(new_lines)

print("✓ Doublon supprimé!")
print("Vérification:")
os.system(f'grep -n "handleDocUpload" {filepath} | head -5')
