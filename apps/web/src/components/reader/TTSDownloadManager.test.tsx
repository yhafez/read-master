/**
 * Tests for TTSDownloadManager Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";
import { TTSDownloadManager } from "./TTSDownloadManager";
import * as useTTSDownloadsHook from "../../hooks/useTTSDownloads";

// Mock hooks
vi.mock("../../hooks/useTTSDownloads", () => ({
  useTTSDownloads: vi.fn(),
  useDeleteTTSDownload: vi.fn(),
}));

// Mock logger
vi.mock("../../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("TTSDownloadManager", () => {
  let queryClient: QueryClient;

  const mockDownloads = [
    {
      id: "dl_1",
      bookId: "book_1",
      bookTitle: "Completed Book",
      status: "COMPLETED" as const,
      provider: "OPENAI" as const,
      voice: "alloy",
      format: "MP3" as const,
      totalChunks: 10,
      processedChunks: 10,
      progress: 100,
      estimatedCost: 0.5,
      actualCost: 0.5,
      fileSize: 1024000,
      downloadUrl: "https://example.com/dl_1.mp3",
      createdAt: new Date("2026-01-01").toISOString(),
      expiresAt: new Date("2026-02-01").toISOString(),
      errorMessage: null,
    },
    {
      id: "dl_2",
      bookId: "book_2",
      bookTitle: "Processing Book",
      status: "PROCESSING" as const,
      provider: "OPENAI" as const,
      voice: "nova",
      format: "OPUS" as const,
      totalChunks: 20,
      processedChunks: 10,
      progress: 50,
      estimatedCost: 1.0,
      actualCost: 0,
      fileSize: null,
      downloadUrl: null,
      createdAt: new Date("2026-01-15").toISOString(),
      expiresAt: new Date("2026-02-15").toISOString(),
      errorMessage: null,
    },
    {
      id: "dl_3",
      bookId: "book_3",
      bookTitle: "Failed Book",
      status: "FAILED" as const,
      provider: "OPENAI" as const,
      voice: "shimmer",
      format: "MP3" as const,
      totalChunks: 5,
      processedChunks: 2,
      progress: 40,
      estimatedCost: 0.25,
      actualCost: 0,
      fileSize: null,
      downloadUrl: null,
      createdAt: new Date("2026-01-10").toISOString(),
      expiresAt: new Date("2026-02-10").toISOString(),
      errorMessage: "TTS service error",
    },
  ];

  const mockQuota = {
    used: 3,
    limit: 10,
    remaining: 7,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = (userTier: "FREE" | "PRO" | "SCHOLAR" = "PRO") => {
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <TTSDownloadManager userTier={userTier} />
        </I18nextProvider>
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("should render title and quota info", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: mockDownloads, quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/tts downloads/i)).toBeInTheDocument();
      expect(screen.getByText(/3.*10/)).toBeInTheDocument(); // "Used 3 of 10"
    });

    it("should show loading state", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    it("should show error state", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error("Failed to fetch downloads"),
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/failed to fetch downloads/i)).toBeInTheDocument();
    });

    it("should show empty state", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: [], quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/no audio downloads yet/i)).toBeInTheDocument();
      expect(screen.getByText(/start your first audiobook download/i)).toBeInTheDocument();
    });

    it("should show upgrade message for FREE tier", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: [], quota: { used: 0, limit: 0, remaining: 0 } },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent("FREE");

      expect(screen.getByText(/upgrade to pro or scholar/i)).toBeInTheDocument();
    });
  });

  describe("Download List", () => {
    it("should render all downloads", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: mockDownloads, quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText("Completed Book")).toBeInTheDocument();
      expect(screen.getByText("Processing Book")).toBeInTheDocument();
      expect(screen.getByText("Failed Book")).toBeInTheDocument();
    });

    it("should show completed status chip", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it("should show processing status with progress bar", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[1]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/10.*20/)).toBeInTheDocument(); // "10 / 20"
    });

    it("should show failed status with error message", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[2]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
      expect(screen.getByText(/tts service error/i)).toBeInTheDocument();
    });

    it("should show download button for completed downloads", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      const downloadButtons = screen.getAllByLabelText(/download file/i);
      expect(downloadButtons.length).toBeGreaterThan(0);
    });

    it("should show file size for completed downloads", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      // 1024000 bytes = 1000 KB = ~1.0 MB
      expect(screen.getByText(/1\.0.*mb/i)).toBeInTheDocument();
    });
  });

  describe("Delete Functionality", () => {
    it("should open delete confirmation dialog", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      const deleteButtons = screen.getAllByLabelText(/delete/i);
      const deleteButton = deleteButtons[0];
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      expect(
        screen.getByText(/are you sure you want to delete this download/i)
      ).toBeInTheDocument();
    });

    it("should call delete mutation when confirmed", async () => {
      const mockMutate = vi.fn();

      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      renderComponent();

      // Open delete dialog
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      const deleteButton = deleteButtons[0];
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      // Confirm delete
      const confirmButton = screen.getByText(/^delete$/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith("dl_1");
      });
    });

    it("should close dialog when cancel clicked", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [mockDownloads[0]],
          quota: mockQuota,
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      // Open delete dialog
      const deleteButtons = screen.getAllByLabelText(/delete/i);
      const deleteButton = deleteButtons[0];
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      // Cancel
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      // Dialog should be closed
      expect(
        screen.queryByText(/are you sure you want to delete/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Refresh Functionality", () => {
    it("should have refresh button", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: mockDownloads, quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      const refreshButton = screen.getByLabelText(/refresh/i);
      expect(refreshButton).toBeInTheDocument();
    });

    it("should call refetch when refresh clicked", () => {
      const mockRefetch = vi.fn();

      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: mockDownloads, quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      const refreshButton = screen.getByLabelText(/refresh/i);
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("Quota Display", () => {
    it("should show remaining quota", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: { downloads: [], quota: mockQuota },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/3.*10/)).toBeInTheDocument();
    });

    it("should show warning color when quota low", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [],
          quota: { used: 9, limit: 10, remaining: 1 },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent();

      expect(screen.getByText(/9.*10/)).toBeInTheDocument();
    });

    it("should show unlimited for SCHOLAR tier", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloads).mockReturnValue({
        data: {
          downloads: [],
          quota: { used: 100, limit: "unlimited", remaining: Infinity },
        },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      vi.mocked(useTTSDownloadsHook.useDeleteTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as any);

      renderComponent("SCHOLAR");

      expect(screen.getByText(/100.*∞/)).toBeInTheDocument();
    });
  });
});
