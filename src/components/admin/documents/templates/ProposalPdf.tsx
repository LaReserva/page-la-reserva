import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import type { Event } from '@/types';

// 1. Registramos explícitamente la familia Helvetica para evitar cualquier duda del renderizador
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/HelveticaNeue-Regular.ttf' },
    { src: 'https://fonts.gstatic.com/s/helveticaneue/v1/HelveticaNeue-Bold.ttf', fontWeight: 'bold' },
  ]
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingHorizontal: 40,
    paddingBottom: 90,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 20,
  },
  logo: {
    width: 200,
    height: 'auto',
    objectFit: 'contain'
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  
  // ✅ CORRECCIÓN: Estilo específico y único para el Título Dorado
  titleGold: {
    fontSize: 20,
    fontFamily: 'Helvetica', // Usamos la familia base
    fontWeight: 'bold',      // Aplicamos el peso aquí
    color: '#D4AF37',        // Color dorado explícito
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  
  refNumber: { fontSize: 10, color: '#555', marginBottom: 2 },
  date: { fontSize: 10, color: '#555' },

  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
    marginTop: 20,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 4,
  },
  
  // Grid
  grid: { flexDirection: 'row', marginBottom: 10 },
  col: { flex: 1, marginRight: 10 },
  label: { fontSize: 9, color: '#666', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 11, color: '#000', marginBottom: 8 },

  // Items
  itemsContainer: { marginTop: 5 },
  itemRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  bullet: { marginRight: 8, fontSize: 12, lineHeight: 1 },
  itemText: { fontSize: 10, color: '#000', flex: 1, lineHeight: 1.3 },

  // Total
  totalContainer: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#000',
    wrap: false,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#000',
    marginRight: 15,
    textTransform: 'uppercase',
  },
  
  // ✅ CORRECCIÓN: Estilo específico para el Precio Dorado
  totalValueGold: {
    fontSize: 18,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#D4AF37', // Color dorado explícito
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 15,
  },
  footerText: { fontSize: 8, color: '#777', marginBottom: 4, lineHeight: 1.4 },
  footerContact: { 
    fontSize: 9, 
    color: '#000', 
    fontFamily: 'Helvetica', 
    fontWeight: 'bold', 
    marginTop: 4 
  },
});

const formatDate = (dateString: string) => {
  if (!dateString) return "por definir";
  const date = new Date(dateString.includes('T') ? dateString : dateString + 'T12:00:00');
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};

const getTodayDate = () => {
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
};

interface ProposalPdfProps {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  items: string[];
  totalCost: number;
  logoUrl?: string; 
}

export function ProposalPdf({
  clientName,
  clientPhone,
  clientEmail,
  eventType,
  eventDate,
  guestCount,
  items,
  totalCost,
  logoUrl = "/logo.png"
}: ProposalPdfProps) {
  
  const refNumber = Math.floor(100000 + Math.random() * 900000);
  const today = getTodayDate();
  const absoluteLogoUrl = typeof window !== 'undefined' ? `${window.location.origin}${logoUrl}` : logoUrl;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Image src={absoluteLogoUrl} style={styles.logo} />
          
          <View style={styles.headerRight}>
            {/* Usamos el estilo dedicado 'titleGold' */}
            <Text style={styles.titleGold}>COTIZACIÓN</Text> 
            <Text style={styles.refNumber}>Ref: {refNumber}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
        </View>

        {/* DATOS */}
        <Text style={styles.sectionTitle}>Datos del Cliente y Evento</Text>
        <View style={styles.grid}>
          <View style={styles.col}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.value}>{clientName}</Text>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{clientEmail || '--'}</Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Fecha del Evento</Text>
            <Text style={styles.value}>{formatDate(eventDate)}</Text>
            <Text style={styles.label}>Tipo / Invitados</Text>
            <Text style={styles.value}>{eventType} ({guestCount} pax)</Text>
          </View>
          <View style={styles.col}>
             <Text style={styles.label}>Teléfono</Text>
             <Text style={styles.value}>{clientPhone || '--'}</Text>
          </View>
        </View>

        {/* ITEMS */}
        <Text style={styles.sectionTitle}>Detalles del Servicio</Text>
        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.itemText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* TOTAL */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>PRECIO TOTAL:</Text>
          {/* Usamos el estilo dedicado 'totalValueGold' */}
          <Text style={styles.totalValueGold}>S/ {totalCost.toFixed(2)}</Text>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Nota: La presente es una cotización preliminar de servicios, sujeta a cambios, personalizaciones y sugerencias por parte del cliente para asegurar el éxito de su evento. Los precios mostrados tienen una validez de 15 días calendario.
          </Text>
          <Text style={styles.footerContact}>
            LA RESERVA BARTENDING  |  bartendinglareserva@gmail.com  |  +51 989 245 091
          </Text>
        </View>

      </Page>
    </Document>
  );
}