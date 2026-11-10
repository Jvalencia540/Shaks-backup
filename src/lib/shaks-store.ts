// Store compartido de pedidos de Shaks (localStorage + sincronización entre pestañas)

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  beeper: number;
  items: OrderItem[];
  total: number;
  createdAt: number;
  status: "pending" | "ready" | "delivered";
  readyAt?: number;
}

export const MENU = [
  { name: "Shak Clásica", price: 18000 },
  { name: "Shak Doble Tocineta", price: 26000 },
  { name: "Shak Crispy Pollo", price: 22000 },
  { name: "Perro Caliente Shak", price: 19000 },
  { name: "Salchipapa Especial", price: 24000 },
  { name: "Papas Locas Shaks", price: 21000 },
  { name: "Maicitos Desgranados", price: 20000 },
  { name: "Combo Familiar x4", price: 65000 },
  { name: "Gaseosa Personal", price: 5000 },
  { name: "Limonada Natural", price: 7000 },
  { name: "Jugo de Mango Biche", price: 8000 },
];

const KEY = "shaks-orders-v1";
const SEED_FLAG = "shaks-seeded-v1";

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function seedIfEmpty(): Order[] {
  if (typeof window === "undefined") return [];
  if (localStorage.getItem(SEED_FLAG)) return load();
  localStorage.setItem(SEED_FLAG, "1");
  const now = Date.now();
  const seed: Order[] = [
    {
      id: "seed-1",
      beeper: 3,
      items: [
        { name: "Shak Clásica", qty: 2, price: 18000 },
        { name: "Gaseosa Personal", qty: 2, price: 5000 },
      ],
      total: 46000,
      createdAt: now - 4 * 60000,
      status: "pending",
    },
    {
      id: "seed-2",
      beeper: 7,
      items: [{ name: "Combo Familiar x4", qty: 1, price: 65000 }],
      total: 65000,
      createdAt: now - 9 * 60000,
      status: "pending",
    },
    {
      id: "seed-3",
      beeper: 12,
      items: [
        { name: "Shak Crispy Pollo", qty: 1, price: 22000 },
        { name: "Papas Locas Shaks", qty: 1, price: 21000 },
      ],
      total: 43000,
      createdAt: now - 15 * 60000,
      status: "ready",
      readyAt: now - 2 * 60000,
    },
    {
      id: "seed-4",
      beeper: 5,
      items: [{ name: "Salchipapa Especial", qty: 1, price: 24000 }],
      total: 24000,
      createdAt: now - 40 * 60000,
      status: "delivered",
      readyAt: now - 30 * 60000,
    },
    {
      id: "seed-5",
      beeper: 9,
      items: [
        { name: "Perro Caliente Shak", qty: 2, price: 19000 },
        { name: "Limonada Natural", qty: 2, price: 7000 },
      ],
      total: 52000,
      createdAt: now - 70 * 60000,
      status: "delivered",
      readyAt: now - 55 * 60000,
    },
  ];
  save(seed);
  return seed;
}

export function load(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Order[];
    // solo pedidos de hoy
    return all.filter((o) => o.createdAt >= todayStart());
  } catch {
    return [];
  }
}

export function save(orders: Order[]) {
  localStorage.setItem(KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event("shaks-update"));
}

export function getOrders(): Order[] {
  const existing = load();
  if (typeof window !== "undefined" && !localStorage.getItem(SEED_FLAG)) {
    return seedIfEmpty();
  }
  return existing;
}

export function addOrder(beeper: number, items: OrderItem[]): Order {
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const order: Order = {
    id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    beeper,
    items,
    total,
    createdAt: Date.now(),
    status: "pending",
  };
  save([...getOrders(), order]);
  return order;
}

export function markReady(id: string) {
  save(
    getOrders().map((o) =>
      o.id === id ? { ...o, status: "ready" as const, readyAt: Date.now() } : o
    )
  );
}

export function markDelivered(id: string) {
  save(getOrders().map((o) => (o.id === id ? { ...o, status: "delivered" as const } : o)));
}

export function formatCOP(n: number): string {
  return "$" + n.toLocaleString("es-CO");
}
