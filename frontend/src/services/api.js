const API_BASE = '/api';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend health check failed');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return { status: 'error', message: error.message };
  }
}

export async function fetchSummary() {
  try {
    const res = await fetch(`${API_BASE}/summary`);
    if (!res.ok) throw new Error('Failed to fetch summary');
    return await res.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}
