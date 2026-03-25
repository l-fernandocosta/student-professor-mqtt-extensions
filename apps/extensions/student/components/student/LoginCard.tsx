import React from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthFormData = {
  email: string;
  password: string;
};

type LoginCardProps = {
  authForm: UseFormReturn<AuthFormData>;
  onRegister: (values: AuthFormData) => void;
  onLogin: (values: AuthFormData) => void;
};

export function LoginCard({ authForm, onRegister, onLogin }: LoginCardProps): React.JSX.Element {
  const submitRegister = authForm.handleSubmit(onRegister);
  const submitLogin = authForm.handleSubmit(onLogin);

  return (
    <main className="app-shell flex flex-col justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Entrar como Aluno</CardTitle>
          <p className="text-sm text-[#7a6047]">Acesse seu atendimento para conversar e responder screenshots.</p>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitLogin();
            }}
          >
            <Controller control={authForm.control} name="email" render={({ field }) => <Input {...field} placeholder="Email" />} />
            <Controller
              control={authForm.control}
              name="password"
              render={({ field }) => <Input {...field} type="password" placeholder="Senha" />}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  void submitRegister();
                }}
              >
                Registrar
              </Button>
              <Button variant="outline" type="submit">
                Entrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
