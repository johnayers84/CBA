import { get, post, patch, del } from '../api';
import type { Event, AggregationMethod } from '../../types';

export interface CreateEventDto {
  name: string;
  date: string;
  location?: string;
  aggregationMethod?: AggregationMethod;
  scoringScaleMin?: number;
  scoringScaleMax?: number;
  scoringScaleStep?: number;
}

export interface UpdateEventDto {
  name?: string;
  date?: string;
  location?: string;
  aggregationMethod?: AggregationMethod;
  scoringScaleMin?: number;
  scoringScaleMax?: number;
  scoringScaleStep?: number;
  isActive?: boolean;
}

/**
 * Get all events
 */
export async function getEvents() {
  return get<Event[]>('/events');
}

/**
 * Get single event
 */
export async function getEvent(id: string) {
  return get<Event>(`/events/${id}`);
}

/**
 * Create new event
 */
export async function createEvent(data: CreateEventDto) {
  return post<Event>('/events', data);
}

/**
 * Update event
 */
export async function updateEvent(id: string, data: UpdateEventDto) {
  return patch<Event>(`/events/${id}`, data);
}

/**
 * Delete event
 */
export async function deleteEvent(id: string) {
  return del(`/events/${id}`);
}
