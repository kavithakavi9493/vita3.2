/**
 * VI — Review Service
 * ====================
 */

import { reviewsApi } from '../utils/api'

export async function submitReview({ userId, productId, rating, title, body }) {
  return reviewsApi.submit({ userId, productId, rating, title, body })
}

export async function getProductReviews(productId, limit = 10) {
  return reviewsApi.forProduct(productId, limit)
}

export async function getRatingSummary(productId) {
  return reviewsApi.summary(productId)
}

export async function getFeaturedReviews() {
  return reviewsApi.featured()
}
