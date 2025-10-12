import axios from './axios'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  middle_name?: string
  full_name: string
  role: string
  position?: string
  phone?: string
  company?: number
  company_name?: string
  is_active: boolean
  approved: boolean
  temp_password?: string
  user_projects?: Array<{ id: number; name: string }>
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  password_confirm: string
  first_name: string
  last_name: string
  middle_name?: string
  role: string
  position?: string
  phone?: string
  company?: number
  project_ids?: number[]
}

export const usersAPI = {
  // Get all users
  getUsers: async () => {
    const response = await axios.get('/auth/users/')
    return response.data
  },

  // Get single user
  getUser: async (id: number) => {
    const response = await axios.get(`/auth/users/${id}/`)
    return response.data
  },

  // Create user
  createUser: async (data: CreateUserData) => {
    const response = await axios.post('/auth/users/', data)
    return response.data
  },

  // Update user
  updateUser: async (id: number, data: Partial<CreateUserData>) => {
    const response = await axios.patch(`/auth/users/${id}/`, data)
    return response.data
  },

  // Delete user
  deleteUser: async (id: number) => {
    await axios.delete(`/auth/users/${id}/`)
  },

  // Activate user
  activateUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/activate/`)
    return response.data
  },

  // Deactivate user
  deactivateUser: async (id: number) => {
    const response = await axios.post(`/auth/users/${id}/deactivate/`)
    return response.data
  },

  // Get user's projects
  getUserProjects: async (id: number) => {
    const response = await axios.get(`/auth/users/${id}/projects/`)
    return response.data
  },

  // Assign projects to user
  assignProjects: async (id: number, project_ids: number[]) => {
    const response = await axios.post(`/auth/users/${id}/assign_projects/`, { project_ids })
    return response.data
  }
}
