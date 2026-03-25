import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { LoginCard } from "./LoginCard";

type AuthFormData = {
  email: string;
  password: string;
};

function LoginCardHarness(props: { onRegister: (v: AuthFormData) => void; onLogin: (v: AuthFormData) => void }) {
  const authForm = useForm<AuthFormData>({
    defaultValues: { email: "", password: "" }
  });

  return <LoginCard authForm={authForm} onRegister={props.onRegister} onLogin={props.onLogin} />;
}

describe("LoginCard", () => {
  it("calls onLogin with form values on submit", async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();
    const onLogin = vi.fn();

    render(<LoginCardHarness onRegister={onRegister} onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText("Email"), "teacher@example.com");
    await user.type(screen.getByPlaceholderText("Senha"), "secret");

    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(onLogin.mock.calls[0]?.[0]).toEqual({ email: "teacher@example.com", password: "secret" });
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("calls onRegister with form values when clicking 'Registrar'", async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn();
    const onLogin = vi.fn();

    render(<LoginCardHarness onRegister={onRegister} onLogin={onLogin} />);

    await user.type(screen.getByPlaceholderText("Email"), "teacher2@example.com");
    await user.type(screen.getByPlaceholderText("Senha"), "secret2");

    await user.click(screen.getByRole("button", { name: "Registrar" }));
    expect(onRegister).toHaveBeenCalledTimes(1);
    expect(onRegister.mock.calls[0]?.[0]).toEqual({ email: "teacher2@example.com", password: "secret2" });
    expect(onLogin).not.toHaveBeenCalled();
  });
});

