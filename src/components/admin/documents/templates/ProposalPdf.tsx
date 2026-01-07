import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  
  // Estructura general para empujar el footer al final
  contentWrapper: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, objectFit: 'contain' },
  headerRight: { alignItems: 'flex-end' },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#C47E09', textTransform: 'uppercase' },
  docNumber: { fontSize: 10, color: '#666', marginTop: 2 },

  // Info Cliente
  clientBox: { 
    marginBottom: 25, 
    padding: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 4,
    backgroundColor: '#f9fafb'
  },
  clientTitle: { fontSize: 11, fontWeight: 'bold', color: '#C47E09', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 3 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCol: { width: '50%', marginBottom: 4 },
  label: { fontWeight: 'bold', color: '#555', fontSize: 9 },
  value: { color: '#222', fontSize: 9 },

  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginBottom: 10, color: '#C47E09', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
  includesContainer: { marginTop: 5, marginBottom: 20 },
  includeItem: { flexDirection: 'row', marginBottom: 8, paddingLeft: 5 },
  bullet: { width: 15, color: '#C47E09', fontSize: 14, lineHeight: 1 },
  includeText: { fontSize: 10, color: '#444', lineHeight: 1.4 },

  totalsSection: { marginTop: 20, alignItems: 'flex-end', marginBottom: 40 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, width: '40%' },
  totalLabel: { width: '50%', textAlign: 'right', paddingRight: 10, color: '#666', fontWeight: 'bold' },
  totalValue: { width: '50%', textAlign: 'right', fontWeight: 'bold', color: '#C47E09', fontSize: 14 },

  // Footer Area
  footerSection: { 
    position: 'absolute', 
    bottom: 30, 
    left: 40, 
    right: 40 
  },
  disclaimerBox: { 
    paddingTop: 10,
    borderTopWidth: 1, 
    borderTopColor: '#eee', 
    marginBottom: 10
  },
  disclaimerText: { fontSize: 8, color: '#888', fontStyle: 'italic', textAlign: 'justify', lineHeight: 1.3 },
  
  contactInfo: { textAlign: 'center', marginTop: 5 },
  footerText: { fontSize: 8, color: '#999' }
});

interface ProposalPdfProps {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  items: string[];
  totalCost: number;
}

export const ProposalPdf = ({ 
  clientName, clientPhone, clientEmail, 
  eventType, eventDate, guestCount, 
  items, totalCost 
}: ProposalPdfProps) => {

  const formatCurrency = (amount: number) => 
    `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* WRAPPER PRINCIPAL */}
        <View style={styles.contentWrapper}>
          
          {/* HEADER */}
          <View style={styles.header}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/logo.png" style={styles.logo} />
            <View style={styles.headerRight}>
              <Text style={styles.mainTitle}>PROPUESTA</Text>
              <Text style={styles.docNumber}>Ref: {new Date().getTime().toString().slice(-6)}</Text>
              <Text style={styles.docNumber}>{new Date().toLocaleDateString()}</Text>
            </View>
          </View>

          {/* CLIENTE */}
          <View style={styles.clientBox}>
            <Text style={styles.clientTitle}>DATOS DEL CLIENTE Y EVENTO</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Cliente:</Text>
                <Text style={styles.value}>{clientName || '--'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.label}>Tipo de Evento:</Text>
                <Text style={styles.value}>{eventType.toUpperCase()} ({guestCount} pax)</Text>
              </View>
              
              {(clientPhone || clientEmail) && (
                <View style={{...styles.infoCol, width: '100%', marginTop: 5, flexDirection: 'row', gap: 20}}>
                   {clientPhone && <Text style={styles.value}>Telf: {clientPhone}</Text>}
                   {clientEmail && <Text style={styles.value}>Email: {clientEmail}</Text>}
                </View>
              )}

              <View style={{...styles.infoCol, marginTop: 5}}>
                <Text style={styles.label}>Fecha Tentativa:</Text>
                <Text style={styles.value}>{eventDate || 'Por definir'}</Text>
              </View>
            </View>
          </View>

          {/* DETALLES */}
          <Text style={styles.sectionTitle}>Detalles del Servicio</Text>
          <View style={styles.includesContainer}>
            {items.map((item, index) => (
              <View key={index} style={styles.includeItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* PRECIO */}
          {totalCost > 0 && (
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>PRECIO TOTAL:</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalCost)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* FOOTER FIXED AL FONDO */}
        <View style={styles.footerSection}>
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              Nota: La presente es una propuesta preliminar de servicios, sujeta a cambios, personalizaciones y sugerencias por parte del cliente para asegurar el éxito de su evento. Los precios mostrados tienen una validez de 15 días calendario.
            </Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.footerText}>LA RESERVA BARTENDING | contacto@lareserva.pe | +51 999 999 999</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};