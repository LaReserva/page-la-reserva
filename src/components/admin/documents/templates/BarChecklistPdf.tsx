import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { Event } from '@/types';
import type { CalculationResult } from '@/utils/calculator';

// Definimos los colores y estilos base
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
    alignItems: 'center', // Centrado verticalmente
    marginBottom: 5,
    height: 60 // Altura fija para el área del logo
  },
  
  logo: {
    width: 200,
    objectFit: 'contain',
    marginRight: 15
  },

  mainTitle: { 
    fontSize: 20, // Título más grande
    fontWeight: 'bold', 
    textTransform: 'uppercase',
    color: '#222',
    textAlign: 'right' // Alineado a la derecha
  },
  
  separator: {
    borderBottomWidth: 2, 
    borderBottomColor: COBRE, // Color solicitado
    marginBottom: 10
  },

  // --- INFO DEL EVENTO (Debajo del header) ---
  eventInfoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 20
  },
  eventInfoItem: {
    fontSize: 10,
    color: '#444'
  },
  eventInfoLabel: {
    fontWeight: 'bold',
    color: COBRE
  },
  
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
  
  // Estilos específicos para el encabezado de la tabla
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2, 
    borderBottomColor: '#444',
    paddingVertical: 6,
    backgroundColor: '#fff',
    marginTop: 5
  },
  tableHeaderText: {
    fontSize: 11,      // Ligeramente más grande
    fontWeight: 'bold', // Negrita
    color: '#000'
  },

  // Columnas
  colName: { width: '50%' },
  colCat: { width: '25%', color: '#666' },
  colQty: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  // Cocteles (Tags)
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
  footerInfo: {
    borderTopWidth: 2,
    borderTopColor: COBRE, // Color solicitado
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  companyInfo: {
    fontSize: 8,
    color: '#666'
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

export const BarChecklistPdf = ({ event, shoppingList, cocktailNames }: BarChecklistProps) => {
  
  // Ordenamiento
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
        
        {/* --- HEADER SUPERIOR --- */}
        <View style={styles.headerTop}>
          {/* Logo a la izquierda */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src="/logo.png" style={styles.logo} />
          
          {/* Título a la derecha */}
          <Text style={styles.mainTitle}>CHECKLIST DE BARRA</Text>
        </View>

        {/* Separador Naranja */}
        <View style={styles.separator} />

        {/* --- INFO DEL EVENTO (Debajo del header) --- */}
        <View style={styles.eventInfoBar}>
          <Text style={styles.eventInfoItem}>
            <Text style={styles.eventInfoLabel}>FECHA: </Text>
            {event.event_date}
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

        {/* --- SECCIÓN 1: MENÚ --- */}
        <Text style={styles.sectionTitle}>1. MENÚ A SERVIR (BARTENDER INFO)</Text>
        <View style={styles.cocktailBox}>
          {cocktailNames.map((name, idx) => (
            <View key={idx} style={styles.cocktailTag}>
              <Text style={styles.cocktailName}>• {name}</Text>
            </View>
          ))}
          {cocktailNames.length === 0 && <Text style={{color:'#999', fontSize: 10, fontStyle:'italic'}}>No hay cocteles especificados.</Text>}
        </View>

        {/* --- SECCIÓN 2: TABLA DE INSUMOS --- */}
        <Text style={styles.sectionTitle}>2. INSUMOS Y CANTIDADES (A ENTREGAR)</Text>
        
        {/* Tabla Header (Negrita y más grande) */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colName, styles.tableHeaderText]}>Insumo</Text>
          <Text style={[styles.colCat, styles.tableHeaderText]}>Categoría</Text> 
          <Text style={[styles.colQty, styles.tableHeaderText]}>Cantidad Total</Text>
        </View>

        {/* Filas */}
        {sortedList.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.colName}>{item.ingredientName}</Text>
            <Text style={styles.colCat}>{item.category.toUpperCase()}</Text>
            <Text style={styles.colQty}>{item.details}</Text>
          </View>
        ))}

        {/* --- FOOTER (Al final de la página) --- */}
        <View style={styles.footer}>
          {/* Firmas */}
          <View style={styles.signatures}>
            <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>Firma Responsable Logística</Text>
            </View>
            <View style={styles.signatureBox}>
                <Text style={styles.signatureText}>Firma Recepción Barra (Bartender)</Text>
            </View>
          </View>

          {/* Pie de Página con Datos de Contacto */}
          <View style={styles.footerInfo}>
             <Text style={styles.companyInfo}>LA RESERVA BARTENDING</Text>
             {/* Aquí puedes poner variables si las tienes en 'event' o dejar estos placeholders */}
             <Text style={styles.companyInfo}>contacto@lareserva.pe | +51 989 245 091</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
};