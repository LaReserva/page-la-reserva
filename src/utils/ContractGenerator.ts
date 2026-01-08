import { 
  Document, Packer, Paragraph, TextRun, AlignmentType, 
  Header, Footer, Table, TableRow, TableCell, 
  WidthType, BorderStyle, HeadingLevel 
} from "docx";
import type { Proposal } from '@/types';

// Función auxiliar para textos
const boldText = (text: string, size: number = 24) => new TextRun({ text, bold: true, font: "Arial", size: size });
const normalText = (text: string, size: number = 24) => new TextRun({ text, font: "Arial", size: size });

export const generateContractWord = async (proposal: Proposal): Promise<Blob> => {
  
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          run: { font: "Arial", size: 24 }, // 11pt
          paragraph: { spacing: { after: 120 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 1 pulgada
        },
      },
      // --- ENCABEZADO ---
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ 
                  text: "LA RESERVA BARTENDING", 
                  bold: true, 
                  size: 28, 
                  color: "2E74B5", 
                  font: "Arial" 
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Servicios Exclusivos de Coctelería", size: 16, italics: true })],
              border: {
                bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 }
              }
            })
          ],
        }),
      },
      // --- PIE DE PÁGINA ---
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "La Reserva Bartending - Lima, Perú", size: 16, color: "808080" }),
              ],
              border: {
                top: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 }
              }
            }),
          ],
        }),
      },
      children: [
        // TÍTULO
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
          children: [
            new TextRun({ text: "CONTRATO DE SERVICIOS DE BARTENDING", bold: true, size: 28 })
          ]
        }),

        // INTRODUCCIÓN
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [
            normalText("Conste por el presente documento, el contrato de servicios que celebran de una parte "),
            boldText("LA RESERVA BARTENDING"),
            normalText(", en adelante EL PROVEEDOR, y de la otra parte:"),
          ],
        }),

        // DATOS DEL CLIENTE
        new Paragraph({ children: [boldText("CLIENTE: "), normalText(proposal.client_name.toUpperCase())] }),
        new Paragraph({ children: [boldText("DNI/RUC: "), normalText("____________________")] }),
        new Paragraph({ children: [boldText("CORREO: "), normalText(proposal.client_email || "____________________")] }),
        new Paragraph({ children: [boldText("TELÉFONO: "), normalText(proposal.client_phone || "____________________")] }),

        // CLÁUSULA PRIMERA
        new Paragraph({
          spacing: { before: 300, after: 200 },
          children: [boldText("PRIMERA: DEL OBJETO DEL SERVICIO")]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [normalText("EL PROVEEDOR se compromete a brindar el servicio de bar para el evento con las siguientes características:")]
        }),

        // TABLA DE DETALLES
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [boldText("Fecha del Evento:")] })], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [normalText(proposal.event_date || "Por definir")] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [boldText("Tipo de Evento:")] })] }),
                new TableCell({ children: [new Paragraph({ children: [normalText(proposal.event_type)] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [boldText("Cantidad Invitados:")] })] }),
                new TableCell({ children: [new Paragraph({ children: [normalText(String(proposal.guest_count || 0) + " personas")] })] }),
              ],
            }),
          ],
        }),

        // DETALLE DE INCLUSIONES (Corregido)
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [boldText("El servicio incluye lo siguiente:")]
        }),
        
        // Mapeo de items
        ...proposal.items.map(item => 
          new Paragraph({
            bullet: { level: 0 },
            children: [normalText(item)]
          })
        ),

        // CLÁUSULA SEGUNDA
        new Paragraph({
          spacing: { before: 300, after: 200 },
          children: [boldText("SEGUNDA: HONORARIOS Y FORMA DE PAGO")]
        }),
        new Paragraph({
          children: [
            normalText("El costo total del servicio asciende a la suma de "),
            new TextRun({ text: `S/ ${Number(proposal.total_price).toFixed(2)}`, bold: true, size: 24 }),
            normalText("."),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [normalText("Para confirmar la fecha se requiere el 50% de adelanto. El saldo restante deberá ser cancelado 24 horas antes del inicio del evento.")]
        }),

        // CLÁUSULA TERCERA
        new Paragraph({
          spacing: { before: 300, after: 200 },
          children: [boldText("TERCERA: CONDICIONES GENERALES")]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [normalText("1. Horas extras tendrán un costo adicional del 20% sobre la hora base.")]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [normalText("2. El Cliente es responsable de brindar un espacio adecuado e iluminado para la barra.")]
        }),
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [normalText("3. En caso de cancelación con menos de 7 días, no hay devolución del adelanto.")]
        }),

        // FIRMAS (Corregido para evitar el error de negrita en párrafo)
        new Paragraph({ text: "", spacing: { before: 1000 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.NONE },
            bottom: { style: BorderStyle.NONE },
            left: { style: BorderStyle.NONE },
            right: { style: BorderStyle.NONE },
            insideVertical: { style: BorderStyle.NONE },
            insideHorizontal: { style: BorderStyle.NONE },
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [normalText("_________________________")] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [boldText("LA RESERVA BARTENDING")] }),
                  ],
                }),
                new TableCell({
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [normalText("_________________________")] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [boldText("EL CLIENTE")] }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBlob(doc);
};