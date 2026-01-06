import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Event } from '@/types';
import type { CalculationResult } from '@/utils/calculator';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#111', paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' },
  subtitle: { fontSize: 10, color: '#666' },
  
  sectionTitle: { fontSize: 12, fontWeight: 'bold', marginTop: 15, marginBottom: 5, backgroundColor: '#eee', padding: 4 },
  
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 4 },
  colName: { width: '50%' },
  colCat: { width: '25%', color: '#666' },
  colQty: { width: '25%', textAlign: 'right', fontWeight: 'bold' },

  cocktailBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  cocktailTag: { border: 1, borderColor: '#ccc', borderRadius: 4, padding: 6, width: '48%', marginBottom: 5 },
  cocktailName: { fontWeight: 'bold' },
});

interface BarChecklistProps {
  event: Event;
  shoppingList: CalculationResult[];
  cocktailNames: string[];
}

export const BarChecklistPdf = ({ event, shoppingList, cocktailNames }: BarChecklistProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>CHECKLIST DE BARRA</Text>
          <Text style={styles.subtitle}>Orden de Servicio / Picking List</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text>Fecha: {event.event_date}</Text>
          <Text>Invitados: {event.guest_count}</Text>
          <Text>Evento: {event.event_type.toUpperCase()}</Text>
        </View>
      </View>

      {/* SECCIÓN 1: MENÚ DE COCTELES */}
      <Text style={styles.sectionTitle}>1. MENÚ A SERVIR (BARTENDER INFO)</Text>
      <View style={styles.cocktailBox}>
        {cocktailNames.map((name, idx) => (
          <View key={idx} style={styles.cocktailTag}>
            <Text style={styles.cocktailName}>• {name}</Text>
          </View>
        ))}
        {cocktailNames.length === 0 && <Text style={{color:'#999'}}>No hay cocteles especificados.</Text>}
      </View>

      {/* SECCIÓN 2: LISTA DE INSUMOS (PICKING) */}
      <Text style={styles.sectionTitle}>2. INSUMOS Y CANTIDADES (A ENTREGAR)</Text>
      
      {/* Tabla Header */}
      <View style={[styles.row, { borderBottomWidth: 2, borderColor: '#333' }]}>
        <Text style={styles.colName}>Insumo</Text>
        {/* CORRECCIÓN AQUÍ: Antes decía style.colCat */}
        <Text style={styles.colCat}>Categoría</Text> 
        <Text style={styles.colQty}>Cantidad Total</Text>
      </View>

      {/* Filas */}
      {shoppingList.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.colName}>{item.ingredientName}</Text>
          <Text style={styles.colCat}>{item.category.toUpperCase()}</Text>
          <Text style={styles.colQty}>{item.details}</Text>
        </View>
      ))}

      {/* FOOTER */}
      <View style={{ position: 'absolute', bottom: 30, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ width: '40%', borderTopWidth: 1, paddingTop: 5 }}>
            <Text>Firma Responsable Logística</Text>
        </View>
        <View style={{ width: '40%', borderTopWidth: 1, paddingTop: 5 }}>
            <Text>Firma Recepción Barra (Bartender)</Text>
        </View>
      </View>

    </Page>
  </Document>
);