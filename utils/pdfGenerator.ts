
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TuitionRecord, AcademySettings, UserProfile } from '../types';

/**
 * Genera un comprobante de pago con lógica matemática de reconstrucción.
 * Garantiza consistencia en historiales de abonos con y sin recargos.
 */
export const generateReceipt = (
    record: TuitionRecord, 
    academy: AcademySettings, 
    user?: UserProfile | null
) => {
    const doc = new jsPDF();
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    
    // Colores
    const colorRedIKC = [220, 38, 38];      
    const colorTextMain = [17, 24, 39];     
    const colorTextMuted = [107, 114, 128];    
    const colorSuccessText = [21, 128, 61];    
    const colorSuccessBG = [220, 252, 231];    
    const colorPendingText = [75, 85, 99];     
    const colorPendingBG = [243, 244, 246];    

    const formatMoney = (val: number) => `$${val.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '---';
        return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    // --- 1. LOGIC ENGINE (MÉTODO DE RECONSTRUCCIÓN) ---

    // A. Calcular lo Pagado (Historial)
    const history = record.paymentHistory || [];
    const totalPaidHistory = history.reduce((sum, p) => sum + p.amount, 0);

    // B. Calcular lo que Falta (Deuda Actual)
    // Si el estatus es pagado, forzamos 0 para evitar residuos flotantes. 
    // Si no, es la suma del monto pendiente + penalización activa.
    const currentDebt = record.status === 'paid' ? 0 : (record.amount + (record.penaltyAmount || 0));

    // C. Reconstruir el Gran Total (Valor Real de la Operación)
    // Esto representa cuánto costó el movimiento en total (Base + Recargos) al día de hoy.
    const grandTotal = totalPaidHistory + currentDebt;

    // D. Detectar Recargos (Lógica Híbrida Robusta)
    // Buscamos si existe un recargo activo (penaltyAmount) o si hubo uno histórico (customPenaltyAmount) que ya se absorbió.
    // Esto es crítico porque al pagar 'full', penaltyAmount se vuelve 0, pero customPenaltyAmount guarda el rastro.
    const activePenalty = record.penaltyAmount || 0;
    const storedPenalty = record.customPenaltyAmount || 0;
    
    // El recargo real es el mayor de los dos (asumiendo que no se duplican y que customPenaltyAmount es la "memoria" del recargo).
    let historicalPenalty = Math.max(activePenalty, storedPenalty);

    // E. Calcular la Base (Costo Original)
    // La base siempre se deriva restando el recargo identificado al gran total.
    // Esto evita inconsistencias si 'originalAmount' fue modificado en la base de datos.
    let baseCost = grandTotal - historicalPenalty;

    // Fallback de seguridad: Si por corrupción de datos la base da negativo, asumimos que no hubo recargo.
    if (baseCost < 0) {
        baseCost = grandTotal;
        historicalPenalty = 0;
    }
    
    // Limpieza de precisión flotante (ej. 0.0000001 -> 0)
    if (historicalPenalty < 0.01) {
        historicalPenalty = 0;
    }

    // F. Estado de Liquidación
    const isFullyPaid = record.status === 'paid' || currentDebt < 0.01;

    // --- CONSTRUCCIÓN DEL PDF ---

    doc.setFont('helvetica');

    // 1. ENCABEZADO
    let currentY = 25;
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorRedIKC[0], colorRedIKC[1], colorRedIKC[2]);
    doc.text(academy.name.toUpperCase(), centerX, currentY, { align: 'center' });

    currentY += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    doc.text('COMPROBANTE DE MOVIMIENTOS', centerX, currentY, { align: 'center' });

    // 2. HERO SECTION
    currentY += 25;
    doc.setFontSize(10);
    doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
    doc.text('TOTAL PAGADO A LA FECHA', centerX, currentY, { align: 'center' });

    currentY += 14;
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextMain[0], colorTextMain[1], colorTextMain[2]);
    doc.text(formatMoney(totalPaidHistory), centerX, currentY, { align: 'center' });

    // Badge
    currentY += 12;
    const statusText = isFullyPaid ? 'LIQUIDADO' : 'SALDO PENDIENTE';
    const bgCol = isFullyPaid ? colorSuccessBG : colorPendingBG;
    const txtCol = isFullyPaid ? colorSuccessText : colorPendingText;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const textWidth = doc.getTextWidth(statusText);
    
    doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
    doc.roundedRect(centerX - (textWidth/2) - 6, currentY - 4.5, textWidth + 12, 7.5, 1.5, 1.5, 'F');
    doc.setTextColor(txtCol[0], txtCol[1], txtCol[2]);
    doc.text(statusText, centerX, currentY + 1, { align: 'center' });

    // 3. INFO ROW
    currentY += 25;
    doc.setDrawColor(colorRedIKC[0], colorRedIKC[1], colorRedIKC[2]);
    doc.setLineWidth(0.6);
    doc.line(centerX - 10, currentY, centerX + 10, currentY);

    currentY += 12;
    const drawInfoRow = (label: string, value: string, x: number, y: number, align: 'left' | 'center' | 'right' = 'left') => {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextMuted[0], colorTextMuted[1], colorTextMuted[2]);
        doc.text(label.toUpperCase(), x, y, { align });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextMain[0], colorTextMain[1], colorTextMain[2]);
        doc.text(value, x, y + 6, { align });
    };

    drawInfoRow('Alumno', record.studentName || 'No registrado', margin, currentY);
    
    // VISUALIZACIÓN DE CONCEPTO
    // Si hay recargo histórico, mostramos el desglose en el título para máxima claridad.
    // Si NO hay recargo (historicalPenalty === 0), mostramos solo el concepto limpio.
    let conceptText = record.concept;
    if (historicalPenalty > 0) {
        conceptText += ` (Base: ${formatMoney(baseCost)} + Recargo: ${formatMoney(historicalPenalty)})`;
    }

    drawInfoRow('Concepto', conceptText, centerX, currentY, 'center');
    drawInfoRow('Fecha', new Date().toLocaleDateString('es-MX'), pageWidth - margin, currentY, 'right');

    currentY += 18;
    const folio = record.id.split('-').pop()?.toUpperCase() || '---';
    drawInfoRow('Folio', `#${folio}`, margin, currentY);
    drawInfoRow('Vencimiento', formatDate(record.dueDate), pageWidth - margin, currentY, 'right');

    // 4. TABLA DE DESGLOSE
    currentY += 22;
    
    const tableBody: any[][] = [];

    // Fila A: Costo Base (Sin Recargo)
    tableBody.push([
        { content: conceptText, styles: { fontStyle: 'bold' } },
        formatMoney(baseCost)
    ]);

    // Fila B: Recargo (Solo si existe > 0)
    if (historicalPenalty > 0) {
        tableBody.push([
            { content: 'Recargo por pago tardío', styles: { textColor: [220, 38, 38] } },
            formatMoney(historicalPenalty)
        ]);
    }

    // Filas C...N: Historial de Abonos
    history.forEach(payment => {
        const pDate = new Date(payment.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        const pMethod = payment.method ? `(${payment.method})` : '';
        tableBody.push([
            { content: `Abono el ${pDate} ${pMethod}`, styles: { textColor: [21, 128, 61] } },
            `-${formatMoney(payment.amount)}` // Negativo para indicar resta
        ]);
    });

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['CONCEPTO', 'MONTO']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: colorTextMuted,
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: { bottom: 0.1 },
            lineColor: [229, 231, 235]
        },
        bodyStyles: {
            fontSize: 9,
            cellPadding: 6,
            textColor: colorTextMain
        },
        columnStyles: {
            1: { halign: 'right' }
        }
    });

    // 5. TOTALES FINALES (FOOTER TABLE)
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    const summaryX = pageWidth - margin - 80;

    const drawSummaryLine = (label: string, value: string, isTotal = false) => {
        doc.setFontSize(isTotal ? 11 : 9);
        doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
        doc.setTextColor(isTotal ? colorTextMain[0] : colorTextMuted[0]);
        doc.text(label, summaryX, finalY);
        
        doc.setTextColor(colorTextMain[0]);
        doc.text(value, pageWidth - margin, finalY, { align: 'right' });
        finalY += isTotal ? 10 : 6;
    };

    // Subtotal (Base)
    drawSummaryLine('Subtotal:', formatMoney(baseCost));

    // Recargo (Si aplica)
    if (historicalPenalty > 0) {
        drawSummaryLine('Recargo:', formatMoney(historicalPenalty));
    }

    // Línea separadora
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.1);
    doc.line(summaryX, finalY - 2, pageWidth - margin, finalY - 2);
    finalY += 4;

    // Gran Total
    drawSummaryLine('Total:', formatMoney(grandTotal), true);
    
    // Total Pagado
    drawSummaryLine('Abonado:', `-${formatMoney(totalPaidHistory)}`);

    // Restante
    const balanceLabel = isFullyPaid ? 'RESTANTE:' : 'PENDIENTE:';
    const balanceValue = isFullyPaid ? '$0.00' : formatMoney(currentDebt);
    
    // Espacio extra y resaltado
    finalY += 2;
    drawSummaryLine(balanceLabel, balanceValue, true);

    // 6. FOOTER
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(156, 163, 175);
    doc.text('Documento generado por IKC Management System.', centerX, pageHeight - 15, { align: 'center' });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
};
