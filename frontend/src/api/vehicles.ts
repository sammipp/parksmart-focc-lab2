import client from './client';
import { VehicleSession } from '../types';

export interface VehicleHistoryResponse {
  sessions: VehicleSession[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getActiveVehicles = async (): Promise<VehicleSession[]> => {
  const res = await client.get<{ data: VehicleSession[] }>('/vehicles/active');
  return res.data.data;
};

export const getVehicleHistory = async (params?: {
  page?: number;
  per_page?: number;
}): Promise<VehicleHistoryResponse> => {
  const res = await client.get<{ data: VehicleHistoryResponse }>('/vehicles/history', { params });
  return res.data.data;
};

export const recordEntry = async (data: {
  space_id: string;
  vehicle_reg: string;
  reservation_id?: string;
}): Promise<VehicleSession> => {
  const res = await client.post<{ data: VehicleSession }>('/vehicles/entry', data);
  return res.data.data;
};

export const recordExit = async (data: {
  space_id?: string;
  session_id?: string;
}): Promise<VehicleSession> => {
  const res = await client.post<{ data: VehicleSession }>('/vehicles/exit', data);
  return res.data.data;
};

