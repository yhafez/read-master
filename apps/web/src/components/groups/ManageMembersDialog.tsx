/**
 * Manage Group Members Dialog Component
 *
 * Allows group owners to manage members:
 * - View member list with roles
 * - Remove members
 * - Change member roles (promote to admin, demote)
 * - View member stats (join date, contributions)
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  Stack,
  Box,
  Divider,
  Alert,
} from "@mui/material";
import {
  Close as CloseIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon,
  RemoveCircle as RemoveIcon,
  Star as PromoteIcon,
  StarBorder as DemoteIcon,
  Shield as AdminIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

export interface ManageMembersDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Group ID */
  groupId: string;
  /** Group name for display */
  groupName: string;
  /** Current user ID (to prevent self-removal) */
  currentUserId: string;
}

type Member = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
  contributionCount: number;
};

export function ManageMembersDialog({
  open,
  onClose,
  groupId: _groupId,
  groupName,
  currentUserId,
}: ManageMembersDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([
    // Mock data - in production, fetch from API
    {
      id: "1",
      username: "johndoe",
      displayName: "John Doe",
      avatar: null,
      role: "owner",
      joinedAt: new Date(2024, 0, 1),
      contributionCount: 42,
    },
    {
      id: "2",
      username: "janedoe",
      displayName: "Jane Doe",
      avatar: null,
      role: "admin",
      joinedAt: new Date(2024, 1, 15),
      contributionCount: 28,
    },
    {
      id: "3",
      username: "bobsmith",
      displayName: "Bob Smith",
      avatar: null,
      role: "member",
      joinedAt: new Date(2024, 2, 10),
      contributionCount: 15,
    },
  ]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    member: Member
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
    setError(null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    if (selectedMember.id === currentUserId) {
      setError(t("groups.members.cannotRemoveSelf"));
      handleMenuClose();
      return;
    }

    try {
      // TODO: Call actual API
      // await fetch(`/api/groups/${groupId}/members/${selectedMember.id}`, {
      //   method: "DELETE",
      // });

      // Mock success
      setMembers((prev) => prev.filter((m) => m.id !== selectedMember.id));
      handleMenuClose();
    } catch (_error) {
      setError(t("groups.members.removeFailed"));
      handleMenuClose();
    }
  };

  const handlePromoteToAdmin = async () => {
    if (!selectedMember) return;

    try {
      // TODO: Call actual API
      // await fetch(`/api/groups/${groupId}/members/${selectedMember.id}/role`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ role: "admin" }),
      // });

      // Mock success
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, role: "admin" as const } : m
        )
      );
      handleMenuClose();
    } catch (_error) {
      setError(t("groups.members.promoteFailed"));
      handleMenuClose();
    }
  };

  const handleDemoteToMember = async () => {
    if (!selectedMember) return;

    try {
      // TODO: Call actual API
      // await fetch(`/api/groups/${groupId}/members/${selectedMember.id}/role`, {
      //   method: "PUT",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ role: "member" }),
      // });

      // Mock success
      setMembers((prev) =>
        prev.map((m) =>
          m.id === selectedMember.id ? { ...m, role: "member" as const } : m
        )
      );
      handleMenuClose();
    } catch (_error) {
      setError(t("groups.members.demoteFailed"));
      handleMenuClose();
    }
  };

  const getRoleChip = (role: Member["role"]) => {
    switch (role) {
      case "owner":
        return (
          <Chip
            label={t("groups.members.roleOwner")}
            color="primary"
            size="small"
            icon={<AdminIcon />}
          />
        );
      case "admin":
        return (
          <Chip
            label={t("groups.members.roleAdmin")}
            color="secondary"
            size="small"
            icon={<AdminIcon />}
          />
        );
      case "member":
        return (
          <Chip
            label={t("groups.members.roleMember")}
            variant="outlined"
            size="small"
          />
        );
    }
  };

  const canManageMember = (member: Member): boolean => {
    // Owner can manage everyone except themselves
    // Cannot change owner role
    return member.id !== currentUserId && member.role !== "owner";
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {t("groups.members.title")}
            </Typography>
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2}>
            {/* Group Info */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t("groups.members.managing")}
              </Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {groupName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("groups.members.totalCount", { count: members.length })}
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Divider />

            {/* Members List */}
            <List disablePadding>
              {members.map((member, index) => (
                <React.Fragment key={member.id}>
                  {index > 0 && <Divider variant="inset" component="li" />}
                  <ListItem
                    secondaryAction={
                      canManageMember(member) ? (
                        <IconButton
                          edge="end"
                          onClick={(e) => handleMenuOpen(e, member)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      ) : null
                    }
                  >
                    <ListItemAvatar>
                      <Avatar src={member.avatar || ""}>
                        {!member.avatar && <PersonIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body1">
                            {member.displayName}
                          </Typography>
                          {getRoleChip(member.role)}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            @{member.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("groups.members.joined")}{" "}
                            {formatDistanceToNow(member.joinedAt, {
                              addSuffix: true,
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {t("groups.members.contributions", {
                              count: member.contributionCount,
                            })}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>{t("common.close")}</Button>
        </DialogActions>
      </Dialog>

      {/* Member Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedMember?.role === "member" && (
          <MenuItem onClick={handlePromoteToAdmin}>
            <PromoteIcon fontSize="small" sx={{ mr: 1 }} />
            {t("groups.members.promoteToAdmin")}
          </MenuItem>
        )}
        {selectedMember?.role === "admin" && (
          <MenuItem onClick={handleDemoteToMember}>
            <DemoteIcon fontSize="small" sx={{ mr: 1 }} />
            {t("groups.members.demoteToMember")}
          </MenuItem>
        )}
        <MenuItem onClick={handleRemoveMember} sx={{ color: "error.main" }}>
          <RemoveIcon fontSize="small" sx={{ mr: 1 }} />
          {t("groups.members.remove")}
        </MenuItem>
      </Menu>
    </>
  );
}

export default ManageMembersDialog;
