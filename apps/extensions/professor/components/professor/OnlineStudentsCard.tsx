import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OnlineStudentsCardProps = {
  selectedStudentId: string;
  studentIds: string[];
  onRefresh: () => void;
  onStartConversation: (studentId: string) => void;
};

export function OnlineStudentsCard({
  selectedStudentId,
  studentIds,
  onRefresh,
  onStartConversation
}: OnlineStudentsCardProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alunos Online</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onRefresh}>Atualizar lista</Button>
        <div className="space-y-2">
          {studentIds.length === 0 ? (
            <p className="text-sm text-zinc-400">Nenhum aluno online.</p>
          ) : (
            studentIds.map((studentId) => (
              <button
                type="button"
                key={studentId}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedStudentId === studentId ? "border-[#b99163] bg-[#fff2e7]" : "border-border bg-card"
                }`}
                onClick={() => onStartConversation(studentId)}
              >
                <div className="flex items-center gap-2">
                  <div className="relative h-8 w-8 rounded-full bg-[#f0d8c2] text-center text-sm font-semibold leading-8 text-[#7d5b30]">
                    {studentId.slice(0, 1).toUpperCase()}
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#4d3728]">{studentId.slice(0, 8)}...</p>
                    <p className="text-xs text-[#8d6b4b]">Online</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
