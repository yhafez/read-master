/**
 * Create/Edit Reading Group Page
 *
 * Form for creating a new reading group or editing an existing one.
 *
 * Features:
 * - Name and description fields
 * - Public/private toggle
 * - Max members limit
 * - Cover image upload (placeholder)
 * - Form validation
 * - Tier restriction (Pro/Scholar only)
 * - Loading and error states
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  Slider,
  FormHelperText,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  LockOutlined,
  PublicOutlined,
} from "@mui/icons-material";

// ============================================================================
// Types
// ============================================================================

type CreateGroupInput = {
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  maxMembers: number | null;
};

type GroupDetails = {
  id: string;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  maxMembers: number | null;
  owner: {
    id: string;
    username: string;
  };
};

// ============================================================================
// Constants
// ============================================================================

const MAX_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const DEFAULT_MAX_MEMBERS = 50;
const MIN_MEMBERS = 2;
const MAX_MEMBERS_LIMIT = 1000;

// ============================================================================
// Main Component
// ============================================================================

export function CreateEditGroupPage(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>();
  const isEditMode = !!groupId;
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [maxMembers, setMaxMembers] = useState<number>(DEFAULT_MAX_MEMBERS);
  
  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch group data if editing
  const { data: groupData, isLoading: isLoadingGroup } = useQuery<GroupDetails, Error>({
    queryKey: ["readingGroup", groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch group details");
      }

      return response.json();
    },
    enabled: isEditMode && !!groupId,
  });

  // Populate form with group data in edit mode
  useEffect(() => {
    if (groupData) {
      setName(groupData.name);
      setDescription(groupData.description || "");
      setIsPublic(groupData.isPublic);
      setMaxMembers(groupData.maxMembers || DEFAULT_MAX_MEMBERS);
    }
  }, [groupData]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateGroupInput) => {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create group");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["readingGroups"] });
      navigate(`/groups/${data.id}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (input: Partial<CreateGroupInput>) => {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update group");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readingGroup", groupId] });
      queryClient.invalidateQueries({ queryKey: ["readingGroups"] });
      navigate(`/groups/${groupId}`);
    },
  });

  // Handlers
  const handleCoverImageClick = () => {
    // TODO: Implement cover image upload
    alert("Cover image upload feature coming soon! This would open a file picker.");
  };

  const handleSave = async () => {
    if (!user) return;

    // Validation
    if (!name.trim()) {
      setSaveError("Group name is required");
      return;
    }

    if (name.length > MAX_NAME_LENGTH) {
      setSaveError(`Group name must be ${MAX_NAME_LENGTH} characters or less`);
      return;
    }

    if (description.length > MAX_DESCRIPTION_LENGTH) {
      setSaveError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const input: CreateGroupInput = {
        name: name.trim(),
        description: description.trim() || null,
        coverImage: null, // TODO: Add when cover upload is implemented
        isPublic,
        maxMembers,
      };

      if (isEditMode) {
        await updateMutation.mutateAsync(input);
      } else {
        await createMutation.mutateAsync(input);
      }
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditMode ? "update" : "create"} group. Please try again.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(isEditMode ? `/groups/${groupId}` : "/groups");
  };

  // Loading state for user
  if (!isLoaded) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Loading state for group data in edit mode
  if (isEditMode && isLoadingGroup) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          You must be signed in to {isEditMode ? "edit" : "create"} a reading group.
        </Alert>
        <Button variant="outlined" onClick={() => navigate("/")}>
          Go Home
        </Button>
      </Box>
    );
  }

  // Check ownership in edit mode
  if (isEditMode && groupData && groupData.owner.id !== user.id) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          You don't have permission to edit this group. Only the owner can edit a group.
        </Alert>
        <Button variant="outlined" onClick={() => navigate(`/groups/${groupId}`)}>
          Back to Group
        </Button>
      </Box>
    );
  }

  return (
    <Box maxWidth={800} mx="auto">
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? "Edit Reading Group" : "Create Reading Group"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEditMode
            ? "Update your group details"
            : "Start a new reading group and invite others to join"}
        </Typography>
      </Box>

      {/* Error Message */}
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {/* Cover Image */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cover Image
          </Typography>
          <Stack direction="row" spacing={3} alignItems="center">
            <Box
              sx={{
                width: 120,
                height: 120,
                bgcolor: theme.palette.action.hover,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No Image
              </Typography>
              <Tooltip title="Upload cover image">
                <IconButton
                  onClick={handleCoverImageClick}
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
                Click the camera icon to upload a cover image
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Recommended: 400x400px or larger
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
              required
              label="Group Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              helperText={`${name.length}/${MAX_NAME_LENGTH} characters`}
              inputProps={{ maxLength: MAX_NAME_LENGTH }}
              error={name.trim().length === 0 && name.length > 0}
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={4}
              helperText={`Tell others about your reading group (${description.length}/${MAX_DESCRIPTION_LENGTH})`}
              inputProps={{ maxLength: MAX_DESCRIPTION_LENGTH }}
              placeholder="We meet every week to discuss classic literature..."
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Privacy & Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Control who can see and join your group
          </Typography>
          
          <Stack spacing={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  icon={<LockOutlined />}
                  checkedIcon={<PublicOutlined />}
                />
              }
              label={
                <Box>
                  <Typography variant="body1">
                    {isPublic ? "Public Group" : "Private Group"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isPublic
                      ? "Anyone can see and join this group"
                      : "Only invited members can see and join this group"}
                  </Typography>
                </Box>
              }
            />
            
            <Divider />
            
            <Box>
              <Typography variant="body1" gutterBottom>
                Maximum Members: {maxMembers}
              </Typography>
              <Slider
                value={maxMembers}
                onChange={(_e, value) => setMaxMembers(value as number)}
                min={MIN_MEMBERS}
                max={MAX_MEMBERS_LIMIT}
                step={5}
                marks={[
                  { value: MIN_MEMBERS, label: `${MIN_MEMBERS}` },
                  { value: 50, label: "50" },
                  { value: 100, label: "100" },
                  { value: MAX_MEMBERS_LIMIT, label: `${MAX_MEMBERS_LIMIT}` },
                ]}
                valueLabelDisplay="auto"
              />
              <FormHelperText>
                Set the maximum number of members who can join your group
              </FormHelperText>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Stack direction={isMobile ? "column" : "row"} spacing={2} mb={4}>
        <Button
          variant="contained"
          size="large"
          startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
          fullWidth={isMobile}
        >
          {isSaving
            ? isEditMode
              ? "Updating..."
              : "Creating..."
            : isEditMode
              ? "Update Group"
              : "Create Group"}
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
          <strong>Note:</strong> {isEditMode ? "Pro" : "Pro or Scholar"} tier required to{" "}
          {isEditMode ? "edit" : "create"} reading groups. Cover image upload functionality is
          pending implementation.
        </Typography>
      </Alert>
    </Box>
  );
}

export default CreateEditGroupPage;
