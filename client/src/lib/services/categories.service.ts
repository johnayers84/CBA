import { get, post, patch, del } from '../api';
import type { Category } from '../../types';

export interface CreateCategoryDto {
  name: string;
  displayOrder?: number;
  weight?: number;
}

export interface UpdateCategoryDto {
  name?: string;
  displayOrder?: number;
  weight?: number;
}

/**
 * Get categories for an event
 */
export async function getCategories(eventId: string) {
  return get<Category[]>(`/events/${eventId}/categories`);
}

/**
 * Get single category
 */
export async function getCategory(id: string) {
  return get<Category>(`/categories/${id}`);
}

/**
 * Create new category
 */
export async function createCategory(eventId: string, data: CreateCategoryDto) {
  return post<Category>(`/events/${eventId}/categories`, data);
}

/**
 * Update category
 */
export async function updateCategory(id: string, data: UpdateCategoryDto) {
  return patch<Category>(`/categories/${id}`, data);
}

/**
 * Delete category
 */
export async function deleteCategory(id: string) {
  return del(`/categories/${id}`);
}
