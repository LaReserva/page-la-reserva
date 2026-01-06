import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Quote } from '@/types';

// Estilos similares a Tailwind pero para PDF
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 12, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  logo: { width: 120, height: 40, objectFit: 'contain' }, // Ajusta según tu logo real
  title: { fontSize: 24, fontWeight: 'bold', color: '#111', textTransform: 'uppercase' },
  subTitle: { fontSize: 10, color: '#666', marginTop: 4 },
  
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#c2410c' }, // Un color naranja tipo 'primary'
  
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontWeight: 'bold', color: '#555', fontSize: 10 },
  value: { flex: 1, fontSize: 10 },
  
  priceBox: { marginTop: 30, padding: 15, backgroundColor: '#f8fafc', borderRadius: 4, alignItems: 'flex-end' },
  totalLabel: { fontSize: 12, fontWeight: 'bold' },
  totalValue: { fontSize: 28, fontWeight: 'bold', color: '#c2410c' },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 9, color: '#999', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }
});

interface ProposalPdfProps {
  quote: Quote;
}

export const ProposalPdf = ({ quote }: ProposalPdfProps) => {
  // Formateadores
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const formatMoney = (amount: number) => `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>LA RESERVA</Text>
            <Text style={styles.subTitle}>Bartending & Experience</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 10, color: '#666' }}>Cotización #{quote.id.slice(0, 6).toUpperCase()}</Text>
            <Text style={{ fontSize: 10, color: '#666' }}>Fecha: {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* CLIENTE INFO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preparado para:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cliente:</Text>
            <Text style={styles.value}>{quote.client_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{quote.client_email}</Text>
          </View>
           <View style={styles.row}>
            <Text style={styles.label}>Teléfono:</Text>
            <Text style={styles.value}>{quote.client_phone}</Text>
          </View>
        </View>

        {/* DETALLES DEL EVENTO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles del Servicio:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Tipo de Evento:</Text>
            <Text style={styles.value}>{quote.event_type}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Fecha del Evento:</Text>
            <Text style={styles.value}>{formatDate(quote.event_date)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Invitados:</Text>
            <Text style={styles.value}>{quote.guest_count} personas</Text>
          </View>
           {quote.message && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Notas/Requerimientos:</Text>
              <Text style={{ ...styles.value, fontStyle: 'italic', marginTop: 2 }}>"{quote.message}"</Text>
            </View>
          )}
        </View>

        {/* PRECIO (Si existe) */}
        {quote.estimated_price ? (
          <View style={styles.priceBox}>
            <Text style={styles.totalLabel}>Inversión Estimada</Text>
            <Text style={styles.totalValue}>{formatMoney(quote.estimated_price)}</Text>
            <Text style={{ fontSize: 9, color: '#666', marginTop: 5 }}>* Precios incluyen IGV. Válido por 15 días.</Text>
          </View>
        ) : (
          <View style={{ marginTop: 20, padding: 10, backgroundColor: '#fff7ed', borderRadius: 4 }}>
             <Text style={{ color: '#c2410c', fontSize: 10 }}>* Cotización pendiente de valoración económica.</Text>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          La Reserva Bartending - www.lareservabartending.com - contacto@lareserva.com
        </Text>
      </Page>
    </Document>
  );
};