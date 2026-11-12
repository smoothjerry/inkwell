import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLibraryStore } from "@/features/library";
import { GoalFields, type GoalValues, SegmentedControl } from "@/features/settings";
import { useProgressStore } from "@/features/stats";
import { THEMES, useSettingsStore } from "@/stores/settings-store";
import { createWelcomeDocument } from "./welcome-document";

/** First-launch setup: (1) weekly goal, daily target, week start; (2) theme. */
export function OnboardingDialog() {
  const isLoaded = useSettingsStore((state) => state.isLoaded);
  const onboarded = useSettingsStore((state) => state.onboarded);
  const theme = useSettingsStore((state) => state.theme);
  const [step, setStep] = useState<1 | 2>(1);
  const [goals, setGoals] = useState<GoalValues>(() => {
    const { weeklyGoal, dailyTarget, weekStartsOn } = useSettingsStore.getState();
    return { weeklyGoal, dailyTarget, weekStartsOn };
  });

  if (!isLoaded || onboarded) {
    return null;
  }

  async function finish() {
    const settings = useSettingsStore.getState();
    settings.update({ weekStartsOn: goals.weekStartsOn, onboarded: true });
    await useProgressStore.getState().changeGoal(goals.weeklyGoal, goals.dailyTarget);
    try {
      const id = await createWelcomeDocument();
      await useLibraryStore.getState().load();
      useLibraryStore.getState().selectDocument(id);
    } catch (error) {
      console.error(error);
      toast.error("Could not create the Welcome document.");
    }
  }

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === 1 ? "Set your weekly goal" : "Choose a theme"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === 1
              ? "Step 1 of 2. Pick a number you can reach most weeks. You can change it later."
              : "Step 2 of 2. System follows your computer's setting."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {step === 1 ? (
          <div className="text-[13px]">
            <GoalFields values={goals} onChange={setGoals} />
          </div>
        ) : (
          <div className="py-3">
            <SegmentedControl
              label="Theme"
              options={THEMES}
              value={theme}
              onChange={(next) => useSettingsStore.getState().update({ theme: next })}
            />
          </div>
        )}

        <AlertDialogFooter>
          {step === 1 ? (
            <Button onClick={() => setStep(2)}>Continue</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => void finish()}>Start writing</Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
