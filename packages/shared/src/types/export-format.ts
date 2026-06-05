export interface ExportFormat {
  id: string
  name: string
  slug: string
  header: string | null
  lineTemplate: string
  footer: string | null
  contentType: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateExportFormatDto {
  name: string
  slug: string
  header?: string
  lineTemplate: string
  footer?: string
  contentType?: string
}

export interface UpdateExportFormatDto {
  name?: string
  slug?: string
  header?: string
  lineTemplate?: string
  footer?: string
  contentType?: string
  isEnabled?: boolean
}
