
const API_BASE = 'http://localhost:8000/api';

// ============================================================
// DISTRICTS
// ============================================================

export const fetchDistricts = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/districts/`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`District API failed: ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Invalid districts response');
    }

    return data;
  } catch (error) {
    console.warn('Could not load districts from backend:', error);

    return [
      { id: 1, name: 'Mangaluru', region: 'Coastal Karnataka' },
      { id: 2, name: 'Bengaluru', region: 'South Karnataka' },
      { id: 3, name: 'Mysuru', region: 'Heritage Zone' },
      { id: 4, name: 'Coorg', region: 'Western Ghats' },
      { id: 5, name: 'Hampi', region: 'UNESCO World Heritage' },
      { id: 6, name: 'Udupi', region: 'Coastal Karnataka' },
      { id: 7, name: 'Gokarna', region: 'Uttara Kannada' },
      { id: 8, name: 'Chikkamagaluru', region: 'Coffee Hills' },
      { id: 9, name: 'Hubballi', region: 'North Karnataka' },
      { id: 10, name: 'Shivamogga', region: 'Malnad Region' },
    ];
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// PLACES
// ============================================================

export const fetchPlaces = async (
  district = '',
  category = 'All',
  search = ''
) => {
  const params = new URLSearchParams();

  if (district) {
    params.set('district', district);
  }

  if (category && category !== 'All') {
    params.set('category', category);
  }

  if (search) {
    params.set('search', search);
  }

  const url = `${API_BASE}/places/?${params.toString()}`;
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Places API failed: ${res.status}`);
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      throw new Error('Places API returned an unexpected response');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Loading places timed out after 15 seconds. Please try again.'
      );
    }

    console.error('Failed to load places:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// INCIDENTS
// ============================================================

export const fetchIncidents = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${API_BASE}/incidents/`, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch incidents: ${res.status}`);
    }

    const data = await res.json();

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Failed to load incidents:', error);
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// ROUTE SAFETY
// ============================================================

export const fetchRouteSafety = async (
  from = 'Bengaluru',
  to = 'Mangaluru'
) => {
  const params = new URLSearchParams({ from, to });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(
      `${API_BASE}/routes/safety-eval/?${params.toString()}`,
      { signal: controller.signal }
    );

    if (!res.ok) {
      throw new Error(`Route safety API failed: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to load route safety:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ============================================================
// TRIP SAFETY BRIEF
// ============================================================

export const generateTripBrief = async (tripData) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch(
      `${API_BASE}/trip-brief/generate/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tripData),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      throw new Error(`Trip brief API failed: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error('Failed to generate trip brief:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
