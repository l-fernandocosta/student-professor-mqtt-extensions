import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children", () => {
    render(<Badge>Online</Badge>);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("applies variant classes", () => {
    render(<Badge variant="success">Ok</Badge>);
    expect(screen.getByText("Ok")).toHaveClass("bg-[#dff3e7]");
  });
});

