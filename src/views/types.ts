import type { KoipyModel } from "../hooks/useKoipyConfig";
import type { ConfigBinding } from "../components/Field";

export interface ViewProps {
  model: KoipyModel;
  binding: ConfigBinding;
  onInspect: (path: string) => void;
}
