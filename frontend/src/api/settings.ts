import axios from './axios'

// Интерфейс для матрицы доступа
export interface AccessMatrix {
  [page: string]: {
    [role: string]: boolean
  }
}

// Интерфейс для ответа API с матрицей доступа
export interface AccessMatrixResponse {
  matrix: AccessMatrix
}

// Интерфейс для запроса на обновление матрицы
export interface UpdateAccessMatrixRequest {
  matrix: AccessMatrix
}

// API для работы с настройками системы
export const settingsAPI = {
  // Получить матрицу доступа
  getAccessMatrix: async (): Promise<AccessMatrixResponse> => {
    const response = await axios.get<AccessMatrixResponse>('/settings/page-access/matrix/')
    return response.data
  },

  // Обновить матрицу доступа
  updateAccessMatrix: async (data: UpdateAccessMatrixRequest): Promise<{ message: string; data: AccessMatrixResponse }> => {
    const response = await axios.post<{ message: string; data: AccessMatrixResponse }>('/settings/page-access/matrix/', data)
    return response.data
  },
}
