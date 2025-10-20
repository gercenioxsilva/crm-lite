import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, MenuItem,
  Select, FormControl, InputLabel, Switch, FormControlLabel, IconButton,
  CircularProgress, Alert
} from '@mui/material'
import { Add, Edit, Delete, DragIndicator } from '@mui/icons-material'

interface CustomField {
  id: string
  name: string
  label: string
  field_type: string
  is_required: boolean
  placeholder?: string
  help_text?: string
  options?: { options: string[] }
  validation_rules?: any
  display_order: number
  is_active: boolean
}

export function CustomFieldsManager() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [newField, setNewField] = useState({
    name: '',
    label: '',
    field_type: 'text',
    is_required: false,
    placeholder: '',
    help_text: '',
    options: [] as string[],
    display_order: 0
  })

  const fieldTypes = [
    { value: 'text', label: '📝 Texto' },
    { value: 'email', label: '📧 Email' },
    { value: 'phone', label: '📞 Telefone' },
    { value: 'number', label: '🔢 Número' },
    { value: 'select', label: '📋 Seleção' },
    { value: 'checkbox', label: '☑️ Checkbox' },
    { value: 'textarea', label: '📄 Texto Longo' },
    { value: 'date', label: '📅 Data' }
  ]

  const fetchFields = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching custom fields from frontend...')
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const response = await fetch('http://localhost:3000/backoffice/custom-fields', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Custom fields data:', data)
        setFields(Array.isArray(data) ? data : [])
      } else {
        const errorData = await response.text()
        console.error('API Error:', response.status, errorData)
        setError(`Erro ${response.status}: ${errorData}`)
        setFields([])
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error)
      setError('Erro de conexão')
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveField = async () => {
    try {
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const payload = {
        ...newField,
        name: newField.name || newField.label.toLowerCase().replace(/\s+/g, '_'),
        options: newField.field_type === 'select' && newField.options.length > 0 
          ? { options: newField.options } 
          : null
      }

      const url = editingField 
        ? `http://localhost:3000/backoffice/custom-fields/${editingField.id}`
        : 'http://localhost:3000/backoffice/custom-fields'
      
      const method = editingField ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setOpenDialog(false)
        setEditingField(null)
        setNewField({
          name: '',
          label: '',
          field_type: 'text',
          is_required: false,
          placeholder: '',
          help_text: '',
          options: [],
          display_order: 0
        })
        await fetchFields()
      }
    } catch (error) {
      console.error('Error saving field:', error)
    }
  }

  const handleEditField = (field: CustomField) => {
    setEditingField(field)
    setNewField({
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      is_required: field.is_required,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      options: field.options?.options || [],
      display_order: field.display_order
    })
    setOpenDialog(true)
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Tem certeza que deseja excluir este campo?')) return

    try {
      const token = localStorage.getItem('auth_token') || 'mock-admin-token'
      const response = await fetch(`http://localhost:3000/backoffice/custom-fields/${fieldId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await fetchFields()
      }
    } catch (error) {
      console.error('Error deleting field:', error)
    }
  }

  const addOption = () => {
    setNewField({
      ...newField,
      options: [...newField.options, '']
    })
  }

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newField.options]
    updatedOptions[index] = value
    setNewField({
      ...newField,
      options: updatedOptions
    })
  }

  const removeOption = (index: number) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== index)
    })
  }

  useEffect(() => {
    fetchFields()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando campos customizáveis...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={fetchFields} variant="outlined">
          Tentar Novamente
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          🎛️ Campos Customizáveis
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingField(null)
            setNewField({
              name: '',
              label: '',
              field_type: 'text',
              is_required: false,
              placeholder: '',
              help_text: '',
              options: [],
              display_order: fields.length
            })
            setOpenDialog(true)
          }}
        >
          Novo Campo
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Campos do Formulário de Captação
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ordem</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Obrigatório</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <DragIndicator color="disabled" />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          {field.display_order}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {field.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fieldTypes.find(t => t.value === field.field_type)?.label || field.field_type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={field.is_required ? 'Sim' : 'Não'}
                        color={field.is_required ? 'error' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={field.is_active ? 'Ativo' : 'Inativo'}
                        color={field.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleEditField(field)}>
                        <Edit />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteField(field.id)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Create/Edit Field Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingField ? '✏️ Editar Campo' : '➕ Novo Campo'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Campo"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Campo</InputLabel>
                <Select
                  value={newField.field_type}
                  onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                >
                  {fieldTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Placeholder"
                value={newField.placeholder}
                onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                helperText="Texto de exemplo no campo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ordem de Exibição"
                type="number"
                value={newField.display_order}
                onChange={(e) => setNewField({ ...newField, display_order: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto de Ajuda"
                multiline
                rows={2}
                value={newField.help_text}
                onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                helperText="Texto explicativo que aparece abaixo do campo"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  />
                }
                label="Campo Obrigatório"
              />
            </Grid>

            {/* Options for select fields */}
            {newField.field_type === 'select' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Opções de Seleção
                </Typography>
                {newField.options.map((option, index) => (
                  <Box key={index} display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={`Opção ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => removeOption(index)}
                    >
                      Remover
                    </Button>
                  </Box>
                ))}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={addOption}
                  startIcon={<Add />}
                >
                  Adicionar Opção
                </Button>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSaveField} 
            variant="contained"
            disabled={!newField.label}
          >
            {editingField ? 'Atualizar' : 'Criar'} Campo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}