#!/usr/bin/env python3
import subprocess, os

REPO_PATH = "/workspaces/voltride-booking"

def read_file(fp):
    with open(os.path.join(REPO_PATH, fp), 'r') as f: return f.read()

def write_file(fp, c):
    with open(os.path.join(REPO_PATH, fp), 'w') as f: f.write(c)
    print(f"  ✓ {fp}")

def replace_in_file(fp, old, new, desc=""):
    c = read_file(fp)
    if old not in c:
        print(f"  ⚠️ Non trouvé: {desc}")
        return False
    write_file(fp, c.replace(old, new, 1))
    print(f"  ✓ {desc}")
    return True

def main():
    print("🚀 PARTIE 2 - UI Documents")
    os.chdir(REPO_PATH)
    
    # 1. CheckInModal - UI recto/verso
    print("\n📄 1. CheckInModal.tsx")
    
    old_ui = '''          {/* STEP 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Carte d'identité <span className="text-red-500">*</span>
                </label>
                <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                  (idCardUrl ? 'border-green-500' : 'border-orange-300 hover:border-orange-400')}>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = await uploadPhoto(file)
                        if (url) setIdCardUrl(url)
                      }
                    }} />
                  {idCardUrl ? (
                    <img src={idCardUrl} className="w-full h-full object-contain" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <span className="text-3xl">🪪</span>
                      <span>Photographier la CNI</span>
                    </div>
                  )}
                </label>
              </div>'''
    
    new_ui = '''          {/* STEP 4: Documents */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-blue-700 text-sm">
                ℹ️ Documents <strong>facultatifs maintenant</strong>, mais <strong>obligatoires au retour</strong> pour rembourser la caution.
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Carte d'identité <span className="text-gray-400 text-xs">(optionnel)</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                    (idCardUrl ? 'border-green-500' : 'border-gray-300 hover:border-gray-400')}>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await uploadPhoto(file)
                          if (url) setIdCardUrl(url)
                        }
                      }} />
                    {idCardUrl ? (
                      <img src={idCardUrl} className="w-full h-full object-contain" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">🪪</span>
                        <span className="text-sm">Recto</span>
                      </div>
                    )}
                  </label>
                  <label className={'block border-2 border-dashed rounded-xl h-32 cursor-pointer transition-all overflow-hidden ' +
                    (idCardVersoUrl ? 'border-green-500' : 'border-gray-300 hover:border-gray-400')}>
                    <input type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const url = await uploadPhoto(file)
                          if (url) setIdCardVersoUrl(url)
                        }
                      }} />
                    {idCardVersoUrl ? (
                      <img src={idCardVersoUrl} className="w-full h-full object-contain" />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <span className="text-2xl">🪪</span>
                        <span className="text-sm">Verso</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>'''
    
    replace_in_file("apps/operator/src/CheckInModal.tsx", old_ui, new_ui, "UI CNI recto/verso")
    
    # 2. CheckOutModal
    print("\n📄 2. CheckOutModal.tsx")
    
    old_load = '''        // Initialize validations
        setPhotoValidations(photos.map(url => ({
          originalUrl: url,
          validated: null,
          damagedParts: []
        })))
      }'''
    
    new_load = '''        // Initialize validations
        setPhotoValidations(photos.map(url => ({
          originalUrl: url,
          validated: null,
          damagedParts: []
        })))
        
        // Vérifier documents manquants
        const missing: string[] = []
        const needsLicense = booking.fleetVehicle?.vehicle?.hasPlate
        if (!contractData.customerIdCardUrl) missing.push('idCardRecto')
        if (!contractData.customerIdCardVersoUrl) missing.push('idCardVerso')
        if (needsLicense && !contractData.customerLicenseUrl) missing.push('licenseRecto')
        if (needsLicense && !contractData.customerLicenseVersoUrl) missing.push('licenseVerso')
        setMissingDocs(missing)
      }'''
    
    replace_in_file("apps/operator/src/CheckOutModal.tsx", old_load, new_load, "Vérif docs")
    
    old_handler = '''  // Photo validation handlers
  const validateCurrentPhoto = (isValid: boolean) => {'''
    
    new_handler = '''  // Upload document manquant
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingDoc(true)
    try {
      const url = await api.uploadImage(file, `checkout/${booking.id}/docs`)
      if (url) {
        if (type === 'idCardRecto') setIdCardUrl(url)
        if (type === 'idCardVerso') setIdCardVersoUrl(url)
        if (type === 'licenseRecto') setLicenseUrl(url)
        if (type === 'licenseVerso') setLicenseVersoUrl(url)
        setMissingDocs(prev => prev.filter(d => d !== type))
      }
    } catch (err) { alert('Erreur upload') }
    setUploadingDoc(false)
  }

  // Photo validation handlers
  const validateCurrentPhoto = (isValid: boolean) => {'''
    
    replace_in_file("apps/operator/src/CheckOutModal.tsx", old_handler, new_handler, "Handler upload")
    
    old_summary = '''              {/* No issues */}
              {deductions.length === 0 && fuelCharge === 0 && extraKmCharge === 0 && (
                <div className="p-4 bg-green-50 rounded-lg text-center text-green-700">
                  Aucun dommage constaté
                </div>
              )}

              {/* Deposit calculation */}'''
    
    new_summary = '''              {/* No issues */}
              {deductions.length === 0 && fuelCharge === 0 && extraKmCharge === 0 && (
                <div className="p-4 bg-green-50 rounded-lg text-center text-green-700">✓ Aucun dommage</div>
              )}

              {/* Documents manquants */}
              {missingDocs.length > 0 && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                  <p className="font-medium text-red-700 mb-2">⚠️ Documents manquants - Caution bloquée</p>
                  <div className="grid grid-cols-2 gap-2">
                    {missingDocs.includes('idCardRecto') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'idCardRecto')} />
                        <span>🪪</span><span className="text-xs">CNI Recto</span>
                      </label>
                    )}
                    {missingDocs.includes('idCardVerso') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'idCardVerso')} />
                        <span>🪪</span><span className="text-xs">CNI Verso</span>
                      </label>
                    )}
                    {missingDocs.includes('licenseRecto') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'licenseRecto')} />
                        <span>🪪</span><span className="text-xs">Permis Recto</span>
                      </label>
                    )}
                    {missingDocs.includes('licenseVerso') && (
                      <label className="border-2 border-dashed border-red-300 rounded-lg h-20 cursor-pointer flex flex-col items-center justify-center text-red-400">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handleDocUpload(e, 'licenseVerso')} />
                        <span>🪪</span><span className="text-xs">Permis Verso</span>
                      </label>
                    )}
                  </div>
                  {uploadingDoc && <p className="text-blue-600 text-sm mt-2 text-center">⏳ Upload...</p>}
                </div>
              )}

              {/* Deposit calculation */}'''
    
    replace_in_file("apps/operator/src/CheckOutModal.tsx", old_summary, new_summary, "UI docs manquants")
    
    old_btn = '''              <button onClick={handleFinalize} disabled={processing}
                className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50">
                {processing ? 'Finalisation...' : 'Finaliser le check-out'}
              </button>'''
    
    new_btn = '''              <button onClick={handleFinalize} disabled={processing || missingDocs.length > 0}
                className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50">
                {processing ? '...' : missingDocs.length > 0 ? '⚠️ Docs requis' : '✅ Finaliser'}
              </button>'''
    
    replace_in_file("apps/operator/src/CheckOutModal.tsx", old_btn, new_btn, "Bouton bloqué")
    
    # Git
    print("\n📤 Git...")
    subprocess.run("git add -A && git commit -m 'feat: UI documents recto/verso' && git push", shell=True, cwd=REPO_PATH)
    print("\n✅ Terminé!")

if __name__ == "__main__":
    main()
