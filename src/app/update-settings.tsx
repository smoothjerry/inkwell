import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingRow } from "@/features/settings";
import { useUpdateStore } from "@/stores/update-store";
import { checkForUpdate, relaunchToUpdate } from "./use-update-notice";

/**
 * Settings ▸ Updates (DESIGN_SPEC §7.12): Relaunch while a newer build is
 * waiting, so it stays reachable after the notice is closed; otherwise a
 * button that checks once.
 */
export function UpdateSettings() {
  const isWaiting = useUpdateStore((state) => state.waitingToken !== null);
  const [isChecking, setChecking] = useState(false);

  async function checkNow() {
    setChecking(true);
    const found = await checkForUpdate();
    setChecking(false);
    if (!found) {
      toast("No newer build of Inkwell is installed.");
    }
  }

  return isWaiting ? (
    <SettingRow title="Inkwell" description="A newer build of Inkwell is installed.">
      <Button size="sm" onClick={() => void relaunchToUpdate()}>
        Relaunch
      </Button>
    </SettingRow>
  ) : (
    <SettingRow title="Inkwell" description="This is the newest build installed.">
      <Button variant="outline" size="sm" disabled={isChecking} onClick={() => void checkNow()}>
        Check Now
      </Button>
    </SettingRow>
  );
}
