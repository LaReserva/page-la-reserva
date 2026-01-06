import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType 
} from 'docx';

// --- CORRECCIÓN AQUÍ ---
// Cambiamos el named import por un default import
import FileSaver from 'file-saver'; 

import type { Quote } from '@/types';

export const generateContract = (quote: Quote) => {
  // 1. Formateadores
  const formatMoney = (amount: number) => `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });

  // 2. Definición del Documento
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // --- HEADER ---
        new Paragraph({
          text: "CONTRATO DE SERVICIOS DE BARTENDING",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
        }),
        
        new Paragraph({
          children: [
            new TextRun({ text: "Conste por el presente documento, el contrato de servicios que celebran de una parte " }),
            new TextRun({ text: "LA RESERVA BARTENDING", bold: true }),
            new TextRun({ text: ", en adelante EL PROVEEDOR, y de la otra parte:" }),
          ],
          spacing: { after: 200 },
        }),

        // --- DATOS DEL CLIENTE ---
        new Paragraph({
          children: [
            new TextRun({ text: "CLIENTE: ", bold: true }),
            new TextRun({ text: quote.client_name.toUpperCase() }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "DNI/RUC: ", bold: true }),
            new TextRun({ text: "____________________" }), // Espacio para llenar
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "CORREO: ", bold: true }),
            new TextRun({ text: quote.client_email }),
          ],
          spacing: { after: 300 },
        }),

        // --- CLÁUSULA PRIMERA: DEL EVENTO ---
        new Paragraph({
          text: "PRIMERA: DEL OBJETO DEL SERVICIO",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "EL PROVEEDOR se compromete a brindar el servicio de bar para el evento con las siguientes características:",
          spacing: { after: 100 },
        }),
        
        // Tabla de detalles
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [ new TextRun({ text: "Fecha del Evento:", bold: true }) ] 
                    })
                  ] 
                }),
                new TableCell({ 
                  children: [ new Paragraph(formatDate(quote.event_date)) ] 
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [ new TextRun({ text: "Tipo de Evento:", bold: true }) ] 
                    })
                  ] 
                }),
                new TableCell({ 
                  children: [ new Paragraph(quote.event_type) ] 
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ 
                  children: [
                    new Paragraph({ 
                      children: [ new TextRun({ text: "Cantidad Invitados:", bold: true }) ] 
                    })
                  ] 
                }),
                new TableCell({ 
                  children: [ new Paragraph(`${quote.guest_count} personas`) ] 
                }),
              ],
            }),
          ],
        }),

        new Paragraph({ text: "", spacing: { after: 300 } }), // Espaciador

        // --- CLÁUSULA SEGUNDA: DEL PRECIO ---
        new Paragraph({
          text: "SEGUNDA: HONORARIOS Y FORMA DE PAGO",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun("El costo total del servicio asciende a la suma de "),
            new TextRun({ text: quote.estimated_price ? formatMoney(quote.estimated_price) : "S/ ____________", bold: true }),
            new TextRun("."),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "Para confirmar la fecha se requiere el 50% de adelanto. El saldo restante deberá ser cancelado 24 horas antes del inicio del evento.",
          spacing: { after: 300 },
        }),

        // --- CLÁUSULAS GENERALES ---
        new Paragraph({
          text: "TERCERA: CONDICIONES GENERALES",
          heading: HeadingLevel.HEADING_2,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "1. Horas extras tendrán un costo adicional del 20% sobre la hora base.",
        }),
        new Paragraph({
          text: "2. El Cliente es responsable de brindar un espacio adecuado e iluminado para la barra.",
        }),
        new Paragraph({
          text: "3. En caso de cancelación con menos de 7 días, no hay devolución del adelanto.",
          spacing: { after: 400 },
        }),

        // --- FIRMAS ---
        new Paragraph({
          children: [
            new TextRun("_________________________                         _________________________"),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 800 },
        }),
        new Paragraph({
          children: [
            new TextRun("LA RESERVA BARTENDING                                          EL CLIENTE"),
          ],
          alignment: AlignmentType.CENTER,
        }),
      ],
    }],
  });

  // 3. Generar y descargar
  Packer.toBlob(doc).then((blob) => {
    // --- CORRECCIÓN AQUÍ ---
    // Usamos la importación por defecto: FileSaver.saveAs()
    FileSaver.saveAs(blob, `Contrato_${quote.client_name.replace(/\s+/g, '_')}.docx`);
  });
};