import axios from 'axios'

const API_BASE = 'http://localhost:8001'

export const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 60000,
})

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Quick health check
export async function checkBackendHealth() {
  try {
    const res = await axios.get(`${API_BASE}/api/health`, { timeout: 4000 })
    return res.data
  } catch (e) {
    return null
  }
}

// Authentication
export async function registerUser(name, email, password) {
  const res = await api.post('/auth/register', { name, email, password })
  if (res.data.access_token) {
    localStorage.setItem('access_token', res.data.access_token)
    if (res.data.refresh_token) {
      localStorage.setItem('refresh_token', res.data.refresh_token)
    }
  }
  return res.data
}

export async function loginUser(email, password) {
  const res = await api.post('/auth/login', { email, password })
  if (res.data.access_token) {
    localStorage.setItem('access_token', res.data.access_token)
    if (res.data.refresh_token) {
      localStorage.setItem('refresh_token', res.data.refresh_token)
    }
  }
  return res.data
}

// Ensure a session exists (auto-register guest if needed)
export async function ensureSession() {
  const token = localStorage.getItem('access_token')
  if (token) return token

  // Auto-register guest researcher session
  try {
    const guestEmail = `clinician_${Date.now()}@screening.local`
    const res = await registerUser('Clinical Screener', guestEmail, 'MSPE-DeiT-Screening-2026!')
    return res.access_token
  } catch (err) {
    return null
  }
}

// Multipart screening inference
export async function analyzeScreening(imageFile, clinicalData, modality = 'dermoscopy') {
  await ensureSession()

  const formData = new FormData()
  formData.append('image', imageFile)
  formData.append('clinical', JSON.stringify(clinicalData))
  formData.append('modality', modality)

  const res = await api.post('/screenings/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

// Fetch historical assessments
export async function fetchScreenings() {
  await ensureSession()
  const res = await api.get('/screenings')
  return res.data
}

// Download PDF report
export async function downloadPdfReport(id) {
  await ensureSession()
  const res = await api.get(`/screenings/${id}/report`, {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `screening-report-${id}.pdf`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
  return true
}

export default api
