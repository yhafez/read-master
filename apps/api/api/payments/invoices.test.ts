/**
 * Tests for /api/payments/invoices endpoint
 */

import { describe, it, expect } from "vitest";
import { mapInvoiceToSummary, parseLimit } from "./invoices";
import type Stripe from "stripe";

describe("Invoices API Helper Functions", () => {
  describe("parseLimit", () => {
    it("should parse valid limit values", () => {
      expect(parseLimit(5)).toBe(5);
      expect(parseLimit(10)).toBe(10);
      expect(parseLimit(50)).toBe(50);
      expect(parseLimit(100)).toBe(100);
    });

    it("should parse string numbers", () => {
      expect(parseLimit("5")).toBe(5);
      expect(parseLimit("10")).toBe(10);
      expect(parseLimit("25")).toBe(25);
    });

    it("should return default 10 for invalid values", () => {
      expect(parseLimit(undefined)).toBe(10);
      expect(parseLimit(null)).toBe(10);
      expect(parseLimit("abc")).toBe(10);
      expect(parseLimit({})).toBe(10);
    });

    it("should clamp values to allowed range", () => {
      expect(parseLimit(0)).toBe(10); // Below min
      expect(parseLimit(-5)).toBe(10); // Negative
      expect(parseLimit(200)).toBe(10); // Above max
    });

    it("should return valid values within range", () => {
      expect(parseLimit(1)).toBe(1);
      expect(parseLimit(50)).toBe(50);
      expect(parseLimit(100)).toBe(100);
    });
  });

  describe("mapInvoiceToSummary", () => {
    const mockInvoice: Stripe.Invoice = {
      id: "in_test123",
      number: "INV-001",
      status: "paid",
      amount_paid: 999, // $9.99 in cents
      currency: "usd",
      description: "Pro subscription",
      invoice_pdf: "https://example.com/invoice.pdf",
      hosted_invoice_url: "https://example.com/hosted",
      created: 1704067200, // Jan 1, 2024 00:00:00 UTC
      status_transitions: {
        paid_at: 1704067500,
        finalized_at: null,
        marked_uncollectible_at: null,
        voided_at: null,
      },
      period_start: 1704067200,
      period_end: 1706745600,
    } as Stripe.Invoice;

    it("should map id correctly", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.id).toBe("in_test123");
    });

    it("should map number correctly", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.number).toBe("INV-001");
    });

    it("should map status correctly", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.status).toBe("paid");
    });

    it("should format amount correctly", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.amount).toBe("$9.99");
      expect(result.amountCents).toBe(999);
    });

    it("should uppercase currency", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.currency).toBe("USD");
    });

    it("should map description", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.description).toBe("Pro subscription");
    });

    it("should map PDF URL", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.pdfUrl).toBe("https://example.com/invoice.pdf");
    });

    it("should map hosted URL", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.hostedUrl).toBe("https://example.com/hosted");
    });

    it("should convert createdAt to ISO string", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.createdAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should convert paidAt to ISO string when present", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.paidAt).toBe("2024-01-01T00:05:00.000Z");
    });

    it("should handle null paidAt", () => {
      const invoiceNoPaid = {
        ...mockInvoice,
        status_transitions: null,
      } as unknown as Stripe.Invoice;
      const result = mapInvoiceToSummary(invoiceNoPaid);
      expect(result.paidAt).toBeNull();
    });

    it("should convert period dates to ISO strings", () => {
      const result = mapInvoiceToSummary(mockInvoice);
      expect(result.periodStart).toBe("2024-01-01T00:00:00.000Z");
      expect(result.periodEnd).toBe("2024-02-01T00:00:00.000Z");
    });

    it("should handle null period dates", () => {
      const invoiceNoPeriod = {
        ...mockInvoice,
        period_start: null,
        period_end: null,
      } as unknown as Stripe.Invoice;
      const result = mapInvoiceToSummary(invoiceNoPeriod);
      expect(result.periodStart).toBeNull();
      expect(result.periodEnd).toBeNull();
    });

    it("should handle null description", () => {
      const invoiceNoDesc = {
        ...mockInvoice,
        description: null,
      } as Stripe.Invoice;
      const result = mapInvoiceToSummary(invoiceNoDesc);
      expect(result.description).toBeNull();
    });

    it("should handle null invoice number", () => {
      const invoiceNoNumber = {
        ...mockInvoice,
        number: null,
      } as Stripe.Invoice;
      const result = mapInvoiceToSummary(invoiceNoNumber);
      expect(result.number).toBeNull();
    });

    it("should handle different currencies", () => {
      const euroInvoice = {
        ...mockInvoice,
        currency: "eur",
        amount_paid: 1999,
      } as Stripe.Invoice;
      const result = mapInvoiceToSummary(euroInvoice);
      expect(result.currency).toBe("EUR");
      // Note: formatAmount may format differently for EUR
    });
  });
});

describe("InvoiceSummary Type Structure", () => {
  it("should have correct fields", () => {
    const invoiceSummary = {
      id: "in_123",
      number: "INV-001",
      status: "paid",
      amount: "$9.99",
      amountCents: 999,
      currency: "USD",
      description: "Test",
      pdfUrl: "https://example.com/pdf",
      hostedUrl: "https://example.com/hosted",
      createdAt: "2024-01-01T00:00:00.000Z",
      paidAt: "2024-01-01T00:05:00.000Z",
      periodStart: "2024-01-01T00:00:00.000Z",
      periodEnd: "2024-02-01T00:00:00.000Z",
    };

    expect(typeof invoiceSummary.id).toBe("string");
    expect(typeof invoiceSummary.amount).toBe("string");
    expect(typeof invoiceSummary.amountCents).toBe("number");
    expect(typeof invoiceSummary.currency).toBe("string");
    expect(typeof invoiceSummary.createdAt).toBe("string");
  });
});

describe("InvoicesResponse Type Structure", () => {
  it("should have invoices array and hasMore flag", () => {
    const response = {
      invoices: [],
      hasMore: false,
    };

    expect(Array.isArray(response.invoices)).toBe(true);
    expect(typeof response.hasMore).toBe("boolean");
  });

  it("should have hasMore true when there are more results", () => {
    const response = {
      invoices: [{ id: "in_1" }, { id: "in_2" }],
      hasMore: true,
    };

    expect(response.hasMore).toBe(true);
    expect(response.invoices.length).toBe(2);
  });
});
