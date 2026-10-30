export type SpaceStatus = 'available' | 'reserved' | 'occupied' | 'out_of_service';
export type VehicleType = 'car' | 'motorcycle' | 'truck' | 'disabled';
export type ReservationStatus = 'active' | 'completed' | 'cancelled';
export type SessionStatus = 'active' | 'completed';

export interface ParkingZone {
  id: string;
  name: string;
  floor: string;
  description?: string;
  created_at?: string;
}

export interface ParkingSpace {
  id: string;
  zone_id: string;
  slot_number: string;
  floor: string;
  vehicle_type: VehicleType;
  status: SpaceStatus;
  hourly_rate: number;
  created_at?: string;
  updated_at?: string;
  zone?: ParkingZone;
  current_reservation?: {
    id: string;
    vehicle_reg: string;
    start_time: string;
    end_time: string;
    status: ReservationStatus;
  } | null;
}

export interface Reservation {
  id: string;
  space_id: string;
  vehicle_reg: string;
  start_time: string;
  end_time: string;
  status: ReservationStatus;
  estimated_fee: number;
  actual_fee?: number | null;
  created_at: string;
  cancelled_at?: string | null;
  space?: ParkingSpace;
}

export interface VehicleSession {
  id: string;
  space_id: string;
  reservation_id?: string | null;
  vehicle_reg: string;
  entry_time: string;
  exit_time?: string | null;
  duration_minutes?: number | null;
  charge?: number | null;
  status: SessionStatus;
  created_at: string;
  space?: ParkingSpace;
}

export interface AnalyticsOverview {
  total_spaces: number;
  available_spaces?: number;
  available?: number;
  occupied_spaces?: number;
  occupied?: number;
  reserved_spaces?: number;
  reserved?: number;
  out_of_service_spaces?: number;
  out_of_service?: number;
  occupancy_percentage?: number;
  occupancy_percent?: number;
  active_reservations: number;
  today_entries: number;
  today_exits: number;
  simulated_daily_revenue?: number;
  today_revenue?: number;
  zones?: Array<{
    zone_id: string;
    zone_name: string;
    floor: string;
    total: number;
    available: number;
    occupied: number;
  }>;
}

export interface OccupancyDataPoint {
  date: string;
  occupancy_percent: number;
  active_sessions?: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  completed_sessions?: number;
}

export interface PeakHourDataPoint {
  hour: number;
  count: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}
