/**
 * Subscription Settings Page
 *
 * Manage subscription, upgrade/downgrade, view billing history
 */

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Skeleton,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Star as StarIcon,
  Workspaces as ScholarIcon,
  Download as DownloadIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import {
  useCreateCheckoutSession,
  useCreateBillingPortalSession,
  redirectToCheckout,
  redirectToCustomerPortal,
} from "@/hooks/usePayments";
import {
  useInvoices,
  formatInvoiceStatus,
  getInvoiceStatusColor,
} from "@/hooks/useSubscription";
import { UsageIndicator } from "@/components/subscription";
import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

type SubscriptionTier = "FREE" | "PRO" | "SCHOLAR";

interface TierFeature {
  name: string;
  included: boolean;
}

interface TierInfo {
  name: string;
  price: string;
  priceAnnual?: string;
  features: TierFeature[];
  color: "default" | "primary" | "secondary";
  icon: React.ReactElement;
}

// ============================================================================
// Component
// ============================================================================

export function SettingsSubscriptionPage(): React.ReactElement {
  const { t } = useTranslation();
  const { user } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Get user tier from Clerk metadata
  const currentTier =
    (user?.publicMetadata?.tier as SubscriptionTier) || "FREE";

  // Check for successful checkout
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      setShowSuccessMessage(true);
      logger.info("Checkout completed successfully", { sessionId });

      // Clear query params
      setTimeout(() => {
        setSearchParams({});
        setShowSuccessMessage(false);
      }, 5000);
    }
  }, [searchParams, setSearchParams]);

  // Mutations
  const createCheckoutSession = useCreateCheckoutSession({
    onSuccess: (data) => {
      redirectToCheckout(data.url);
    },
    onError: (error) => {
      logger.error("Checkout failed", { error: error.message });
    },
  });

  const createBillingPortal = useCreateBillingPortalSession({
    onSuccess: (data) => {
      redirectToCustomerPortal(data.url);
    },
    onError: (error) => {
      logger.error("Failed to open billing portal", { error: error.message });
    },
  });

  // ============================================================================
  // Tier Definitions
  // ============================================================================

  const tiers: Record<SubscriptionTier, TierInfo> = {
    FREE: {
      name: t("subscription.tiers.free.name", "Free"),
      price: "$0",
      features: [
        {
          name: t("subscription.features.books.free", "10 books"),
          included: true,
        },
        {
          name: t("subscription.features.ai.free", "5 AI guides/month"),
          included: true,
        },
        {
          name: t("subscription.features.flashcards.free", "100 flashcards"),
          included: true,
        },
        {
          name: t("subscription.features.tts.free", "Basic TTS"),
          included: true,
        },
        {
          name: t("subscription.features.downloads", "TTS Downloads"),
          included: false,
        },
        {
          name: t("subscription.features.support.priority", "Priority Support"),
          included: false,
        },
      ],
      color: "default",
      icon: <CancelIcon />,
    },
    PRO: {
      name: t("subscription.tiers.pro.name", "Pro"),
      price: "$9.99",
      priceAnnual: "$99/year",
      features: [
        {
          name: t("subscription.features.books.unlimited", "Unlimited books"),
          included: true,
        },
        {
          name: t("subscription.features.ai.unlimited", "Unlimited AI guides"),
          included: true,
        },
        {
          name: t(
            "subscription.features.flashcards.unlimited",
            "Unlimited flashcards"
          ),
          included: true,
        },
        {
          name: t("subscription.features.tts.openai", "OpenAI TTS Voices"),
          included: true,
        },
        {
          name: t(
            "subscription.features.downloads.pro",
            "5 TTS downloads/month"
          ),
          included: true,
        },
        {
          name: t("subscription.features.support.priority", "Priority Support"),
          included: true,
        },
      ],
      color: "primary",
      icon: <StarIcon />,
    },
    SCHOLAR: {
      name: t("subscription.tiers.scholar.name", "Scholar"),
      price: "$29.99",
      priceAnnual: "$299/year",
      features: [
        {
          name: t("subscription.features.books.unlimited", "Unlimited books"),
          included: true,
        },
        {
          name: t("subscription.features.ai.unlimited", "Unlimited AI guides"),
          included: true,
        },
        {
          name: t(
            "subscription.features.flashcards.unlimited",
            "Unlimited flashcards"
          ),
          included: true,
        },
        {
          name: t(
            "subscription.features.tts.elevenlabs",
            "ElevenLabs Premium Voices"
          ),
          included: true,
        },
        {
          name: t(
            "subscription.features.downloads.unlimited",
            "Unlimited TTS downloads"
          ),
          included: true,
        },
        {
          name: t(
            "subscription.features.support.premium",
            "Premium 1-on-1 Support"
          ),
          included: true,
        },
        {
          name: t("subscription.features.custom", "Custom themes & features"),
          included: true,
        },
      ],
      color: "secondary",
      icon: <ScholarIcon />,
    },
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleUpgrade = (tier: "PRO" | "SCHOLAR") => {
    const successUrl = `${window.location.origin}/settings/subscription?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${window.location.origin}/settings/subscription`;

    createCheckoutSession.mutate({
      tier,
      successUrl,
      cancelUrl,
    });
  };

  const handleManageBilling = () => {
    const returnUrl = `${window.location.origin}/settings/subscription`;

    createBillingPortal.mutate({
      returnUrl,
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        {t("settings.subscription")}
      </Typography>

      {showSuccessMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t(
            "subscription.upgradeSuccess",
            "Subscription updated successfully! Your new features are now available."
          )}
        </Alert>
      )}

      {/* Current Subscription */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              {t("subscription.currentPlan", "Current Plan")}
            </Typography>
            <Chip
              label={tiers[currentTier].name}
              color={tiers[currentTier].color}
              icon={tiers[currentTier].icon}
            />
          </Stack>

          {currentTier !== "FREE" && (
            <>
              <Divider sx={{ my: 2 }} />
              <Button
                variant="outlined"
                onClick={handleManageBilling}
                disabled={createBillingPortal.isPending}
              >
                {createBillingPortal.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  t("subscription.manageBilling", "Manage Billing")
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {(currentTier === "FREE" || currentTier === "PRO") && (
        <>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            {t("subscription.upgradePlans", "Upgrade Your Plan")}
          </Typography>

          <Grid container spacing={3}>
            {/* Pro Tier */}
            {currentTier === "FREE" && (
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    height: "100%",
                    border: 2,
                    borderColor: "primary.main",
                    position: "relative",
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="h5" gutterBottom>
                          {tiers.PRO.name}
                        </Typography>
                        <Typography variant="h3" color="primary">
                          {tiers.PRO.price}
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                          >
                            /month
                          </Typography>
                        </Typography>
                        {tiers.PRO.priceAnnual && (
                          <Typography variant="body2" color="text.secondary">
                            {tiers.PRO.priceAnnual} (save 17%)
                          </Typography>
                        )}
                      </Box>

                      <List dense>
                        {tiers.PRO.features.map((feature, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {feature.included ? (
                                <CheckIcon color="success" fontSize="small" />
                              ) : (
                                <CancelIcon color="disabled" fontSize="small" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={feature.name}
                              primaryTypographyProps={{
                                variant: "body2",
                                color: feature.included
                                  ? "text.primary"
                                  : "text.disabled",
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        fullWidth
                        onClick={() => handleUpgrade("PRO")}
                        disabled={createCheckoutSession.isPending}
                      >
                        {createCheckoutSession.isPending ? (
                          <CircularProgress size={24} />
                        ) : (
                          t("subscription.upgradeToPro", "Upgrade to Pro")
                        )}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Scholar Tier */}
            <Grid item xs={12} md={currentTier === "FREE" ? 6 : 12}>
              <Card
                sx={{
                  height: "100%",
                  border: 2,
                  borderColor: "secondary.main",
                  position: "relative",
                }}
              >
                <Chip
                  label={t("subscription.popular", "Most Popular")}
                  color="secondary"
                  size="small"
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                  }}
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        {tiers.SCHOLAR.name}
                      </Typography>
                      <Typography variant="h3" color="secondary">
                        {tiers.SCHOLAR.price}
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                        >
                          /month
                        </Typography>
                      </Typography>
                      {tiers.SCHOLAR.priceAnnual && (
                        <Typography variant="body2" color="text.secondary">
                          {tiers.SCHOLAR.priceAnnual} (save 17%)
                        </Typography>
                      )}
                    </Box>

                    <List dense>
                      {tiers.SCHOLAR.features.map((feature, index) => (
                        <ListItem key={index} disableGutters>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {feature.included ? (
                              <CheckIcon color="success" fontSize="small" />
                            ) : (
                              <CancelIcon color="disabled" fontSize="small" />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={feature.name}
                            primaryTypographyProps={{
                              variant: "body2",
                              color: feature.included
                                ? "text.primary"
                                : "text.disabled",
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    <Button
                      variant="contained"
                      color="secondary"
                      size="large"
                      fullWidth
                      onClick={() => handleUpgrade("SCHOLAR")}
                      disabled={createCheckoutSession.isPending}
                    >
                      {createCheckoutSession.isPending ? (
                        <CircularProgress size={24} />
                      ) : (
                        t("subscription.upgradeToScholar", "Upgrade to Scholar")
                      )}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Usage Section */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          {t("subscription.usage.title", "Usage")}
        </Typography>
        <UsageIndicator showAll />
      </Box>

      {/* Invoice History Section */}
      {currentTier !== "FREE" && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            {t("subscription.invoices.title", "Invoice History")}
          </Typography>
          <InvoiceHistoryTable />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleManageBilling}
              disabled={createBillingPortal.isPending}
            >
              {createBillingPortal.isPending ? (
                <CircularProgress size={20} />
              ) : (
                t("subscription.manageBilling", "Manage Billing")
              )}
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ============================================================================
// Invoice History Table Component
// ============================================================================

function InvoiceHistoryTable(): React.ReactElement {
  const { t } = useTranslation();
  const { data: invoicesData, isLoading, error } = useInvoices({ limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rectangular" height={48} />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {t("subscription.invoices.error", "Failed to load invoices")}
      </Alert>
    );
  }

  if (!invoicesData?.invoices || invoicesData.invoices.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {t("subscription.invoices.empty", "No invoices yet")}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("subscription.invoices.date", "Date")}</TableCell>
            <TableCell>{t("subscription.invoices.amount", "Amount")}</TableCell>
            <TableCell>{t("subscription.invoices.status", "Status")}</TableCell>
            <TableCell align="right">
              {t("common.moreOptions", "Actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoicesData.invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                {new Date(invoice.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>{invoice.amount}</TableCell>
              <TableCell>
                <Chip
                  label={formatInvoiceStatus(invoice.status)}
                  color={getInvoiceStatusColor(invoice.status)}
                  size="small"
                />
              </TableCell>
              <TableCell align="right">
                {invoice.pdfUrl && (
                  <Tooltip
                    title={t("subscription.invoices.download", "Download")}
                  >
                    <IconButton
                      size="small"
                      component="a"
                      href={invoice.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {invoice.hostedUrl && (
                  <Tooltip
                    title={t(
                      "subscription.invoices.viewInvoice",
                      "View Invoice"
                    )}
                  >
                    <IconButton
                      size="small"
                      component="a"
                      href={invoice.hostedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default SettingsSubscriptionPage;
