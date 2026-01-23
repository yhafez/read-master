/**
 * ScreenReaderText Component Tests
 *
 * Tests for screen reader accessibility components.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ScreenReaderText,
  ScreenReaderAnnounce,
  DescribedBy,
  LabelledBy,
  StatusMessage,
  AlertMessage,
  ProgressAnnounce,
} from "./ScreenReaderText";

describe("ScreenReaderText", () => {
  it("renders children content", () => {
    render(<ScreenReaderText>Hidden text for screen readers</ScreenReaderText>);

    expect(
      screen.getByText("Hidden text for screen readers")
    ).toBeInTheDocument();
  });

  it("applies visually hidden styles", () => {
    const { container } = render(
      <ScreenReaderText>Hidden text</ScreenReaderText>
    );

    const element = container.querySelector("span");
    expect(element).toHaveStyle({
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
    });
  });

  it("renders as different HTML elements", () => {
    const { container } = render(
      <ScreenReaderText as="h1">Screen reader heading</ScreenReaderText>
    );

    expect(container.querySelector("h1")).toBeInTheDocument();
    expect(container.querySelector("h1")).toHaveTextContent(
      "Screen reader heading"
    );
  });

  it("defaults to span element", () => {
    const { container } = render(
      <ScreenReaderText>Default span</ScreenReaderText>
    );

    expect(container.querySelector("span")).toBeInTheDocument();
  });
});

describe("ScreenReaderAnnounce", () => {
  it("renders with role=status by default", () => {
    render(<ScreenReaderAnnounce>Status message</ScreenReaderAnnounce>);

    const element = screen.getByRole("status");
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent("Status message");
  });

  it("renders with aria-live=polite by default", () => {
    render(<ScreenReaderAnnounce>Polite message</ScreenReaderAnnounce>);

    const element = screen.getByRole("status");
    expect(element).toHaveAttribute("aria-live", "polite");
  });

  it("renders with aria-live=assertive when specified", () => {
    render(
      <ScreenReaderAnnounce politeness="assertive">
        Assertive message
      </ScreenReaderAnnounce>
    );

    const element = screen.getByRole("status");
    expect(element).toHaveAttribute("aria-live", "assertive");
  });

  it("renders with aria-atomic=true by default", () => {
    render(<ScreenReaderAnnounce>Atomic message</ScreenReaderAnnounce>);

    const element = screen.getByRole("status");
    expect(element).toHaveAttribute("aria-atomic", "true");
  });

  it("renders with custom role", () => {
    render(
      <ScreenReaderAnnounce role="alert">Alert message</ScreenReaderAnnounce>
    );

    const element = screen.getByRole("alert");
    expect(element).toBeInTheDocument();
  });
});

describe("DescribedBy", () => {
  it("renders with the specified id", () => {
    const { container } = render(
      <DescribedBy id="my-description">Description text</DescribedBy>
    );

    const element = container.querySelector("#my-description");
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent("Description text");
  });

  it("is visually hidden", () => {
    const { container } = render(
      <DescribedBy id="hidden-desc">Hidden description</DescribedBy>
    );

    const element = container.querySelector("#hidden-desc");
    expect(element).toHaveStyle({
      position: "absolute",
      width: "1px",
      height: "1px",
    });
  });

  it("can be referenced by aria-describedby", () => {
    render(
      <>
        <input aria-describedby="password-hint" />
        <DescribedBy id="password-hint">
          Password must be at least 8 characters
        </DescribedBy>
      </>
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-describedby", "password-hint");
    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
  });
});

describe("LabelledBy", () => {
  it("renders with the specified id", () => {
    const { container } = render(
      <LabelledBy id="my-label">Label text</LabelledBy>
    );

    const element = container.querySelector("#my-label");
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent("Label text");
  });

  it("is visually hidden", () => {
    const { container } = render(
      <LabelledBy id="hidden-label">Hidden label</LabelledBy>
    );

    const element = container.querySelector("#hidden-label");
    expect(element).toHaveStyle({
      position: "absolute",
      width: "1px",
      height: "1px",
    });
  });
});

describe("StatusMessage", () => {
  it("renders with role=status", () => {
    render(<StatusMessage>Status update</StatusMessage>);

    const element = screen.getByRole("status");
    expect(element).toBeInTheDocument();
  });

  it("renders with aria-live=polite", () => {
    render(<StatusMessage>Polite status</StatusMessage>);

    const element = screen.getByRole("status");
    expect(element).toHaveAttribute("aria-live", "polite");
  });

  it("is visually hidden by default", () => {
    render(<StatusMessage>Hidden status</StatusMessage>);

    const element = screen.getByRole("status");
    expect(element).toHaveStyle({
      position: "absolute",
    });
  });

  it("can be made visible", () => {
    render(<StatusMessage visible>Visible status</StatusMessage>);

    const element = screen.getByRole("status");
    // When visible=true, visually hidden styles are not applied
    expect(element).not.toHaveStyle({
      position: "absolute",
      width: "1px",
    });
  });
});

describe("AlertMessage", () => {
  it("renders with role=alert", () => {
    render(<AlertMessage>Alert message</AlertMessage>);

    const element = screen.getByRole("alert");
    expect(element).toBeInTheDocument();
  });

  it("renders with aria-live=assertive", () => {
    render(<AlertMessage>Assertive alert</AlertMessage>);

    const element = screen.getByRole("alert");
    expect(element).toHaveAttribute("aria-live", "assertive");
  });

  it("is visually hidden by default", () => {
    render(<AlertMessage>Hidden alert</AlertMessage>);

    const element = screen.getByRole("alert");
    expect(element).toHaveStyle({
      position: "absolute",
    });
  });

  it("can be made visible when flag is set", () => {
    render(<AlertMessage visible>Visible alert</AlertMessage>);

    const element = screen.getByRole("alert");
    expect(element).not.toHaveStyle({
      position: "absolute",
      width: "1px",
    });
  });
});

describe("ProgressAnnounce", () => {
  it("renders with role=progressbar", () => {
    render(<ProgressAnnounce value={50} />);

    const element = screen.getByRole("progressbar");
    expect(element).toBeInTheDocument();
  });

  it("sets aria-valuenow to current value", () => {
    render(<ProgressAnnounce value={75} />);

    const element = screen.getByRole("progressbar");
    expect(element).toHaveAttribute("aria-valuenow", "75");
  });

  it("sets aria-valuemin to 0", () => {
    render(<ProgressAnnounce value={50} />);

    const element = screen.getByRole("progressbar");
    expect(element).toHaveAttribute("aria-valuemin", "0");
  });

  it("sets aria-valuemax to default of 100", () => {
    render(<ProgressAnnounce value={50} />);

    const element = screen.getByRole("progressbar");
    expect(element).toHaveAttribute("aria-valuemax", "100");
  });

  it("sets aria-valuemax to custom value", () => {
    render(<ProgressAnnounce value={50} max={200} />);

    const element = screen.getByRole("progressbar");
    expect(element).toHaveAttribute("aria-valuemax", "200");
  });

  it("calculates percentage correctly", () => {
    render(<ProgressAnnounce value={50} max={100} />);

    expect(screen.getByText("50% complete")).toBeInTheDocument();
  });

  it("includes label in text", () => {
    render(<ProgressAnnounce value={75} label="File upload" />);

    expect(screen.getByText("File upload: 75% complete")).toBeInTheDocument();
  });

  it("is visually hidden", () => {
    render(<ProgressAnnounce value={50} />);

    const element = screen.getByRole("progressbar");
    expect(element).toHaveStyle({
      position: "absolute",
    });
  });
});
