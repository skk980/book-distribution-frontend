// src/apis/client.ts
import axios from "axios";

// const API_BASE_URL = "https://book-distribution-backend.vercel.app/api";

const API_BASE_URL = "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ────────────────────────────────────────────────
   Auth
   ──────────────────────────────────────────────── */

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    localStorage.setItem("authToken", token);
  } else {
    delete api.defaults.headers.common["Authorization"];
    localStorage.removeItem("authToken");
  }
}

export function initAuthFromStorage() {
  const token = localStorage.getItem("authToken");
  if (token) {
    setAuthToken(token);
  }
}

// ────────────────────────────────────────────────
// Global axios interceptors
// ────────────────────────────────────────────────

// Attach Authorization header on each request if token exists (extra safety)
api.interceptors.request.use(
  (config) => {
    if (authToken && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// If backend returns 401 → logout + redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      // Clear token from memory + localStorage + axios defaults
      setAuthToken(null);

      // Avoid redirect loop: only redirect if not already on /login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export async function registerAdmin(payload: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/register", payload);
  setAuthToken(res.data.token);
  return res.data;
}

export async function loginAdmin(payload: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", payload);
  setAuthToken(res.data.token);
  return res.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const res = await api.get<AuthUser>("/auth/me");
  return res.data;
}

/* ────────────────────────────────────────────────
   Domain types
   ──────────────────────────────────────────────── */

export interface Book {
  _id: string;
  productName: string;
  subcategory?: string;
  salePrice: number;
  currentStock: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Distributor {
  _id: string;
  name: string;
  phone?: string;
  notes?: string;
  isActive: boolean;
  totalTrips: number;
  totalBooksSold: number;
  totalAmountCollected: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TripItem {
  book: string | Book;
  quantityOut: number;
  quantityReturn: number;
  amountReturned: number;
  differenceReason?: string;
}

export interface Trip {
  _id: string;
  date: string; // YYYY-MM-DD
  distributor: string | Distributor;
  remarks?: string;
  status: "OUT" | "COMPLETED";
  items: TripItem[];
  createdAt?: string;
  updatedAt?: string;
}

/* For creating trips from frontend Trips page (outbound only) */
export interface CreateTripItemPayload {
  bookId: string;
  quantityOut: number;
}

export interface CreateTripPayload {
  date: string;
  distributorId: string;
  remarks?: string;
  items: CreateTripItemPayload[];
}

/* For updating returns from Active Trips page */
export interface UpdateTripReturnItemPayload {
  bookId: string;
  quantityReturn: number;
  amountReturned: number;
  differenceReason?: string;
}

/* Reports */
export interface SummaryReport {
  totalBooksSold: number;
  expectedAmount: number;
  amountCollected: number;
  difference: number;
}

export interface BookReport {
  bookId: string;
  productName: string;
  totalOut: number;
  totalReturned: number;
  totalSold: number;
  expectedAmount: number;
  amountCollected: number;
  difference: number;
}

export interface DistributorReport {
  distributorId: string;
  name: string;
  trips: number;
  booksSold: number;
  expectedAmount: number;
  amountCollected: number;
  difference: number;
}

export interface DistributorBookReportRow {
  date: string;
  productName: string;
  totalOut: number;
  totalReturned: number;
  totalSold: number;
  expectedAmount: number;
  amountCollected: number;
  difference: number;
}

/* ────────────────────────────────────────────────
   Books API
   ──────────────────────────────────────────────── */

export async function getBooks(): Promise<Book[]> {
  const res = await api.get<Book[]>("/books");
  return res.data;
}

export async function createBook(payload: {
  productName: string;
  subcategory?: string;
  salePrice: number;
  currentStock?: number;
}): Promise<Book> {
  const res = await api.post<Book>("/books", payload);
  return res.data;
}

export async function updateBook(
  id: string,
  payload: Partial<
    Pick<Book, "productName" | "subcategory" | "salePrice" | "currentStock">
  >
): Promise<Book> {
  const res = await api.put<Book>(`/books/${id}`, payload);
  return res.data;
}

/* ────────────────────────────────────────────────
   Distributors API
   ──────────────────────────────────────────────── */

export async function getDistributors(): Promise<Distributor[]> {
  const res = await api.get<Distributor[]>("/distributors");
  return res.data;
}

export async function createDistributor(payload: {
  name: string;
  phone?: string;
  notes?: string;
  isActive?: boolean;
}): Promise<Distributor> {
  const res = await api.post<Distributor>("/distributors", payload);
  return res.data;
}

export async function updateDistributor(
  id: string,
  payload: Partial<Pick<Distributor, "name" | "phone" | "notes" | "isActive">>
): Promise<Distributor> {
  const res = await api.put<Distributor>(`/distributors/${id}`, payload);
  return res.data;
}

/* ────────────────────────────────────────────────
   Trips & Active Trips API
   ──────────────────────────────────────────────── */

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const res = await api.post<Trip>("/trips", payload);
  return res.data;
}

export async function getTrips(date?: string): Promise<Trip[]> {
  const res = await api.get<Trip[]>("/trips", {
    params: date ? { date } : {},
  });
  return res.data;
}

export async function updateTripReturns(
  tripId: string,
  items: UpdateTripReturnItemPayload[]
): Promise<Trip> {
  const res = await api.patch<Trip>(`/trips/${tripId}/returns`, { items });
  return res.data;
}

export const deleteTrip = async (tripId: string) => {
  const res = await api.delete(`/trips/${tripId}`);
  return res.data;
};

/* ────────────────────────────────────────────────
   Reports API
   ──────────────────────────────────────────────── */

export async function getSummaryReport(date?: string): Promise<SummaryReport> {
  const res = await api.get<SummaryReport>("/reports/summary", {
    params: date ? { date } : {},
  });
  return res.data;
}

export async function getBookReports(date?: string): Promise<BookReport[]> {
  const res = await api.get<BookReport[]>("/reports/books", {
    params: date ? { date } : {},
  });
  return res.data;
}

export async function getDistributorReports(
  date?: string
): Promise<DistributorReport[]> {
  const res = await api.get<DistributorReport[]>("/reports/distributors", {
    params: date ? { date } : {},
  });
  return res.data;
}

export async function getDistributorBookReports(
  distributorId: string,
  date?: string
): Promise<DistributorBookReportRow[]> {
  const res = await api.get<DistributorBookReportRow[]>(
    `/reports/distributors/${distributorId}/books`,
    {
      params: date ? { date } : {},
    }
  );
  return res.data;
}

export async function deleteBook(id: string) {
  const res = await api.delete(`/books/${id}`);
  return res.data;
}
