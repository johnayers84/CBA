import { get, post, patch, del } from '../api';
import type { Table, TableWithSeats, Seat } from '../../types';

export interface CreateTableDto {
  tableNumber: number;
  name?: string;
}

export interface CreateTableWithSeatsDto {
  tableNumber: number;
  name?: string;
  seatCount: number;
}

export interface UpdateTableDto {
  name?: string;
}

export interface CreateSeatDto {
  seatNumber: number;
}

/**
 * Get tables for an event
 */
export async function getTables(eventId: string) {
  return get<Table[]>(`/events/${eventId}/tables`);
}

/**
 * Get single table
 */
export async function getTable(id: string) {
  return get<Table>(`/tables/${id}`);
}

/**
 * Create new table
 */
export async function createTable(eventId: string, data: CreateTableDto) {
  return post<Table>(`/events/${eventId}/tables`, data);
}

/**
 * Update table
 */
export async function updateTable(id: string, data: UpdateTableDto) {
  return patch<Table>(`/tables/${id}`, data);
}

/**
 * Delete table
 */
export async function deleteTable(id: string) {
  return del(`/tables/${id}`);
}

/**
 * Regenerate table QR token
 */
export async function regenerateTableToken(id: string) {
  return post<Table>(`/tables/${id}/regenerate-token`, {});
}

/**
 * Get seats for a table
 */
export async function getSeats(tableId: string) {
  return get<Seat[]>(`/tables/${tableId}/seats`);
}

/**
 * Get single seat
 */
export async function getSeat(id: string) {
  return get<Seat>(`/seats/${id}`);
}

/**
 * Create new seat
 */
export async function createSeat(tableId: string, data: CreateSeatDto) {
  return post<Seat>(`/tables/${tableId}/seats`, data);
}

/**
 * Delete seat
 */
export async function deleteSeat(id: string) {
  return del(`/seats/${id}`);
}

/**
 * Get tables with their seats for an event
 */
export async function getTablesWithSeats(eventId: string): Promise<{ data?: TableWithSeats[]; error?: string }> {
  const tablesRes = await get<Table[]>(`/events/${eventId}/tables`);
  if (tablesRes.error || !tablesRes.data) {
    return { error: tablesRes.error || 'Failed to load tables' };
  }

  // Load seats for each table in parallel
  const tablesWithSeats = await Promise.all(
    tablesRes.data.map(async (table) => {
      const seatsRes = await get<Seat[]>(`/tables/${table.id}/seats`);
      return {
        ...table,
        seats: seatsRes.data || [],
      };
    })
  );

  return { data: tablesWithSeats };
}

/**
 * Create table with seats
 */
export async function createTableWithSeats(
  eventId: string,
  data: CreateTableWithSeatsDto
): Promise<{ data?: TableWithSeats; error?: string }> {
  // Create the table
  const tableRes = await post<Table>(`/events/${eventId}/tables`, {
    tableNumber: data.tableNumber,
    name: data.name,
  });

  if (tableRes.error || !tableRes.data) {
    return { error: tableRes.error || 'Failed to create table' };
  }

  // Create seats
  const seats: Seat[] = [];
  for (let i = 1; i <= data.seatCount; i++) {
    const seatRes = await post<Seat>(`/tables/${tableRes.data.id}/seats`, {
      seatNumber: i,
    });
    if (seatRes.data) {
      seats.push(seatRes.data);
    }
  }

  return {
    data: {
      ...tableRes.data,
      seats,
    },
  };
}
