import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useSimpleAuth } from '../hooks/useSimpleAuth'
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  AccountTree as PipelineIcon,
  Assignment as ActivitiesIcon,
  BarChart as BarChartIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'

const drawerWidth = 280

export function Layout() {
  const { user, logout } = useSimpleAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user) {
    return null
  }

  const navigation = [
    { name: 'Dashboard', path: '/', icon: DashboardIcon },
    { name: 'Leads', path: '/leads', icon: PeopleIcon },
    { name: 'Pipeline', path: '/pipeline', icon: PipelineIcon },
    { name: 'Atividades', path: '/activities', icon: ActivitiesIcon },
    { name: 'Relatorios', path: '/reports', icon: BarChartIcon },
    { name: 'Campos Customizaveis', path: '/custom-fields', icon: SettingsIcon },
  ]

  const handleNavigate = (path: string) => {
    navigate(path)
    setMobileOpen(false)
  }

  const drawerContent = (
    <>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1.5}>
          <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                background: 'linear-gradient(135deg, #8A05BE, #b5179e)',
                boxShadow: '0 6px 24px rgba(138,5,190,.35)',
                flexShrink: 0,
              }}
            />
            <Typography variant="h6" fontWeight={600} noWrap>
              Quiz Backoffice
            </Typography>
          </Box>

          {!isDesktop && (
            <IconButton aria-label="Fechar menu" edge="end" onClick={() => setMobileOpen(false)}>
              <CloseIcon />
            </IconButton>
          )}
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
                onClick={() => handleNavigate(item.path)}
                sx={{
                  minHeight: 48,
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
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{ noWrap: true, fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Box sx={{ mt: 'auto', p: 2 }}>
        <Paper sx={{ p: 2, backgroundColor: 'action.hover', overflow: 'hidden' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', flexShrink: 0 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box minWidth={0}>
              <Typography variant="body2" fontWeight={500} noWrap>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
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
    </>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: 'background.paper',
          boxShadow: 'none',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          {!isDesktop && (
            <IconButton
              aria-label="Abrir menu de navegacao"
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" noWrap component="div" color="text.primary">
            Quiz Backoffice
          </Typography>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: Math.min(drawerWidth, 320),
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        <Drawer
          variant="permanent"
          anchor="left"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3 },
          py: { xs: 2, md: 3 },
          mt: { xs: 7, sm: 8 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  )
}
