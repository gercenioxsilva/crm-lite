import { useState } from 'react'
import { Box, Button, Typography, Card, CardContent, Alert } from '@mui/material'
import { apiService } from '../services/api'

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAPIs = async () => {
    setLoading(true)
    const results: any = {}

    try {
      console.log('Testing APIs...')
      
      // Test token
      const token = localStorage.getItem('auth_token')
      results.token = token ? `${token.substring(0, 20)}...` : 'No token'
      
      // Test stats
      try {
        const stats = await apiService.getStats()
        results.stats = stats
        console.log('Stats:', stats)
      } catch (error) {
        results.stats = { error: error instanceof Error ? error.message : 'Unknown error' }
        console.error('Stats error:', error)
      }

      // Test leads
      try {
        const leads = await apiService.getLeads()
        results.leads = { count: leads.length, sample: leads.slice(0, 2) }
        console.log('Leads:', leads)
      } catch (error) {
        results.leads = { error: error instanceof Error ? error.message : 'Unknown error' }
        console.error('Leads error:', error)
      }

      // Test chart
      try {
        const chart = await apiService.getChartData()
        results.chart = chart
        console.log('Chart:', chart)
      } catch (error) {
        results.chart = { error: error instanceof Error ? error.message : 'Unknown error' }
        console.error('Chart error:', error)
      }

      // Test pipeline
      try {
        const pipeline = await apiService.getPipeline()
        results.pipeline = { stages: pipeline.length }
        console.log('Pipeline:', pipeline)
      } catch (error) {
        results.pipeline = { error: error instanceof Error ? error.message : 'Unknown error' }
        console.error('Pipeline error:', error)
      }

    } catch (error) {
      results.generalError = error instanceof Error ? error.message : 'Unknown error'
    }

    setDebugInfo(results)
    setLoading(false)
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Debug Panel - API Connections
      </Typography>
      
      <Button 
        variant="contained" 
        onClick={testAPIs}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? 'Testing...' : 'Test All APIs'}
      </Button>

      {debugInfo && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Debug Results:
            </Typography>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              Token: {debugInfo.token}
            </Alert>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Stats API:</Typography>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                {JSON.stringify(debugInfo.stats, null, 2)}
              </pre>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Leads API:</Typography>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                {JSON.stringify(debugInfo.leads, null, 2)}
              </pre>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Chart API:</Typography>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                {JSON.stringify(debugInfo.chart, null, 2)}
              </pre>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2">Pipeline API:</Typography>
              <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                {JSON.stringify(debugInfo.pipeline, null, 2)}
              </pre>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}