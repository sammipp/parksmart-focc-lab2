import client from './client';
import { Reservation, ReservationStatus } from '../types';

export interface ReservationFilterParams {
  status?: ReservationStatus;
  date?: string;
  page?: number;
  per_page?: number;
}

export interface ReservationListResponse {
  reservations: Reservation[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getReservations = async (params?: ReservationFilterParams): Promise<ReservationListResponse> => {
  const res = await client.get<{ data: ReservationListResponse }>('/reservations/', { params });
  return res.data.data;
};

export const getReservation = async (id: string): Promise<Reservation> => {
  const res = await client.get<{ data: Reservation }>(`/reservations/${id}`);
  return res.data.data;
};

export const createReservation = async (data: {
  space_id: string;
  vehicle_reg: string;
  start_time: string;
  end_time: string;
}): Promise<Reservation> => {
  const res = await client.post<{ data: Reservation }>('/reservations/', data);
  return res.data.data;
};

export const cancelReservation = async (id: string): Promise<Reservation> => {
  const res = await client.patch<{ data: Reservation }>(`/reservations/${id}/cancel`);
  return res.data.data;
};

