import React, { useState, useEffect } from 'react'

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
        const response = await fetch('/api/public/custom-fields')
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
    const commonProps = {
      id: field.name,
      name: field.name,
      required: field.is_required,
      placeholder: field.placeholder || '',
      value: values[field.name] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        onFieldChange(field.name, e.target.value)
      },
      className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
    }

    switch (field.field_type) {
      case 'text':
        return <input type="text" {...commonProps} />
      
      case 'email':
        return <input type="email" {...commonProps} />
      
      case 'phone':
        return <input type="tel" {...commonProps} />
      
      case 'number':
        return <input type="number" {...commonProps} />
      
      case 'date':
        return <input type="date" {...commonProps} />
      
      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
          />
        )
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Selecione uma opção</option>
            {field.options?.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.name}
              name={field.name}
              checked={values[field.name] || false}
              onChange={(e) => onFieldChange(field.name, e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor={field.name} className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        )
      
      default:
        return <input type="text" {...commonProps} />
    }
  }

  if (customFields.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Informações Adicionais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {customFields.map((field) => (
            <div key={field.id} className={field.field_type === 'textarea' ? 'md:col-span-2' : ''}>
              {field.field_type !== 'checkbox' && (
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              
              {renderField(field)}
              
              {field.help_text && (
                <p className="mt-1 text-sm text-gray-500">
                  {field.help_text}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}