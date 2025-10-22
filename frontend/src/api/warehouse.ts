import axios from './axios'

// =B5@D59AK 4;O A:;04A:>3> CG5B0
export interface WarehouseReceipt {
  id: number
  material_request: number
  request_number?: string
  material_item: number
  material_name?: string
  project: number
  project_data?: {
    id: number
    name: string
    address?: string
  }
  receipt_date: string
  received_quantity: number
  unit: string
  waybill_number?: string
  supplier?: string
  received_by?: number
  received_by_data?: {
    id: number
    full_name: string
    email: string
    role: string
  }
  quality_status: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'PARTIAL'
  quality_status_display?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateWarehouseReceiptData {
  material_request: number
  material_item: number
  project: number
  receipt_date: string
  received_quantity: number
  unit: string
  waybill_number?: string
  supplier?: string
  notes?: string
  quality_status?: 'GOOD' | 'DAMAGED' | 'DEFECTIVE' | 'PARTIAL'
}

// API <5B>4K
export const warehouseAPI = {
  // >;CG8BL A?8A>: ?>ABC?;5=89
  getReceipts: async (params?: any) => {
    const response = await axios.get('/warehouse/receipts/', { params })
    return response.data
  },

  // >;CG8BL >4=> ?>ABC?;5=85
  getReceipt: async (id: number) => {
    const response = await axios.get(`/warehouse/receipts/${id}/`)
    return response.data
  },

  // !>740BL ?>ABC?;5=85
  createReceipt: async (data: CreateWarehouseReceiptData) => {
    const response = await axios.post('/warehouse/receipts/', data)
    return response.data
  },

  // 1=>28BL ?>ABC?;5=85
  updateReceipt: async (id: number, data: Partial<CreateWarehouseReceiptData>) => {
    const response = await axios.patch(`/warehouse/receipts/${id}/`, data)
    return response.data
  },

  // #40;8BL ?>ABC?;5=85
  deleteReceipt: async (id: number) => {
    await axios.delete(`/warehouse/receipts/${id}/`)
  },
}
