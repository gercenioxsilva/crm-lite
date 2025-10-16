import { useState, useEffect } from 'react'
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip, MenuItem,
  Select, FormControl, InputLabel
} from '@mui/material'
import { Add, Send } from '@mui/icons-material'

interface Email {
  id: string
  status: string
  subject: string
  to: { email: string; name?: string }[]
  createdAt: string
  sentAt?: string
  deliveredAt?: string
}

interface Lead {
  id: string
  name: string
  email: string
}

export function EmailManager() {
  const [emails, setEmails] = useState<Email[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [, setLoading] = useState(false)
  const [newEmail, setNewEmail] = useState({
    leadId: '',
    to: '',
    subject: '',
    htmlBody: '',
    textBody: '',
    priority: 'normal'
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      // Fetch leads
      const leadsRes = await fetch('http://localhost:3000/backoffice/leads', { headers })
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(leadsData.slice(0, 50))
      }

      // Fetch emails (mock for now)
      setEmails([])
    } catch (err) {
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      if (!newEmail.leadId || !newEmail.subject || !newEmail.htmlBody) {
        alert('Por favor, preencha todos os campos obrigatórios')
        return
      }

      const selectedLead = leads.find(l => l.id === newEmail.leadId)
      if (!selectedLead) {
        alert('Lead não encontrado')
        return
      }

      const token = localStorage.getItem('auth_token')
      const response = await fetch('http://localhost:3000/backoffice/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: { email: 'noreply@crm.com', name: 'CRM System' },
          to: [{ email: selectedLead.email, name: selectedLead.name }],
          subject: newEmail.subject,
          htmlBody: newEmail.htmlBody,
          textBody: newEmail.textBody,
          leadId: newEmail.leadId,
          priority: newEmail.priority
        })
      })

      if (response.ok) {
        setOpenDialog(false)
        setNewEmail({
          leadId: '',
          to: '',
          subject: '',
          htmlBody: '',
          textBody: '',
          priority: 'normal'
        })
        await fetchData()
        alert('Email enviado com sucesso!')
      } else {
        const errorData = await response.json()
        alert('Erro ao enviar email: ' + (errorData.error || 'Erro desconhecido'))
      }
    } catch (err) {
      console.error('Error sending email:', err)
      alert('Erro ao enviar email: ' + (err instanceof Error ? err.message : 'Erro desconhecido'))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success'
      case 'delivered': return 'primary'
      case 'pending': return 'warning'
      case 'failed': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviado'
      case 'delivered': return 'Entregue'
      case 'pending': return 'Pendente'
      case 'failed': return 'Falhou'
      default: return status
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">
          📧 Gestão de Emails
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Novo Email
        </Button>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                📤 Enviados Hoje
              </Typography>
              <Typography variant="h4">
                {emails.filter(e => e.status === 'sent' && 
                  new Date(e.createdAt).toDateString() === new Date().toDateString()).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                ✅ Entregues
              </Typography>
              <Typography variant="h4">
                {emails.filter(e => e.status === 'delivered').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                ⏳ Pendentes
              </Typography>
              <Typography variant="h4">
                {emails.filter(e => e.status === 'pending').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                ❌ Falharam
              </Typography>
              <Typography variant="h4">
                {emails.filter(e => e.status === 'failed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Emails Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Emails Recentes
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Para</TableCell>
                  <TableCell>Assunto</TableCell>
                  <TableCell>Enviado</TableCell>
                  <TableCell>Entregue</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhum email encontrado. Envie o primeiro email!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id} hover>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(email.status)}
                          color={getStatusColor(email.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {email.to[0]?.name || email.to[0]?.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {email.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {email.sentAt ? new Date(email.sentAt).toLocaleString('pt-BR') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {email.deliveredAt ? new Date(email.deliveredAt).toLocaleString('pt-BR') : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Send Email Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>📧 Novo Email</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Lead</InputLabel>
                <Select
                  value={newEmail.leadId}
                  onChange={(e) => {
                    const leadId = e.target.value
                    const lead = leads.find(l => l.id === leadId)
                    setNewEmail({ 
                      ...newEmail, 
                      leadId,
                      to: lead?.email || ''
                    })
                  }}
                >
                  {leads.map((lead) => (
                    <MenuItem key={lead.id} value={lead.id}>
                      {lead.name} - {lead.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={newEmail.priority}
                  onChange={(e) => setNewEmail({ ...newEmail, priority: e.target.value })}
                >
                  <MenuItem value="low">🔵 Baixa</MenuItem>
                  <MenuItem value="normal">🟡 Normal</MenuItem>
                  <MenuItem value="high">🔴 Alta</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Para"
                value={newEmail.to}
                disabled
                helperText="Email será preenchido automaticamente ao selecionar o lead"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Assunto"
                value={newEmail.subject}
                onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Conteúdo HTML"
                multiline
                rows={6}
                value={newEmail.htmlBody}
                onChange={(e) => setNewEmail({ ...newEmail, htmlBody: e.target.value })}
                required
                helperText="Conteúdo do email em HTML"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Conteúdo Texto"
                multiline
                rows={4}
                value={newEmail.textBody}
                onChange={(e) => setNewEmail({ ...newEmail, textBody: e.target.value })}
                helperText="Versão em texto simples (opcional)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleSendEmail} 
            variant="contained"
            startIcon={<Send />}
            disabled={!newEmail.leadId || !newEmail.subject || !newEmail.htmlBody}
          >
            📧 Enviar Email
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}