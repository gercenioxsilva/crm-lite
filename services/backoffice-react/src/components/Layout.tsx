import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '../hooks/useSimpleAuth'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Button,
  Paper
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  AccountTree as PipelineIcon,
  BarChart as BarChartIcon,
  Assignment as ActivitiesIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material'

const drawerWidth = 280

export function Layout() {
  const { user, logout } = useSimpleAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', path: '/', icon: DashboardIcon },
    { name: 'Leads', path: '/leads', icon: PeopleIcon },
    { name: 'Pipeline', path: '/pipeline', icon: PipelineIcon },
    { name: 'Atividades', path: '/activities', icon: ActivitiesIcon },
    { name: 'Relatórios', path: '/reports', icon: BarChartIcon },
    { name: 'Campos Customizáveis', path: '/custom-fields', icon: SettingsIcon },
  ]

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          backgroundColor: 'background.paper',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" color="text.primary">
            Quiz Backoffice
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Box sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                background: 'linear-gradient(135deg, #8A05BE, #b5179e)',
                boxShadow: '0 6px 24px rgba(138,5,190,.35)'
              }}
            />
            <Typography variant="h6" fontWeight={600}>
              Quiz Backoffice
            </Typography>
          </Box>
        </Box>

        <List sx={{ px: 2 }}>
          {navigation.map((item) => {
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path)
            return (
              <ListItem key={item.name} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'primary.contrastText' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                    <item.icon />
                  </ListItemIcon>
                  <ListItemText primary={item.name} />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>

        <Box sx={{ mt: 'auto', p: 2 }}>
          <Paper sx={{ p: 2, backgroundColor: 'action.hover' }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                {user.name.charAt(0)}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {user.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>
            </Box>
            <Button
              fullWidth
              size="small"
              startIcon={<LogoutIcon />}
              onClick={logout}
              sx={{ justifyContent: 'flex-start' }}
            >
              Sair
            </Button>
          </Paper>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          p: 3,
          mt: 8
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}