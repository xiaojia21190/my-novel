"use client";

import React from "react";
import { Progress } from "./progress";
import { Loader2 } from "lucide-react";

export type GenerationStep = {
  id: string;
  name: string;
  description: string;
  status: "waiting" | "processing" | "completed" | "error";
  progress?: number; // 0-100
  error?: string;
};

interface GenerationProgressProps {
  steps: GenerationStep[];
  currentStepId: string | null;
  className?: string;
  showDetails?: boolean;
}

export function GenerationProgress({ steps, currentStepId, className = "", showDetails = true }: GenerationProgressProps) {
  // 计算总体进度
  const calculateOverallProgress = (): number => {
    if (steps.length === 0) return 0;

    const completedSteps = steps.filter((step) => step.status === "completed").length;
    const processingStep = steps.find((step) => step.status === "processing");

    const baseProgress = (completedSteps / steps.length) * 100;

    if (processingStep && processingStep.progress !== undefined) {
      const stepContribution = (1 / steps.length) * processingStep.progress;
      return baseProgress + stepContribution;
    }

    return baseProgress;
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">总体进度</div>
          <div className="text-xs text-muted-foreground">{Math.round(overallProgress)}%</div>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      {showDetails && (
        <div className="mt-4 space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {step.status === "processing" && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                  <div className="text-sm font-medium">{step.name}</div>
                </div>
                <div className="text-xs text-muted-foreground">{step.status === "completed" ? "完成" : step.status === "processing" ? `${step.progress !== undefined ? `${Math.round(step.progress)}%` : "处理中"}` : step.status === "error" ? "错误" : "等待中"}</div>
              </div>

              {step.status === "processing" && step.progress !== undefined && <Progress value={step.progress} className="h-1" />}

              {step.description && <div className="text-xs text-muted-foreground">{step.description}</div>}

              {step.status === "error" && step.error && <div className="text-xs text-destructive">{step.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
