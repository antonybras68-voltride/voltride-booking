import PDFDocument from 'pdfkit'

// Logos des marques
const LOGOS = {
  'VOLTRIDE': 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766928342/d5uv1qrfwr86rd1abtd1.png',
  'MOTOR-RENT': 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766930480/logo-2024-e1699439584325-removebg-preview_sv6yxg.png'
}

// Fonction pour télécharger une image depuis une URL
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (e) {
    console.error('Error fetching image:', e)
    return null
  }
}

// Formater une date
function formatDate(date: Date | string, lang: string = 'fr'): string {
  const d = new Date(date)
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-GB', options)
}

// Formater un montant
function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toFixed(2) + ' €'
}

// Traductions
const translations = {
  fr: {
    contract: 'CONTRAT DE LOCATION',
    invoice: 'FACTURE',
    customer: 'Client',
    vehicle: 'Véhicule',
    period: 'Période de location',
    from: 'Du',
    to: 'Au',
    days: 'jours',
    dailyRate: 'Tarif journalier',
    subtotal: 'Sous-total',
    options: 'Options',
    discount: 'Remise',
    taxRate: 'TVA',
    total: 'Total TTC',
    deposit: 'Caution',
    signature: 'Signature du client',
    date: 'Date',
    contractNumber: 'N° Contrat',
    invoiceNumber: 'N° Facture',
    cgv: 'Conditions Générales de Vente',
    rgpd: 'Protection des données (RGPD)',
    legalNotice: 'Mentions légales',
    page: 'Page',
    of: 'sur',
    depositMethod: 'Mode de caution',
    paymentMethod: 'Mode de paiement',
    mileageStart: 'Kilométrage départ',
    mileageEnd: 'Kilométrage retour',
    fuelStart: 'Niveau carburant départ',
    fuelEnd: 'Niveau carburant retour',
    deductions: 'Déductions',
    refund: 'Remboursement caution',
    htAmount: 'Montant HT',
    tvaAmount: 'Montant TVA',
    ttcAmount: 'Montant TTC'
  },
  es: {
    contract: 'CONTRATO DE ALQUILER',
    invoice: 'FACTURA',
    customer: 'Cliente',
    vehicle: 'Vehículo',
    period: 'Período de alquiler',
    from: 'Desde',
    to: 'Hasta',
    days: 'días',
    dailyRate: 'Tarifa diaria',
    subtotal: 'Subtotal',
    options: 'Opciones',
    discount: 'Descuento',
    taxRate: 'IVA',
    total: 'Total con IVA',
    deposit: 'Fianza',
    signature: 'Firma del cliente',
    date: 'Fecha',
    contractNumber: 'N° Contrato',
    invoiceNumber: 'N° Factura',
    cgv: 'Condiciones Generales de Venta',
    rgpd: 'Protección de datos (RGPD)',
    legalNotice: 'Aviso legal',
    page: 'Página',
    of: 'de',
    depositMethod: 'Método de fianza',
    paymentMethod: 'Método de pago',
    mileageStart: 'Kilometraje salida',
    mileageEnd: 'Kilometraje llegada',
    fuelStart: 'Nivel combustible salida',
    fuelEnd: 'Nivel combustible llegada',
    deductions: 'Deducciones',
    refund: 'Reembolso fianza',
    htAmount: 'Importe sin IVA',
    tvaAmount: 'Importe IVA',
    ttcAmount: 'Importe con IVA'
  },
  en: {
    contract: 'RENTAL CONTRACT',
    invoice: 'INVOICE',
    customer: 'Customer',
    vehicle: 'Vehicle',
    period: 'Rental period',
    from: 'From',
    to: 'To',
    days: 'days',
    dailyRate: 'Daily rate',
    subtotal: 'Subtotal',
    options: 'Options',
    discount: 'Discount',
    taxRate: 'VAT',
    total: 'Total incl. VAT',
    deposit: 'Deposit',
    signature: 'Customer signature',
    date: 'Date',
    contractNumber: 'Contract No.',
    invoiceNumber: 'Invoice No.',
    cgv: 'Terms and Conditions',
    rgpd: 'Data Protection (GDPR)',
    legalNotice: 'Legal notice',
    page: 'Page',
    of: 'of',
    depositMethod: 'Deposit method',
    paymentMethod: 'Payment method',
    mileageStart: 'Start mileage',
    mileageEnd: 'End mileage',
    fuelStart: 'Start fuel level',
    fuelEnd: 'End fuel level',
    deductions: 'Deductions',
    refund: 'Deposit refund',
    htAmount: 'Amount excl. VAT',
    tvaAmount: 'VAT amount',
    ttcAmount: 'Amount incl. VAT'
  }
}

// ============== GÉNÉRATION DU CONTRAT PDF ==============
export async function generateContractPDF(contract: any, brandSettings: any, lang: string = 'fr'): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const t = translations[lang] || translations.fr
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
      const chunks: Buffer[] = []
      
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE'
      const logoUrl = LOGOS[brand] || LOGOS['VOLTRIDE']
      const logoBuffer = await fetchImageBuffer(logoUrl)

      // ============== PAGE 1 - RECTO ==============
      
      // Header avec logo
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 })
      }
      
      // Titre
      doc.fontSize(18).font('Helvetica-Bold')
         .text(t.contract, 200, 50, { align: 'right' })
      
      doc.fontSize(10).font('Helvetica')
         .text(`${t.contractNumber}: ${contract.contractNumber}`, 200, 75, { align: 'right' })
         .text(`${t.date}: ${formatDate(contract.createdAt || new Date(), lang)}, 200, 90, { align: 'right' })

      // Ligne de séparation
      doc.moveTo(40, 120).lineTo(555, 120).stroke()

      // Infos client
      let y = 140
      doc.fontSize(12).font('Helvetica-Bold').text(t.customer, 40, y)
      doc.fontSize(10).font('Helvetica')
      y += 18
      doc.text(`${contract.customer?.firstName || ''} ${contract.customer?.lastName || ''}`, 40, y)
      y += 14
      if (contract.customer?.email) doc.text(contract.customer.email, 40, y); y += 14
      if (contract.customer?.phone) doc.text(contract.customer.phone, 40, y); y += 14
      if (contract.customer?.address) doc.text(contract.customer.address, 40, y); y += 14
      if (contract.customer?.city) doc.text(`${contract.customer.postalCode || ''} ${contract.customer.city}`, 40, y)

      // Infos véhicule
      y = 140
      doc.fontSize(12).font('Helvetica-Bold').text(t.vehicle, 300, y)
      doc.fontSize(10).font('Helvetica')
      y += 18
      const vehicleName = contract.fleetVehicle?.vehicle?.name
      const vName = typeof vehicleName === 'object' ? (vehicleName[lang] || vehicleName.fr || '') : (vehicleName || '')
      doc.text(vName, 300, y); y += 14
      doc.text(`N°: ${contract.fleetVehicle?.vehicleNumber || ''}`, 300, y); y += 14
      if (contract.fleetVehicle?.licensePlate) doc.text(`Plaque: ${contract.fleetVehicle.licensePlate}`, 300, y); y += 14

      // Période de location
      y = 280
      doc.fontSize(12).font('Helvetica-Bold').text(t.period, 40, y)
      y += 18
      doc.fontSize(10).font('Helvetica')
      doc.text(`${t.from}: ${formatDate(contract.currentStartDate, lang)}, 40, y)
      doc.text(`${t.to}: ${formatDate(contract.currentEndDate, lang)}, 200, y)
      doc.text(`${contract.totalDays} ${t.days}`, 400, y)

      // Tableau des prix
      y = 340
      doc.fontSize(12).font('Helvetica-Bold').text('Détails', 40, y)
      y += 20
      
      // Lignes du tableau
      doc.fontSize(10).font('Helvetica')
      const drawLine = (label: string, value: string, bold: boolean = false) => {
        if (bold) doc.font('Helvetica-Bold')
        doc.text(label, 40, y)
        doc.text(value, 450, y, { align: 'right', width: 105 })
        if (bold) doc.font('Helvetica')
        y += 18
      }

      drawLine(t.dailyRate, formatMoney(contract.dailyRate))
      drawLine(t.subtotal, formatMoney(contract.subtotal))
      if (parseFloat(contract.optionsTotal) > 0) drawLine(t.options, formatMoney(contract.optionsTotal))
      if (parseFloat(contract.discountAmount) > 0) drawLine(t.discount, '-' + formatMoney(contract.discountAmount))
      
      // Ligne de séparation
      doc.moveTo(40, y).lineTo(555, y).stroke()
      y += 10
      
      const htAmount = parseFloat(contract.totalAmount) / 1.21
      drawLine(t.htAmount, formatMoney(htAmount))
      drawLine(`${t.taxRate} (21%)`, formatMoney(contract.taxAmount))
      drawLine(t.total, formatMoney(contract.totalAmount), true)
      
      y += 10
      drawLine(t.deposit, formatMoney(contract.depositAmount), true)

      // CGV Résumé
      y = 520
      doc.fontSize(10).font('Helvetica-Bold').text(t.cgv, 40, y)
      y += 15
      doc.fontSize(7).font('Helvetica')
      const cgvResume = brandSettings?.cgvResume?.[lang] || brandSettings?.cgvResume?.fr || ''
      if (cgvResume) {
        doc.text(cgvResume, 40, y, { width: 515, align: 'justify' })
      }

      // Zone signature
      y = 720
      doc.fontSize(10).font('Helvetica-Bold').text(t.signature, 40, y)
      doc.rect(40, y + 15, 200, 60).stroke()
      
      if (contract.customerSignature) {
        try {
          const sigBuffer = Buffer.from(contract.customerSignature.split(',')[1], 'base64')
          doc.image(sigBuffer, 45, y + 20, { width: 190, height: 50 })
        } catch (e) {}
      }

      doc.text(`${t.date}: ${contract.customerSignedAt ? formatDate(contract.customerSignedAt, lang) : '_______________'}`, 280, y + 40)

      // ============== PAGE 2 - VERSO ==============
      doc.addPage()

      // CGV Complètes
      y = 40
      doc.fontSize(12).font('Helvetica-Bold').text(t.cgv, 40, y)
      y += 20
      doc.fontSize(7).font('Helvetica')
      const cgvComplete = brandSettings?.cgvComplete?.[lang] || brandSettings?.cgvComplete?.fr || ''
      if (cgvComplete) {
        doc.text(cgvComplete, 40, y, { width: 515, align: 'justify' })
        y = doc.y + 20
      }

      // RGPD
      if (y < 600) {
        doc.fontSize(12).font('Helvetica-Bold').text(t.rgpd, 40, y)
        y += 20
        doc.fontSize(7).font('Helvetica')
        const rgpd = brandSettings?.rgpd?.[lang] || brandSettings?.rgpd?.fr || ''
        if (rgpd) {
          doc.text(rgpd, 40, y, { width: 515, align: 'justify' })
        }
      }

      // Numéro de page
      const pages = doc.bufferedPageRange()
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i)
        doc.fontSize(8).text(`${t.page} ${i + 1} ${t.of} ${pages.count}`, 40, 800, { align: 'center', width: 515 })
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}

// ============== GÉNÉRATION DE LA FACTURE PDF ==============
export async function generateInvoicePDF(contract: any, brandSettings: any, lang: string = 'fr', invoiceNumber?: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const t = translations[lang] || translations.fr
      const doc = new PDFDocument({ size: 'A4', margin: 40 })
      const chunks: Buffer[] = []
      
      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE'
      const logoUrl = LOGOS[brand] || LOGOS['VOLTRIDE']
      const logoBuffer = await fetchImageBuffer(logoUrl)

      // Header avec logo
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 })
      }

      // Infos entreprise
      doc.fontSize(8).font('Helvetica')
      let companyY = 30
      if (brandSettings?.legalName) doc.text(brandSettings.legalName, 350, companyY, { align: 'right' }); companyY += 12
      if (brandSettings?.address) doc.text(brandSettings.address, 350, companyY, { align: 'right' }); companyY += 12
      if (brandSettings?.city) doc.text(`${brandSettings.postalCode || ''} ${brandSettings.city}`, 350, companyY, { align: 'right' }); companyY += 12
      if (brandSettings?.taxId) doc.text(`NIF: ${brandSettings.taxId}`, 350, companyY, { align: 'right' }); companyY += 12
      if (brandSettings?.email) doc.text(brandSettings.email, 350, companyY, { align: 'right' }); companyY += 12
      if (brandSettings?.phone) doc.text(brandSettings.phone, 350, companyY, { align: 'right' })

      // Titre Facture
      doc.fontSize(20).font('Helvetica-Bold')
         .text(t.invoice, 40, 130)
      
      const invNum = invoiceNumber || `FAC-${contract.contractNumber}`
      doc.fontSize(10).font('Helvetica')
         .text(`${t.invoiceNumber}: ${invNum}`, 40, 160)
         .text(`${t.date}: ${formatDate(new Date(), lang)}, 40, 175)
         .text(`${t.contractNumber}: ${contract.contractNumber}`, 40, 190)

      // Ligne de séparation
      doc.moveTo(40, 210).lineTo(555, 210).stroke()

      // Infos client
      let y = 230
      doc.fontSize(11).font('Helvetica-Bold').text(t.customer, 40, y)
      doc.fontSize(10).font('Helvetica')
      y += 18
      doc.text(`${contract.customer?.firstName || ''} ${contract.customer?.lastName || ''}`, 40, y); y += 14
      if (contract.customer?.email) doc.text(contract.customer.email, 40, y); y += 14
      if (contract.customer?.phone) doc.text(contract.customer.phone, 40, y); y += 14
      if (contract.customer?.address) doc.text(contract.customer.address, 40, y); y += 14
      if (contract.customer?.city) doc.text(`${contract.customer.postalCode || ''} ${contract.customer.city}`, 40, y)

      // Détails de la location
      y = 350
      doc.fontSize(11).font('Helvetica-Bold').text('Détails de la location', 40, y)
      y += 25

      // En-tête tableau
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text('Description', 40, y)
      doc.text('Qté', 300, y)
      doc.text('Prix unit.', 350, y)
      doc.text('Total', 480, y, { align: 'right', width: 75 })
      y += 5
      doc.moveTo(40, y + 10).lineTo(555, y + 10).stroke()
      y += 20

      // Lignes
      doc.fontSize(9).font('Helvetica')
      
      // Véhicule
      const vehicleName = contract.fleetVehicle?.vehicle?.name
      const vName = typeof vehicleName === 'object' ? (vehicleName[lang] || vehicleName.fr || '') : (vehicleName || '')
      doc.text(`${vName} (${contract.totalDays} ${t.days})`, 40, y)
      doc.text(contract.totalDays.toString(), 300, y)
      doc.text(formatMoney(contract.dailyRate), 350, y)
      doc.text(formatMoney(contract.subtotal), 480, y, { align: 'right', width: 75 })
      y += 18

      // Options si présentes
      if (parseFloat(contract.optionsTotal) > 0) {
        doc.text(t.options, 40, y)
        doc.text(formatMoney(contract.optionsTotal), 480, y, { align: 'right', width: 75 })
        y += 18
      }

      // Remise si présente
      if (parseFloat(contract.discountAmount) > 0) {
        doc.text(`${t.discount}${contract.discountReason ? ` (${contract.discountReason})` : ''}`, 40, y)
        doc.text('-' + formatMoney(contract.discountAmount), 480, y, { align: 'right', width: 75 })
        y += 18
      }

      // Ligne de séparation
      y += 5
      doc.moveTo(40, y).lineTo(555, y).stroke()
      y += 15

      // Totaux
      const htAmount = parseFloat(contract.totalAmount) / 1.21
      const taxAmount = parseFloat(contract.totalAmount) - htAmount
      
      doc.text(t.htAmount, 350, y)
      doc.text(formatMoney(htAmount), 480, y, { align: 'right', width: 75 })
      y += 16
      
      doc.text(`${t.taxRate} (21%)`, 350, y)
      doc.text(formatMoney(taxAmount), 480, y, { align: 'right', width: 75 })
      y += 16
      
      doc.font('Helvetica-Bold')
      doc.text(t.total, 350, y)
      doc.text(formatMoney(contract.totalAmount), 480, y, { align: 'right', width: 75 })
      y += 25

      // Déductions si présentes
      if (parseFloat(contract.totalDeductions) > 0) {
        doc.font('Helvetica')
        doc.text(t.deductions, 350, y)
        doc.text('-' + formatMoney(contract.totalDeductions), 480, y, { align: 'right', width: 75 })
        y += 16
        
        if (contract.deductionNotes) {
          doc.fontSize(8).text(`Note: ${contract.deductionNotes}`, 40, y, { width: 515 })
          y += 20
        }
      }

      // Caution
      y += 10
      doc.fontSize(9).font('Helvetica')
      doc.text(`${t.deposit}: ${formatMoney(contract.depositAmount)}, 40, y)
      if (contract.finalDepositRefund !== null && contract.finalDepositRefund !== undefined) {
        doc.text(`${t.refund}: ${formatMoney(contract.finalDepositRefund)}, 250, y)
      }

      // Mentions légales
      y = 700
      doc.fontSize(7).font('Helvetica')
      const mentions = brandSettings?.mentionsLegales?.[lang] || brandSettings?.mentionsLegales?.fr || ''
      if (mentions) {
        doc.text(mentions, 40, y, { width: 515, align: 'center' })
      }

      doc.end()
    } catch (e) {
      reject(e)
    }
  })
}
