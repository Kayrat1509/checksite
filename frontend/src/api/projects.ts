import axios from './axios'

export const projectsAPI = {
  getProjects: async (params?: any) => {
    const response = await axios.get('/projects/projects/', { params })
    return response.data
  },

  getProject: async (id: number) => {
    const response = await axios.get(`/projects/projects/${id}/`)
    return response.data
  },

  createProject: async (data: any) => {
    const response = await axios.post('/projects/projects/', data)
    return response.data
  },

  updateProject: async (id: number, data: any) => {
    const response = await axios.patch(`/projects/projects/${id}/`, data)
    return response.data
  },

  deleteProject: async (id: number) => {
    await axios.delete(`/projects/projects/${id}/`)
  },

  getSites: async (params?: any) => {
    const response = await axios.get('/projects/sites/', { params })
    return response.data
  },

  getCategories: async () => {
    const response = await axios.get('/projects/categories/')
    return response.data
  },

  getProjectContractors: async (projectId: number) => {
    const response = await axios.get(`/projects/projects/${projectId}/contractors/`)
    return response.data
  },

  // Drawing APIs
  getDrawings: async (projectId?: number) => {
    const params = projectId ? { project: projectId } : {}
    const response = await axios.get('/projects/drawings/', { params })
    return response.data
  },

  uploadDrawing: async (projectId: number, file: File, fileName: string) => {
    const formData = new FormData()
    formData.append('project', projectId.toString())
    formData.append('file', file)
    formData.append('file_name', fileName)

    const response = await axios.post('/projects/drawings/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  deleteDrawing: async (id: number) => {
    await axios.delete(`/projects/drawings/${id}/`)
  },
}
