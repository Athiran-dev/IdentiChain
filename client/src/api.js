export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function apiFetch(endpoint, options = {}) {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid token
    sessionStorage.removeItem('token');
    window.dispatchEvent(new Event('unauthorized'));
  }

  // Parse JSON if the response is successful and has content
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null; // Maybe a 204 No Content
  }

  if (!response.ok) {
    throw new Error(data?.error || `HTTP error! status: ${response.status}`);
  }

  // Preserve some custom headers if requested
  if (options.exposeHeaders) {
    const customHeaders = {};
    options.exposeHeaders.forEach(h => {
      customHeaders[h] = response.headers.get(h);
    });
    return { data, headers: customHeaders };
  }

  return data;
}
