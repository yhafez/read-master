/**
 * AI Model Selector component
 *
 * Provides UI for:
 * - Selecting AI provider (Anthropic, OpenAI, Google, Ollama)
 * - Choosing specific model
 * - Viewing model details and pricing
 * - Cost estimation calculator
 * - Model comparison
 */

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
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CompareIcon from "@mui/icons-material/Compare";
import SpeedIcon from "@mui/icons-material/Speed";
import StarIcon from "@mui/icons-material/Star";
import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  useAIModels,
  useAIModelPreferences,
  useUpdateModelPreferences,
  useSetActiveModel,
  useModelComparison,
  useTestModelConnection,
  calculateModelCost,
  formatCost,
  estimateTokens,
  AI_MODELS_CATALOG,
  type AIProvider,
  type AIModelDefinition,
  type ModelTier,
} from "@/hooks/useAIModels";

// =============================================================================
// Types
// =============================================================================

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// =============================================================================
// Helper Components
// =============================================================================

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`model-tabpanel-${index}`}
      aria-labelledby={`model-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

/**
 * Provider icon/logo component
 */
function ProviderIcon({ provider }: { provider: AIProvider }) {
  const colors: Record<AIProvider, string> = {
    anthropic: "#D97706",
    openai: "#10A37F",
    google: "#4285F4",
    ollama: "#1F2937",
  };

  const labels: Record<AIProvider, string> = {
    anthropic: "A",
    openai: "O",
    google: "G",
    ollama: "L",
  };

  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        bgcolor: colors[provider],
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.75rem",
        fontWeight: "bold",
      }}
    >
      {labels[provider]}
    </Box>
  );
}

/**
 * Model card component for grid view
 */
interface ModelCardProps {
  model: AIModelDefinition;
  isSelected: boolean;
  userTier: ModelTier;
  onSelect: (modelId: string, provider: AIProvider) => void;
}

function ModelCard({
  model,
  isSelected,
  userTier,
  onSelect,
}: ModelCardProps): React.ReactElement {
  const { t } = useTranslation();
  const tierOrder: Record<ModelTier, number> = { free: 0, pro: 1, scholar: 2 };
  const canUse = tierOrder[userTier] >= tierOrder[model.tier];

  return (
    <Card
      sx={{
        height: "100%",
        cursor: canUse ? "pointer" : "not-allowed",
        opacity: canUse ? 1 : 0.6,
        border: isSelected ? 2 : 1,
        borderColor: isSelected ? "primary.main" : "divider",
        transition: "all 0.2s ease-in-out",
        "&:hover": canUse
          ? {
              borderColor: "primary.light",
              transform: "translateY(-2px)",
            }
          : undefined,
      }}
      onClick={() => canUse && onSelect(model.id, model.provider)}
    >
      <CardContent>
        <Stack spacing={1.5}>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <ProviderIcon provider={model.provider} />
              <Typography variant="subtitle1" fontWeight="bold">
                {model.name}
              </Typography>
            </Box>
            {isSelected && <CheckCircleIcon color="primary" fontSize="small" />}
          </Box>

          {/* Description */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ minHeight: 40 }}
          >
            {model.description}
          </Typography>

          {/* Tags */}
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            {model.recommended && (
              <Chip
                label={t("settings.aiModels.recommended")}
                size="small"
                color="primary"
                icon={<StarIcon />}
              />
            )}
            {model.capabilities.includes("fast") && (
              <Chip
                label={t("settings.aiModels.fast")}
                size="small"
                variant="outlined"
                icon={<SpeedIcon />}
              />
            )}
            {model.tier !== "free" && (
              <Chip
                label={model.tier.toUpperCase()}
                size="small"
                color={model.tier === "scholar" ? "secondary" : "default"}
              />
            )}
          </Box>

          {/* Pricing */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("settings.aiModels.pricing")}
            </Typography>
            <Typography variant="body2">
              ${model.pricing.input}/M in | ${model.pricing.output}/M out
            </Typography>
          </Box>

          {/* Context Window */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("settings.aiModels.contextWindow")}
            </Typography>
            <Typography variant="body2">
              {(model.contextWindow / 1000).toLocaleString()}K tokens
            </Typography>
          </Box>

          {!canUse && (
            <Alert severity="info" sx={{ py: 0.5, px: 1 }}>
              <Typography variant="caption">
                {t("settings.aiModels.requiresTier", { tier: model.tier })}
              </Typography>
            </Alert>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Cost Calculator Component
// =============================================================================

interface CostCalculatorProps {
  selectedModelId: string;
}

function CostCalculator({
  selectedModelId,
}: CostCalculatorProps): React.ReactElement {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState("");
  const [outputTokens, setOutputTokens] = useState(500);

  const inputTokens = useMemo(() => estimateTokens(inputText), [inputText]);
  const cost = useMemo(
    () => calculateModelCost(selectedModelId, inputTokens, outputTokens),
    [selectedModelId, inputTokens, outputTokens]
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t("settings.aiModels.costCalculator.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("settings.aiModels.costCalculator.description")}
        </Typography>

        <Stack spacing={3}>
          {/* Input text field */}
          <TextField
            label={t("settings.aiModels.costCalculator.inputText")}
            multiline
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t("settings.aiModels.costCalculator.inputPlaceholder")}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" color="text.secondary">
                    ~{inputTokens} tokens
                  </Typography>
                </InputAdornment>
              ),
            }}
          />

          {/* Output tokens slider */}
          <Box>
            <Typography gutterBottom>
              {t("settings.aiModels.costCalculator.expectedOutput")}:{" "}
              {outputTokens} tokens
            </Typography>
            <Slider
              value={outputTokens}
              onChange={(_, value) => setOutputTokens(value as number)}
              min={100}
              max={8000}
              step={100}
              marks={[
                { value: 100, label: "100" },
                { value: 2000, label: "2K" },
                { value: 4000, label: "4K" },
                { value: 8000, label: "8K" },
              ]}
            />
          </Box>

          {/* Cost breakdown */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1}>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.aiModels.costCalculator.inputCost")}:
                </Typography>
                <Typography variant="body2">
                  {formatCost(cost.costs.inputCost)}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  {t("settings.aiModels.costCalculator.outputCost")}:
                </Typography>
                <Typography variant="body2">
                  {formatCost(cost.costs.outputCost)}
                </Typography>
              </Box>
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" fontWeight="bold">
                  {t("settings.aiModels.costCalculator.totalCost")}:
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary">
                  {cost.formattedCost}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Model Comparison Component
// =============================================================================

interface ModelComparisonDialogProps {
  open: boolean;
  onClose: () => void;
  selectedModels: string[];
}

function ModelComparisonDialog({
  open,
  onClose,
  selectedModels,
}: ModelComparisonDialogProps): React.ReactElement {
  const { t } = useTranslation();
  const { data: comparison, isLoading } = useModelComparison(selectedModels, {
    enabled: open && selectedModels.length >= 2,
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{t("settings.aiModels.comparison.title")}</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {comparison && (
          <Stack spacing={3}>
            {/* Recommendation summary */}
            <Alert severity="info">
              <Typography variant="body2">
                <strong>
                  {t("settings.aiModels.comparison.bestOverall")}:
                </strong>{" "}
                {comparison.recommendation.bestOverall}
                <br />
                <strong>
                  {t("settings.aiModels.comparison.bestValue")}:
                </strong>{" "}
                {comparison.recommendation.bestValue}
                <br />
                <strong>
                  {t("settings.aiModels.comparison.bestQuality")}:
                </strong>{" "}
                {comparison.recommendation.bestQuality}
              </Typography>
            </Alert>

            {/* Comparison table */}
            <Box sx={{ overflowX: "auto" }}>
              <Grid container spacing={2}>
                {comparison.models.map((model) => (
                  <Grid item xs={12} md={6} key={model.modelId}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Stack spacing={1}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <ProviderIcon provider={model.provider} />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {model.name}
                          </Typography>
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t("settings.aiModels.comparison.costScore")}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={model.costScore * 10}
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t("settings.aiModels.comparison.speedScore")}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={model.speedScore * 10}
                            color="secondary"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            {t("settings.aiModels.comparison.qualityScore")}
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={model.qualityScore * 10}
                            color="success"
                            sx={{ height: 8, borderRadius: 1 }}
                          />
                        </Box>

                        <Typography variant="body2" color="text.secondary">
                          ${model.pricing.input}/M in | ${model.pricing.output}
                          /M out
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.close")}</Button>
      </DialogActions>
    </Dialog>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export interface AIModelSelectorProps {
  userTier?: ModelTier;
}

export function AIModelSelector({
  userTier = "free",
}: AIModelSelectorProps): React.ReactElement {
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(0);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(
    []
  );

  // Queries and mutations
  const { data: models = [] } = useAIModels();
  const { data: preferences } = useAIModelPreferences();
  const updatePreferences = useUpdateModelPreferences();
  const setActiveModel = useSetActiveModel();
  const testConnection = useTestModelConnection();

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    const grouped: Record<AIProvider, AIModelDefinition[]> = {
      anthropic: [],
      openai: [],
      google: [],
      ollama: [],
    };
    models.forEach((model) => {
      grouped[model.provider].push(model);
    });
    return grouped;
  }, [models]);

  // Handlers
  const handleTabChange = useCallback(
    (_: React.SyntheticEvent, newValue: number) => {
      setTabValue(newValue);
    },
    []
  );

  const handleSelectModel = useCallback(
    (modelId: string, provider: AIProvider) => {
      setActiveModel.mutate({ modelId, provider });
    },
    [setActiveModel]
  );

  const handleProviderChange = useCallback(
    (event: SelectChangeEvent<string>) => {
      const provider = event.target.value as AIProvider;
      const firstModel = modelsByProvider[provider][0];
      if (firstModel) {
        handleSelectModel(firstModel.id, provider);
      }
    },
    [modelsByProvider, handleSelectModel]
  );

  const handleAutoSelectToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updatePreferences.mutate({ autoSelect: event.target.checked });
    },
    [updatePreferences]
  );

  const handleCostWarningsToggle = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      updatePreferences.mutate({ showCostWarnings: event.target.checked });
    },
    [updatePreferences]
  );

  const handleTestConnection = useCallback(() => {
    if (preferences?.modelId && preferences?.provider) {
      testConnection.mutate({
        modelId: preferences.modelId,
        provider: preferences.provider,
      });
    }
  }, [preferences, testConnection]);

  const handleToggleCompare = useCallback((modelId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= 4) {
        return prev;
      }
      return [...prev, modelId];
    });
  }, []);

  const providers: AIProvider[] = ["anthropic", "openai", "google", "ollama"];
  const providerLabels: Record<AIProvider, string> = {
    anthropic: "Anthropic (Claude)",
    openai: "OpenAI (GPT)",
    google: "Google (Gemini)",
    ollama: "Ollama (Local)",
  };

  return (
    <Card>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box>
            <Typography variant="h6" gutterBottom>
              {t("settings.aiModels.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("settings.aiModels.description")}
            </Typography>
          </Box>

          {/* Quick Settings */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* Provider selector */}
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="provider-select-label">
                {t("settings.aiModels.provider")}
              </InputLabel>
              <Select
                labelId="provider-select-label"
                value={preferences?.provider ?? "anthropic"}
                label={t("settings.aiModels.provider")}
                onChange={handleProviderChange}
              >
                {providers.map((provider) => (
                  <MenuItem key={provider} value={provider}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ProviderIcon provider={provider} />
                      {providerLabels[provider]}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Actions */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<CompareIcon />}
                onClick={() => setCompareDialogOpen(true)}
                disabled={selectedForComparison.length < 2}
              >
                {t("settings.aiModels.compare")} ({selectedForComparison.length}
                )
              </Button>
              <Button
                variant="outlined"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <CircularProgress size={20} />
                ) : (
                  t("settings.aiModels.testConnection")
                )}
              </Button>
            </Stack>
          </Box>

          {/* Test connection result */}
          {testConnection.data && (
            <Alert
              severity={testConnection.data.success ? "success" : "error"}
              onClose={() => testConnection.reset()}
            >
              {testConnection.data.success
                ? t("settings.aiModels.connectionSuccess", {
                    time: testConnection.data.responseTimeMs,
                  })
                : testConnection.data.error}
            </Alert>
          )}

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab
                label={t("settings.aiModels.tabs.models")}
                id="model-tab-0"
                aria-controls="model-tabpanel-0"
              />
              <Tab
                label={t("settings.aiModels.tabs.calculator")}
                id="model-tab-1"
                aria-controls="model-tabpanel-1"
              />
              <Tab
                label={t("settings.aiModels.tabs.settings")}
                id="model-tab-2"
                aria-controls="model-tabpanel-2"
              />
            </Tabs>
          </Box>

          {/* Models Tab */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={2}>
              {models.map((model) => (
                <Grid item xs={12} sm={6} md={4} key={model.id}>
                  <Box sx={{ position: "relative" }}>
                    <ModelCard
                      model={model}
                      isSelected={preferences?.modelId === model.id}
                      userTier={userTier}
                      onSelect={handleSelectModel}
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleCompare(model.id);
                      }}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        bgcolor: selectedForComparison.includes(model.id)
                          ? "primary.main"
                          : "background.paper",
                        color: selectedForComparison.includes(model.id)
                          ? "white"
                          : "text.secondary",
                        "&:hover": {
                          bgcolor: selectedForComparison.includes(model.id)
                            ? "primary.dark"
                            : "action.hover",
                        },
                      }}
                    >
                      <CompareIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Calculator Tab */}
          <TabPanel value={tabValue} index={1}>
            <CostCalculator
              selectedModelId={
                preferences?.modelId ?? "claude-3-5-sonnet-20241022"
              }
            />
          </TabPanel>

          {/* Settings Tab */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={2}>
              {/* Auto-select model */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body1">
                    {t("settings.aiModels.settings.autoSelect")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("settings.aiModels.settings.autoSelectDescription")}
                  </Typography>
                </Box>
                <Switch
                  checked={preferences?.autoSelect ?? false}
                  onChange={handleAutoSelectToggle}
                />
              </Box>

              <Divider />

              {/* Show cost warnings */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body1">
                    {t("settings.aiModels.settings.costWarnings")}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("settings.aiModels.settings.costWarningsDescription")}
                  </Typography>
                </Box>
                <Switch
                  checked={preferences?.showCostWarnings ?? true}
                  onChange={handleCostWarningsToggle}
                />
              </Box>

              {/* Current model info */}
              <Divider />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("settings.aiModels.settings.currentModel")}
                </Typography>
                {preferences?.modelId && (
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body1" fontWeight="medium">
                      {AI_MODELS_CATALOG.find(
                        (m) => m.id === preferences.modelId
                      )?.name ?? preferences.modelId}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {
                        AI_MODELS_CATALOG.find(
                          (m) => m.id === preferences.modelId
                        )?.description
                      }
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Stack>
          </TabPanel>
        </Stack>
      </CardContent>

      {/* Comparison Dialog */}
      <ModelComparisonDialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        selectedModels={selectedForComparison}
      />
    </Card>
  );
}

export default AIModelSelector;
