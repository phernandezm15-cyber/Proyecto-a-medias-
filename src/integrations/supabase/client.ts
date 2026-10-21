/**
 * Client for Supabase with dual-mode support:
 * 1. Real Supabase if VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY exist.
 * 2. In-browser mock database with full seeded farmacia dataset if keys are absent.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const hasRealSupabase = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

// --- SEED DATA DEFINITIONS ---
const INITIAL_MEDS = [
  { id: 'MED-001', codigo: '75010000010', nombre: 'Panadol Extra', principio: 'Paracetamol 500mg', categoria: 'Analgésicos', caducidad: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10), precio_compra: 8.5, precio_venta: 14, stock: 120 },
  { id: 'MED-002', codigo: '75010079191', nombre: 'Advil', principio: 'Ibuprofeno 400mg', categoria: 'Antiinflamatorios', caducidad: new Date(Date.now() + 300 * 86400000).toISOString().slice(0, 10), precio_compra: 12, precio_venta: 19.5, stock: 85 },
  { id: 'MED-003', codigo: '75010158382', nombre: 'Amoxil', principio: 'Amoxicilina 500mg', categoria: 'Antibióticos', caducidad: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), precio_compra: 35, precio_venta: 55, stock: 6 },
  { id: 'MED-004', codigo: '75010237573', nombre: 'Clarityne', principio: 'Loratadina 10mg', categoria: 'Antihistamínicos', caducidad: new Date(Date.now() + 250 * 86400000).toISOString().slice(0, 10), precio_compra: 22, precio_venta: 34, stock: 48 },
  { id: 'MED-005', codigo: '75010316764', nombre: 'Omeprazol MK', principio: 'Omeprazol 20mg', categoria: 'Gastrointestinal', caducidad: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10), precio_compra: 15, precio_venta: 25, stock: 64 },
  { id: 'MED-006', codigo: '75010395955', nombre: 'Losartán Denk', principio: 'Losartán 50mg', categoria: 'Cardiovascular', caducidad: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10), precio_compra: 28, precio_venta: 42, stock: 8 },
  { id: 'MED-007', codigo: '75010475146', nombre: 'Centrum', principio: 'Multivitamínico', categoria: 'Vitaminas', caducidad: new Date(Date.now() + 500 * 86400000).toISOString().slice(0, 10), precio_compra: 95, precio_venta: 139, stock: 30 },
  { id: 'MED-008', codigo: '75010554337', nombre: 'Ventolin', principio: 'Salbutamol 100mcg', categoria: 'Respiratorio', caducidad: new Date(Date.now() + 25 * 86400000).toISOString().slice(0, 10), precio_compra: 48, precio_venta: 72, stock: 22 },
  { id: 'MED-009', codigo: '75010633528', nombre: 'Aspirina Bayer', principio: 'Ácido acetilsalicílico', categoria: 'Analgésicos', caducidad: new Date(Date.now() + 600 * 86400000).toISOString().slice(0, 10), precio_compra: 6, precio_venta: 10, stock: 150 },
  { id: 'MED-010', codigo: '75010712719', nombre: 'Cipro', principio: 'Ciprofloxacino 500mg', categoria: 'Antibióticos', caducidad: new Date(Date.now() + 210 * 86400000).toISOString().slice(0, 10), precio_compra: 40, precio_venta: 62, stock: 5 },
  { id: 'MED-011', codigo: '75010791900', nombre: 'Voltaren', principio: 'Diclofenaco 50mg', categoria: 'Antiinflamatorios', caducidad: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10), precio_compra: 18, precio_venta: 29, stock: 40 },
  { id: 'MED-012', codigo: '75010871091', nombre: 'Allegra', principio: 'Fexofenadina 180mg', categoria: 'Antihistamínicos', caducidad: new Date(Date.now() + 320 * 86400000).toISOString().slice(0, 10), precio_compra: 45, precio_venta: 68, stock: 26 },
  { id: 'MED-013', codigo: '75010950282', nombre: 'Gaviscon', principio: 'Alginato de sodio', categoria: 'Gastrointestinal', caducidad: new Date(Date.now() + 140 * 86400000).toISOString().slice(0, 10), precio_compra: 38, precio_venta: 58, stock: 18 },
  { id: 'MED-014', codigo: '75011029473', nombre: 'Redoxon', principio: 'Vitamina C 1g', categoria: 'Vitaminas', caducidad: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10), precio_compra: 30, precio_venta: 46, stock: 55 },
  { id: 'MED-015', codigo: '75011108664', nombre: 'Atorvastatina MK', principio: 'Atorvastatina 20mg', categoria: 'Cardiovascular', caducidad: new Date(Date.now() + 400 * 86400000).toISOString().slice(0, 10), precio_compra: 32, precio_venta: 50, stock: 9 },
  { id: 'MED-016', codigo: '75011187855', nombre: 'Bepanthen', principio: 'Dexpantenol 5%', categoria: 'Dermatológicos', caducidad: new Date(Date.now() + 420 * 86400000).toISOString().slice(0, 10), precio_compra: 42, precio_venta: 65, stock: 35 },
  { id: 'MED-017', codigo: '75011267046', nombre: 'Glucophage', principio: 'Metformina 850mg', categoria: 'Diabetes', caducidad: new Date(Date.now() + 380 * 86400000).toISOString().slice(0, 10), precio_compra: 26, precio_venta: 40, stock: 70 },
  { id: 'MED-018', codigo: '75011346237', nombre: 'Mucosolvan', principio: 'Ambroxol 30mg', categoria: 'Respiratorio', caducidad: new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10), precio_compra: 33, precio_venta: 49, stock: 14 },
  { id: 'MED-019', codigo: '75011425428', nombre: 'Fucidin', principio: 'Ácido fusídico 2%', categoria: 'Dermatológicos', caducidad: new Date(Date.now() + 260 * 86400000).toISOString().slice(0, 10), precio_compra: 55, precio_venta: 82, stock: 3 },
  { id: 'MED-020', codigo: '75011504619', nombre: 'Januvia', principio: 'Sitagliptina 100mg', categoria: 'Diabetes', caducidad: new Date(Date.now() + 500 * 86400000).toISOString().slice(0, 10), precio_compra: 210, precio_venta: 295, stock: 12 },
];

const INITIAL_PROVS = [
  { id: 'PRV-001', empresa: 'Droguería Centroamericana', contacto: 'Luis Méndez', telefono: '2245-1100', correo: 'ventas@drocen.gt', direccion: 'Zona 9, Ciudad de Guatemala' },
  { id: 'PRV-002', empresa: 'Laboratorios Bonin', contacto: 'Ana Castillo', telefono: '2380-4422', correo: 'pedidos@bonin.gt', direccion: 'Zona 12, Ciudad de Guatemala' },
  { id: 'PRV-003', empresa: 'Farmasa Distribuciones', contacto: 'Carlos Rivera', telefono: '2421-7788', correo: 'info@farmasa.com', direccion: 'Mixco, Guatemala' },
  { id: 'PRV-004', empresa: 'MediPharma GT', contacto: 'Sofía Herrera', telefono: '2290-3355', correo: 'contacto@medipharma.gt', direccion: 'Zona 10, Ciudad de Guatemala' },
  { id: 'PRV-005', empresa: 'Grupo Selecta Salud', contacto: 'Jorge Pérez', telefono: '7765-0099', correo: 'selecta@salud.gt', direccion: 'Quetzaltenango' },
];

const INITIAL_CLIENTS = [
  { id: 'CLI-001', nombre: 'Ana Morales', telefono: '5512-3344', nit: '4589632-1', puntos: 45 },
  { id: 'CLI-002', nombre: 'Carlos Juárez', telefono: '5523-8899', nit: 'CF', puntos: 10 },
  { id: 'CLI-003', nombre: 'Lucía Barrios', telefono: '4456-7788', nit: '7845123-6', puntos: 120 },
  { id: 'CLI-004', nombre: 'Pedro Gómez', telefono: '5590-1122', nit: '1234567-8', puntos: 0 },
  { id: 'CLI-005', nombre: 'María Fernanda Ruiz', telefono: '3345-6677', nit: '9988776-5', puntos: 75 },
  { id: 'CLI-006', nombre: 'José Ramírez', telefono: '5567-0011', nit: 'CF', puntos: 20 },
  { id: 'CLI-007', nombre: 'Elena Castillo', telefono: '4478-2233', nit: '5566778-9', puntos: 200 },
  { id: 'CLI-008', nombre: 'Diego Hernández', telefono: '5501-9988', nit: '3322114-0', puntos: 35 },
  { id: 'CLI-009', nombre: 'Sofía Pérez', telefono: '3390-4455', nit: 'CF', puntos: 5 },
  { id: 'CLI-010', nombre: 'Ricardo López', telefono: '5544-6677', nit: '6677889-1', puntos: 60 },
];

const INITIAL_USERS = [
  { id: 'usr-admin', email: 'admin@farmacia.gt', password: 'admin123', nombre: 'Admin General', role: 'admin' },
  { id: 'usr-emp', email: 'empleado@farmacia.gt', password: 'empleado123', nombre: 'María López', role: 'empleado' },
];

const INITIAL_COMPRAS = [
  { id: 'CMP-001', codigo: 'CMP-001', fecha: new Date(Date.now() - 1 * 86400000).toISOString(), proveedor_id: 'PRV-001', med_id: 'MED-003', cantidad: 50, costo: 35, estado: 'Pendiente', nota: 'Entrega programada' },
  { id: 'CMP-002', codigo: 'CMP-002', fecha: new Date(Date.now() - 3 * 86400000).toISOString(), proveedor_id: 'PRV-002', med_id: 'MED-001', cantidad: 100, costo: 8.5, estado: 'Completado', nota: null },
  { id: 'CMP-003', codigo: 'CMP-003', fecha: new Date(Date.now() - 6 * 86400000).toISOString(), proveedor_id: 'PRV-004', med_id: 'MED-007', cantidad: 20, costo: 95, estado: 'Completado', nota: null },
  { id: 'CMP-004', codigo: 'CMP-004', fecha: new Date(Date.now() - 8 * 86400000).toISOString(), proveedor_id: 'PRV-003', med_id: 'MED-010', cantidad: 40, costo: 40, estado: 'Pendiente', nota: null },
  { id: 'CMP-005', codigo: 'CMP-005', fecha: new Date(Date.now() - 12 * 86400000).toISOString(), proveedor_id: 'PRV-001', med_id: 'MED-009', cantidad: 80, costo: 6, estado: 'Completado', nota: null },
  { id: 'CMP-006', codigo: 'CMP-006', fecha: new Date(Date.now() - 15 * 86400000).toISOString(), proveedor_id: 'PRV-005', med_id: 'MED-017', cantidad: 60, costo: 26, estado: 'Completado', nota: null },
];

function generateInitialSales(): any[] {
  const vendedores = ['Admin General', 'María López', 'Carlos Méndez', 'Andrea Solís'];
  const ventas: any[] = [];
  const now = Date.now();

  for (let i = 0; i < 45; i++) {
    const dayOffset = (i * 7) % 28;
    const hour = 8 + ((i * 5) % 12);
    const minute = (i * 13) % 60;
    const date = new Date(now - dayOffset * 86400000);
    date.setHours(hour, minute, 0, 0);

    const descPct = i % 6 === 0 ? 5 : i % 11 === 0 ? 10 : 0;
    const cliente = i % 3 === 0 ? INITIAL_CLIENTS[i % INITIAL_CLIENTS.length] : null;
    const medIdx = (i * 3) % INITIAL_MEDS.length;
    const med = INITIAL_MEDS[medIdx];
    const qty = 1 + (i % 3);

    const subtotal = med.precio_venta * qty;
    const descuento = Math.round((subtotal * descPct) / 100 * 100) / 100;
    const iva = Math.round((subtotal - descuento) * 0.12 * 100) / 100;
    const total = subtotal - descuento + iva;
    const puntos = cliente ? Math.floor(total / 100) * 5 : 0;

    const id = `VTA-${String(1000 + i)}`;
    ventas.push({
      id: `uuid-vta-${i}`,
      codigo: id,
      fecha: date.toISOString(),
      vendedor_nombre: vendedores[i % vendedores.length],
      vendedor_id: i % 2 === 0 ? 'usr-admin' : 'usr-emp',
      cliente_id: cliente ? cliente.id : null,
      subtotal,
      descuento,
      desc_pct: descPct,
      iva,
      total,
      puntos,
      venta_detalle: [
        {
          med_id: med.id,
          nombre: med.nombre,
          cantidad: qty,
          precio: med.precio_venta,
        },
      ],
    });
  }
  return ventas;
}

// Local storage helper
function getStore<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(`farmaciadb_${key}`);
  if (!raw) {
    localStorage.setItem(`farmaciadb_${key}`, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setStore<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`farmaciadb_${key}`, JSON.stringify(value));
  }
}

// --- MOCK CLIENT IMPLEMENTATION ---
class MockSupabaseClient {
  private authListeners: ((event: string, session: any) => void)[] = [];

  constructor() {
    // Ensure default stores exist
    getStore('meds', INITIAL_MEDS);
    getStore('provs', INITIAL_PROVS);
    getStore('clients', INITIAL_CLIENTS);
    getStore('users', INITIAL_USERS);
    getStore('compras', INITIAL_COMPRAS);
    getStore('ventas', generateInitialSales());
    // Auto-login as Admin demo user by default so user can preview immediately
    if (!localStorage.getItem('farmaciadb_current_user')) {
      localStorage.setItem('farmaciadb_current_user', JSON.stringify(INITIAL_USERS[0]));
    }
  }

  get auth() {
    return {
      getUser: async () => {
        const u = getStore<any | null>('current_user', null);
        return { data: { user: u ? { id: u.id, email: u.email } : null }, error: null };
      },
      getSession: async () => {
        const u = getStore<any | null>('current_user', null);
        return {
          data: {
            session: u
              ? {
                  user: { id: u.id, email: u.email },
                  access_token: 'mock-jwt-token',
                }
              : null,
          },
          error: null,
        };
      },
      signInWithPassword: async ({ email, password }: { email: string; password?: string }) => {
        const users = getStore<any[]>('users', INITIAL_USERS);
        const match = users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim() && (!password || u.password === password)
        );
        if (!match) {
          return { data: { user: null, session: null }, error: new Error('Credenciales incorrectas') };
        }
        setStore('current_user', match);
        this.notifyAuth('SIGNED_IN', { user: { id: match.id, email: match.email } });
        return {
          data: {
            user: { id: match.id, email: match.email },
            session: { user: { id: match.id, email: match.email } },
          },
          error: null,
        };
      },
      signUp: async ({ email, password, options }: any) => {
        const users = getStore<any[]>('users', INITIAL_USERS);
        const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase().trim());
        if (exists) {
          return { data: { user: null }, error: new Error('Este correo ya está registrado') };
        }
        const newUser = {
          id: `usr-${Date.now()}`,
          email: email.trim(),
          password,
          nombre: options?.data?.nombre || 'Usuario',
          role: options?.data?.rol === 'admin' ? 'admin' : 'empleado',
        };
        users.push(newUser);
        setStore('users', users);
        return { data: { user: { id: newUser.id, email: newUser.email } }, error: null };
      },
      signOut: async () => {
        setStore('current_user', null);
        this.notifyAuth('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange: (cb: (ev: string, session: any) => void) => {
        this.authListeners.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                this.authListeners = this.authListeners.filter((l) => l !== cb);
              },
            },
          },
        };
      },
    };
  }

  private notifyAuth(event: string, session: any) {
    this.authListeners.forEach((l) => l(event, session));
  }

  from(tableName: string) {
    let data: any[] = [];
    let key = '';

    if (tableName === 'medicamentos') {
      key = 'meds';
      data = getStore(key, INITIAL_MEDS);
    } else if (tableName === 'proveedores') {
      key = 'provs';
      data = getStore(key, INITIAL_PROVS);
    } else if (tableName === 'clientes') {
      key = 'clients';
      data = getStore(key, INITIAL_CLIENTS);
    } else if (tableName === 'compras') {
      key = 'compras';
      data = getStore(key, INITIAL_COMPRAS);
    } else if (tableName === 'ventas') {
      key = 'ventas';
      data = getStore(key, []);
    } else if (tableName === 'profiles') {
      const users = getStore('users', INITIAL_USERS);
      data = users.map((u) => ({ id: u.id, nombre: u.nombre, email: u.email, role: u.role, created_at: u.created_at || '2026-01-01' }));
    } else if (tableName === 'user_roles') {
      const users = getStore('users', INITIAL_USERS);
      data = users.map((u) => ({ user_id: u.id, role: u.role }));
    }

    let filters: ((item: any) => boolean)[] = [];
    let sortFn: ((a: any, b: any) => number) | null = null;
    let limitCount: number | null = null;

    const builder: any = {
      select: (_cols?: string) => builder,
      eq: (col: string, val: any) => {
        filters.push((item: any) => String(item[col]) === String(val));
        return builder;
      },
      order: (col: string, opts?: { ascending?: boolean }) => {
        const asc = opts?.ascending !== false;
        sortFn = (a: any, b: any) => {
          if (a[col] < b[col]) return asc ? -1 : 1;
          if (a[col] > b[col]) return asc ? 1 : -1;
          return 0;
        };
        return builder;
      },
      limit: (n: number) => {
        limitCount = n;
        return builder;
      },
      maybeSingle: async () => {
        let res = [...data];
        for (const f of filters) res = res.filter(f);
        return { data: res[0] ?? null, error: null };
      },
      single: async () => {
        let res = [...data];
        for (const f of filters) res = res.filter(f);
        return { data: res[0] ?? null, error: null };
      },
      insert: async (rowOrRows: any) => {
        const rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
        const currentList = getStore<any[]>(key, []);
        const inserted = rows.map((r, idx) => {
          const id = r.id || `${key.toUpperCase().slice(0, 3)}-${String(currentList.length + idx + 1).padStart(3, '0')}`;
          return { ...r, id };
        });
        const updated = [...currentList, ...inserted];
        setStore(key, updated);
        return { data: inserted, error: null };
      },
      update: (fields: any) => {
        return {
          eq: async (col: string, val: any) => {
            const currentList = getStore<any[]>(key, []);
            const updated = currentList.map((item) => {
              if (String(item[col]) === String(val)) {
                return { ...item, ...fields };
              }
              return item;
            });
            setStore(key, updated);
            return { data: updated.filter((item) => String(item[col]) === String(val)), error: null };
          },
        };
      },
      delete: () => {
        return {
          eq: (col: string, val: any) => {
            const currentList = getStore<any[]>(key, []);
            const toDelete = currentList.filter((item) => String(item[col]) === String(val));
            const remaining = currentList.filter((item) => String(item[col]) !== String(val));
            setStore(key, remaining);
            return {
              select: async () => ({ data: toDelete, error: null }),
              then: (fn: any) => fn({ data: toDelete, error: null }),
            };
          },
        };
      },
      then: (resolve: any, reject?: any) => {
        let res = [...data];
        for (const f of filters) res = res.filter(f);
        if (sortFn) res.sort(sortFn);
        if (limitCount != null) res = res.slice(0, limitCount);
        return Promise.resolve({ data: res, error: null }).then(resolve, reject);
      },
    };

    return builder;
  }

  async rpc(funcName: string, args: any) {
    if (funcName === 'registrar_venta') {
      const { _items, _desc_pct, _cliente_id } = args;
      const meds = getStore<any[]>('meds', INITIAL_MEDS);
      const ventas = getStore<any[]>('ventas', []);
      const clients = getStore<any[]>('clients', INITIAL_CLIENTS);
      const currentUser = getStore<any | null>('current_user', INITIAL_USERS[0]);

      let subtotal = 0;
      const details: any[] = [];

      for (const item of _items) {
        const m = meds.find((x) => x.id === item.med_id);
        if (!m) throw new Error('Producto no existe');
        if (m.stock < item.cantidad) throw new Error(`Stock insuficiente: ${m.nombre}`);
        m.stock -= item.cantidad;
        subtotal += m.precio_venta * item.cantidad;
        details.push({
          med_id: m.id,
          nombre: m.nombre,
          cantidad: item.cantidad,
          precio: m.precio_venta,
        });
      }
      setStore('meds', meds);

      const descuento = Math.round((subtotal * (_desc_pct || 0)) / 100 * 100) / 100;
      const base = subtotal - descuento;
      const iva = Math.round(base * 0.12 * 100) / 100;
      const total = base + iva;
      const puntos = _cliente_id ? Math.floor(total / 100) * 5 : 0;

      if (_cliente_id && puntos > 0) {
        const client = clients.find((c) => c.id === _cliente_id);
        if (client) {
          client.puntos = (client.puntos || 0) + puntos;
          setStore('clients', clients);
        }
      }

      const displayCode = `VTA-${String(1001 + ventas.length)}`;
      const newVenta = {
        id: `uuid-${Date.now()}`,
        codigo: displayCode,
        fecha: new Date().toISOString(),
        vendedor_id: currentUser?.id || 'usr-admin',
        vendedor_nombre: currentUser?.nombre || 'Usuario',
        cliente_id: _cliente_id,
        subtotal,
        descuento,
        desc_pct: _desc_pct || 0,
        iva,
        total,
        puntos,
        venta_detalle: details,
      };

      ventas.unshift(newVenta);
      setStore('ventas', ventas);

      return {
        data: {
          id: newVenta.id,
          codigo: newVenta.codigo,
          fecha: newVenta.fecha,
          total: newVenta.total,
          puntos: newVenta.puntos,
          subtotal: newVenta.subtotal,
          descuento: newVenta.descuento,
          iva: newVenta.iva,
          desc_pct: newVenta.desc_pct,
          vendedor_nombre: newVenta.vendedor_nombre,
        },
        error: null,
      };
    }

    if (funcName === 'recibir_compra') {
      const { _id } = args;
      const compras = getStore<any[]>('compras', INITIAL_COMPRAS);
      const meds = getStore<any[]>('meds', INITIAL_MEDS);

      const compra = compras.find((c) => c.id === _id);
      if (compra && compra.estado !== 'Completado') {
        compra.estado = 'Completado';
        const med = meds.find((m) => m.id === compra.med_id);
        if (med) {
          med.stock += compra.cantidad;
          med.precio_compra = compra.costo;
        }
        setStore('compras', compras);
        setStore('meds', meds);
      }
      return { data: null, error: null };
    }

    return { data: null, error: new Error(`RPC function ${funcName} not mocked`) };
  }
}

let _supabaseClient: any = null;

if (hasRealSupabase) {
  _supabaseClient = createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  );
} else {
  _supabaseClient = new MockSupabaseClient();
}

export const supabase = _supabaseClient;
