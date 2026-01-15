import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Event } from '@/types';
import type { CalculationResult } from '@/utils/calculator';

const COBRE = '#D4AF37';
const BORDER_COLOR = '#eee';

const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontFamily: 'Helvetica', 
    fontSize: 10, 
    color: '#333',
    flexDirection: 'column'
  },
  
  // --- HEADER SUPERIOR ---
  headerTop: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 5,
    height: 60 
  },
  
  logo: {
    width: 200,
    objectFit: 'contain',
    marginRight: 15
  },

  mainTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textTransform: 'uppercase',
    color: '#222',
    textAlign: 'right' 
  },
  
  separator: {
    borderBottomWidth: 2, 
    borderBottomColor: COBRE, 
    marginBottom: 10
  },

  // --- INFO DEL EVENTO ---
  eventInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 20
  },
  eventInfoItem: { fontSize: 10, color: '#444' },
  eventInfoLabel: { fontWeight: 'bold', color: COBRE },
  
  // --- SECCIONES ---
  sectionTitle: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginTop: 10, 
    marginBottom: 8, 
    backgroundColor: '#eee', 
    padding: 4,
    color: '#000'
  },
  
  // --- TABLA ---
  row: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER_COLOR, 
    paddingVertical: 5,
    alignItems: 'center'
  },
  
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2, 
    borderBottomColor: '#444',
    paddingVertical: 6,
    backgroundColor: '#fff',
    marginTop: 5
  },
  tableHeaderText: { fontSize: 11, fontWeight: 'bold', color: '#000' },

  colName: { width: '50%' },
  colCat: { width: '25%', color: '#666' },
  colQty: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  cocktailBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5, marginBottom: 15 },
  cocktailTag: { 
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#ccc', 
    borderRadius: 4, 
    padding: 6, 
    width: '48%', 
    marginBottom: 5 
  },
  cocktailName: { fontWeight: 'bold' },

  // --- FOOTER ---
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  signatureBox: {
    width: '40%',
    borderTopWidth: 1,
    borderTopColor: '#999',
    paddingTop: 5
  },
  signatureText: {
    fontSize: 8,
    color: '#666',
    textAlign: 'center'
  },
  
  // ✅ PIE DE PÁGINA CENTRADO Y EN FILA
  footerInfo: {
    borderTopWidth: 2,
    borderTopColor: COBRE,
    paddingTop: 10,
    flexDirection: 'row',    // Fila única
    justifyContent: 'center', // Centrado horizontal
    alignItems: 'center'
  },
  companyInfo: {
    fontSize: 9,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

interface BarChecklistProps {
  event: Event;
  shoppingList: CalculationResult[];
  cocktailNames: string[];
}

const CATEGORY_PRIORITY: Record<string, number> = {
  'licores': 1, 'licor': 1, 'destilados': 1,
  'mixer': 2, 'mixers': 2, 'jarabes': 2,
  'frutas': 3, 'fruta': 3,
  'garnish': 4, 'decoracion': 4,
  'otros': 5, 'insumos': 5,
  'hielo': 6
};

// ✅ FORMATO DE FECHA ROBUSTO
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Por definir";
  try {
    // Si viene ISO (2025-01-20T...), usa esa. Si viene YYYY-MM-DD, agrégale hora.
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T12:00:00');
    
    if (isNaN(date.getTime())) return dateString; // Si falla, devuelve el original

    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch (e) {
    return dateString || "";
  }
};

export const BarChecklistPdf = ({ event, shoppingList, cocktailNames }: BarChecklistProps) => {
  
  const sortedList = [...shoppingList].sort((a, b) => {
    const catA = a.category.toLowerCase();
    const catB = b.category.toLowerCase();
    const priorityA = CATEGORY_PRIORITY[catA] || 99;
    const priorityB = CATEGORY_PRIORITY[catB] || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.ingredientName.localeCompare(b.ingredientName);
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerTop}>
          <Image src="/logo.png" style={styles.logo} />
          <Text style={styles.mainTitle}>CHECKLIST DE BARRA</Text>
        </View>

        <View style={styles.separator} />

        {/* INFO */}
        <View style={styles.eventInfoBar}>
          <Text style={styles.eventInfoItem}>
            <Text style={styles.eventInfoLabel}>FECHA: </Text>
            {formatDate(event.event_date)}
          </Text>
          <Text style={styles.eventInfoItem}>
            <Text style={styles.eventInfoLabel}>INVITADOS: </Text>
            {event.guest_count} pers.
          </Text>
          <Text style={styles.eventInfoItem}>
            <Text style={styles.eventInfoLabel}>EVENTO: </Text>
            {event.event_type ? event.event_type.toUpperCase() : 'GENERAL'}
          </Text>
        </View>

        {/* MENÚ */}
        <Text style={styles.sectionTitle}>1. MENÚ A SERVIR (BARTENDER INFO)</Text>
        <View style={styles.cocktailBox}>
          {cocktailNames.map((name, idx) => (
            <View key={idx} style={styles.cocktailTag}>
              <Text style={styles.cocktailName}>• {name}</Text>
            </View>
          ))}
          {cocktailNames.length === 0 && <Text style={{color:'#999', fontSize: 10, fontStyle:'italic'}}>No hay cocteles especificados.</Text>}
        </View>

        {/* TABLA */}
        <Text style={styles.sectionTitle}>2. INSUMOS Y CANTIDADES (A ENTREGAR)</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colName, styles.tableHeaderText]}>Insumo</Text>
          <Text style={[styles.colCat, styles.tableHeaderText]}>Categoría</Text> 
          <Text style={[styles.colQty, styles.tableHeaderText]}>Cantidad Total</Text>
        </View>

        {sortedList.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.colName}>{item.ingredientName}</Text>
            <Text style={styles.colCat}>{item.category.toUpperCase()}</Text>
            <Text style={styles.colQty}>{item.details}</Text>
          </View>
        ))}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.signatures}>
            <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>Firma Responsable Logística</Text>
            </View>
            <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>Firma Recepción Barra (Bartender)</Text>
            </View>
          </View>

          <View style={styles.footerInfo}>
             <Text style={styles.companyInfo}>
                LA RESERVA BARTENDING  |  contacto@lareserva.pe  |  +51 999 999 999
             </Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};