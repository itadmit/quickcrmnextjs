export interface Invoice4UIntegration {
  id: string
  name: string
  isActive: boolean
  lastSyncAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Invoice4UDocument {
  id: string
  documentNumber: number
  total: number
  documentType: number
  createdAt: string
}

export type DocumentType = 'quote' | 'proforma' | 'invoice' | 'receipt'

export interface CreateDocumentPayload {
  clientId: string
  documentType: DocumentType
  subject: string
  items: DocumentItem[]
  customEmails?: string[]
}

export interface DocumentItem {
  name: string
  quantity: number
  price: number
  code?: string
}

export interface Invoice4UCustomer {
  ID: number
  Name: string
  Email?: string
  Phone?: string
  Address?: string
  City?: string
  UniqueID?: string
  Active?: boolean
}

export interface Invoice4UResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

