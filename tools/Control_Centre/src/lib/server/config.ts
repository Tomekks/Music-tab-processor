import { resolve } from "node:path";

export const PIPELINE_ROOT: string =
  process.env.CC_PIPELINE_ROOT ?? resolve(process.cwd(), "../..");
export const DATA_DIR: string = resolve(process.cwd(), "data");
export const ALLOWED_HOSTS: readonly string[] = ["localhost:5173", "127.0.0.1:5173"];
export const DESIGN_SYSTEM_URL = "http://localhost:3000/design-system";
export const PYTHON: string = resolve(PIPELINE_ROOT, ".venv/bin/python");
export const MANIFEST_PATH: string = resolve(PIPELINE_ROOT, "pipeline/manifest.json");
export const RUNS_DIR: string = resolve(PIPELINE_ROOT, "pipeline_runs");
