import { 
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
  WidthType, AlignmentType, HeadingLevel, BorderStyle, UnderlineType, 
  Footer, PageNumber, LineRuleType 
} from 'docx';
import type { Proposal } from '@/types';

interface GeneratorParams {
  proposal: Proposal;
  config: {
    guaranteeDeposit: number;
    extraHourCost: number;
    setupHours: number;
    serviceHours: number;
  };
  supplies: {
    type: 'provider' | 'client_all' | 'client_partial';
    items: { qty: number; description: string }[];
  };
}

export const generateContractWord = async ({ proposal, config, supplies }: GeneratorParams) => {
  
  const FONT_SIZE = 24; // 12pt (Arial 12)
  const FONT_FAMILY = "Arial";
  
  // Interlineado 1.5 líneas
  const LINE_SPACING = { line: 360, lineRule: LineRuleType.AUTO }; 

  // --- HELPERS DE ESTILO ---
  const p = (text: string, isBold = false) => new Paragraph({
    children: [new TextRun({ text, bold: isBold, size: FONT_SIZE, font: FONT_FAMILY })],
    spacing: { after: 120, ...LINE_SPACING },
    alignment: AlignmentType.JUSTIFIED
  });

  const clauseTitle = (text: string) => new Paragraph({
    children: [new TextRun({ text, bold: true, size: FONT_SIZE, font: FONT_FAMILY })],
    spacing: { before: 240, after: 120, ...LINE_SPACING }
  });

  const listItem = (text: string) => new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: FONT_SIZE, font: FONT_FAMILY })],
    spacing: { after: 60, ...LINE_SPACING },
    indent: { left: 400 }
  });

  // --- CONTENIDO DINÁMICO ---

  const itemsParagraphs = (proposal.items || []).map(item => listItem(item));

  const paymentParagraphs = [
    new Paragraph({
      children: [
        new TextRun({ text: "El costo total asciende a ", size: FONT_SIZE, font: FONT_FAMILY }),
        new TextRun({ text: `S/ ${Number(proposal.total_price).toFixed(2)}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
        new TextRun({ text: ". Para confirmar la fecha se requiere el 50% de adelanto.", size: FONT_SIZE, font: FONT_FAMILY })
      ],
      spacing: { after: 120, ...LINE_SPACING },
      alignment: AlignmentType.JUSTIFIED
    }),
    p("El saldo restante deberá ser cancelado 24 horas antes del inicio del evento."),
    new Paragraph({
        children: [new TextRun({ text: "Ningún servicio se prestará sin el pago total de lo acordado.", bold: true, size: FONT_SIZE, font: FONT_FAMILY })],
        spacing: { after: 120, ...LINE_SPACING },
        alignment: AlignmentType.JUSTIFIED
    })
  ];

  if (config.guaranteeDeposit > 0) {
    paymentParagraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Adicionalmente, se requiere un depósito de garantía de ", size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({ text: `S/ ${config.guaranteeDeposit.toFixed(2)}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
          new TextRun({ text: ", devuelto al finalizar el evento si no hay incidencias.", size: FONT_SIZE, font: FONT_FAMILY })
        ],
        spacing: { before: 120, ...LINE_SPACING },
        alignment: AlignmentType.JUSTIFIED
      })
    );
  }

  let supplyParagraphs = [];
  if (supplies.type === 'provider') {
    supplyParagraphs.push(p("EL PROVEEDOR suministrará la totalidad de los insumos para el servicio de Bar."));
  } else if (supplies.type === 'client_all') {
    supplyParagraphs.push(new Paragraph({
      children: [
        new TextRun({ text: "EL CLIENTE asume la responsabilidad de proveer la TOTALIDAD de los licores e insumos. ", bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
        new TextRun({ text: "Se adjunta lista de requerimientos. EL CLIENTE garantiza que los insumos estarán en barra antes del montaje.", size: FONT_SIZE, font: FONT_FAMILY })
      ],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120, ...LINE_SPACING }
    }));
  } else {
    supplyParagraphs.push(p("EL CLIENTE proveerá los siguientes insumos específicos:"));
    supplies.items.forEach(item => supplyParagraphs.push(listItem(`${item.qty} - ${item.description}`)));
    supplyParagraphs.push(new Paragraph({
        children: [new TextRun({ text: "Todo lo demás será provisto por EL PROVEEDOR.", size: FONT_SIZE, font: FONT_FAMILY })],
        spacing: { before: 120, ...LINE_SPACING }
    }));
  }

  // --- DOCUMENTO ---
  const doc = new Document({
    sections: [{
      properties: {},
      
      // PIE DE PÁGINA
      footers: {
        default: new Footer({
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                        new TextRun({ text: "LA RESERVA BARTENDING - Contrato de Servicios | Pág. ", size: 18, color: "808080", font: FONT_FAMILY }),
                        new TextRun({
                            children: [PageNumber.CURRENT, " de ", PageNumber.TOTAL_PAGES],
                            size: 18, color: "808080", font: FONT_FAMILY
                        })
                    ]
                })
            ]
        })
      },

      children: [
        new Paragraph({ 
            text: "CONTRATO DE SERVICIOS DE BARTENDING", 
            heading: HeadingLevel.HEADING_1, 
            alignment: AlignmentType.CENTER, 
            spacing: { after: 300, ...LINE_SPACING } 
        }),

        // INTRO
        p("Conste por el presente documento, el contrato de servicios que celebran de una parte LA RESERVA BARTENDING, en adelante EL PROVEEDOR, y de la otra parte:"),
        p(`CLIENTE: ${proposal.client_name}`, true),
        p(`DNI/RUC: ____________________`),
        p(`CORREO: ${proposal.client_email || '____________________'}`),
        p(`TELÉFONO: ${proposal.client_phone || '____________________'}`),
        p("En adelante, “EL CLIENTE”."),

        // 1. OBJETO
        clauseTitle("PRIMERA: DEL OBJETO DEL SERVICIO"),
        p("EL PROVEEDOR se compromete a brindar el servicio de bar con las siguientes características:"),
        new Paragraph({
            children: [
                new TextRun({ text: `Fecha: ${proposal.event_date || '________'}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: ` | Tipo: ${proposal.event_type}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: ` | Invitados: ${proposal.guest_count}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
            ],
            spacing: { after: 120, ...LINE_SPACING }
        }),
        p("El servicio incluye lo siguiente:"),
        ...itemsParagraphs,
        
        new Paragraph({ 
            children: [
                new TextRun({ text: "Nota Logística: ", bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: `EL PROVEEDOR llegará ${config.setupHours} horas antes para el montaje. Este tiempo NO computa dentro de las horas de servicio.`, size: FONT_SIZE, font: FONT_FAMILY })
            ],
            spacing: { before: 120, ...LINE_SPACING },
            alignment: AlignmentType.JUSTIFIED
        }),
        new Paragraph({
            children: [new TextRun({ text: "El servicio incluye únicamente lo expresamente detallado en este contrato.", bold: true, size: FONT_SIZE, font: FONT_FAMILY })],
            spacing: { before: 120, after: 120, ...LINE_SPACING }
        }),

        // 2. HONORARIOS
        clauseTitle("SEGUNDA: HONORARIOS Y FORMA DE PAGO"),
        ...paymentParagraphs,

        // 3. HORAS EXTRAS
        clauseTitle("TERCERA: HORAS EXTRAS"),
        new Paragraph({ 
            children: [
                new TextRun({ text: "El servicio tiene una duración específica de ", size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: `${config.serviceHours} horas`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: ". Cualquier tiempo adicional solicitado será considerado hora extra con un costo de ", size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: `S/ ${config.extraHourCost.toFixed(2)}`, bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: " por hora, pagadero inmediatamente.", size: FONT_SIZE, font: FONT_FAMILY })
            ],
            spacing: { ...LINE_SPACING },
            alignment: AlignmentType.JUSTIFIED
        }),
        p("La continuidad del servicio queda sujeta al pago de dichas horas extras."),

        // 4. DAÑOS
        clauseTitle("CUARTA: RESPONSABILIDAD POR DAÑOS Y PÉRDIDAS"),
        p("EL CLIENTE asume plena responsabilidad por los daños, pérdidas o roturas ocasionadas durante el evento, incluyendo, pero no limitándose a: Vasos rotos, Cristalería dañada, Utensilios o Mobiliario."),
        p("Costos referenciales:"),
        listItem("Vaso roto: S/ 6.00 por unidad"),
        listItem("Copa especial: S/ 12.00 por unidad"),
        listItem("Daño a equipos o barra: Costo de reposición total o reparación"),
        p("Estos montos serán cobrados al finalizar el evento o descontados del depósito de garantía, si lo hubiera."),

        // 5. SUMINISTROS
        clauseTitle("QUINTA: DE LOS SUMINISTROS"),
        ...supplyParagraphs,

        // 6. OBLIGACIONES CLIENTE
        clauseTitle("SEXTA: OBLIGACIONES DEL CLIENTE"),
        p("EL CLIENTE se compromete a:"),
        listItem("Garantizar un espacio adecuado y seguro para la prestación del servicio."),
        listItem("No exceder el límite de personas establecidas para el servicio."),
        listItem("Proporcionar permisos necesarios si el evento lo requiere."),
        listItem("No exigir actividades ilegales o contrarias a la normativa vigente (venta de alcohol a menores, por ejemplo)."),
        listItem("Mantener un ambiente de respeto hacia el personal de LA RESERVA."),

        // 7. OBLIGACIONES PRESTADOR
        clauseTitle("SEPTIMA: OBLIGACIONES DEL PRESTADOR"),
        p("EL PROVEEDOR se compromete a:"),
        listItem("Brindar el servicio con personal capacitado."),
        listItem("Mantener una conducta profesional durante el evento."),
        listItem("Cumplir con el horario acordado, salvo causas de fuerza mayor."),
        
        new Paragraph({ 
            children: [
                new TextRun({ text: "SEGURIDAD: ", bold: true, size: FONT_SIZE, font: FONT_FAMILY }),
                new TextRun({ text: "EL PROVEEDOR se reserva el derecho de dejar de servir bebidas alcohólicas a invitados en estado evidente de ebriedad nociva o comportamiento agresivo.", size: FONT_SIZE, font: FONT_FAMILY })
            ],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 120, ...LINE_SPACING }
        }),

        // 8. CANCELACIONES
        clauseTitle("OCTAVA: CANCELACIONES"),
        p("Si EL CLIENTE cancela con menos de 7 días de anticipación, el anticipo no será reembolsable."),
        p("Si la cancelación se produce por causas atribuibles a EL PROVEEDOR, se devolverá el 100% del monto recibido."),

        // 9. FUERZA MAYOR
        clauseTitle("NOVENA: CASO FORTUITO O FUERZA MAYOR"),
        p("Ninguna de las partes será responsable por incumplimientos derivados de situaciones imprevisibles o inevitables como desastres naturales, disturbios, restricciones legales u otros eventos fuera de su control."),

        // 10. NATURALEZA
        clauseTitle("DECIMA: NATURALEZA DEL CONTRATO"),
        p("El presente contrato es de naturaleza civil, no existiendo relación laboral alguna entre EL CLIENTE y el personal de EL PRESTADOR."),

        // ✅ REORDENADO: RESOLUCIÓN POR INCUMPLIMIENTO
        clauseTitle("UNDECIMA: RESOLUCIÓN POR INCUMPLIMIENTO"),
        p("El incumplimiento de cualquiera de las obligaciones establecidas en el presente contrato por alguna de las partes, facultará a la parte afectada a dar por disuelto el contrato de pleno derecho, sin perjuicio de las indemnizaciones que correspondan por ley."),

        // ✅ REORDENADO: ACEPTACIÓN (ÚLTIMA)
        clauseTitle("DUODECIMA: ACEPTACIÓN"),
        p("Leído el presente contrato y conformes con su contenido, las partes lo firman en dos ejemplares del mismo tenor."),
        
        new Paragraph({ text: "\n\n", spacing: { ...LINE_SPACING } }),

        // FIRMAS (SIN NOMBRES NI FECHAS)
        new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
                top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
                insideVertical: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }
            },
            rows: [
                new TableRow({
                    children: [
                        new TableCell({ 
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "__________________________", size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER, spacing: { ...LINE_SPACING } }), 
                                new Paragraph({ children: [new TextRun({ text: "LA RESERVA BARTENDING", bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER, spacing: { ...LINE_SPACING } })
                            ] 
                        }),
                        new TableCell({ 
                            children: [
                                new Paragraph({ children: [new TextRun({ text: "__________________________", size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER, spacing: { ...LINE_SPACING } }), 
                                new Paragraph({ children: [new TextRun({ text: "EL CLIENTE", bold: true, size: FONT_SIZE, font: FONT_FAMILY })], alignment: AlignmentType.CENTER, spacing: { ...LINE_SPACING } })
                            ] 
                        }),
                    ]
                })
            ]
        })
      ]
    }]
  });

  return Packer.toBlob(doc);
};