import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Home as HomeIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Assignment as LogsIcon,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import { usersAPI } from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleAvatarClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate("/");
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === "tr" ? "en" : "tr";
    i18n.changeLanguage(newLang);
    localStorage.setItem("language", newLang);
    if (user) {
      usersAPI.updateLanguage(user.id, newLang).catch(() => {});
    }
  };

  const navItems = [
    { label: t("nav.home"), icon: <HomeIcon />, path: "/dashboard" },
    { label: t("nav.search"), icon: <SearchIcon />, path: "/search" },
    { label: t("nav.profile"), icon: <PersonIcon />, path: "/profile" },
  ];

  const currentNavValue = navItems.findIndex((item) =>
    location.pathname.startsWith(item.path)
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* AppBar */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              cursor: "pointer",
              fontWeight: 800,
              mr: 3,
              background: "linear-gradient(135deg, #6C63FF, #FF6584)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
            onClick={() => navigate("/dashboard")}
          >
            RecoApp
          </Typography>

          {/* Desktop nav links */}
          {!isMobile && (
            <Box sx={{ display: "flex", gap: 1, flexGrow: 1 }}>
              {navItems.map((item) => (
                <Button
                  key={item.path}
                  color="inherit"
                  startIcon={item.icon}
                  onClick={() => navigate(item.path)}
                  sx={{
                    fontWeight: location.pathname.startsWith(item.path) ? 700 : 400,
                    color: location.pathname.startsWith(item.path) ? "primary.main" : "text.secondary",
                    textTransform: "none",
                    borderRadius: 2,
                    px: 1.5,
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}
          {isMobile && <Box sx={{ flexGrow: 1 }} />}

          {/* Language switcher */}
          <Tooltip title="Change language">
            <Button
              color="inherit"
              size="small"
              onClick={toggleLanguage}
              sx={{ minWidth: 44, fontWeight: 600, mr: 1 }}
            >
              {i18n.language === "tr" ? "EN" : "TR"}
            </Button>
          </Tooltip>

          {/* Avatar menu */}
          {user ? (
            <>
              <IconButton onClick={handleAvatarClick} sx={{ p: 0 }}>
                <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36 }}>
                  {user.username?.[0]?.toUpperCase() ?? "U"}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <MenuItem disabled>
                  <Typography variant="body2" color="text.secondary">
                    {user.username}
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleProfileClick}>
                  <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("nav.profile")}
                </MenuItem>
                {user?.isAdmin && (
                  <MenuItem onClick={() => { handleMenuClose(); navigate("/admin"); }}>
                    <LogsIcon fontSize="small" sx={{ mr: 1 }} />
                    Admin Paneli
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("nav.logout")}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => navigate("/login")}>
              {t("auth.login")}
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, pb: isMobile ? 7 : 0 }}>
        {children}
      </Box>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <Paper
          sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100 }}
          elevation={3}
        >
          <BottomNavigation
            value={currentNavValue === -1 ? false : currentNavValue}
            onChange={(_e, newValue) => {
              navigate(navItems[newValue].path);
            }}
          >
            {navItems.map((item) => (
              <BottomNavigationAction
                key={item.path}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
