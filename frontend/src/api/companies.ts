import axios from './axios'

export interface Company {
  id: number
  legal_form: string
  name: string
  country?: string
  address?: string
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export const companiesAPI = {
  // Получить все компании
  getCompanies: async () => {
    const response = await axios.get('/auth/companies/')
    return response.data
  },

  // Получить одну компанию
  getCompany: async (id: number) => {
    const response = await axios.get(`/auth/companies/${id}/`)
    return response.data
  }
}
