import React, { useEffect, useState } from 'react'
import { Box, Checkbox, FormControlLabel, Grid, MenuItem, TextField, Typography } from '@mui/material'

interface CustomField {
  id: string
  name: string
  label: string
  field_type: string
  is_required: boolean
  placeholder?: string
  help_text?: string
  options?: { options: string[] }
  display_order: number
}

interface DynamicFormFieldsProps {
  onFieldChange: (fieldName: string, value: any) => void
  values: Record<string, any>
}

export const DynamicFormFields: React.FC<DynamicFormFieldsProps> = ({ onFieldChange, values }) => {
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api')
        const response = await fetch(`${apiUrl}/public/custom-fields`)
        if (response.ok) {
          const fields = await response.json()
          setCustomFields(fields.sort((a: CustomField, b: CustomField) => a.display_order - b.display_order))
        }
      } catch (error) {
        console.error('Error fetching custom fields:', error)
      }
    }

    fetchCustomFields()
  }, [])

  const renderField = (field: CustomField) => {
    const value = values[field.name] || ''
    const commonProps = {
      fullWidth: true,
      label: field.label,
      required: field.is_required,
      placeholder: field.placeholder || '',
      helperText: field.help_text,
    }

    if (field.field_type === 'checkbox') {
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(values[field.name])}
              onChange={(event) => onFieldChange(field.name, event.target.checked)}
            />
          }
          label={field.label}
        />
      )
    }

    if (field.field_type === 'select') {
      return (
        <TextField
          {...commonProps}
          select
          value={value}
          onChange={(event) => onFieldChange(field.name, event.target.value)}
        >
          <MenuItem value="">Selecione</MenuItem>
          {field.options?.options?.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </TextField>
      )
    }

    return (
      <TextField
        {...commonProps}
        value={value}
        type={field.field_type === 'phone' ? 'tel' : field.field_type}
        multiline={field.field_type === 'textarea'}
        rows={field.field_type === 'textarea' ? 4 : undefined}
        onChange={(event) => onFieldChange(field.name, event.target.value)}
      />
    )
  }

  if (customFields.length === 0) {
    return (
      <Box sx={{ p: 2, border: '1px dashed rgba(148,163,184,.32)', borderRadius: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Nao ha campos adicionais obrigatorios para este cadastro.
        </Typography>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 1 }}>
        Complementos do atendimento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Preencha os campos adicionais solicitados para acelerar a qualificacao.
      </Typography>
      <Grid container spacing={2}>
        {customFields.map((field) => (
          <Grid item xs={12} sm={field.field_type === 'textarea' ? 12 : 6} key={field.id}>
            {renderField(field)}
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
