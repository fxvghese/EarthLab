import { useMemo, useRef, useState, useCallback } from "react";
import {
  buildSchedule,
  initialState,
  projectDay,
  commitDay,
  TOTAL_DAYS,
  type GameState,
  type PlannedMix,
} from "./engine";

export function useGame() {
  const seedRef = useRef(Math.floor(Math.random() * 2 ** 31));

  const [seed, setSeed] = useState(() => seedRef.current);
  const [state, setState] = useState<GameState>(() => initialState());
  const [mix, setMix] = useState<PlannedMix>({ solar: 0, wind: 0, hydro: 0, coal: 0 });

  const schedule = useMemo(() => buildSchedule(seed), [seed]);
  const spec = schedule[Math.min(state.day, TOTAL_DAYS) - 1];

  const projection = useMemo(
    () => projectDay(mix, spec.weather, state.battery, state.coal, spec.demand),
    [mix, spec.weather, state.battery, state.coal, spec.demand]
  );

  const setSource = useCallback((id: keyof PlannedMix, v: number) => {
    setMix((m) => ({ ...m, [id]: v }));
  }, []);

  const reset = useCallback(() => {
    seedRef.current = Math.floor(Math.random() * 2 ** 31);
    setSeed(seedRef.current);
    setState(initialState());
    setMix({ solar: 0, wind: 0, hydro: 0, coal: 0 });
  }, []);

  const commit = useCallback(() => {
    setState((s) => commitDay(s, schedule, mix).state);
    setMix({ solar: 0, wind: 0, hydro: 0, coal: 0 });
  }, [schedule, mix]);

  return {
    state,
    schedule,
    spec,
    mix,
    projection,
    setSource,
    commit,
    reset,
  };
}
