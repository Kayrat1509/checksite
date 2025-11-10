import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api'

// Параметры фильтрации отчетов
export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  projectId?: number
  siteId?: number
  responsibleId?: number
  contractorId?: number
  status?: string
  category?: string
}

// Получение токена
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`
})

// API для генерации отчетов
export const reportsAPI = {
  // Генерация отчета по замечаниям/проекту (используем project_summary)
  generateIssuesReport: async (filters: ReportFilters, format: 'pdf' | 'excel' = 'pdf') => {
    const response = await axios.post(
      `${API_URL}/reports/reports/project_summary/`,
      {
        project_id: filters.projectId,
        format: format
      },
      {
        responseType: 'blob',
        headers: getAuthHeaders()
      }
    )
    return response.data
  },

  // Статистика по проектам (используем project_summary)
  generateProjectsReport: async (filters: ReportFilters, format: 'pdf' | 'excel' = 'excel') => {
    const response = await axios.post(
      `${API_URL}/reports/reports/project_summary/`,
      {
        project_id: filters.projectId,
        format: format
      },
      {
        responseType: 'blob',
        headers: getAuthHeaders()
      }
    )
    return response.data
  },

  // KPI подрядчиков (используем contractor_performance)
  generateContractorsKPIReport: async (filters: ReportFilters, format: 'pdf' | 'excel' = 'pdf') => {
    const response = await axios.post(
      `${API_URL}/reports/reports/contractor_performance/`,
      {
        contractor_id: filters.contractorId,
        start_date: filters.dateFrom,
        end_date: filters.dateTo,
        format: format
      },
      {
        responseType: 'blob',
        headers: getAuthHeaders()
      }
    )
    return response.data
  },

  // Отчет по просроченным замечаниям (используем overdue_issues)
  generateMaterialRequestsReport: async (filters: ReportFilters, format: 'pdf' | 'excel' = 'excel') => {
    const response = await axios.post(
      `${API_URL}/reports/reports/overdue_issues/`,
      {
        project_id: filters.projectId,
        format: format
      },
      {
        responseType: 'blob',
        headers: getAuthHeaders()
      }
    )
    return response.data
  },

  // Получение статистики для дашборда
  getDashboardStats: async () => {
    const response = await axios.get(
      `${API_URL}/reports/reports/dashboard_stats/`,
      {
        headers: getAuthHeaders()
      }
    )
    return response.data
  }
}
