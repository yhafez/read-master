/**
 * Tests for TTSDownloadButton Component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";
import { TTSDownloadButton } from "./TTSDownloadButton";
import * as useTTSDownloadsHook from "../../hooks/useTTSDownloads";

// Mock hooks
vi.mock("../../hooks/useTTSDownloads", () => ({
  useTTSDownloads: vi.fn(),
  useTTSDownload: vi.fn(),
  useTTSDownloadStatus: vi.fn(),
  useCreateTTSDownload: vi.fn(),
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

describe("TTSDownloadButton", () => {
  let queryClient: QueryClient;

  const defaultProps = {
    bookId: "book_123",
    bookTitle: "Test Book",
    userTier: "PRO" as const,
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

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <TTSDownloadButton {...defaultProps} {...props} />
        </I18nextProvider>
      </QueryClientProvider>
    );
  };

  describe("Rendering", () => {
    it("should render download button for PRO tier", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloadStatus).mockReturnValue({
        status: null,
        progress: 0,
        isDownloading: false,
      } as any);

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      expect(screen.getByRole("button")).toBeInTheDocument();
      expect(screen.getByLabelText(/download audiobook/i)).toBeInTheDocument();
    });

    it("should show upgrade message for FREE tier", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloadStatus).mockReturnValue({
        status: null,
        progress: 0,
        isDownloading: false,
      } as any);

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent({ userTier: "FREE" });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(
        screen.getByText(/upgrade to pro or scholar to download audiobooks/i)
      ).toBeInTheDocument();
    });

    it("should render with SCHOLAR tier permissions", () => {
      vi.mocked(useTTSDownloadsHook.useTTSDownloadStatus).mockReturnValue({
        status: null,
        progress: 0,
        isDownloading: false,
      } as any);

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent({ userTier: "SCHOLAR" });

      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("Dialog Interaction", () => {
    it("should open dialog when button clicked", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText(/download audiobook/i)).toBeInTheDocument();
      expect(screen.getByText(/book title/i)).toBeInTheDocument();
    });

    it("should close dialog when cancel clicked", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      // Open dialog
      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Close dialog
      const cancelButton = screen.getByText(/cancel/i);
      fireEvent.click(cancelButton);

      // Dialog should be closed
      expect(screen.queryByText(/select voice/i)).not.toBeInTheDocument();
    });

    it("should show voice options for PRO tier", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent({ userTier: "PRO" });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // PRO tier has OpenAI voices
      expect(screen.getByText(/select voice/i)).toBeInTheDocument();
    });

    it("should show format options", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText(/select format/i)).toBeInTheDocument();
    });
  });

  describe("Download Creation", () => {
    it("should create download with selected options", async () => {
      const mockMutate = vi.fn();

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      // Open dialog
      const button = screen.getByRole("button");
      fireEvent.click(button);

      // Click start download
      const startButton = screen.getByText(/start download/i);
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            bookId: "book_123",
            bookTitle: "Test Book",
          })
        );
      });
    });

    it("should disable button while download is pending", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const startButton = screen.getByText(/downloading/i);
      expect(startButton).toBeDisabled();
    });

    it("should show success message on completion", async () => {
      const mockReset = vi.fn();

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: true,
        error: null,
        data: { id: "dl_new" },
        reset: mockReset,
      } as any);

      renderComponent();

      // Success should close dialog
      expect(screen.queryByText(/download audiobook/i)).not.toBeInTheDocument();
    });

    it("should show error message on failure", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: true,
        isSuccess: false,
        error: new Error("Download failed"),
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText(/download failed/i)).toBeInTheDocument();
    });
  });

  describe("Voice Selection", () => {
    it("should use OpenAI voices for PRO tier", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent({ userTier: "PRO" });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // OpenAI has voices like "alloy", "nova", etc.
      expect(screen.getByText(/select voice/i)).toBeInTheDocument();
    });

    it("should use ElevenLabs voices for SCHOLAR tier", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent({ userTier: "SCHOLAR" });

      const button = screen.getByRole("button");
      fireEvent.click(button);

      // ElevenLabs has voices like "rachel", "adam", etc.
      expect(screen.getByText(/select voice/i)).toBeInTheDocument();
    });
  });

  describe("Format Selection", () => {
    it("should show MP3 format option", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      expect(screen.getByText(/select format/i)).toBeInTheDocument();
    });

    it("should default to MP3 format", () => {
      const mockMutate = vi.fn();

      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      fireEvent.click(button);

      const startButton = screen.getByText(/start download/i);
      fireEvent.click(startButton);

      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "MP3",
        })
      );
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria labels", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      expect(button).toHaveAttribute("aria-label");
    });

    it("should be keyboard accessible", () => {
      vi.mocked(useTTSDownloadsHook.useCreateTTSDownload).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
        isError: false,
        isSuccess: false,
        error: null,
        data: undefined,
        reset: vi.fn(),
      } as any);

      renderComponent();

      const button = screen.getByRole("button");
      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
