import React from "react";
import { Button } from "@/components/ui/button";

type ScreenshotRequestDialogProps = {
  selectedStudentId: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ScreenshotRequestDialog({
  selectedStudentId,
  onCancel,
  onConfirm
}: ScreenshotRequestDialogProps): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="text-lg font-semibold text-[#4d3728]">Solicitar screenshot</h3>
        <p className="mt-2 text-sm text-[#7a6047]">
          Enviar solicitação para o aluno <strong>{selectedStudentId || "-"}</strong> agora?
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}
