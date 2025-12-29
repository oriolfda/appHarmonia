const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tipus
export interface Usuari {
  id: number;
  email: string;
  nom_usuari: string;
  nom_display: string;
  rol: 'admin' | 'professor' | 'alumne' | 'usuari';
  creat_a: string;
}

export interface Partitura {
  id: number;
  titol: string;
  descripcio: string;
  imatge_url: string;
  usuari_id: number;
  nom_usuari: string;
  nom_display: string;
  creat_a: string;
  actualitzat_a: string;
  publica: boolean;
  permet_anotacions: boolean;
  anotacions_count: number;
  comentaris_count: number;
}

export interface Anotacio {
  id: number;
  partitura_id: number;
  usuari_id: number;
  nom_usuari: string;
  nom_display: string;
  dades_anotacio: any;
  color: string;
  eina_utilitzada: string;
  acceptada: boolean;
  revisada: boolean;
  creat_a: string;
  actualitzat_a: string;
}

export interface Comentari {
  id: number;
  partitura_id: number;
  usuari_id: number;
  nom_usuari: string;
  nom_display: string;
  comentari: string;
  resposta_a: number | null;
  creat_a: string;
}

export interface Paginacio {
  pagina: number;
  limit: number;
  total: number;
  pagines: number;
}

// Funció per obtenir token
const getToken = (): string | null => {
  return localStorage.getItem('harmonia_token');
};

// Configuració base de fetch
const fetchConfig = (method: string, data?: any, needsAuth = true): RequestInit => {
  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  if (needsAuth) {
    const token = getToken();
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      };
    }
  }

  return config;
};

// Funció per manejar errors
const handleResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    if (contentType?.includes('application/json')) {
      const error = await response.json().catch(() => ({ error: 'Error desconegut' }));
      throw new Error(error.error || `Error ${response.status}`);
    } else {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
  }
  
  // Si la resposta és buida (204 No Content)
  if (response.status === 204) {
    return {};
  }
  
  // Si hi ha contingut JSON, parsejar-lo
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};

// API Auth
export const authAPI = {
  register: async (email: string, nom_usuari: string, password: string, nom_display?: string) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nom_usuari, password, nom_display })
    });
    return handleResponse(response);
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await handleResponse(response);
    if (data.token) {
      localStorage.setItem('harmonia_token', data.token);
      localStorage.setItem('harmonia_user', JSON.stringify(data.user));
    }
    return data;
  },

  logout: () => {
    localStorage.removeItem('harmonia_token');
    localStorage.removeItem('harmonia_user');
  },

  getProfile: async () => {
    const response = await fetch(`${API_URL}/auth/profile`, fetchConfig('GET', null, true));
    return handleResponse(response);
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('harmonia_token');
    return !!token;
  },

  getCurrentUser: (): Usuari | null => {
    const userStr = localStorage.getItem('harmonia_user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
};

// API Partitures
export const partituresAPI = {
  upload: async (file: File, titol: string, descripcio?: string) => {
    const formData = new FormData();
    formData.append('imatge', file);
    formData.append('titol', titol);
    if (descripcio) formData.append('descripcio', descripcio);

    const token = getToken();
    const response = await fetch(`${API_URL}/partitures/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return handleResponse(response);
  },

  getAll: async (page = 1, limit = 20) => {
    const response = await fetch(
      `${API_URL}/partitures?page=${page}&limit=${limit}`,
      fetchConfig('GET', null, false)
    );
    return handleResponse(response);
  },

  getById: async (id: number) => {
    const response = await fetch(
      `${API_URL}/partitures/${id}`,
      fetchConfig('GET', null, false)
    );
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(
      `${API_URL}/partitures/${id}`,
      fetchConfig('DELETE', null, true)
    );
    return handleResponse(response);
  }
};

// API Anotacions
export const anotacionsAPI = {
  create: async (partitura_id: number, dades_anotacio: any, color?: string, eina_utilitzada?: string) => {
    const response = await fetch(`${API_URL}/anotacions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({
        partitura_id,
        dades_anotacio,
        color,
        eina_utilitzada
      })
    });
    return handleResponse(response);
  },

  getByPartitura: async (partitura_id: number) => {
    const response = await fetch(
      `${API_URL}/anotacions?partitura_id=${partitura_id}`,
      fetchConfig('GET', null, false)
    );
    return handleResponse(response);
  },

  update: async (id: number, acceptada?: boolean, revisada?: boolean) => {
    const response = await fetch(
      `${API_URL}/anotacions/${id}`,
      fetchConfig('PATCH', { acceptada, revisada }, true)
    );
    return handleResponse(response);
  },

  delete: async (id: number) => {
    const response = await fetch(
      `${API_URL}/anotacions/${id}`,
      fetchConfig('DELETE', null, true)
    );
    return handleResponse(response);
  }
};

// API Comentaris
export const comentarisAPI = {
  create: async (partitura_id: number, comentari: string, resposta_a?: number) => {
    const response = await fetch(
      `${API_URL}/comentaris`,
      fetchConfig('POST', { partitura_id, comentari, resposta_a }, true)
    );
    return handleResponse(response);
  },

  getByPartitura: async (partitura_id: number) => {
    const response = await fetch(
      `${API_URL}/comentaris?partitura_id=${partitura_id}`,
      fetchConfig('GET', null, false)
    );
    return handleResponse(response);
  }
};

// API Estadístiques
export const estadistiquesAPI = {
  get: async () => {
    const response = await fetch(
      `${API_URL}/estadistiques`,
      fetchConfig('GET', null, false)
    );
    return handleResponse(response);
  }
};

// API de salut
export const salutAPI = {
  check: async () => {
    const response = await fetch(`${API_URL}/salut`, fetchConfig('GET', null, false));
    return handleResponse(response);
  }
};

export default {
  auth: authAPI,
  partitures: partituresAPI,
  anotacions: anotacionsAPI,
  comentaris: comentarisAPI,
  estadistiques: estadistiquesAPI,
  salut: salutAPI
};