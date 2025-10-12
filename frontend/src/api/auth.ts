import axios from './axios'

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  secondary_email?: string
  first_name: string
  last_name: string
  middle_name?: string
  position: string
  password: string
  password_confirm: string
}

export interface TokenResponse {
  access: string
  refresh: string
}

export const authAPI = {
  login: async (data: LoginData): Promise<TokenResponse> => {
    const response = await axios.post('/auth/token/', data)
    return response.data
  },

  register: async (data: RegisterData) => {
    const response = await axios.post('/auth/register/register/', data)
    return response.data
  },

  getCurrentUser: async () => {
    const response = await axios.get('/auth/users/me/')
    return response.data
  },

  updateProfile: async (data: any) => {
    const response = await axios.patch('/auth/users/update_profile/', data)
    return response.data
  },

  changePassword: async (data: {
    old_password: string
    new_password: string
    new_password_confirm: string
  }) => {
    const response = await axios.post('/auth/users/change_password/', data)
    return response.data
  },
}
