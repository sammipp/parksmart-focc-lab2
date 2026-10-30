import client from './client';
import { ParkingSpace, SpaceStatus, VehicleType } from '../types';

export interface SpaceFilterParams {
  status?: SpaceStatus;
  zone?: string;
  vehicle_type?: VehicleType;
  page?: number;
  per_page?: number;
}

export interface SpaceListResponse {
  spaces: ParkingSpace[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export const getSpaces = async (params?: SpaceFilterParams): Promise<SpaceListResponse> => {
  const res = await client.get<{ data: SpaceListResponse }>('/spaces/', { params });
  return res.data.data;
};

export const getSpace = async (id: string): Promise<ParkingSpace> => {
  const res = await client.get<{ data: ParkingSpace }>(`/spaces/${id}`);
  return res.data.data;
};

export const createSpace = async (data: {
  slot_number: string;
  zone_id: string;
  floor?: string;
  vehicle_type?: VehicleType;
  hourly_rate?: number;
}): Promise<ParkingSpace> => {
  const res = await client.post<{ data: ParkingSpace }>('/spaces/', data);
  return res.data.data;
};

export const updateSpace = async (
  id: string,
  data: {
    zone_id?: string;
    floor?: string;
    vehicle_type?: VehicleType;
    hourly_rate?: number;
    status?: SpaceStatus;
  }
): Promise<ParkingSpace> => {
  const res = await client.put<{ data: ParkingSpace }>(`/spaces/${id}`, data);
  return res.data.data;
};

export const updateSpaceStatus = async (
  id: string,
  status: SpaceStatus
): Promise<ParkingSpace> => {
  const res = await client.patch<{ data: ParkingSpace }>(`/spaces/${id}/status`, { status });
  return res.data.data;
};

