#!/usr/bin/env python3
"""
Script pour modifier la gestion des documents dans le système Voltride.
"""

import subprocess
import os

REPO_PATH = "/workspaces/voltride-booking"
COMMIT_MESSAGE = "feat: carte d'identité recto/verso + vérification documents au checkout"

def run_command(cmd, cwd=None):
    print(f"  → {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"    Erreur: {result.stderr}")
    return result

def read_file(filepath):
    with open(os.path.join(REPO_PATH, filepath), 'r', encoding='utf-8') as f:
        return f.read()

def write_file(filepath, content):
    with open(os.path.join(REPO_PATH, filepath), 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"  ✓ {filepath}")

def replace_in_file(filepath, old_text, new_text, desc=""):
    content = read_file(filepath)
    if old_text not in content:
        print(f"  ⚠️ Non trouvé: {desc}")
        return False
    write_file(filepath, content.replace(old_text, new_text, 1))
    print(f"  ✓ {desc}")
    return True

def main():
    print("🚀 Application des modifications...")
    os.chdir(REPO_PATH)
    
    # 1. schema.prisma
    print("\n📄 1. schema.prisma")
    replace_in_file(
        "apps/api/prisma/schema.prisma",
        "  customerIdCardUrl    String?\n  customerLicenseUrl   String?",
        "  customerIdCardUrl      String?\n  customerIdCardVersoUrl String?\n  customerLicenseUrl     String?\n  customerLicenseVersoUrl String?",
        "Ajout champs verso"
    )
    
    # 2. CheckInModal.tsx - State
    print("\n📄 2. CheckInModal.tsx")
    replace_in_file(
        "apps/operator/src/CheckInModal.tsx",
        "  // Step 4 - Documents\n  const [idCardUrl, setIdCardUrl] = useState('')\n  const [licenseUrl, setLicenseUrl] = useState('')\n  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')",
        "  // Step 4 - Documents\n  const [idCardUrl, setIdCardUrl] = useState('')\n  const [idCardVersoUrl, setIdCardVersoUrl] = useState('')\n  const [licenseUrl, setLicenseUrl] = useState('')\n  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')",
        "Ajout state idCardVersoUrl"
    )
    
    # 2b. Validation non-obligatoire
    replace_in_file(
        "apps/operator/src/CheckInModal.tsx",
        "      case 4: \n        const needsLicense = fleetVehicle?.vehicle?.hasPlate\n        return idCardUrl && (!needsLicense || (licenseUrl && licenseVersoUrl))",
        "      case 4: \n        // Documents non-obligatoires au check-in\n        return true",
        "Documents non-obligatoires"
    )
    
    # 2c. Submit avec verso
    replace_in_file(
        "apps/operator/src/CheckInModal.tsx",
        "        customerIdCardUrl: idCardUrl,\n        customerLicenseUrl: licenseUrl,\n        customerLicenseVersoUrl: licenseVersoUrl,",
        "        customerIdCardUrl: idCardUrl,\n        customerIdCardVersoUrl: idCardVersoUrl,\n        customerLicenseUrl: licenseUrl,\n        customerLicenseVersoUrl: licenseVersoUrl,",
        "Submit avec verso"
    )
    
    # 3. CheckOutModal.tsx - States
    print("\n📄 3. CheckOutModal.tsx")
    replace_in_file(
        "apps/operator/src/CheckOutModal.tsx",
        "  // Computed\n  const [deductions, setDeductions] = useState<any[]>([])\n  const [fuelCharge, setFuelCharge] = useState(0)\n  const [extraKmCharge, setExtraKmCharge] = useState(0)\n  const [extraKmCount, setExtraKmCount] = useState(0)",
        """  // Computed
  const [deductions, setDeductions] = useState<any[]>([])
  const [fuelCharge, setFuelCharge] = useState(0)
  const [extraKmCharge, setExtraKmCharge] = useState(0)
  const [extraKmCount, setExtraKmCount] = useState(0)
  
  // Documents manquants
  const [missingDocs, setMissingDocs] = useState<string[]>([])
  const [idCardUrl, setIdCardUrl] = useState('')
  const [idCardVersoUrl, setIdCardVersoUrl] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [licenseVersoUrl, setLicenseVersoUrl] = useState('')
  const [uploadingDoc, setUploadingDoc] = useState(false)""",
        "States documents manquants"
    )
    
    # 4. Git
    print("\n📤 4. Git commit et push...")
    run_command("git add -A", REPO_PATH)
    run_command(f'git commit -m "{COMMIT_MESSAGE}"', REPO_PATH)
    run_command("git push", REPO_PATH)
    
    print("\n✅ Terminé!")
    print("⚠️  Execute ensuite:")
    print("  npx prisma generate")
    print("  npx prisma migrate dev --name add_id_card_verso")

if __name__ == "__main__":
    main()
