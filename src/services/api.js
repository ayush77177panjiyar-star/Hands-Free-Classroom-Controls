const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`Fetch error for ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  async checkHealth() {
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) return await res.json();
      // fallback to top-level health
      const topRes = await fetch('/api/health');
      if (topRes.ok) return await topRes.json();
      throw new Error('Health check responded with non-200');
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  },

  async getSystemStatus() {
    return request('/status');
  },

  async getCalibration(profileId = 'default_student') {
    return request(`/calibration?profile_id=${profileId}`);
  },

  async saveCalibration(profile) {
    return request('/calibration', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  async resetCalibration(profileId = 'default_student') {
    return request(`/calibration/reset?profile_id=${profileId}`, {
      method: 'POST',
    });
  },

  async getSessions() {
    return request('/sessions');
  },

  async recordSession(sessionData) {
    return request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  },

  async getAnalyticsOverview() {
    return request('/analytics/overview');
  },

  async getComparativeBenchmark() {
    return request('/analytics/comparison');
  },
};
