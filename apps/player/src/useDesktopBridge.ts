import { useEffect, useRef } from "react";
import { isDesktop } from "../../../packages/platform/src";
import type {
  ControlCommand,
  PlayerSnapshot,
} from "../../../packages/platform/src/control";
export function useDesktopBridge(
  state: PlayerSnapshot,
  command: (c: ControlCommand) => void,
  error: (s: string) => void,
) {
  const refs = useRef({ state, command, error });
  refs.current = { state, command, error };
  useEffect(() => {
    if (!isDesktop()) return;
    let canceled = false;
    let off: (() => void) | undefined;
    void import("@tauri-apps/api/event")
      .then(async ({ listen, emitTo }) => {
        const unsubscribe = await listen<ControlCommand>(
          "control-command",
          (event) => {
            if (event.payload?.type === "snapshot")
              void emitTo("controls", "player-state", refs.current.state);
            else refs.current.command(event.payload);
          },
        );
        if (canceled) unsubscribe();
        else off = unsubscribe;
      })
      .catch((e) => refs.current.error(String(e)));
    return () => {
      canceled = true;
      off?.();
    };
  }, []);
  useEffect(() => {
    if (isDesktop())
      void import("@tauri-apps/api/event")
        .then(({ emitTo }) => emitTo("controls", "player-state", state))
        .catch(() => {});
  }, [state]);
}
