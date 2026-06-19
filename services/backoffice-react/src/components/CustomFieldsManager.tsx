import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Add, Delete, DragIndicator, Edit } from '@mui/icons-material'
import { apiService } from '../services/api'

interface CustomField {
  id: string
  name: string
  label: string
  field_type: string
  is_required: boolean
  placeholder?: string
  help_text?: string
  options?: { options: string[] }
  validation_rules?: unknown
  display_order: number
  is_active: boolean
}

const emptyField = {
  name: '',
  label: '',
  field_type: 'text',
  is_required: false,
  placeholder: '',
  help_text: '',
  options: [] as string[],
  display_order: 0,
}

const fieldTypes = [
  { value: 'text', label: 'Texto' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'number', label: 'Numero' },
  { value: 'select', label: 'Selecao' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'date', label: 'Data' },
]

function slugifyLabel(label: string) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function CustomFieldsManager() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openDialog, setOpenDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [newField, setNewField] = useState(emptyField)

  const fetchFields = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getCustomFields()
      setFields(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching custom fields:', err)
      setError('Todo mundo erra dessa vez, foi os nossos engenheiros.')
      setFields([])
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingField(null)
    setNewField(emptyField)
  }

  const handleSaveField = async () => {
    try {
      setSaving(true)
      setError(null)

      const payload = {
        ...newField,
        name: newField.name || slugifyLabel(newField.label),
        options: newField.field_type === 'select'
          ? { options: newField.options.filter(Boolean) }
          : null,
        validation_rules: null,
      }

      if (editingField) {
        await apiService.updateCustomField(editingField.id, payload)
      } else {
        await apiService.createCustomField(payload)
      }

      setOpenDialog(false)
      resetForm()
      await fetchFields()
    } catch (err) {
      console.error('Error saving custom field:', err)
      setError('Todo mundo erra dessa vez, foi os nossos engenheiros.')
    } finally {
      setSaving(false)
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
      display_order: field.display_order,
    })
    setOpenDialog(true)
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este campo?')) return

    try {
      setError(null)
      await apiService.deleteCustomField(fieldId)
      await fetchFields()
    } catch (err) {
      console.error('Error deleting custom field:', err)
      setError('Todo mundo erra dessa vez, foi os nossos engenheiros.')
    }
  }

  const addOption = () => {
    setNewField({ ...newField, options: [...newField.options, ''] })
  }

  const updateOption = (index: number, value: string) => {
    const options = [...newField.options]
    options[index] = value
    setNewField({ ...newField, options })
  }

  const removeOption = (index: number) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, currentIndex) => currentIndex !== index),
    })
  }

  useEffect(() => {
    fetchFields()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando campos customizaveis...</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Campos Customizaveis</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            resetForm()
            setNewField({ ...emptyField, display_order: fields.length })
            setOpenDialog(true)
          }}
        >
          Novo Campo
        </Button>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Campos do formulario de captacao
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Ordem</TableCell>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Obrigatorio</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Acoes</TableCell>
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
                      <Typography variant="body2" fontWeight="bold">
                        {field.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={fieldTypes.find((type) => type.value === field.field_type)?.label || field.field_type}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={field.is_required ? 'Sim' : 'Nao'}
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

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingField ? 'Editar Campo' : 'Novo Campo'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Campo"
                value={newField.label}
                onChange={(event) => setNewField({ ...newField, label: event.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Campo</InputLabel>
                <Select
                  label="Tipo de Campo"
                  value={newField.field_type}
                  onChange={(event) => setNewField({ ...newField, field_type: event.target.value })}
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
                onChange={(event) => setNewField({ ...newField, placeholder: event.target.value })}
                helperText="Texto de exemplo no campo"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ordem de Exibicao"
                type="number"
                value={newField.display_order}
                onChange={(event) => setNewField({ ...newField, display_order: parseInt(event.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Texto de Ajuda"
                multiline
                rows={2}
                value={newField.help_text}
                onChange={(event) => setNewField({ ...newField, help_text: event.target.value })}
                helperText="Texto explicativo que aparece abaixo do campo"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newField.is_required}
                    onChange={(event) => setNewField({ ...newField, is_required: event.target.checked })}
                  />
                }
                label="Campo Obrigatorio"
              />
            </Grid>

            {newField.field_type === 'select' && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Opcoes de Selecao
                </Typography>
                {newField.options.map((option, index) => (
                  <Box key={index} display="flex" gap={1} mb={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={`Opcao ${index + 1}`}
                      value={option}
                      onChange={(event) => updateOption(index, event.target.value)}
                    />
                    <Button variant="outlined" color="error" size="small" onClick={() => removeOption(index)}>
                      Remover
                    </Button>
                  </Box>
                ))}
                <Button variant="outlined" size="small" onClick={addOption} startIcon={<Add />}>
                  Adicionar Opcao
                </Button>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSaveField} variant="contained" disabled={!newField.label || saving}>
            {saving ? 'Salvando...' : editingField ? 'Atualizar Campo' : 'Criar Campo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
