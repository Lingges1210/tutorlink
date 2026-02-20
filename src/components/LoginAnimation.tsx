"use client";

import { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";

export type LoginAnimationHandle = {
  setChecking: (v: boolean) => void;
  setHandsUp: (v: boolean) => void;
  success: () => void;
  fail: () => void;
  look?: (v: number) => void; // optional if you want eye-follow later
};

export default function LoginAnimation({
  onReady,
}: {
  onReady?: (api: LoginAnimationHandle) => void;
}) {
  const STATE_MACHINE = "State Machine 1";

  const { rive, RiveComponent } = useRive({
    src: "/rive/login.riv",
    stateMachines: STATE_MACHINE,
    autoplay: true,
  });

  //  Correct names from your file
  const check = useStateMachineInput(rive, STATE_MACHINE, "Check");
  const handsUp = useStateMachineInput(rive, STATE_MACHINE, "hands_up");
  const look = useStateMachineInput(rive, STATE_MACHINE, "Look"); // likely number
  const successTrigger = useStateMachineInput(rive, STATE_MACHINE, "success");
  const failTrigger = useStateMachineInput(rive, STATE_MACHINE, "fail");

  useEffect(() => {
    if (!rive || !onReady) return;

    onReady({
      setChecking: (v) => {
        if (check) check.value = v;
      },
      setHandsUp: (v) => {
        // If hands_up is a boolean:
        if (handsUp && "value" in handsUp) (handsUp as any).value = v;
      },
      success: () => successTrigger?.fire?.(),
      fail: () => failTrigger?.fire?.(),
      look: (v) => {
        if (look) (look as any).value = v;
      },
    });
  }, [rive, onReady, check, handsUp, look, successTrigger, failTrigger]);

  return (
    <div className="h-72 w-full">
      <RiveComponent className="h-full w-full scale-[1.12]"  />
    </div>
  );
}
