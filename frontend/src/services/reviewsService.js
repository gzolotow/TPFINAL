import api from './api';

export async function getMyReviews() {
  const { data } = await api.get('/reviews');
  return data.reviews;
}

// Devuelve la reseña o null si todavía no hay
export async function getReview(gameId) {
  try {
    const { data } = await api.get(`/reviews/${gameId}`);
    return data.review;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

export async function saveReview(gameId, body) {
  const { data } = await api.put(`/reviews/${gameId}`, { body });
  return data.review;
}

export async function deleteReview(gameId) {
  await api.delete(`/reviews/${gameId}`);
}
