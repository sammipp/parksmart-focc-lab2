import client from './client';
import { AnalyticsOverview, OccupancyDataPoint, RevenueDataPoint } from '../types';

export const getOverview = async (): Promise<AnalyticsOverview> => {
  const res = await client.get<{ data: AnalyticsOverview }>('/analytics/overview');
  return res.data.data;
};

export const getOccupancy = async (days = 7): Promise<OccupancyDataPoint[]> => {
  const res = await client.get<{ data: OccupancyDataPoint[] }>(`/analytics/occupancy?days=${days}`);
  return res.data.data;
};

export const getRevenue = async (days = 7): Promise<RevenueDataPoint[]> => {
  const res = await client.get<{ data: RevenueDataPoint[] }>(`/analytics/revenue?days=${days}`);
  return res.data.data;
};

