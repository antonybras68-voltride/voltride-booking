import PDFDocument from 'pdfkit';

const LOGOS: Record<string, string> = {
  'VOLTRIDE': 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1769278425/IMG-20260111-WA0001_1_-removebg-preview_zzajxa.png',
  'MOTOR-RENT': 'https://res.cloudinary.com/dis5pcnfr/image/upload/v1766930480/logo-2024-e1699439584325-removebg-preview_sv6yxg.png'
};

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    console.error('Error fetching image:', e);
    return null;
  }
}

function formatDate(date: Date | string, lang: string = 'fr'): string {
  const d = new Date(date);
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-GB', options);
}

function formatMoney(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2) + ' EUR';
}

const translations: Record<string, Record<string, string>> = {
  fr: {
    contract: 'CONTRAT DE LOCATION',
    invoice: 'FACTURE',
    customer: 'Client',
    vehicle: 'Vehicule',
    period: 'Periode de location',
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
    contractNumber: 'N Contrat',
    invoiceNumber: 'N Facture',
    cgv: 'Conditions Generales de Vente',
    rgpd: 'Protection des donnees (RGPD)',
    page: 'Page',
    of: 'sur',
    htAmount: 'Montant HT',
    tvaAmount: 'Montant TVA',
    ttcAmount: 'Montant TTC',
    deductions: 'Deductions',
    refund: 'Remboursement caution'
  },
  es: {
    contract: 'CONTRATO DE ALQUILER',
    invoice: 'FACTURA',
    customer: 'Cliente',
    vehicle: 'Vehiculo',
    period: 'Periodo de alquiler',
    from: 'Desde',
    to: 'Hasta',
    days: 'dias',
    dailyRate: 'Tarifa diaria',
    subtotal: 'Subtotal',
    options: 'Opciones',
    discount: 'Descuento',
    taxRate: 'IVA',
    total: 'Total con IVA',
    deposit: 'Fianza',
    signature: 'Firma del cliente',
    date: 'Fecha',
    contractNumber: 'N Contrato',
    invoiceNumber: 'N Factura',
    cgv: 'Condiciones Generales de Venta',
    rgpd: 'Proteccion de datos (RGPD)',
    page: 'Pagina',
    of: 'de',
    htAmount: 'Importe sin IVA',
    tvaAmount: 'Importe IVA',
    ttcAmount: 'Importe con IVA',
    deductions: 'Deducciones',
    refund: 'Reembolso fianza'
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
    contractNumber: 'Contract No',
    invoiceNumber: 'Invoice No',
    cgv: 'Terms and Conditions',
    rgpd: 'Data Protection (GDPR)',
    page: 'Page',
    of: 'of',
    htAmount: 'Amount excl. VAT',
    tvaAmount: 'VAT amount',
    ttcAmount: 'Amount incl. VAT',
    deductions: 'Deductions',
    refund: 'Deposit refund'
  }
};

export async function generateContractPDF(contract: any, brandSettings: any, lang: string = 'fr'): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const t = translations[lang] || translations.fr;
      const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE';
      const logoUrl = LOGOS[brand] || LOGOS['VOLTRIDE'];
      const logoBuffer = await fetchImageBuffer(logoUrl);

      // PAGE 1 - RECTO
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 });
      }
      
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text(t.contract, 200, 50, { align: 'right' });
      
      doc.fontSize(10).font('Helvetica');
      doc.text(t.contractNumber + ': ' + contract.contractNumber, 200, 75, { align: 'right' });
      doc.text(t.date + ': ' + formatDate(contract.createdAt || new Date(), lang), 200, 90, { align: 'right' });

      doc.moveTo(40, 120).lineTo(555, 120).stroke();

      // Client info
      let y = 140;
      doc.fontSize(12).font('Helvetica-Bold').text(t.customer, 40, y);
      doc.fontSize(10).font('Helvetica');
      y += 18;
      doc.text((contract.customer?.firstName || '') + ' ' + (contract.customer?.lastName || ''), 40, y);
      y += 14;
      if (contract.customer?.email) { doc.text(contract.customer.email, 40, y); y += 14; }
      if (contract.customer?.phone) { doc.text(contract.customer.phone, 40, y); y += 14; }
      if (contract.customer?.address) { doc.text(contract.customer.address, 40, y); y += 14; }
      if (contract.customer?.city) { doc.text((contract.customer.postalCode || '') + ' ' + contract.customer.city, 40, y); }

      // Vehicle info
      y = 140;
      doc.fontSize(12).font('Helvetica-Bold').text(t.vehicle, 300, y);
      doc.fontSize(10).font('Helvetica');
      y += 18;
      const vehicleName = contract.fleetVehicle?.vehicle?.name;
      const vName = typeof vehicleName === 'object' ? (vehicleName[lang] || vehicleName.fr || '') : (vehicleName || '');
      doc.text(vName, 300, y);
      y += 14;
      doc.text('N: ' + (contract.fleetVehicle?.vehicleNumber || ''), 300, y);
      y += 14;
      if (contract.fleetVehicle?.licensePlate) { doc.text('Plaque: ' + contract.fleetVehicle.licensePlate, 300, y); }

      // Period
      y = 280;
      doc.fontSize(12).font('Helvetica-Bold').text(t.period, 40, y);
      y += 18;
      doc.fontSize(10).font('Helvetica');
      doc.text(t.from + ': ' + formatDate(contract.currentStartDate, lang), 40, y);
      doc.text(t.to + ': ' + formatDate(contract.currentEndDate, lang), 200, y);
      doc.text(contract.totalDays + ' ' + t.days, 400, y);

      // Prices
      y = 340;
      doc.fontSize(12).font('Helvetica-Bold').text('Details', 40, y);
      y += 20;
      
      doc.fontSize(10).font('Helvetica');
      doc.text(t.dailyRate, 40, y); doc.text(formatMoney(contract.dailyRate), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.text(t.subtotal, 40, y); doc.text(formatMoney(contract.subtotal), 450, y, { align: 'right', width: 105 }); y += 18;
      
      if (parseFloat(contract.optionsTotal) > 0) {
        doc.text(t.options, 40, y); doc.text(formatMoney(contract.optionsTotal), 450, y, { align: 'right', width: 105 }); y += 18;
      }
      if (parseFloat(contract.discountAmount) > 0) {
        doc.text(t.discount, 40, y); doc.text('-' + formatMoney(contract.discountAmount), 450, y, { align: 'right', width: 105 }); y += 18;
      }
      
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 10;
      
      const htAmount = parseFloat(contract.totalAmount) / 1.21;
      doc.text(t.htAmount, 40, y); doc.text(formatMoney(htAmount), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.text(t.taxRate + ' (21%)', 40, y); doc.text(formatMoney(contract.taxAmount), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.font('Helvetica-Bold');
      doc.text(t.total, 40, y); doc.text(formatMoney(contract.totalAmount), 450, y, { align: 'right', width: 105 }); y += 18;
      y += 10;
      doc.text(t.deposit, 40, y); doc.text(formatMoney(contract.depositAmount), 450, y, { align: 'right', width: 105 });

      // CGV Resume
      y = 520;
      doc.fontSize(10).font('Helvetica-Bold').text(t.cgv, 40, y);
      y += 15;
      doc.fontSize(7).font('Helvetica');
      const cgvResume = brandSettings?.cgvResume?.[lang] || brandSettings?.cgvResume?.fr || '';
      if (cgvResume) {
        doc.text(cgvResume, 40, y, { width: 515, align: 'justify' });
      }

      // Signature
      y = 720;
      doc.fontSize(10).font('Helvetica-Bold').text(t.signature, 40, y);
      doc.rect(40, y + 15, 200, 60).stroke();
      
      if (contract.customerSignature) {
        try {
          const sigData = contract.customerSignature.split(',')[1];
          if (sigData) {
            const sigBuffer = Buffer.from(sigData, 'base64');
            doc.image(sigBuffer, 45, y + 20, { width: 190, height: 50 });
          }
        } catch (e) { console.error('Signature error:', e); }
      }

      const signDate = contract.customerSignedAt ? formatDate(contract.customerSignedAt, lang) : '_______________';
      doc.font('Helvetica').text(t.date + ': ' + signDate, 280, y + 40);

      // PAGE 2 - VERSO
      doc.addPage();

      y = 40;
      doc.fontSize(12).font('Helvetica-Bold').text(t.cgv, 40, y);
      y += 20;
      doc.fontSize(7).font('Helvetica');
      const cgvComplete = brandSettings?.cgvComplete?.[lang] || brandSettings?.cgvComplete?.fr || '';
      if (cgvComplete) {
        doc.text(cgvComplete, 40, y, { width: 515, align: 'justify' });
        y = doc.y + 20;
      }

      if (y < 600) {
        doc.fontSize(12).font('Helvetica-Bold').text(t.rgpd, 40, y);
        y += 20;
        doc.fontSize(7).font('Helvetica');
        const rgpd = brandSettings?.rgpd?.[lang] || brandSettings?.rgpd?.fr || '';
        if (rgpd) {
          doc.text(rgpd, 40, y, { width: 515, align: 'justify' });
        }
      }

      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).text(t.page + ' ' + (i + 1) + ' ' + t.of + ' ' + pages.count, 40, 800, { align: 'center', width: 515 });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function generateInvoicePDF(contract: any, brandSettings: any, lang: string = 'fr'): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const t = translations[lang] || translations.fr;
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE';
      const logoUrl = LOGOS[brand] || LOGOS['VOLTRIDE'];
      const logoBuffer = await fetchImageBuffer(logoUrl);

      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 });
      }

      // Company info
      doc.fontSize(8).font('Helvetica');
      let companyY = 30;
      if (brandSettings?.legalName) { doc.text(brandSettings.legalName, 350, companyY, { align: 'right' }); companyY += 12; }
      if (brandSettings?.address) { doc.text(brandSettings.address, 350, companyY, { align: 'right' }); companyY += 12; }
      if (brandSettings?.city) { doc.text((brandSettings.postalCode || '') + ' ' + brandSettings.city, 350, companyY, { align: 'right' }); companyY += 12; }
      if (brandSettings?.taxId) { doc.text('NIF: ' + brandSettings.taxId, 350, companyY, { align: 'right' }); companyY += 12; }
      if (brandSettings?.email) { doc.text(brandSettings.email, 350, companyY, { align: 'right' }); companyY += 12; }
      if (brandSettings?.phone) { doc.text(brandSettings.phone, 350, companyY, { align: 'right' }); }

      doc.fontSize(20).font('Helvetica-Bold');
      doc.text(t.invoice, 40, 130);
      
      const invNum = 'FAC-' + contract.contractNumber;
      doc.fontSize(10).font('Helvetica');
      doc.text(t.invoiceNumber + ': ' + invNum, 40, 160);
      doc.text(t.date + ': ' + formatDate(new Date(), lang), 40, 175);
      doc.text(t.contractNumber + ': ' + contract.contractNumber, 40, 190);

      doc.moveTo(40, 210).lineTo(555, 210).stroke();

      // Customer
      let y = 230;
      doc.fontSize(11).font('Helvetica-Bold').text(t.customer, 40, y);
      doc.fontSize(10).font('Helvetica');
      y += 18;
      doc.text((contract.customer?.firstName || '') + ' ' + (contract.customer?.lastName || ''), 40, y); y += 14;
      if (contract.customer?.email) { doc.text(contract.customer.email, 40, y); y += 14; }
      if (contract.customer?.phone) { doc.text(contract.customer.phone, 40, y); y += 14; }
      if (contract.customer?.address) { doc.text(contract.customer.address, 40, y); y += 14; }
      if (contract.customer?.city) { doc.text((contract.customer.postalCode || '') + ' ' + contract.customer.city, 40, y); }

      // Table header
      y = 350;
      doc.fontSize(11).font('Helvetica-Bold').text('Details', 40, y);
      y += 25;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Description', 40, y);
      doc.text('Qty', 300, y);
      doc.text('Unit price', 350, y);
      doc.text('Total', 480, y, { align: 'right', width: 75 });
      y += 5;
      doc.moveTo(40, y + 10).lineTo(555, y + 10).stroke();
      y += 20;

      // Lines
      doc.fontSize(9).font('Helvetica');
      
      const vehicleName = contract.fleetVehicle?.vehicle?.name;
      const vName = typeof vehicleName === 'object' ? (vehicleName[lang] || vehicleName.fr || '') : (vehicleName || '');
      doc.text(vName + ' (' + contract.totalDays + ' ' + t.days + ')', 40, y);
      doc.text(String(contract.totalDays), 300, y);
      doc.text(formatMoney(contract.dailyRate), 350, y);
      doc.text(formatMoney(contract.subtotal), 480, y, { align: 'right', width: 75 });
      y += 18;

      if (parseFloat(contract.optionsTotal) > 0) {
        doc.text(t.options, 40, y);
        doc.text(formatMoney(contract.optionsTotal), 480, y, { align: 'right', width: 75 });
        y += 18;
      }

      if (parseFloat(contract.discountAmount) > 0) {
        doc.text(t.discount, 40, y);
        doc.text('-' + formatMoney(contract.discountAmount), 480, y, { align: 'right', width: 75 });
        y += 18;
      }

      y += 5;
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 15;

      const htAmount = parseFloat(contract.totalAmount) / 1.21;
      const taxAmount = parseFloat(contract.totalAmount) - htAmount;
      
      doc.text(t.htAmount, 350, y);
      doc.text(formatMoney(htAmount), 480, y, { align: 'right', width: 75 });
      y += 16;
      
      doc.text(t.taxRate + ' (21%)', 350, y);
      doc.text(formatMoney(taxAmount), 480, y, { align: 'right', width: 75 });
      y += 16;
      
      doc.font('Helvetica-Bold');
      doc.text(t.total, 350, y);
      doc.text(formatMoney(contract.totalAmount), 480, y, { align: 'right', width: 75 });
      y += 25;

      if (parseFloat(contract.totalDeductions) > 0) {
        doc.font('Helvetica');
        doc.text(t.deductions, 350, y);
        doc.text('-' + formatMoney(contract.totalDeductions), 480, y, { align: 'right', width: 75 });
        y += 16;
      }

      y += 10;
      doc.fontSize(9).font('Helvetica');
      doc.text(t.deposit + ': ' + formatMoney(contract.depositAmount), 40, y);
      if (contract.finalDepositRefund !== null && contract.finalDepositRefund !== undefined) {
        doc.text(t.refund + ': ' + formatMoney(contract.finalDepositRefund), 250, y);
      }

      // Legal mentions
      y = 700;
      doc.fontSize(7).font('Helvetica');
      const mentions = brandSettings?.mentionsLegales?.[lang] || brandSettings?.mentionsLegales?.fr || '';
      if (mentions) {
        doc.text(mentions, 40, y, { width: 515, align: 'center' });
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export async function generateExtensionPDF(extension: any, contract: any, brandSettings: any, lang: string = 'fr'): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const t = translations[lang] || translations.fr;
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const brand = contract.fleetVehicle?.vehicle?.category?.brand || 'VOLTRIDE';
      const logoUrl = LOGOS[brand] || LOGOS['VOLTRIDE'];
      const logoBuffer = await fetchImageBuffer(logoUrl);

      // Header
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 30, { width: 120 });
      }

      const titleTexts: Record<string, string> = {
        fr: 'AVENANT AU CONTRAT DE LOCATION',
        es: 'ANEXO AL CONTRATO DE ALQUILER',
        en: 'RENTAL CONTRACT AMENDMENT'
      };
      
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text(titleTexts[lang] || titleTexts.fr, 200, 50, { align: 'right' });
      
      doc.fontSize(10).font('Helvetica');
      doc.text(extension.extensionNumber, 200, 75, { align: 'right' });
      doc.text(t.date + ': ' + formatDate(extension.createdAt || new Date(), lang), 200, 90, { align: 'right' });

      doc.moveTo(40, 115).lineTo(555, 115).stroke();

      // Reference contrat original
      let y = 130;
      const refTexts: Record<string, string> = {
        fr: 'Référence du contrat original',
        es: 'Referencia del contrato original',
        en: 'Original contract reference'
      };
      doc.fontSize(12).font('Helvetica-Bold').text(refTexts[lang] || refTexts.fr, 40, y);
      y += 18;
      doc.fontSize(10).font('Helvetica');
      doc.text(t.contractNumber + ': ' + contract.contractNumber, 40, y);
      y += 14;

      // Client
      y += 10;
      doc.fontSize(12).font('Helvetica-Bold').text(t.customer, 40, y);
      doc.fontSize(12).font('Helvetica-Bold').text(t.vehicle, 300, y);
      y += 18;
      doc.fontSize(10).font('Helvetica');
      doc.text((contract.customer?.firstName || '') + ' ' + (contract.customer?.lastName || ''), 40, y);
      const vehicleName = contract.fleetVehicle?.vehicle?.name;
      const vName = typeof vehicleName === 'object' ? (vehicleName[lang] || vehicleName.fr || '') : (vehicleName || '');
      doc.text(vName, 300, y);
      y += 14;
      if (contract.customer?.email) doc.text(contract.customer.email, 40, y);
      doc.text('N: ' + (contract.fleetVehicle?.vehicleNumber || ''), 300, y);
      y += 14;
      if (contract.customer?.phone) doc.text(contract.customer.phone, 40, y);

      // Modification des dates
      y += 30;
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 15;
      
      const modifTexts: Record<string, Record<string, string>> = {
        fr: {
          title: 'Modification de la période de location',
          previousEnd: 'Date de fin précédente',
          newEnd: 'Nouvelle date de fin',
          additional: 'Jours supplémentaires',
        },
        es: {
          title: 'Modificación del período de alquiler',
          previousEnd: 'Fecha de fin anterior',
          newEnd: 'Nueva fecha de fin',
          additional: 'Días adicionales',
        },
        en: {
          title: 'Rental period modification',
          previousEnd: 'Previous end date',
          newEnd: 'New end date',
          additional: 'Additional days',
        }
      };
      const mt = modifTexts[lang] || modifTexts.fr;
      
      doc.fontSize(12).font('Helvetica-Bold').text(mt.title, 40, y);
      y += 25;
      
      // Tableau dates
      doc.fontSize(10).font('Helvetica');
      doc.rect(40, y, 515, 25).fill('#f5f5f5').stroke('#ddd');
      doc.fill('#333');
      doc.text(mt.previousEnd, 50, y + 7);
      doc.text(formatDate(extension.previousEndDate, lang), 350, y + 7, { align: 'right', width: 195 });
      y += 25;
      
      doc.rect(40, y, 515, 25).stroke('#ddd');
      doc.text(mt.newEnd, 50, y + 7);
      doc.font('Helvetica-Bold').text(formatDate(extension.requestedEndDate, lang), 350, y + 7, { align: 'right', width: 195 });
      y += 25;
      
      doc.font('Helvetica');
      doc.rect(40, y, 515, 25).fill('#f5f5f5').stroke('#ddd');
      doc.fill('#333');
      doc.text(mt.additional, 50, y + 7);
      doc.font('Helvetica-Bold').text('+' + extension.additionalDays + ' ' + t.days, 350, y + 7, { align: 'right', width: 195 });

      // Tarification
      y += 45;
      const priceTitleTexts: Record<string, string> = {
        fr: 'Tarification de la prolongation',
        es: 'Tarificación de la prolongación',
        en: 'Extension pricing'
      };
      doc.fontSize(12).font('Helvetica-Bold').text(priceTitleTexts[lang] || priceTitleTexts.fr, 40, y);
      y += 25;
      
      doc.fontSize(10).font('Helvetica');
      doc.text(t.dailyRate, 40, y); doc.text(formatMoney(extension.dailyRate), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.text(extension.additionalDays + ' ' + t.days + ' x ' + formatMoney(extension.dailyRate), 40, y);
      y += 18;
      
      doc.moveTo(40, y).lineTo(555, y).stroke();
      y += 10;
      
      doc.text(t.htAmount || t.subtotal, 40, y); doc.text(formatMoney(extension.subtotal), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.text(t.taxRate + ' (' + extension.taxRate + '%)', 40, y); doc.text(formatMoney(extension.taxAmount), 450, y, { align: 'right', width: 105 }); y += 18;
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(t.total, 40, y); doc.text(formatMoney(extension.totalAmount), 450, y, { align: 'right', width: 105 });

      // Mode de paiement
      y += 35;
      const payTexts: Record<string, Record<string, string>> = {
        fr: { title: 'Mode de paiement', agency: 'Paiement en agence au retour', stripe: 'Paiement en ligne (carte bancaire)', pending: 'En attente', paid: 'Payé' },
        es: { title: 'Método de pago', agency: 'Pago en agencia al devolver', stripe: 'Pago en línea (tarjeta)', pending: 'Pendiente', paid: 'Pagado' },
        en: { title: 'Payment method', agency: 'Payment at agency upon return', stripe: 'Online payment (credit card)', pending: 'Pending', paid: 'Paid' }
      };
      const pt = payTexts[lang] || payTexts.fr;
      
      doc.fontSize(10).font('Helvetica-Bold').text(pt.title, 40, y);
      y += 18;
      doc.font('Helvetica');
      const isAgency = extension.notes?.includes('agencia') || extension.paymentStatus === 'PENDING';
      doc.text(isAgency ? pt.agency : pt.stripe, 40, y);
      y += 14;
      const statusColor = extension.paymentStatus === 'PAID' ? '#16a34a' : '#ea580c';
      doc.fill(statusColor).text(extension.paymentStatus === 'PAID' ? pt.paid : pt.pending, 40, y);
      doc.fill('#333');

      // Signature
      y = 680;
      doc.fontSize(10).font('Helvetica-Bold').text(t.signature, 40, y);
      doc.rect(40, y + 15, 200, 60).stroke();
      
      if (extension.customerSignature) {
        try {
          const sigData = extension.customerSignature.split(',')[1];
          if (sigData) {
            const sigBuffer = Buffer.from(sigData, 'base64');
            doc.image(sigBuffer, 45, y + 20, { width: 190, height: 50 });
          }
        } catch (e) { console.error('Extension signature error:', e); }
      }

      const signDate = extension.customerSignedAt ? formatDate(extension.customerSignedAt, lang) : formatDate(new Date(), lang);
      doc.font('Helvetica').text(t.date + ': ' + signDate, 280, y + 40);

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
