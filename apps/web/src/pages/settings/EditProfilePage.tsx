/**
 * Edit Profile Page
 *
 * Allows users to edit their profile information including:
 * - Display name
 * - Username
 * - Bio
 * - Avatar (placeholder for upload)
 * - Privacy settings (profile public, show stats, show activity)
 *
 * NOTE: This is a basic implementation. Avatar upload and backend API
 * integration would need to be added for full functionality.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Avatar,
  Stack,
  Switch,
  FormControlLabel,
  FormGroup,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

// ============================================================================
// Main Component
// ============================================================================

export function EditProfilePage(): React.ReactElement {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Form state
  const [displayName, setDisplayName] = useState(user?.firstName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState("");
  const [profilePublic, setProfilePublic] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Handlers
  const handleAvatarClick = () => {
    // TODO: Implement avatar upload
    alert("Avatar upload feature coming soon! This would open a file picker.");
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Update Clerk user data
      await user.update({
        firstName: displayName,
        username: username || null,
      });

      // TODO: Save bio and privacy settings to backend API
      // This would be a PUT request to /api/users/me/settings
      // For now, we'll just simulate success

      setSaveSuccess(true);

      // Redirect to profile after a short delay
      setTimeout(() => {
        if (user.username) {
          navigate(`/users/${user.username}`);
        } else {
          navigate("/");
        }
      }, 1500);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to save profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  // Loading state
  if (!isLoaded) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          You must be signed in to edit your profile.
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </Box>
    );
  }

  return (
    <Box maxWidth={800} mx="auto">
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Profile
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your public profile and privacy settings
        </Typography>
      </Box>

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Profile updated successfully! Redirecting...
        </Alert>
      )}

      {/* Error Message */}
      {saveError && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          onClose={() => setSaveError(null)}
        >
          {saveError}
        </Alert>
      )}

      {/* Profile Picture */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Profile Picture
          </Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box position="relative">
              <Avatar src={user.imageUrl} sx={{ width: 120, height: 120 }}>
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Tooltip title="Change avatar">
                <IconButton
                  onClick={handleAvatarClick}
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: theme.palette.primary.main,
                    color: "white",
                    "&:hover": {
                      bgcolor: theme.palette.primary.dark,
                    },
                  }}
                  size="small"
                >
                  <PhotoCameraIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box>
              <Typography variant="body1" gutterBottom>
                Click the camera icon to upload a new avatar
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Recommended: Square image, at least 400x400px
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Basic Information
          </Typography>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              helperText="Your name as it appears to others"
              inputProps={{ maxLength: 100 }}
            />

            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                )
              }
              helperText="Your unique username (letters, numbers, and underscores only)"
              inputProps={{ maxLength: 30 }}
            />

            <TextField
              fullWidth
              label="Bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              multiline
              rows={4}
              helperText={`Tell others about yourself (${bio.length}/500)`}
              inputProps={{ maxLength: 500 }}
              placeholder="I'm a passionate reader who loves..."
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Privacy Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Control what information is visible to others
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={profilePublic}
                  onChange={(e) => setProfilePublic(e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Public Profile</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Allow others to view your profile page
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={showStats}
                  onChange={(e) => setShowStats(e.target.checked)}
                  disabled={!profilePublic}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Show Reading Stats</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Display your reading stats (books completed, streaks, etc.)
                  </Typography>
                </Box>
              }
            />

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={showActivity}
                  onChange={(e) => setShowActivity(e.target.checked)}
                  disabled={!profilePublic}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">Show Activity Feed</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Display your recent reading activity to others
                  </Typography>
                </Box>
              }
            />
          </FormGroup>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction={isMobile ? "column" : "row"} spacing={2} mb={4}>
        <Button
          variant="contained"
          size="large"
          startIcon={
            isSaving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSave}
          disabled={isSaving}
          fullWidth={isMobile}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<CancelIcon />}
          onClick={handleCancel}
          disabled={isSaving}
          fullWidth={isMobile}
        >
          Cancel
        </Button>
      </Stack>

      {/* Info Box */}
      <Alert severity="info">
        <Typography variant="body2">
          <strong>Note:</strong> Some features like bio and privacy settings
          require backend integration to persist. Avatar upload functionality is
          also pending implementation.
        </Typography>
      </Alert>
    </Box>
  );
}

export default EditProfilePage;
